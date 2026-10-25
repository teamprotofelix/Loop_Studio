/** No-dependency local HTTP server for dependable YouTube Referer headers. */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, extname, resolve, sep } from 'node:path';
const root=dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT || 4173);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8'};
const server=createServer(async (req,res)=>{
  const headers={'Referrer-Policy':'strict-origin-when-cross-origin','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'};
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,headers);res.end('Method not allowed');return;}
  try{
    const url=new URL(req.url,`http://127.0.0.1:${port}`);
    const path=decodeURIComponent(url.pathname);
    if(path.includes('\0'))throw new Error('bad path');
    const target=path==='/' ? resolve(root,'index.html') : resolve(root,'.'+path);
    if(target!==root&&!target.startsWith(root+sep))throw new Error('out of root');
    const info=await stat(target);
    if(!info.isFile())throw new Error('not file');
    const data=await readFile(target);
    res.writeHead(200,{...headers,'Content-Type':mime[extname(target)]||'application/octet-stream','Content-Length':data.length});
    res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404,headers);res.end('Not Found');}
});
server.on('error',err=>{console.error('서버를 시작하지 못했습니다:',err.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>{
  console.log('\n  MARIE LOOP STUDIO 실행 중');
  console.log(`  http://localhost:${port}/`);
  console.log('  종료: Ctrl+C\n');
});
