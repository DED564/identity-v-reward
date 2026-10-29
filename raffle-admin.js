(function(){
 const show=m=>{
  let b=document.getElementById('dbgbox');
  if(!b){
   b=document.createElement('div');
   b.id='dbgbox';
   b.style.cssText='position:fixed;left:0;right:0;bottom:0;max-height:40vh;overflow:auto;background:#900;color:#fff;font:12px monospace;padding:8px;z-index:99999;white-space:pre-wrap';
   document.body.appendChild(b)
  }
  b.textContent+=m+'\n'
 };
 addEventListener('error',e=>show('ERR: '+e.message+' @'+(e.filename||'').split('/').pop()+':'+e.lineno));
 addEventListener('unhandledrejection',e=>show('PROMISE: '+(e.reason&&(e.reason.code||e.reason.message)||e.reason)));
})();
import {doc,getDoc,getDocs,setDoc,updateDoc,deleteField,collection,query,orderBy,limit,where,writeBatch,Timestamp,serverTimestamp,arrayUnion} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const A=window.APP;
if(!A){console.error('raffle-admin: APP missing');}
else{

const {db,$,esc,ms,fd,fdt,toast,ask,log,rnd,SV,SL}=A;
const eod=d=>Timestamp.fromDate(new Date(d+'T23:59:59'));
const ri=n=>{const m=2**32-(2**32%n);let x;do{x=crypto.getRandomValues(new Uint32Array(1))[0]}while(x>=m);return x%n};
const rcode=()=>`RND-${rnd(4)}-${rnd(4)}`;
const dd=d=>({id:d.id,...d.data()});
const rst=r=>!r.open?'ปิดรับ':ms(r.exp)<Date.now()?'หมดอายุ':r.next==='END'?'เต็มแล้ว':'เปิดรับ';
const TA='style="width:100%;min-height:110px;padding:10px 12px;background:var(--sf2);color:var(--tx);border:1px solid var(--ln);border-radius:10px;font:inherit"';
const withTimeout=(p,msec=15000)=>Promise.race([p,new Promise((_,no)=>setTimeout(()=>no(new Error('timeout')),msec))]);

let act=false,det=null,R=[],CL=[],SLT=[],tok=0;

/* ---------- Admin ---------- */
async function load(){
 const jobs=[getDocs(query(collection(db,'raffles'),orderBy('created','desc'),limit(100)))];
 if(det){
  jobs.push(getDocs(query(collection(db,'raffleClaims'),where('code','==',det))));
  jobs.push(getDocs(query(collection(db,'slots'),where('code','==',det))));
 }
 const [a,b,c]=await withTimeout(Promise.all(jobs));
 R=a.docs.map(dd);
 CL=b?b.docs.map(dd).sort((x,y)=>ms(y.created)-ms(x.created)):[];
 SLT=c?c.docs.map(dd):[];
}

async function showAdmin(){
 act=true;
 const my=++tok;
 const app=$('#app'),tabs=app&&app.querySelector('.tabs');
 if(!tabs)return;
 tabs.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x.id==='rftab'));
 while(tabs.nextSibling)tabs.nextSibling.remove();
 const box=document.createElement('div');
 box.innerHTML='<p class="mu">กำลังโหลด...</p>';
 app.appendChild(box);
 try{await load()}
 catch(e){
  if(my!==tok||!act)return;
  box.innerHTML='<div class="err">โหลดไม่สำเร็จ ('+esc(e.code||e.message)+')</div>';
  return
 }
 if(my!==tok||!act||!box.isConnected)return;
 box.innerHTML=det?detail():listHtml()
}

