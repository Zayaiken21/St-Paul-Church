import {REPO,DESIGN_PATH,LABELS_PATH,clone,validateDesign,BASE} from './studio-model.js?v=7';
const HISTORY_PATH='assets/studio/history.json';
const HIDDEN_PATH='assets/studio/hidden-versions.json';
export const EDITOR_API='https://xmcikhjiljbrfixjeswd.supabase.co/functions/v1/church-editor';
const decode=b=>new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\s/g,'')),c=>c.charCodeAt(0)));
export class GitHubStore{
 #session='';
 constructor(fetcher=(...args)=>globalThis.fetch(...args)){this.fetcher=fetcher;this.head=null;this.designSHA=null;this.user=null;}
 async api(path,method='GET',body){
  const response=await this.fetcher(EDITOR_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'api',session:this.#session,method,path,...(body?{body}:{})})});
  if(!response.ok){const e=await response.json().catch(()=>({}));throw Error(response.status===401?'Your editor session ended. Sign in again with the church editor password.':response.status===403?'GitHub denied this request. Check Contents: Read and write permission, repository access, and the API rate limit.':response.status===409||response.status===422?'The website changed while you were working. Download your draft, reload the published version, and review before publishing again.':e.message||'GitHub could not complete this request. Try again.');}
  return response.status===204?null:response.json();
 }
 async connect(password){const r=await this.fetcher(EDITOR_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'login',password:String(password||'').trim()})});const d=await r.json().catch(()=>({}));if(!r.ok||!d.session)throw Error(d.error||'The church editor password is not correct.');this.#session=d.session;try{this.user=await this.api('/user');const r=await this.api('/repos/'+REPO);if(!r.permissions?.push)throw Error('This GitHub account needs write access to the church repository. Ask the owner to invite you as a collaborator.');return this.user;}catch(e){this.disconnect();throw e;}}
 disconnect(){this.#session='';this.user=null;this.head=null;this.designSHA=null;}
 async headNow(){return this.api('/repos/'+REPO+'/git/ref/heads/main').then(x=>x.object.sha);}
 async file(path,ref){const r=await this.api('/repos/'+REPO+'/contents/'+path+'?ref='+encodeURIComponent(ref));if(r.encoding==='base64')return {text:decode(r.content),sha:r.sha};const b=await this.api('/repos/'+REPO+'/git/blobs/'+r.sha);return {text:decode(b.content),sha:r.sha};}
 async load(){this.head=await this.headNow();const f=await this.file(DESIGN_PATH,this.head);this.designSHA=f.sha;return validateDesign(JSON.parse(f.text));}
 async commit(entries,message,head){const parent=await this.api('/repos/'+REPO+'/git/commits/'+head);const tree=await this.api('/repos/'+REPO+'/git/trees','POST',{base_tree:parent.tree.sha,tree:entries});const c=await this.api('/repos/'+REPO+'/git/commits','POST',{message,tree:tree.sha,parents:[head]});await this.api('/repos/'+REPO+'/git/refs/heads/main','PATCH',{sha:c.sha,force:false});return c;}
 async publish(design,name,compile){
  validateDesign(design);const latest=await this.headNow();const live=await this.file(DESIGN_PATH,latest);
  if(live.sha!==this.designSHA)throw Error('Another editor published changes. Download your draft, reload the published version, and review their changes before publishing. Your draft is still here.');
  const clean=clone(design),entries=[],images=new Map();
  const walk=async obj=>{for(const [key,value]of Object.entries(obj)){if(value&&typeof value==='object')await walk(value);else if(typeof value==='string'){
   const match=value.match(/data:(?:image\/(?:png|jpeg|webp)|video\/mp4);base64,[A-Za-z0-9+/=]+/);if(!match)continue;const data=match[0];
   if(!images.has(data)){const [header,content]=data.split(',');const type=header.match(/(?:image|video)\/(\w+)/)[1];const path=(type==='mp4'?'assets/videos/':'assets/photos/')+'studio-'+crypto.randomUUID()+'.'+(type==='jpeg'?'jpg':type);const blob=await this.api('/repos/'+REPO+'/git/blobs','POST',{content,encoding:'base64'});entries.push({path,mode:'100644',type:'blob',sha:blob.sha});images.set(data,path);}obj[key]=value.replace(data,images.get(data));
  }}};await walk(clean);
  const pages=await compile(clean);
  for(const [path,content]of Object.entries(pages))entries.push({path,mode:'100644',type:'blob',content});
  for(const [path,p]of Object.entries(JSON.parse(live.text).pages)){if(p.custom&&!clean.pages[path])entries.push({path,mode:'100644',type:'blob',sha:null});}
  entries.push({path:DESIGN_PATH,mode:'100644',type:'blob',content:JSON.stringify(clean,null,2)+'\n'});
  entries.push({path:'assets/content.json',mode:'100644',type:'blob',content:JSON.stringify(clean.content,null,2)+'\n'});
  entries.push({path:'sitemap.xml',mode:'100644',type:'blob',content:'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+Object.keys(clean.pages).map(path=>'<url><loc>'+BASE+(path==='index.html'?'':path)+'</loc></url>').join('')+'</urlset>\n'});
  const commit=await this.commit(entries,'Church Studio: '+name.trim().slice(0,100),latest);
  this.head=commit.sha;this.designSHA=(await this.file(DESIGN_PATH,commit.sha)).sha;return {design:clean,sha:commit.sha};
 }
 async history(page=1,since=''){return this.api('/repos/'+REPO+'/commits?path='+DESIGN_PATH+'&per_page=20&page='+page+(since?'&since='+encodeURIComponent(since):''));}
 async historyStart(){try{return JSON.parse((await this.file(HISTORY_PATH,this.head||await this.headNow())).text);}catch{return null;}}
 async revision(sha){return validateDesign(JSON.parse((await this.file(DESIGN_PATH,sha)).text));}
 async labels(){return JSON.parse((await this.file(LABELS_PATH,await this.headNow())).text);}
 async rename(sha,name){const head=await this.headNow();const names=JSON.parse((await this.file(LABELS_PATH,head)).text);names[sha]=name.trim().slice(0,100);return this.commit([{path:LABELS_PATH,mode:'100644',type:'blob',content:JSON.stringify(names,null,2)+'\n'}],'Name a Church Studio revision',head);}
 async hidden(){try{const list=JSON.parse((await this.file(HIDDEN_PATH,await this.headNow())).text);return Array.isArray(list)?list:[];}catch{return [];}}
 async hideVersion(sha){const head=await this.headNow();const list=await this.hidden();if(list.includes(sha))return null;list.push(sha);return this.commit([{path:HIDDEN_PATH,mode:'100644',type:'blob',content:JSON.stringify(list,null,2)+'\n'}],'Remove a version from the Versions list',head);}
 async deployment(sha){const b=await this.api('/repos/'+REPO+'/pages/builds/latest');if(!b?.commit||b.commit!==sha)return {status:'queued'};if(b.status==='built')return {status:'completed',conclusion:'success'};if(b.status==='errored')return {status:'completed',conclusion:'failure'};return {status:'in_progress'};}
}

