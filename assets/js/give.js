import {init,$,safeUrl} from './core.js';
const c=await init(),s=c.settings||{};
function link(id,value){const n=$(id),url=safeUrl(value);if(!n)return false;if(!url){n.hidden=true;return false;}n.href=url;n.target='_blank';n.rel='noopener noreferrer';n.hidden=false;return true;}
function card(id,textId,text){const box=$(id),p=$(textId);const value=String(text||'').trim();if(!box||!p||!value)return false;p.textContent=value;box.hidden=false;return true;}
let any=false;
any=link('#give-paypal',s.paypalUrl)||any;
any=link('#give-venmo',s.venmoUrl)||any;
any=link('#give-cashapp',s.cashAppUrl)||any;
any=link('#giving',s.givingUrl)||any;
any=card('#give-zelle','#zelle-text',s.zelleInfo?'Send to '+String(s.zelleInfo).trim()+'.':'')||any;
any=card('#give-check','#check-text',s.checkAddress?'Mail checks to '+String(s.checkAddress).trim()+'.':'')||any;
$('#giving-options').hidden=!any;
$('#giving-note').hidden=any;
