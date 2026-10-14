import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { AuthService } from './services/auth.service.js';
import { UserService } from './services/user.service.js';
import { authMiddleware, getAuthContext } from './middleware/auth.js';
import { loginRateLimit, registerRateLimit } from './middleware/rateLimit.js';
import { generateSessionId, isStrongPassword } from './utils/crypto.js';
import { ValidationError, UnauthorizedError } from './utils/errors.js';

const account=new Hono();
function credentials(body){
    if(typeof body.email!=='string'||body.email.length>254||!/^\S+@\S+\.\S+$/.test(body.email.trim()))throw new ValidationError('Enter a valid email address');
    if(typeof body.password!=='string'||body.password.length>128||body.password.length<8)throw new ValidationError('Password must be 8–128 characters');
    return {email:body.email.trim().toLowerCase(),password:body.password};
}
function cookie(c,token){setCookie(c,'swopblog_refresh',token,{httpOnly:true,sameSite:'Strict',secure:new URL(c.req.url).protocol==='https:',path:'/api/auth',maxAge:7*86400});}
function clearCookie(c){deleteCookie(c,'swopblog_refresh',{path:'/api/auth'});}
account.post('/register',registerRateLimit,async c=>{
    const body=await c.req.json();const {email,password}=credentials(body);
    if(!isStrongPassword(password).valid)throw new ValidationError('Use uppercase, lowercase and a number in your password');
    const name=typeof body.name==='string'?body.name.trim():'';
    if(!name||name.length>80)throw new ValidationError('Display name must be 1–80 characters');
    const users=new UserService(c.env.DB),auth=new AuthService(c.env,c.env.DB);
    const user=await users.createUser(email,await auth.hashPassword(password));
    await c.env.DB.prepare('INSERT INTO blog_profiles(user_id,name) VALUES(?,?)').bind(user.id,name).run();
    return c.json({message:'Account created. Sign in to start writing.'},201);
});
account.post('/login',loginRateLimit,async c=>{
    const {email,password}=credentials(await c.req.json());const users=new UserService(c.env.DB),auth=new AuthService(c.env,c.env.DB);
    const user=await users.getUserByEmail(email);
    if(!user||!await auth.verifyPassword(password,user.password_hash))throw new UnauthorizedError('Email or password is incorrect');
    const sid=generateSessionId();await c.env.DB.prepare('INSERT INTO sessions(id,user_id,device_name) VALUES(?,?,?)').bind(sid,user.id,'SwopBlog browser').run();
    const full=await users.getUserWithRoles(user.id);const accessToken=await auth.generateAccessToken(full,sid);cookie(c,await auth.generateRefreshToken(user.id,sid));
    return c.json({accessToken});
});
account.post('/refresh',async c=>{
    const raw=getCookie(c,'swopblog_refresh');if(!raw)throw new UnauthorizedError('Sign in to continue');
    const auth=new AuthService(c.env,c.env.DB);
    try{const {userId,sessionId}=await auth.verifyRefreshToken(raw);const user=await new UserService(c.env.DB).getUserWithRoles(userId);
        const accessToken=await auth.generateAccessToken(user,sessionId);cookie(c,await auth.generateRefreshToken(userId,sessionId));return c.json({accessToken});
    }catch(error){clearCookie(c);throw error;}
});
account.post('/logout',authMiddleware,async c=>{await new AuthService(c.env,c.env.DB).revokeSession(getAuthContext(c).sessionId);clearCookie(c);return c.json({ok:true});});
account.post('/logout-all',authMiddleware,async c=>{await new AuthService(c.env,c.env.DB).revokeAllSessions(getAuthContext(c).user.id);clearCookie(c);return c.json({ok:true});});
account.post('/change-password',authMiddleware,async c=>{
    const body=await c.req.json();if(typeof body.currentPassword!=='string'||typeof body.newPassword!=='string'||body.newPassword.length>128||!isStrongPassword(body.newPassword).valid)throw new ValidationError('Enter a current password and a strong new password');
    const {user}=getAuthContext(c),auth=new AuthService(c.env,c.env.DB);
    if(!await auth.verifyPassword(body.currentPassword,user.password_hash))throw new ValidationError('Current password is incorrect');
    await new UserService(c.env.DB).updatePassword(user.id,await auth.hashPassword(body.newPassword));await auth.revokeAllSessions(user.id);clearCookie(c);return c.json({ok:true});
});
export default account;
