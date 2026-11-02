// Church Life gallery renderer. Used by the public page, the Church Studio editor and the Studio compiler,
// so it only touches the document it is given (no window globals).
export const MOMENT_CATEGORIES={events:'Events & outreach',gatherings:'Church gatherings',members:'Member moments'};
export const ALBUM_PREVIEW=9;
export function mediaUrl(value){if(typeof value!=='string'||!value.trim())return '';if(/^data:(?:image\/(?:png|jpeg|webp)|video\/mp4);base64,[A-Za-z0-9+/=]+$/.test(value))return value;try{const u=new URL(value,'https://zayaiken21.github.io/The-growing-Church/');return ['https:','http:'].includes(u.protocol)?value:'';}catch{return '';}}

const isDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v);
const longDate=v=>new Date(v+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
const monthYear=v=>new Date(v+'T12:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric'});
const isFilm=x=>x.type==='video'||x.type==='youtube';
export const thumbOf=x=>mediaUrl(x.type==='photo'?(x.thumb||x.url):(x.image||''));
export const albumKey=x=>x.albumId||(x.album?x.album.toLowerCase().replace(/[^a-z0-9]+/g,'-'):'daily');
export const domId=x=>/^[a-zA-Z0-9-]+$/.test(x.id||'')?x.id:'';
export function duration(s){s=Math.round(Number(s)||0);if(!s)return '';return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}

