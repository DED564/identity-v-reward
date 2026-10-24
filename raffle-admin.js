import {doc,getDoc,getDocs,setDoc,updateDoc,collection,query,orderBy,limit,where,writeBatch,Timestamp,serverTimestamp,arrayUnion} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
const A=window.APP;
if(!A)throw new Error('APP missing');
const {db,$,esc,ms,fd,fdt,toast,ask,log,rnd,SV,SL}=A;
const eod=d=>Timestamp.fromDate(new Date(d+'T23:59:59'));
const ri=n=>{const m=2**32-(2**32%n);let x;do{x=crypto.getRandomValues(new Uint32Array(1))[0]}while(x>=m);return x%n};
const rcode=()=>`RND-${rnd(4)}-${rnd(4)}`;
const dd=d=>({id:d.id,...d.data()});
const rst=r=>!r.open?'ปิดรับ':ms(r.exp)<Date.now()?'หมดอายุ':r.next==='END'?'เต็มแล้ว':'เปิดรับ';
const TA='style="width:100%;min-height:110px;padding:10px 12px;background:var(--sf2);color:var(--tx);border:1px solid var(--ln);border-radius:10px;font:inherit"';
let act=false,det=null,R=[],CL=[],SLT=[];

/* ---------- Admin ---------- */
async function load(){
 R=(await getDocs(query(collection(db,'raffles'),orderBy('created','desc'),limit(100)))).docs.map(dd);
 CL=[];SLT=[];
 if(det){CL=(await getDocs(query(collection(db,'raffleClaims'),where('code','==',det)))).docs.map(dd).sort((a,b)=>ms(b.created)-ms(a.created));
  SLT=(await getDocs(query(collection(db,'slots'),where('code','==',det)))).docs.map(dd)}}
async function showAdmin(){
 act=true;const app=$('#app'),tabs=app.querySelector('.tabs');if(!tabs)return;
 tabs.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x.id==='rftab'));
 while(tabs.nextSibling)tabs.nextSibling.remove();
 const box=document.createElement('div');box.innerHTML='<p class="mu">กำลังโหลด...</p>';app.appendChild(box);
 try{await load()}catch(e){box.innerHTML='<div class="err">โหลดไม่สำเร็จ ('+esc(e.code||e.message)+')</div>';return}
 box.innerHTML=det?detail():listHtml()}
function listHtml(){
 return `<div class="card"><h2 style="margin-top:0">สร้างโค้ดสุ่มแจกรางวัล</h2>
 <label for="rt">ชื่อ</label><input id="rt"><label for="rd">รายละเอียด</label><input id="rd">
 <label for="rx">วันหมดอายุ</label><input id="rx" type="date">
 <label for="rn">จำนวนคนที่ใช้โค้ดได้ (1-300)</label><input id="rn" type="number" inputmode="numeric" min="1" max="300">
 <label for="rp">รางวัล (บรรทัดละ 1 อย่าง ใส่จำนวนด้วย x เช่น กรอบ A x2)</label><textarea id="rp" ${TA}></textarea>
 <label for="rf">รางวัลของช่องที่เหลือ (ถ้ารางวัลน้อยกว่าจำนวนคน)</label><input id="rf" value="รางวัลปลอบใจ">
 <label for="rc">โค้ด (เว้นว่าง = สุ่มให้)</label><input id="rc" class="code">
 <div class="err" id="rerr"></div><button class="full" onclick="RF.create()">สร้างโค้ดสุ่ม</button></div>`+
 (R.map(r=>`<div class="card"><b>${esc(r.title)}</b> <span class="tag ${rst(r)==='เปิดรับ'?'t-unused':'t-expired'}">${rst(r)}</span><p class="code">${esc(r.id)}</p><p class="mu">รับแล้ว ${r.taken}/${r.total} · หมดอายุ ${fd(r.exp)}</p><div class="row"><button class="g s" onclick="RF.open('${r.id}')">ดูรายละเอียด</button><button class="g s" onclick="RF.tog('${r.id}')">${r.open?'ปิดรับ':'เปิดรับ'}</button></div></div>`).join('')||'<p class="mu">ยังไม่มีโค้ดสุ่มแจกรางวัล</p>')}
function detail(){
 const r=R.find(x=>x.id===det)||{id:det,title:'',taken:0,total:0},left={},pm={};
 SLT.forEach(s=>{pm[s.id]=s.prize;if(!s.claimId)left[s.prize]=(left[s.prize]||0)+1});
 return `<button class="g s" onclick="RF.back()">← กลับ</button><h2>${esc(r.title)}</h2><p class="code">${esc(r.id)}</p><p class="mu">รับแล้ว ${r.taken}/${r.total}</p>
 <div class="card"><b>รางวัลที่ยังเหลือ (ห้ามบอกผู้เล่น)</b>${Object.entries(left).map(([k,v])=>`<p>${esc(k)} × ${v}</p>`).join('')||'<p class="mu">ไม่เหลือแล้ว</p>'}</div>`+
 (CL.map(c=>`<div class="card"><div class="kv"><b>รางวัลที่ได้</b><span>${esc(pm[c.slotId]||'-')}</span><b>หมายเลข</b><span class="code">${esc(c.id)}</span><b>เซิร์ฟเวอร์</b><span>${esc(SV[c.server]||'-')}</span><b>UID</b><span>${esc(c.uid)}</span><b>ชื่อในเกม</b><span>${esc(c.name)}</span><b>เวลา</b><span>${fdt(c.created)}</span><b>สถานะ</b><span><span class="tag t-${c.status}">${SL[c.status]}</span></span></div>
 <div class="row" style="margin-top:8px">${c.status==='pending'?`<button class="s" onclick="RF.setSt('${c.id}','review','เปลี่ยนสถานะเป็น กำลังตรวจสอบ')">เริ่มตรวจสอบ</button>`:''}${c.status==='review'?`<button class="s" onclick="RF.sent('${c.id}')">ส่งรางวัลแล้ว</button>`:''}${c.status!=='sent'&&c.status!=='cancelled'?`<button class="d s" onclick="RF.cancel('${c.id}')">ยกเลิกรายการ</button>`:''}</div>
 <p class="mu" style="font-size:13px">${(c.hist||[]).map(h=>`${fdt(h.t)} ${esc(h.by)}: ${esc(h.a)}`).join('<br>')}</p></div>`).join('')||'<p class="mu">ยังไม่มีผู้ใช้โค้ดนี้</p>')}
