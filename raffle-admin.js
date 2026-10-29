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
 app.appendChild(box);eDoc(doc(db,cc,id),{hasProof:false});
  await log('ลบรูปหลักฐาน '+id);
  redo(k)
 },'ลบ')
};

async function sweep(){
 const cut=Timestamp.fromMillis(Date.now()-7*864e5);
 for(const [rc,cc] of [['receipts','claims'],['raffleReceipts','raffleClaims']]){
  const s=await getDocs(query(collection(db,rc),where('proofAt','<',cut)));
  for(const d of s.docs){
   await updateDoc(d.ref,{proof:deleteField(),proofAt:deleteField()});
   try{await updateDoc(doc(db,cc,d.data().claimId),{hasProof:false})}catch(e){}
  }
 }
}
let swept=false;
new MutationObserver(()=>{
 if(!swept&&A.getMe()){
  swept=true;
  sweep().catch(()=>{})
 }
}).observe($('#app'),{childList:true});