function listHtml(){
 return `<div class="card"><h2 style="margin-top:0">สร้างโค้ดสุ่มแจกรางวัล</h2>
 <label for="rt">ชื่อ</label><input id="rt"><label for="rd">รายละเอียด</label><input id="rd">
 <label for="rx">วันหมดอายุ</label><input id="rx" type="date">
 <label for="rn">จำนวนคนที่ใช้โค้ดได้ (1-300)</label><input id="rn" type="number" inputmode="numeric" min="1" max="300">
 <label for="rp">รางวัล (บรรทัดละ 1 อย่าง ใส่จำนวนด้วย x เช่น กรอบ A x2)</label><textarea id="rp" ${TA}></textarea>
 <label for="rf">รางวัลของช่องที่เหลือ (ถ้ารางวัลน้อยกว่าจำนวนคน)</label><input id="rf" value="รางวัลปลอบใจ">
 <label for="rc">โค้ด (เว้นว่าง = สุ่มให้)</label><input id="rc" class="code">
 <div class="err" id="rerr"></div><button class="full" onclick="RF.create()">สร้างโค้ดสุ่ม</button></div>`+
 (R.map(r=>`<div class="card"><b>${esc(r.title)}</b> <span class="tag ${rst(r)==='เปิดรับ'?'t-unused':'t-expired'}">${rst(r)}</span><p class="code">${esc(r.id)}</p><p class="mu">รับแล้ว ${r.taken}/${r.total} · หมดอายุ ${fd(r.exp)}</p><div class="row"><button class="g s" onclick="RF.open('${esc(r.id)}')">ดูรายละเอียด</button><button class="g s" onclick="RF.tog('${esc(r.id)}')">${r.open?'ปิดรับ':'เปิดรับ'}</button></div></div>`).join('')||'<p class="mu">ยังไม่มีโค้ดสุ่มแจกรางวัล</p>')
}

function detail(){
 const r=R.find(x=>x.id===det)||{id:det,title:'',taken:0,total:0},left={},pm={};
 SLT.forEach(s=>{pm[s.id]=s.prize;if(!s.claimId)left[s.prize]=(left[s.prize]||0)+1});
 return `<button class="g s" onclick="RF.back()">← กลับ</button><h2>${esc(r.title)}</h2><p class="code">${esc(r.id)}</p><p class="mu">รับแล้ว ${r.taken}/${r.total}</p>
 <div class="card"><b>รางวัลที่ยังเหลือ (ห้ามบอกผู้เล่น)</b>${Object.entries(left).map(([k,v])=>`<p>${esc(k)} × ${v}</p>`).join('')||'<p class="mu">ไม่เหลือแล้ว</p>'}</div>`+
 (CL.map(c=>`<div class="card"><div class="kv"><b>รางวัลที่ได้</b><span>${esc(pm[c.slotId]||'-')}</span><b>หมายเลข</b><span class="code">${esc(c.id)}</span><b>เซิร์ฟเวอร์</b><span>${esc(SV[c.server]||'-')}</span><b>UID</b><span>${esc(c.uid)}</span><b>ชื่อในเกม</b><span>${esc(c.name)}</span><b>เวลา</b><span>${fdt(c.created)}</span><b>สถานะ</b><span><span class="tag t-${esc(c.status)}">${esc(SL[c.status]||c.status)}</span></span></div>
 <div class="row" style="margin-top:8px">${c.status==='pending'?`<button class="s" onclick="RF.setSt('${esc(c.id)}','review','เปลี่ยนสถานะเป็น กำลังตรวจสอบ')">เริ่มตรวจสอบ</button>`:''}${c.status==='review'?`<button class="s" onclick="RF.sent('${esc(c.id)}')">ส่งรางวัลแล้ว</button>`:''}${c.status!=='sent'&&c.status!=='cancelled'?`<button class="d s" onclick="RF.cancel('${esc(c.id)}')">ยกเลิกรายการ</button>`:''}${pb(c,'r')}</div>
 <p class="mu" style="font-size:13px">${(c.hist||[]).map(h=>`${fdt(h.t)} ${esc(h.by)}: ${esc(h.a)}`).join('<br>')}</p></div>`).join('')||'<p class="mu">ยังไม่มีผู้ใช้โค้ดนี้</p>')
}

function parse(txt){
 const out=[];
 for(const ln of txt.split('\n')){
  const s=ln.trim();
  if(!s)continue;
  const m=s.match(/^(.*?)(?:\s+[x*]|\s*×)\s*(\d+)$/i),name=(m?m[1]:s).trim(),n=m?parseInt(m[2],10):1;
  if(!name||n<1||n>300)return null;
  for(let i=0;i<n;i++)out.push(name);
  if(out.length>300)return null
 }
 return out
}

