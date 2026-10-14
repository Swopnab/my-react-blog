import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdirSync,readFileSync,writeFileSync,existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BlogDatabase } from './database.js';
import app from './src/index.js';
const root=fileURLToPath(new URL('../',import.meta.url)),data=resolve(root,'.data');
mkdirSync(data,{recursive:true,mode:0o700});
const secretFile=resolve(data,'jwt-secret');
if(!process.env.JWT_ACCESS_SECRET&&!existsSync(secretFile))writeFileSync(secretFile,randomBytes(48).toString('hex'),{mode:0o600,flag:'wx'});
const secret=process.env.JWT_ACCESS_SECRET||readFileSync(secretFile,'utf8').trim();
if(secret.length<32||secret.startsWith('replace-'))throw new Error('JWT_ACCESS_SECRET must be a random secret of at least 32 characters');
const db=new BlogDatabase(process.env.BLOG_DATABASE_PATH||resolve(data,'swopblog.sqlite'));
const assets=new Map([['/','index.html'],...['index.html','style.css','app.js','shared.js','auth-client.js','avatar.svg','icons.js'].map(n=>['/'+n,n])]);
const server=http.createServer(async(req,res)=>{
    const address=server.address(),origin=`http://127.0.0.1:${address.port}`;
    try{
        const url=new URL(req.url,origin);
        if(url.pathname.startsWith('/api/')){
            const chunks=[];let bytes=0;
            for await(const chunk of req){bytes+=chunk.length;if(bytes>300*1024){res.writeHead(413,{'Content-Type':'application/json'}).end('{"error":{"message":"Request exceeds 300 KB"}}');return;}chunks.push(chunk);}
            const headers=new Headers(req.headers);headers.delete('cf-connecting-ip');headers.delete('x-forwarded-for');
            const request=new Request(url,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
            const response=await app.fetch(request,{DB:db,JWT_ACCESS_SECRET:secret,APP_ORIGIN:origin,CLIENT_IP:req.socket.remoteAddress});
            const outputHeaders=Object.fromEntries(response.headers);const cookies=response.headers.getSetCookie();if(cookies.length)outputHeaders['set-cookie']=cookies;
            res.writeHead(response.status,outputHeaders).end(Buffer.from(await response.arrayBuffer()));return;
        }
        if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
        if(url.pathname==='/config.js'){res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'}).end('window.SWOPBLOG={mode:"shared"};');return;}
        const file=assets.get(url.pathname);if(!file){res.writeHead(404).end('Not found');return;}
        const mime=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/html';
        res.writeHead(200,{'Content-Type':mime,'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'}).end(req.method==='HEAD'?'':readFileSync(resolve(root,file)));
    }catch{if(!res.headersSent)res.writeHead(500,{'Content-Type':'application/json'}).end('{"error":{"message":"Server error"}}');}
});
server.listen(Number(process.env.PORT||8000),'127.0.0.1',()=>console.log(`SwopBlog shared app: http://127.0.0.1:${server.address().port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.close(()=>{db.close();process.exit(0);});server.closeIdleConnections();setTimeout(()=>server.closeAllConnections(),1000).unref();});
