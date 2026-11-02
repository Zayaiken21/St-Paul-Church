import {init} from './core.js';
import {renderGallery,mediaUrl} from './gallery-model.js';

const content=await init();
const items=(content.moments||[]).filter(x=>mediaUrl(x.url));
const byId=new Map(items.map(x=>[x.id,x]));
const longDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')?new Date(v+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}):'';
const pauseAll=except=>document.querySelectorAll('video').forEach(v=>{if(v!==except)v.pause();});
renderGallery(document,items);

// Filters: everything / photos / films
const filters=document.querySelector('.moment-filters');
filters?.addEventListener('click',event=>{const button=event.target.closest('[data-category]');if(!button)return;filters.querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));pauseAll();renderGallery(document,items,button.dataset.category);});

// "View all" inside large albums
document.getElementById('church-moments').addEventListener('click',event=>{const more=event.target.closest('[data-expand]');if(!more)return;const section=document.getElementById(more.dataset.expand);section.querySelectorAll('[data-extra="true"]').forEach(n=>n.hidden=false);more.remove();});

// Film theater: pick a film to play on the main screen
const films=document.getElementById('life-films');
films?.addEventListener('click',event=>{const pick=event.target.closest('[data-film]');if(!pick)return;const film=byId.get(pick.dataset.film);if(!film)return;
 if(film.type==='youtube'){window.open(film.url,'_blank','noopener');return;}
 films.querySelectorAll('[data-film]').forEach(b=>b.toggleAttribute('aria-current',b===pick));if(pick.hasAttribute('aria-current'))pick.setAttribute('aria-current','true');
 const screen=document.getElementById('theater-screen');pauseAll();const video=document.createElement('video');video.controls=true;video.playsInline=true;video.preload='metadata';if(mediaUrl(film.image))video.poster=film.image;video.setAttribute('aria-label',film.title||'Church film');const s=document.createElement('source');s.src=film.url;s.type='video/mp4';video.append(s);screen.replaceChildren(video);
 const info=document.getElementById('theater-info');const eyebrow=document.createElement('p');eyebrow.className='eyebrow';eyebrow.textContent=[film.album,longDate(film.date)].filter(Boolean).join(' · ')||'GREATER ST. PAUL FILMS';const h=document.createElement('h3');h.textContent=film.title||'Church film';info.replaceChildren(eyebrow,h);if(film.text){const p=document.createElement('p');p.textContent=film.text;info.append(p);}
 if(window.matchMedia('(max-width: 860px)').matches)screen.scrollIntoView({behavior:'smooth',block:'start'});video.play().catch(()=>{});});

// Full-screen viewer for photos and films, moving through the album
const dialog=document.createElement('dialog');dialog.className='life-viewer';dialog.setAttribute('aria-label','Church Life viewer');
dialog.innerHTML='<div class="viewer-top"><span class="viewer-index" aria-live="polite"></span><button type="button" class="viewer-close" aria-label="Close viewer">✕</button></div><div class="viewer-stage"><button type="button" class="viewer-arrow prev" aria-label="Previous">‹</button><div class="viewer-media"></div><button type="button" class="viewer-arrow next" aria-label="Next">›</button></div><div class="viewer-caption"><p class="eyebrow"></p><h3></h3><p class="viewer-text"></p></div>';
document.body.append(dialog);
const $=s=>dialog.querySelector(s);let list=[],index=0;
function show(){const item=list[index];if(!item)return;const media=$('.viewer-media');pauseAll();
 if(item.type==='video'){const v=document.createElement('video');v.controls=true;v.playsInline=true;v.autoplay=true;if(mediaUrl(item.image))v.poster=item.image;v.setAttribute('aria-label',item.title||'Church film');const s=document.createElement('source');s.src=item.url;s.type='video/mp4';v.append(s);media.replaceChildren(v);}
 else{const img=document.createElement('img');img.src=item.url;img.alt=item.alt||item.title||'Greater St. Paul';media.replaceChildren(img);}
 $('.eyebrow').textContent=[item.album||'Together in Faith',longDate(item.date)].filter(Boolean).join(' · ');$('h3').textContent=item.title||'';$('.viewer-text').textContent=item.text||'';
 $('.viewer-index').textContent=(index+1)+' / '+list.length;dialog.querySelectorAll('.viewer-arrow').forEach(b=>b.hidden=list.length<2);
 const next=list[(index+1)%list.length];if(next?.type==='photo'){const pre=new Image();pre.src=next.url;}}
function move(n){index=(index+n+list.length)%list.length;show();}
$('.prev').onclick=()=>move(-1);$('.next').onclick=()=>move(1);$('.viewer-close').onclick=()=>dialog.close();
dialog.addEventListener('close',()=>{pauseAll();$('.viewer-media').replaceChildren();});
dialog.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();move(1);}if(e.key==='ArrowLeft'){e.preventDefault();move(-1);}});
dialog.addEventListener('click',e=>{if(e.target===dialog||e.target.classList.contains('viewer-stage'))dialog.close();});
let startX=0;dialog.addEventListener('touchstart',e=>{startX=e.changedTouches[0].screenX;},{passive:true});dialog.addEventListener('touchend',e=>{if(e.target.closest('video'))return;const d=e.changedTouches[0].screenX-startX;if(Math.abs(d)>60)move(d<0?1:-1);},{passive:true});
document.getElementById('church-moments').addEventListener('click',event=>{const link=event.target.closest('[data-moment]');if(!link)return;const item=byId.get(link.dataset.moment);if(!item||item.type==='youtube')return;event.preventDefault();
 const section=link.closest('.life-album');const ids=[...section.querySelectorAll('[data-moment]')].map(n=>n.dataset.moment);list=ids.map(id=>byId.get(id)).filter(x=>x&&x.type!=='youtube');index=list.indexOf(item);if(index<0)return;show();dialog.showModal();});

document.addEventListener('play',event=>{if(event.target.tagName==='VIDEO')pauseAll(event.target);},true);
if(location.hash){const target=document.getElementById(location.hash.slice(1));if(target){target.hidden=false;target.scrollIntoView({block:'start'});}}
