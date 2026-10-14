import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { formatErrorResponse } from './utils/errors.js';
import account from './account.js';
import blog from './blog.js';
const app=new Hono();
app.use('*',bodyLimit({maxSize:300*1024,onError:c=>c.json({error:{message:'Request exceeds 300 KB'}},413)}));
app.use('*',async(c,next)=>{
    c.header('Cache-Control','no-store');c.header('X-Content-Type-Options','nosniff');
    if(!['GET','HEAD','OPTIONS'].includes(c.req.method)){
        const origin=c.req.header('Origin');
        if((origin&&origin!==c.env.APP_ORIGIN)||c.req.header('Sec-Fetch-Site')==='cross-site')return c.json({error:{message:'Request origin is not allowed'}},403);
    }
    await next();
});
app.get('/api/health',c=>c.json({status:'ok',mode:'shared',emailDelivery:false}));
app.route('/api/auth',account);app.route('/api',blog);
app.notFound(c=>c.json({error:{message:'Endpoint not found'}},404));
app.onError((err,c)=>{if(err instanceof SyntaxError)return c.json({error:{message:'Invalid JSON'}},400);if(!err.statusCode)console.error('API request failed:',err.name);return c.json(formatErrorResponse(err),err.statusCode||500);});
export default app;