async function create(){
 const er=$('#rerr'),t=$('#rt').value.trim(),d=$('#rd').value.trim(),ex=$('#rx').value,tot=parseInt($('#rn').value,10),fill=$('#rf').value.trim()||'รางวัลปลอบใจ',pr=parse($('#rp').value);
 let code=$('#rc').value.trim().toUpperCase();
 if(!t||!ex||!(tot>=1&&tot<=300)||!pr||!pr.length){
  er.textContent='กรอกชื่อ วันหมดอายุ จำนวนคน (1-300) และรายการรางวัลให้ถูกต้อง';
  return
 }
 if(eod(ex).toMillis()<Date.now()){
  er.textContent='ต้องระบุวันหมดอายุที่ยังมาไม่ถึง';
  return
 }
 if(pr.length>tot){
  er.textContent=`รางวัลรวม ${pr.length} ชิ้น มากกว่าจำนวนคน ${tot} ให้เพิ่มจำนวนคนหรือลดรางวัล`;
  return
 }
 if(code&&!/^[A-Z0-9-]{4,30}$/.test(code)){
  er.textContent='โค้ดใช้ได้เฉพาะ A-Z 0-9 และ - ยาว 4-30 ตัว';
  return
 }
 if(!code)code=rcode();
 while(pr.length<tot)pr.push(fill);
 try{
  const [a,b]=await Promise.all([getDoc(doc(db,'raffles',code)),getDoc(doc(db,'codes',code))]);
  if(a.exists()||b.exists()){
   er.textContent='โค้ดนี้มีอยู่แล้ว ลองใหม่';
   return
  }
  for(let i=pr.length-1;i>0;i--){
   const j=ri(i+1);
   [pr[i],pr[j]]=[pr[j],pr[i]]
  }
  const ids=pr.map((_,i)=>code+'_'+(i+1));
  for(let i=0;i<tot;i+=100){
   const bt=writeBatch(db);
   for(let k=i;k<Math.min(i+100,tot);k++)bt.set(doc(db,'slots',ids[k]),{code,n:k+1,prize:pr[k]});
   await bt.commit()
  }
  await setDoc(doc(db,'raffles',code),{title:t,desc:d,total:tot,taken:0,next:ids[0],ids:[...ids,'END'],exp:eod(ex),open:true,created:serverTimestamp()});
  await log('สร้างโค้ดสุ่มแจกรางวัล '+code+' ('+tot+' สิทธิ์)');
  toast('สร้างแล้ว: '+code)
 }
 catch(x){
  er.textContent='บันทึกไม่สำเร็จ ('+(x.code||x.message)+')';
  return
 }
 showAdmin()
}

async function tog(id){
 const r=R.find(x=>x.id===id);
 if(!r)return;
 try{
  await updateDoc(doc(db,'raffles',id),{open:!r.open});
  await log((r.open?'ปิดรับ ':'เปิดรับ ')+'โค้ดสุ่ม '+id)
 }catch(e){toast('ทำรายการไม่สำเร็จ')}
 showAdmin()
}

async function setSt(id,s,a){
 const c=CL.find(x=>x.id===id);
 if(!c){toast('ไม่พบรายการ');return}
 try{
  await updateDoc(doc(db,'raffleClaims',id),{status:s,hist:arrayUnion({t:Date.now(),by:(A.getMe()||{}).name||'-',a})});
  if(c.rid){try{await updateDoc(doc(db,'raffleReceipts',c.rid),{status:s})}catch(e){}}
  await log('(สุ่มแจก) '+id+': '+a)
 }catch(e){toast('ทำรายการไม่สำเร็จ')}
 showAdmin()
}

function sent(id){
 ask('ยืนยันส่งรางวัล',`<p>ยืนยันว่าส่งรางวัลของ ${esc(id)} เรียบร้อยแล้ว?</p>`,()=>setSt(id,'sent','เปลี่ยนสถานะเป็น ส่งรางวัลแล้ว'))
}

function cancel(id){
 ask('ยกเลิกรายการ',`<label for="rrs">เหตุผล (จำเป็น)</label><input id="rrs"><p class="mu">รางวัลของรายการนี้จะไม่ถูกแจกให้คนอื่น</p>`,()=>{
  const r=$('#rrs').value.trim();
  if(!r)return false;
  return setSt(id,'cancelled','ยกเลิกรายการ: '+r)
 },'ยกเลิกรายการ')
}

/* ---------- ผูกกับแท็บ ---------- */
const st0=window.setTab;
window.setTab=function(k){act=false;tok++;return typeof st0==='function'?st0.apply(this,arguments):undefined};

window.RF=Object.assign(window.RF||{},{create,tog,setSt,sent,cancel,open:id=>{det=id;showAdmin()},back:()=>{det=null;showAdmin()}});

