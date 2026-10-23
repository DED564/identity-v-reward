import {doc,getDoc,setDoc,writeBatch,serverTimestamp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
const A=window.APP;
if(!A)throw new Error('APP missing');
const {db,$,esc,ms,toast,ask,rnd,sha,SV,HOURS,HINT,WARN,expText,claimCard}=A;
const ri=n=>{const m=2**32-(2**32%n);let x;do{x=crypto.getRandomValues(new Uint32Array(1))[0]}while(x>=m);return x%n};
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const show=h=>{$('#app').innerHTML=h};
const dd=d=>({id:d.id,...d.data()});
let P={};

/* ---------- Player ---------- */
async function tryCode(v){
 let s;try{s=await getDoc(doc(db,'raffles',v))}catch(e){return false}
 if(!s.exists())return false;
 const r=dd(s);
 if(!r.open||ms(r.exp)<Date.now()||r.next==='END'){const er=$('#er'),b=$('#cb');if(er)er.textContent=r.next==='END'?'โค้ดนี้มีผู้รับสิทธิ์ครบแล้ว':'โค้ดนี้ปิดรับหรือหมดอายุแล้ว';if(b)b.disabled=false;return true}
 P.r=r;show(formHtml());return true}
function formHtml(){const r=P.r;return WARN+`<h1>${esc(r.title)}</h1><p>${esc(r.desc)}</p>
 <div class="card"><div class="kv"><b>โค้ด</b><span class="code">${esc(r.id)}</span><b>สิทธิ์คงเหลือ</b><span>${r.total-r.taken} จาก ${r.total}</span><b>อายุโค้ด</b><span>${expText(r.exp)}</span></div><p class="mu">รางวัลสุ่มให้ ผู้เล่นเลือกเองไม่ได้ ระบบแสดงผลทันทีหลังส่งข้อมูล</p></div>
 <label for="rsv">เซิร์ฟเวอร์ที่เล่น *</label><select id="rsv"><option value="">เลือกเซิร์ฟเวอร์</option><option value="asia">${SV.asia}</option><option value="naeu">${SV.naeu}</option></select>
 <label for="ruid">UID ในเกม * (ตัวเลข)</label><input id="ruid" inputmode="numeric" maxlength="20">
 <label for="rnm">ชื่อในเกม *</label><input id="rnm" maxlength="60">
 <div class="err" id="rer"></div><button class="full" onclick="RF.review()">ตรวจสอบข้อมูลก่อนส่ง</button><button class="full g" onclick="go('code')">กลับ</button>`}
function prizeBox(c,head){return WARN+`<h1>${head}</h1><div class="card" style="text-align:center"><p class="mu">รางวัลที่คุณได้รับ</p><p class="code" style="font-size:30px;font-weight:800;margin:8px 0">${esc(c.reward)}</p><p class="mu">${esc(c.eventName)}</p></div>`}
function review(){
 const sv=$('#rsv').value,uid=$('#ruid').value.trim(),nm=$('#rnm').value.trim(),er=$('#rer');
 if(!sv||!nm||!/^[0-9]{4,20}$/.test(uid)){er.textContent='กรุณาเลือกเซิร์ฟเวอร์ กรอก UID (ตัวเลข 4-20 หลัก) และชื่อในเกมให้ครบ';return}
 ask('คุณแน่ใจในข้อมูลแล้วใช่ไหม?',`<div class="kv"><b>เซิร์ฟเวอร์</b><span>${esc(SV[sv])}</span><b>UID</b><span>${esc(uid)}</span><b>ชื่อในเกม</b><span>${esc(nm)}</span></div><p class="mu">เมื่อส่งแล้วระบบจะสุ่มรางวัลให้ทันที เปลี่ยนไม่ได้ และ UID นี้รับสิทธิ์ของโค้ดนี้ได้ครั้งเดียว</p>`,()=>submit({server:sv,uid,name:nm,date:today()}),'ใช่ สุ่มรางวัลเลย')}
async function submit(f){
 const code=P.r.id,id='LUCKY-'+rnd(6),rid=id+'_'+await sha(f.uid);
 try{if((await getDoc(doc(db,'raffleUids',code+'_'+f.uid))).exists()){toast('UID นี้รับสิทธิ์ของโค้ดนี้ไปแล้ว');return false}}catch(e){}
 let slot=null,r=null;
 for(let t=0;t<6&&!slot;t++){
  r=(await getDoc(doc(db,'raffles',code))).data();
  if(!r||!r.open||ms(r.exp)<Date.now()||r.next==='END'){toast('สิทธิ์เต็มแล้วหรือโค้ดหมดอายุ');window.go('code');return false}
  try{const b=writeBatch(db);
   b.update(doc(db,'raffles',code),{next:r.ids[r.taken+1],taken:r.taken+1});
   b.update(doc(db,'slots',r.next),{claimId:id});
   b.set(doc(db,'raffleClaims',id),{rid,code,slotId:r.next,server:f.server,uid:f.uid,name:f.name,date:f.date,created:serverTimestamp(),status:'pending'});
   b.set(doc(db,'raffleUids',code+'_'+f.uid),{claimId:id});
   await b.commit();slot=r.next}
  catch(e){await new Promise(z=>setTimeout(z,300+ri(500)))}
 }
 if(!slot){toast('ส่งไม่สำเร็จ อาจมีคนกดพร้อมกัน หรือ UID นี้เคยรับแล้ว ลองใหม่อีกครั้ง');return false}
 let prize='(โหลดรางวัลไม่สำเร็จ ติดต่อผู้จัดกิจกรรม)';
 try{prize=(await getDoc(doc(db,'slots',slot))).data().prize;
  await setDoc(doc(db,'raffleReceipts',rid),{claimId:id,eventName:r.title,reward:prize,code,server:f.server,uid:f.uid,name:f.name,created:serverTimestamp(),status:'pending'})}catch(e){}
 try{localStorage.setItem('idvlast',JSON.stringify({id,uid:f.uid}))}catch(e){}
 const c={id,eventName:r.title,reward:prize,code,server:f.server,uid:f.uid,name:f.name,created:Date.now(),status:'pending'};
 show(prizeBox(c,'สุ่มรางวัลสำเร็จ')+`<div class="card"><p class="mu">หมายเลขรายการรับรางวัลของคุณ ต้องใช้หมายเลขนี้คู่กับ UID ในเกม จึงจะตรวจสอบสถานะได้</p><p class="code" style="font-size:26px;font-weight:800;user-select:all">${esc(id)}</p><button class="full" onclick="copyId('${esc(id)}')">คัดลอกหมายเลขรายการ</button></div>`+claimCard(c,false)+HOURS+`<p class="mu">แก้ไขข้อมูลเองไม่ได้ หากกรอกผิดให้ติดต่อผู้จัดกิจกรรม</p><button class="full" onclick="go('code')">กลับหน้าแรก</button>`)}
const chk0=window.chk;
window.chk=async function(){
 const el=$('#cd'),v=el?el.value.trim().toUpperCase().replace(/[^A-Z0-9-]/g,''):'';
 let L={};try{L=JSON.parse(localStorage.getItem('idvf'))||{}}catch(e){}
 if(v&&!(L.until>Date.now())){const b=$('#cb');if(b)b.disabled=true;let ok=false;try{ok=await tryCode(v)}catch(e){}if(ok)return;if(b)b.disabled=false}
 return chk0()};
const lk0=window.lookup;
window.lookup=async function(){
 const cn=$('#cn'),id=cn?cn.value.trim().toUpperCase():'',u=$('#lu')?$('#lu').value.trim():'';
 if(!id.startsWith('LUCKY-'))return lk0();
 let r=null;try{if(u){const s=await getDoc(doc(db,'raffleReceipts',id+'_'+await sha(u)));if(s.exists())r=s.data()}}catch(e){}
 if(!r){$('#er').textContent='ไม่พบข้อมูลหรือไม่สามารถตรวจสอบได้';return}
 const c={...r,id:r.claimId};
 show(prizeBox(c,'รายการของคุณ')+claimCard(c,false)+`<p><b>${HINT[c.status]||''}</b></p>`+HOURS+`<button class="full g" onclick="go('code')">กลับหน้าแรก</button>`)};

window.RF=Object.assign(window.RF||{},{review});