function parse(txt){const out=[];for(const ln of txt.split('\n')){const s=ln.trim();if(!s)continue;const m=s.match(/^(.*?)\s*[x×*]\s*(\d+)$/i),name=(m?m[1]:s).trim(),n=m?parseInt(m[2]):1;if(!name||n<1)return null;for(let i=0;i<n;i++)out.push(name)}return out}
async function create(){
 const er=$('#rerr'),t=$('#rt').value.trim(),d=$('#rd').value.trim(),ex=$('#rx').value,tot=parseInt($('#rn').value),fill=$('#rf').value.trim()||'รางวัลปลอบใจ',pr=parse($('#rp').value);
 let code=$('#rc').value.trim().toUpperCase();
 if(!t||!ex||!(tot>=1&&tot<=300)||!pr||!pr.length){er.textContent='กรอกชื่อ วันหมดอายุ จำนวนคน (1-300) และรายการรางวัลให้ถูกต้อง';return}
 if(eod(ex).toMillis()<Date.now()){er.textContent='ต้องระบุวันหมดอายุที่ยังมาไม่ถึง';return}
 if(pr.length>tot){er.textContent=`รางวัลรวม ${pr.length} ชิ้น มากกว่าจำนวนคน ${tot} ให้เพิ่มจำนวนคนหรือลดรางวัล`;return}
 if(code&&!/^[A-Z0-9-]{4,30}$/.test(code)){er.textContent='โค้ดใช้ได้เฉพาะ A-Z 0-9 และ - ยาว 4-30 ตัว';return}
 if(!code)code=rcode();
 while(pr.length<tot)pr.push(fill);
 try{
  if((await getDoc(doc(db,'raffles',code))).exists()||(await getDoc(doc(db,'codes',code))).exists()){er.textContent='โค้ดนี้มีอยู่แล้ว ลองใหม่';return}
  for(let i=pr.length-1;i>0;i--){const j=ri(i+1);[pr[i],pr[j]]=[pr[j],pr[i]]}
  const ids=pr.map((_,i)=>code+'_'+(i+1));
  for(let i=0;i<tot;i+=100){const b=writeBatch(db);for(let k=i;k<Math.min(i+100,tot);k++)b.set(doc(db,'slots',ids[k]),{code,n:k+1,prize:pr[k]});await b.commit()}
  await setDoc(doc(db,'raffles',code),{title:t,desc:d,total:tot,taken:0,next:ids[0],ids:[...ids,'END'],exp:eod(ex),open:true,created:serverTimestamp()});
  await log('สร้างโค้ดสุ่มแจกรางวัล '+code+' ('+tot+' สิทธิ์)');toast('สร้างแล้ว: '+code)}
 catch(x){er.textContent='บันทึกไม่สำเร็จ ('+(x.code||x.message)+')';return}
 showAdmin()}
async function tog(id){const r=R.find(x=>x.id===id);try{await updateDoc(doc(db,'raffles',id),{open:!r.open});await log((r.open?'ปิดรับ ':'เปิดรับ ')+'โค้ดสุ่ม '+id)}catch(e){toast('ทำรายการไม่สำเร็จ')}showAdmin()}
async function setSt(id,s,a){const c=CL.find(x=>x.id===id);
 try{await updateDoc(doc(db,'raffleClaims',id),{status:s,hist:arrayUnion({t:Date.now(),by:A.getMe().name,a})});
  try{await updateDoc(doc(db,'raffleReceipts',c.rid),{status:s})}catch(e){}
  await log('(สุ่มแจก) '+id+': '+a)}catch(e){toast('ทำรายการไม่สำเร็จ')}
 showAdmin()}
function sent(id){ask('ยืนยันส่งรางวัล',`<p>ยืนยันว่าส่งรางวัลของ ${esc(id)} เรียบร้อยแล้ว?</p>`,()=>setSt(id,'sent','เปลี่ยนสถานะเป็น ส่งรางวัลแล้ว'))}
function cancel(id){ask('ยกเลิกรายการ',`<label for="rrs">เหตุผล (จำเป็น)</label><input id="rrs"><p class="mu">รางวัลของรายการนี้จะไม่ถูกแจกให้คนอื่น</p>`,()=>{const r=$('#rrs').value.trim();if(!r)return false;return setSt(id,'cancelled','ยกเลิกรายการ: '+r)},'ยกเลิกรายการ')}
const st0=window.setTab;
window.setTab=function(k){act=false;return st0(k)};
new MutationObserver(()=>{const t=document.querySelector('.tabs');
 if(t&&!t.querySelector('#rftab')&&A.getMe()){act=false;const b=document.createElement('button');b.id='rftab';b.textContent='สุ่มแจกรางวัล';b.onclick=showAdmin;t.insertBefore(b,t.children[2]||null)}
}).observe($('#app'),{childList:true});
window.RF=Object.assign(window.RF||{},{create,tog,setSt,sent,cancel,open:id=>{det=id;showAdmin()},back:()=>{det=null;showAdmin()}});