/* ---------- แนบรูปหลักฐาน ---------- */
const pb=(c,k)=>`<button class="g s" onclick="proofPick('${esc(c.id)}','${esc(c.rid)}','${k}')">${c.hasProof?'เปลี่ยนรูปหลักฐาน':'แนบรูปหลักฐาน'}</button>`+(c.hasProof?`<button class="g s" onclick="proofDel('${esc(c.id)}','${esc(c.rid)}','${k}')">ลบรูป</button>`:'');
window.pb=pb;
const cols=k=>k==='r'?['raffleReceipts','raffleClaims']:['receipts','claims'];
const redo=k=>k==='r'?showAdmin():window.setTab('claims');

function shrink(file){
 return new Promise((ok,no)=>{
  const im=new Image(),u=URL.createObjectURL(file);
  im.onload=()=>{
   let w=im.width,h=im.height;
   const m=900;
   if(Math.max(w,h)>m){
    const z=m/Math.max(w,h);
    w=Math.round(w*z);
    h=Math.round(h*z)
   }
   const c=document.createElement('canvas');
   c.width=w;
   c.height=h;
   c.getContext('2d').drawImage(im,0,0,w,h);
   let q=.7,d=c.toDataURL('image/jpeg',q);
   while(d.length>400000&&q>.3){
    q-=.1;
    d=c.toDataURL('image/jpeg',q)
   }
   URL.revokeObjectURL(u);
   ok(d)
  };
  im.onerror=()=>{URL.revokeObjectURL(u);no(new Error('อ่านรูปไม่ได้'))};
  im.src=u
 })
}

window.proofPick=function(id,rid,k){
 const inp=document.createElement('input');
 inp.type='file';
 inp.accept='image/*';
 inp.onchange=async()=>{
  const f=inp.files[0];
  if(!f)return;
  const [rc,cc]=cols(k);
  try{
   toast('กำลังอัปโหลดรูป...');
   const d=await shrink(f);
   await updateDoc(doc(db,rc,rid),{proof:d,proofAt:serverTimestamp()});
   await updateDoc(doc(db,cc,id),{hasProof:true});
   await log('แนบรูปหลักฐาน '+id);
   toast('แนบรูปแล้ว');
   redo(k)
  }
  catch(e){toast('แนบรูปไม่สำเร็จ ('+(e.code||e.message)+')')}
 };
 inp.click()
};

window.proofDel=function(id,rid,k){
 ask('ลบรูปหลักฐาน','<p>ลบรูปนี้? ผู้เล่นจะไม่เห็นรูปอีก</p>',async()=>{
  const [rc,cc]=cols(k);
  try{
   await updateDoc(doc(db,rc,rid),{proof:deleteField(),proofAt:deleteField()});
   await updateDoc(doc(db,cc,id),{hasProof:false});
   await log('ลบรูปหลักฐาน '+id);
   redo(k)
  }catch(e){toast('ลบรูปไม่สำเร็จ ('+(e.code||e.message)+')')}
 },'ลบ')
};

/* ---------- ล้างรูปเก่า > 7 วัน ---------- */
async function sweep(){
 const cut=Timestamp.fromMillis(Date.now()-7*864e5);
 for(const [rc,cc] of [['receipts','claims'],['raffleReceipts','raffleClaims']]){
  const s=await getDocs(query(collection(db,rc),where('proofAt','<',cut),limit(25)));
  for(const d of s.docs){
   try{
    await updateDoc(d.ref,{proof:deleteField(),proofAt:deleteField()});
    const cid=d.data().claimId;
    if(cid)await updateDoc(doc(db,cc,cid),{hasProof:false}).catch(()=>{})
   }catch(e){}
  }
 }
}

/* ---------- Observer ตัวเดียว: เพิ่มแท็บ + สั่ง sweep ครั้งเดียว ---------- */
let swept=false,pending=false;
new MutationObserver(()=>{
 if(pending)return;
 pending=true;
 requestAnimationFrame(()=>{
  pending=false;
  const me=A.getMe();
  if(!me)return;
  const t=document.querySelector('.tabs');
  if(t&&!t.querySelector('#rftab')){
   const b=document.createElement('button');
   b.id='rftab';
   b.textContent='สุ่มแจกรางวัล';
   b.onclick=showAdmin;
   t.insertBefore(b,t.children[2]||null)
  }
  if(!swept){
   swept=true;
   setTimeout(()=>sweep().catch(e=>console.warn('sweep',e)),10000)
  }
 })
}).observe($('#app'),{childList:true});

}
