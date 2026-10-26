import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const pub=path.join(root,'public');
const port=Number(process.env.PORT||3000);
const files=fs.readdirSync(path.join(root,'knowledge')).filter(f=>f.endsWith('.txt'));
const docs=files.flatMap(f=>{const body=fs.readFileSync(path.join(root,'knowledge',f),'utf8'); const chunks=body.match(/[\s\S]{1,3500}/g)||[];return chunks.map((text,i)=>({file:f,part:i,text}));});
const stop=new Set('what this that with from they them into where when which have your about there these were been also python code after before then what как почему чтобы этот такие когда если просто написать это и что для или при так на по ли от те мы вам мне тебе тебя можно нужно есть это что как меня'.split(' '));
function words(s){return (s.toLowerCase().match(/[a-zа-яёіїєґ_]{3,}/g)||[]).filter(w=>!stop.has(w));}
function references(query){const terms=new Set(words(query).slice(0,24));return docs.map(d=>({d,score:words(d.text).reduce((s,w)=>s+(terms.has(w)?1:0),0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,3).map(x=>`SOURCE ${x.d.file}, segment ${x.d.part+1}:\n${x.d.text.slice(0,2600)}`).join('\n\n');}
const instructions=`You are Harvard Python AI Tutor, an independent learning assistant based on supplied transcripts of CS50P Introduction to Programming with Python. You are NOT an official Harvard representative. Teach only Python and closely related tooling. Reply in the user's language. First learn the student's skill level and goal if unknown. Adapt teaching to their level. Use the retrieved course transcript excerpts as the primary reference; never attribute facts to the transcripts unless they actually appear there. Structure explanations briefly: what, why, how, tiny code example, typical mistake, quick check. For practice, give one exercise without an immediate solution and offer graduated hints; if user specifically requests a full solution, provide it with explanation. For a quiz, ask one question at a time. Help with errors by identifying where, why, and a fix. Include projects and 30/90-day study plans when asked. Be encouraging and precise. Do not claim to have executed code unless it was actually executed.`;
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
const throttle=new Map();
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://localhost');
  if(u.pathname==='/api/status')return json(res,200,{live:!!process.env.OPENAI_API_KEY,sourceCount:files.length});
  if(u.pathname==='/api/chat'&&req.method==='POST'){
    const ip=req.socket.remoteAddress||'anon';const now=Date.now();const prev=throttle.get(ip)||[];const recent=prev.filter(t=>now-t<60000);if(recent.length>=12)return json(res,429,{error:'Слишком много запросов. Попробуй через минуту.'});throttle.set(ip,[...recent,now]);
    let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>65000)return json(res,413,{error:'Слишком длинный запрос.'});}
    let input;try{input=JSON.parse(raw)}catch{return json(res,400,{error:'Некорректный JSON.'})}
    const messages=Array.isArray(input.messages)?input.messages.filter(m=>['user','assistant'].includes(m.role)&&typeof m.content==='string').slice(-16).map(m=>({role:m.role,content:m.content.slice(0,5000)})):[];
    if(!messages.length||messages.at(-1).role!=='user')return json(res,400,{error:'Отправь сообщение.'});
    if(!process.env.OPENAI_API_KEY)return json(res,503,{error:'AI-чат пока не подключён. Владелец сайта должен установить OPENAI_API_KEY на сервере.',demo:true});
    try{
      const context=references(messages.at(-1).content);
      const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',temperature:0.45,max_tokens:1100,messages:[{role:'system',content:instructions+(context?'\n\nRelevant course transcript excerpts:\n'+context:'\nNo relevant transcript found for this specific question; distinguish general Python knowledge from course excerpts.')},...messages]}),signal:AbortSignal.timeout(35000)});
      const data=await response.json();if(!response.ok)return json(res,502,{error:'AI API: '+(data.error?.message||response.status)});
      return json(res,200,{reply:data.choices?.[0]?.message?.content||'Не удалось получить ответ.'});
    }catch(e){return json(res,502,{error:'Не удалось получить ответ от AI-сервиса. '+e.message})}
  }
  if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
  let rel;try{rel=decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname)}catch{return json(res,400,{error:'Bad path'})}
  const target=path.resolve(pub,'.'+rel);if(!target.startsWith(pub+path.sep))return json(res,403,{error:'Forbidden'});
  fs.readFile(target,(err,body)=>{if(err){res.writeHead(404);res.end('Not found');return}res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(body)});
}).listen(port,'0.0.0.0',()=>console.log(`Python Tutor at http://localhost:${port}`));
