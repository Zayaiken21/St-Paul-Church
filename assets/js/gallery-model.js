// Church Life gallery renderer. Used by the public page, the Church Studio editor and the Studio compiler,
// so it only touches the document it is given (no window globals).
export const MOMENT_CATEGORIES={events:'Events & outreach',gatherings:'Church gatherings',members:'Member moments'};
export const PAGE_SIZE=24;
export function mediaUrl(value){if(typeof value!=='string'||!value.trim())return '';if(/^data:(?:image\/(?:png|jpeg|webp)|video\/mp4);base64,[A-Za-z0-9+/=]+$/.test(value))return value;try{const u=new URL(value,'https://zayaiken21.github.io/The-growing-Church/');return ['https:','http:'].includes(u.protocol)?value:'';}catch{return '';}}

const isDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v);
const isFilm=x=>x.type==='video'||x.type==='youtube';
export const thumbOf=x=>mediaUrl(x.type==='photo'?(x.thumb||x.url):(x.image||''));
export const domId=x=>/^[a-zA-Z0-9-]+$/.test(x.id||'')?x.id:'';
export function duration(s){s=Math.round(Number(s)||0);if(!s)return '';return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
function el(doc,tag,cls,text){const n=doc.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}

// Newest first; undated moments keep their order after the dated ones.
export function sortMoments(items){return items.map((x,i)=>[x,i]).sort((a,b)=>{const da=isDate(a[0].date)?a[0].date:'',db=isDate(b[0].date)?b[0].date:'';return (!da)-(!db)||(db>da?1:db<da?-1:0)||a[1]-b[1];}).map(x=>x[0]);}

function tile(doc,item,hidden){
 const card=el(doc,'article','life-tile'+(isFilm(item)?' is-film':''));const id=domId(item);if(id)card.id=id;if(hidden)card.hidden=true;
 const a=el(doc,'a','life-tile-link');a.href=mediaUrl(item.url);a.dataset.moment=item.id||'';
 if(item.type==='youtube'){a.target='_blank';a.rel='noopener noreferrer';}
 a.setAttribute('aria-label',(isFilm(item)?'Play video: ':'Open photo: ')+(item.title||'Church moment'));
 const src=thumbOf(item);
 if(src){const img=el(doc,'img');img.src=src;img.alt=item.type==='photo'?(item.alt||item.title||'Greater St. Paul'):'';img.loading='lazy';img.decoding='async';img.width=400;img.height=400;a.append(img);}
 else a.append(el(doc,'span','life-tile-placeholder','✝'));
 if(isFilm(item)){const play=el(doc,'span','life-play');play.setAttribute('aria-hidden','true');play.append(el(doc,'span','life-play-icon','▶'));const d=duration(item.duration);if(d)play.append(el(doc,'span','life-play-time',d));a.append(play);}
 card.append(a);return card;
}

export function renderGallery(doc,items=[],filter='all'){
 const root=doc.getElementById('church-moments');if(!root)return;root.replaceChildren();
 const shown=sortMoments(items.filter(x=>mediaUrl(x.url)).filter(x=>filter==='all'||(filter==='photos'&&x.type==='photo')||(filter==='videos'&&isFilm(x))||x.category===filter));
 const count=doc.getElementById('moment-count');if(count)count.textContent=shown.length+(filter==='photos'?(shown.length===1?' photo':' photos'):filter==='videos'?(shown.length===1?' video':' videos'):(shown.length===1?' moment':' moments'));
 if(!shown.length){root.append(el(doc,'p','moments-empty','Nothing here yet. Choose “All” to see every moment.'));return;}
 const grid=el(doc,'div','life-wall');shown.forEach((item,n)=>grid.append(tile(doc,item,n>=PAGE_SIZE)));root.append(grid);
 if(shown.length>PAGE_SIZE){const more=el(doc,'button','btn outline life-more','Show more');more.type='button';more.dataset.more='true';root.append(more);}
}
