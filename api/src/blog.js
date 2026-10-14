import { Hono } from 'hono';
import { authMiddleware, getAuthContext } from './middleware/auth.js';
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from './utils/errors.js';
import { createRateLimiter } from './middleware/rateLimit.js';

const blog=new Hono();
const tags=['General','Technology','Web Development','Design & UI','Lifestyle & Ideas'];
const writerLimit=createRateLimiter(120,60);
const id = value => {const n=Number(value);if(!Number.isSafeInteger(n)||n<1)throw new ValidationError('Invalid ID');return n;};
const text=(value,name,max)=>{if(typeof value!=='string'||!value.trim()||value.length>max)throw new ValidationError(`${name} must be 1–${max} characters`);return value.trim();};
const moderator=user=>user?.roles.some(r=>['Admin','Moderator'].includes(r.name));
const optionalAuth=async(c,next)=>{if(c.req.header('Authorization'))return authMiddleware(c,next);return next();};
const profileFields=(body)=>{
    const name=text(body.name,'Display name',80),bio=body.bio??'',avatar=body.avatar_url??'';
    if(typeof bio!=='string'||bio.length>500)throw new ValidationError('Bio must be at most 500 characters');
    if(typeof avatar!=='string'||avatar.length>220000)throw new ValidationError('Avatar is too large');
    if(avatar&&avatar!=='/avatar.svg'&&!/^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(avatar)){
        try{const url=new URL(avatar);if(!['http:','https:'].includes(url.protocol)||avatar.length>2048)throw new Error();}catch{throw new ValidationError('Use an image upload or HTTP/HTTPS avatar URL');}
    }
    return {name,bio,avatar_url:avatar};
};
async function post(c){const p=await c.env.DB.prepare('SELECT * FROM blog_posts WHERE id=?').bind(id(c.req.param('id'))).first();if(!p)throw new NotFoundError('Story not found');return p;}
function requireReadable(p,user){if(p.status!=='published'&&p.user_id!==user?.id)throw new NotFoundError('Story not found');}
function contentFields(body){const title=text(body.title,'Title',120),content=text(body.content,'Story',30000),tag=body.tag??'General',status=body.status??'published';if(!tags.includes(tag)||!['draft','published'].includes(status))throw new ValidationError('Invalid category or publication status');return {title,content,tag,status};}
blog.get('/me',authMiddleware,async c=>{const {user,sessionId}=getAuthContext(c);const p=await c.env.DB.prepare('SELECT name,bio,avatar_url FROM blog_profiles WHERE user_id=?').bind(user.id).first();return c.json({id:user.id,email:user.email,roles:user.roles.map(r=>r.name),sessionId,...(p||{name:'Reader',bio:'',avatar_url:''})});});
blog.put('/me',authMiddleware,async c=>{const fields=profileFields(await c.req.json());await c.env.DB.prepare('INSERT INTO blog_profiles(user_id,name,bio,avatar_url) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET name=excluded.name,bio=excluded.bio,avatar_url=excluded.avatar_url').bind(getAuthContext(c).user.id,fields.name,fields.bio,fields.avatar_url).run();return c.json(fields);});
blog.get('/sessions',authMiddleware,async c=>{const {user,sessionId}=getAuthContext(c);const {results}=await c.env.DB.prepare('SELECT id,device_name,created_at FROM sessions WHERE user_id=? ORDER BY created_at DESC').bind(user.id).all();return c.json({items:results.map(r=>({...r,current:r.id===sessionId}))});});
blog.delete('/sessions/:id',authMiddleware,async c=>{const session=c.req.param('id');if(session.length>100)throw new ValidationError('Invalid session');const {user}=getAuthContext(c);const result=await c.env.DB.prepare('DELETE FROM sessions WHERE id=? AND user_id=?').bind(session,user.id).run();if(!result.meta.changes)throw new NotFoundError('Session not found');return c.json({ok:true});});
blog.get('/posts',optionalAuth,async c=>{
    const user=c.get('authContext')?.user,scope=c.req.query('scope')||'public',q=c.req.query('q')||'',tag=c.req.query('tag')||'';
    if(!['public','mine','drafts'].includes(scope)||q.length>200||(tag&&!tags.includes(tag)))throw new ValidationError('Invalid feed filters');
    if(scope!=='public'&&!user)throw new ForbiddenError('Sign in to view your stories');
    const where=[],args=[];
    if(scope==='public')where.push("p.status='published'");else{where.push('p.user_id=?');args.push(user.id);if(scope==='drafts')where.push("p.status='draft'");}
    if(q){where.push("(p.title LIKE ? ESCAPE '\\' OR p.content LIKE ? ESCAPE '\\')");const pattern='%'+q.replace(/[\\%_]/g,'\\$&')+'%';args.push(pattern,pattern);}
    if(tag){where.push('p.tag=?');args.push(tag);}
    if(c.req.query('before')){where.push('p.id<?');args.push(id(c.req.query('before')));}
    const {results}=await c.env.DB.prepare(`SELECT p.*,COALESCE(b.name,'Reader') AS author,COALESCE(b.avatar_url,'') AS author_avatar,
        (SELECT COUNT(*) FROM blog_likes WHERE post_id=p.id) AS likes,
        EXISTS(SELECT 1 FROM blog_likes WHERE post_id=p.id AND user_id=?) AS liked,
        (SELECT COUNT(*) FROM blog_comments WHERE post_id=p.id) AS comments_count
        FROM blog_posts p LEFT JOIN blog_profiles b ON b.user_id=p.user_id WHERE ${where.join(' AND ')} ORDER BY p.id DESC LIMIT 21`).bind(user?.id||0,...args).all();
    const more=results.length>20,items=results.slice(0,20).map(p=>({...p,liked:Boolean(p.liked),can_edit:p.user_id===user?.id,can_delete:p.user_id===user?.id||(p.status==='published'&&moderator(user))}));
    return c.json({items,next:more?items.at(-1).id:null});
});
blog.post('/posts',authMiddleware,writerLimit,async c=>{const f=contentFields(await c.req.json());const p=await c.env.DB.prepare('INSERT INTO blog_posts(user_id,title,content,tag,status) VALUES(?,?,?,?,?) RETURNING id,revision').bind(getAuthContext(c).user.id,f.title,f.content,f.tag,f.status).first();return c.json(p,201);});
blog.put('/posts/:id',authMiddleware,writerLimit,async c=>{const p=await post(c),{user}=getAuthContext(c);if(p.user_id!==user.id)throw new ForbiddenError('Only the author can edit this story');const body=await c.req.json(),f=contentFields(body);if(!Number.isSafeInteger(body.revision)||body.revision<1)throw new ValidationError('Story revision is required');const updated=await c.env.DB.prepare("UPDATE blog_posts SET title=?,content=?,tag=?,status=?,revision=revision+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND user_id=? AND revision=? RETURNING id,revision").bind(f.title,f.content,f.tag,f.status,p.id,user.id,body.revision).first();if(!updated)throw new ConflictError('This story changed in another tab. Reload it before editing. Your draft has been kept.');return c.json(updated);});
blog.delete('/posts/:id',authMiddleware,async c=>{const p=await post(c),{user}=getAuthContext(c);if(p.user_id!==user.id&&!(p.status==='published'&&moderator(user)))throw new ForbiddenError('You cannot delete this story');await c.env.DB.prepare('DELETE FROM blog_posts WHERE id=?').bind(p.id).run();return c.json({ok:true});});
blog.get('/posts/:id/comments',optionalAuth,async c=>{const p=await post(c);requireReadable(p,c.get('authContext')?.user);const after=c.req.query('after')?id(c.req.query('after')):0;const user=c.get('authContext')?.user;const {results}=await c.env.DB.prepare("SELECT r.*,COALESCE(b.name,'Reader') AS author,COALESCE(b.avatar_url,'') AS author_avatar FROM blog_comments r LEFT JOIN blog_profiles b ON b.user_id=r.user_id WHERE r.post_id=? AND r.id>? ORDER BY r.id LIMIT 21").bind(p.id,after).all();const items=results.slice(0,20).map(r=>({...r,can_delete:r.user_id===user?.id||moderator(user)}));return c.json({items,next:results.length>20?items.at(-1).id:null});});
blog.post('/posts/:id/comments',authMiddleware,writerLimit,async c=>{const p=await post(c);if(p.status!=='published')throw new NotFoundError('Published story not found');const content=text((await c.req.json()).content,'Reply',500);const r=await c.env.DB.prepare('INSERT INTO blog_comments(post_id,user_id,content) VALUES(?,?,?) RETURNING id').bind(p.id,getAuthContext(c).user.id,content).first();return c.json(r,201);});
blog.delete('/comments/:id',authMiddleware,async c=>{const reply=await c.env.DB.prepare('SELECT * FROM blog_comments WHERE id=?').bind(id(c.req.param('id'))).first();if(!reply)throw new NotFoundError('Reply not found');const {user}=getAuthContext(c);if(reply.user_id!==user.id&&!moderator(user))throw new ForbiddenError('You cannot delete this reply');await c.env.DB.prepare('DELETE FROM blog_comments WHERE id=?').bind(reply.id).run();return c.json({ok:true});});
for(const method of ['put','delete'])blog[method]('/posts/:id/like',authMiddleware,writerLimit,async c=>{const p=await post(c);if(p.status!=='published')throw new NotFoundError('Published story not found');const user=getAuthContext(c).user;if(method==='put')await c.env.DB.prepare('INSERT OR IGNORE INTO blog_likes(post_id,user_id) VALUES(?,?)').bind(p.id,user.id).run();else await c.env.DB.prepare('DELETE FROM blog_likes WHERE post_id=? AND user_id=?').bind(p.id,user.id).run();const count=await c.env.DB.prepare('SELECT COUNT(*) AS likes FROM blog_likes WHERE post_id=?').bind(p.id).first();return c.json({...count,liked:method==='put'});});
export default blog;