function el(doc,tag,cls,text){const n=doc.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function countText(photos,films){const parts=[];if(photos)parts.push(photos+(photos===1?' photo':' photos'));if(films)parts.push(films+(films===1?' film':' films'));return parts.join(' · ')||'No moments yet';}

// Groups visible moments into albums: newest dated albums first, undated albums next, everyday church life last.
export function groupAlbums(items){
 const groups=new Map();
 for(const item of items){const key=albumKey(item);if(!groups.has(key))groups.set(key,{key,title:'',text:'',date:'',items:[]});const g=groups.get(key);g.items.push(item);
  if(!g.title&&item.album)g.title=item.album;if(!g.text&&item.albumText)g.text=item.albumText;if(isDate(item.date)&&item.date>g.date)g.date=item.date;}
 for(const g of groups.values()){if(g.key==='daily'){g.title='Together in Faith';g.text||='Our place of worship. Our time together. A glimpse of the church we call home.';}g.title||='Church events';}
 return [...groups.values()].sort((a,b)=>(a.key==='daily')-(b.key==='daily')||(!a.date)-(!b.date)||(b.date>a.date?1:b.date<a.date?-1:0));
}

function tile(doc,item,hidden){
 const card=el(doc,'article','life-tile'+(isFilm(item)?' is-film':''));const id=domId(item);if(id)card.id=id;if(hidden)card.hidden=true;card.dataset.extra=hidden?'true':'';
 const a=el(doc,'a','life-tile-link');a.href=mediaUrl(item.url);a.dataset.moment=item.id||'';
 if(item.type==='youtube'){a.target='_blank';a.rel='noopener noreferrer';}
 a.setAttribute('aria-label',(isFilm(item)?'Play film: ':'Open photo: ')+(item.title||'Church moment'));
 const src=thumbOf(item);
 if(src){const img=el(doc,'img');img.src=src;img.alt=item.type==='photo'?(item.alt||item.title||'Greater St. Paul'):'';img.loading='lazy';img.decoding='async';
  if(item.w&&item.h){img.width=item.w;img.height=item.h;}else if(item.orientation==='portrait'){img.width=3;img.height=4;}else{img.width=4;img.height=3;}a.append(img);}
 else{const ph=el(doc,'span','life-tile-placeholder','✝');a.append(ph);}
 if(isFilm(item)){const play=el(doc,'span','life-play');play.setAttribute('aria-hidden','true');play.append(el(doc,'span','life-play-icon','▶'));const d=duration(item.duration);if(d)play.append(el(doc,'span','life-play-time',d));a.append(play);}
 const cap=el(doc,'span','life-tile-caption',item.title||'');a.append(cap);
 card.append(a);return card;
}

function renderAlbums(doc,root,albums){
 root.replaceChildren();
 if(!albums.length){root.append(el(doc,'p','moments-empty','No moments match this selection. Choose “Everything” to see every album.'));return;}
 albums.forEach((g,i)=>{
  const section=el(doc,'section','life-album'+(g.key==='daily'?' is-daily':''));section.id=g.key==='daily'?'everyday-life':'album-'+g.key;section.setAttribute('aria-labelledby',section.id+'-title');
  const head=el(doc,'header','life-album-head');
  const num=el(doc,'span','life-album-number',String(i+1).padStart(2,'0'));num.setAttribute('aria-hidden','true');
  const copy=el(doc,'div','life-album-copy');
  const eyebrow=el(doc,'p','eyebrow',g.key==='daily'?'THE LIFE WE SHARE':g.date?'':'FROM OUR ALBUMS');
  if(g.date){const t=el(doc,'time','',longDate(g.date));t.dateTime=g.date;eyebrow.append(t);}
  const h=el(doc,'h2','',g.title);h.id=section.id+'-title';
  copy.append(eyebrow,h);if(g.text)copy.append(el(doc,'p','life-album-text',g.text));
  copy.append(el(doc,'p','life-album-meta',countText(g.items.filter(x=>x.type==='photo').length,g.items.filter(isFilm).length)));
  head.append(num,copy);section.append(head);
  const grid=el(doc,'div','life-grid');g.items.forEach((item,n)=>grid.append(tile(doc,item,n>=ALBUM_PREVIEW)));section.append(grid);
  if(g.items.length>ALBUM_PREVIEW){const more=el(doc,'button','life-more','View all '+g.items.length+' moments ↓');more.type='button';more.dataset.expand=section.id;section.append(more);}
  root.append(section);
 });
}

function renderIndex(doc,albums){
 const nav=doc.getElementById('album-index');if(!nav)return;nav.replaceChildren();
 for(const g of albums){const a=el(doc,'a','album-chip');a.href='#'+(g.key==='daily'?'everyday-life':'album-'+g.key);a.append(el(doc,'span','',g.title));if(g.date)a.append(el(doc,'small','',monthYear(g.date)));nav.append(a);}
}

function renderFilms(doc,items){
 const wrap=doc.getElementById('life-films');if(!wrap)return;
 const films=items.filter(isFilm).filter(x=>mediaUrl(x.url)).sort((a,b)=>(b.date||'')>(a.date||'')?1:(b.date||'')<(a.date||'')?-1:0);
 const section=wrap.closest('.life-theater');if(section)section.hidden=!films.length;
 wrap.replaceChildren();if(!films.length)return;
 const stage=el(doc,'div','theater-stage');const first=films.find(x=>x.type==='video')||films[0];
 const screen=el(doc,'div','theater-screen');screen.id='theater-screen';
 if(first.type==='video'){const v=el(doc,'video');v.controls=true;v.playsInline=true;v.preload='none';if(mediaUrl(first.image))v.poster=first.image;v.setAttribute('aria-label',first.title||'Church film');const s=el(doc,'source');s.src=first.url;s.type='video/mp4';v.append(s);screen.append(v);}
 else{const a=el(doc,'a','worship-video-link');a.href=first.url;a.target='_blank';a.rel='noopener noreferrer';const img=el(doc,'img');img.src=mediaUrl(first.image);img.alt='';a.append(img,el(doc,'span','','▶ Watch on YouTube'));screen.append(a);}
 const info=el(doc,'div','theater-info');info.id='theater-info';
 info.append(el(doc,'p','eyebrow',[first.album,first.date&&isDate(first.date)?longDate(first.date):''].filter(Boolean).join(' · ')||'GREATER ST. PAUL FILMS'),el(doc,'h3','',first.title||'Church film'));if(first.text)info.append(el(doc,'p','',first.text));
 stage.append(screen,info);
 const list=el(doc,'ol','theater-list');list.setAttribute('aria-label','All church films');
 films.forEach(f=>{const li=el(doc,'li');const b=el(doc,'button','theater-pick');b.type='button';b.dataset.film=f.id||'';if(f===first)b.setAttribute('aria-current','true');
  const pic=el(doc,'span','theater-thumb');const src=thumbOf(f);if(src){const img=el(doc,'img');img.src=src;img.alt='';img.loading='lazy';pic.append(img);}const d=duration(f.duration);if(d)pic.append(el(doc,'span','life-play-time',d));
  const txt=el(doc,'span','theater-pick-text');txt.append(el(doc,'strong','',f.title||'Church film'),el(doc,'small','',[f.album,isDate(f.date)?monthYear(f.date):''].filter(Boolean).join(' · ')));
  b.append(pic,txt);li.append(b);list.append(li);});
 wrap.append(stage,list);
}

function renderHero(doc,items){
 const stats=doc.getElementById('life-stats');
 if(stats){stats.replaceChildren();const albums=groupAlbums(items).filter(g=>g.key!=='daily').length;
  for(const [n,label] of [[items.filter(x=>x.type==='photo').length,'Photos'],[items.filter(isFilm).length,'Films'],[albums,'Albums']]){const d=el(doc,'div','life-stat');d.append(el(doc,'strong','',String(n)),el(doc,'span','',label));stats.append(d);}}
 const mosaic=doc.getElementById('life-mosaic');
 if(mosaic){mosaic.replaceChildren();const picks=items.filter(x=>x.featured&&thumbOf(x));for(const g of groupAlbums(items)){if(picks.length>=5)break;const p=g.items.find(x=>x.type==='photo'&&thumbOf(x)&&!picks.includes(x));if(p)picks.push(p);}
  picks.slice(0,5).forEach((p,i)=>{const a=el(doc,'a','mosaic-'+(i+1));a.href='#'+(domId(p)||'church-moments');a.setAttribute('aria-label','See '+(p.title||'this moment'));const img=el(doc,'img');img.src=thumbOf(p);img.alt='';img.decoding='async';if(i>1)img.loading='lazy';a.append(img);mosaic.append(a);});}
}

export function renderGallery(doc,items=[],filter='all'){
 const root=doc.getElementById('church-moments');if(!root)return;
 const valid=items.filter(x=>mediaUrl(x.url));
 const shown=valid.filter(x=>filter==='all'||(filter==='photos'&&x.type==='photo')||(filter==='videos'&&isFilm(x))||x.category===filter);
 const count=doc.getElementById('moment-count');if(count)count.textContent=shown.length+' '+(shown.length===1?'moment':'moments');
 const albums=groupAlbums(shown);
 renderAlbums(doc,root,albums);
 if(filter==='all'){renderIndex(doc,albums);renderFilms(doc,valid);renderHero(doc,valid);}
}
