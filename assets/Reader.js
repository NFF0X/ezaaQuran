const N=+document.body.dataset.s;
const API="https://api.quran.com/api/v4/",FILES="https://verses.quran.foundation/";
const $=id=>document.getElementById(id);
const wordsBox=$("words"),badge=$("ayahBadge"),repeatBtn=$("repeatBtn"),dots=$("dots"),seekEl=$("seek"),timeEl=$("time"),sel=$("ayahSel"),note=$("note"),playBtn=$("playBtn");
$("title").textContent="مجوّد - سورة "+SURAHS[N-1];
document.title="سورة "+SURAHS[N-1]+" - المنشاوي";
const strip=s=>s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g,"");
const arn=n=>String(n).replace(/\d/g,d=>"٠١٢٣٤٥٦٧٨٩"[d]);
const fail=m=>{note.style.display="block";note.textContent=m};

let AYAT=[],URLS=[],cur=-1,words=[],repeatOn=false,ai=0,advFrom=-2,primed=false,dragging=false;
const A=[new Audio(),new Audio()],loaded=[-1,-1];
A.forEach(a=>{a.preload="auto"});
const act=()=>A[ai];
const nextK=k=>repeatOn?k:(k+1<AYAT.length?k+1:-1);
function prep(i,k){if(k<0){loaded[i]=-1;return}if(loaded[i]!==k){A[i].src=URLS[k];A[i].load();loaded[i]=k}}
function seek(a,t){if(a.readyState>=1)a.currentTime=t;else a.addEventListener("loadedmetadata",()=>{a.currentTime=t},{once:true})}
function setBtn(){const a=act();playBtn.textContent=(a.ended&&nextK(cur)<0)?"↻ إعادة":a.paused?"▶ تشغيل":"⏸ إيقاف"}

async function load(){
  const [t,rr]=await Promise.all([
    fetch("https://api.alquran.cloud/v1/surah/"+N+"/quran-uthmani").then(r=>r.json()),
    fetch(API+"resources/recitations").then(r=>r.json())]);
  AYAT=t.data.ayahs.map(a=>a.text);
  if(N!==1&&N!==9)AYAT[0]=AYAT[0].split(" ").slice(4).join(" ");
  const rec=rr.recitations.find(x=>/minshaw/i.test(x.reciter_name)&&/mujawwad/i.test(x.style||""))||{id:8};
  let files=[],p=1;
  do{const f=await fetch(`${API}recitations/${rec.id}/by_chapter/${N}?per_page=50&page=${p}`).then(r=>r.json());
     files=files.concat(f.audio_files);p=f.pagination&&f.pagination.next_page}while(p);
  URLS=files.sort((a,b)=>+a.verse_key.split(":")[1]-+b.verse_key.split(":")[1]).map(a=>/^https?:/.test(a.url)?a.url:FILES+a.url);
  if(URLS.length!==AYAT.length)fail("عدد ملفات الصوت لا يطابق عدد الآيات.");
  if(AYAT.length<=30)AYAT.forEach((_,k)=>{const d=document.createElement("button");d.className="dot";d.textContent=k+1;d.onclick=()=>goTo(k,0,true);dots.appendChild(d)});
  AYAT.forEach((_,k)=>{const o=document.createElement("option");o.value=k;o.textContent="الآية "+arn(k+1);sel.appendChild(o)});
  goTo(0,0,false);
}
function goTo(k,off,play){
  k=Math.max(0,Math.min(k,AYAT.length-1));
  A[1-ai].pause();
  if(loaded[ai]!==k){if(loaded[1-ai]===k)ai=1-ai;else prep(ai,k)}
  const a=act();a.pause();
  if(off)seek(a,off);else if(a.readyState>=1)a.currentTime=0;
  cur=k;advFrom=-2;
  showAyah(k);
  if(play)a.play().catch(()=>{});
  setBtn();
}
function advance(){
  if(advFrom===cur)return;advFrom=cur;
  const nk=nextK(cur);if(nk<0)return;
  const from=cur,bi=1-ai,b=A[bi];prep(bi,nk);
  const go=()=>{
    if(cur!==from)return;
    const old=A[ai],oi=ai;
    b.currentTime=0;b.play().catch(()=>{});
    ai=bi;cur=nk;advFrom=-2;showAyah(nk);setBtn();
    setTimeout(()=>{if(ai!==oi)old.pause()},250);
  };
  b.readyState>=3?go():b.addEventListener("canplay",go,{once:true});
}
function showAyah(k){
  badge.textContent=`الآية ${arn(k+1)} / ${arn(AYAT.length)}`;
  document.querySelectorAll(".dot").forEach((d,i)=>{d.classList.toggle("on",i===k);d.classList.toggle("done",i<k)});
  seekEl.value=0;timeEl.textContent="";sel.value=k;wordsBox.innerHTML="";words=[];
  AYAT[k].split(" ").forEach((w,i)=>{const s=document.createElement("span");s.className="word";s.textContent=w;
    s.onclick=()=>{if(words[i])act().currentTime=words[i].start;act().play().catch(()=>{})};wordsBox.appendChild(s)});
}
function setWords(dur){
  const els=[...wordsBox.children];if(!els.length)return;
  const w=els.map(e=>Math.max(strip(e.textContent).length,1)),tot=w.reduce((x,y)=>x+y,0);let t=0;
  words=els.map((el,i)=>{const len=dur*w[i]/tot,o={el,start:t,end:t+len};t+=len;return o});
}
A.forEach((a,i)=>{
  a.addEventListener("ended",()=>{if(i===ai){if(nextK(cur)>=0)advance();setBtn()}});
  a.addEventListener("play",setBtn);a.addEventListener("pause",setBtn);
  a.addEventListener("error",()=>{if(a.getAttribute("src"))fail("تعذّر تحميل صوت الآية.")});
});
(function loop(){
  const a=act();
  if(cur>=0&&isFinite(a.duration)&&a.duration>0){
    if(!words.length&&loaded[ai]===cur)setWords(a.duration);
    if(!a.paused){const rem=a.duration-a.currentTime;if(rem<=2)prep(1-ai,nextK(cur));if(rem<0.08)advance()}   // تحميل الآية الجاية قبلها بثانيتين   // نبدأ الجاية قبل النهاية بلحظة
    const t=a.currentTime;
    words.forEach(w=>{w.el.classList.toggle("now",t>=w.start&&t<w.end);w.el.classList.toggle("said",t>=w.end)});
    if(!dragging)seekEl.value=Math.min(1000,t/a.duration*1000);
    timeEl.textContent=fmt(t)+" / "+fmt(a.duration);
  }
  requestAnimationFrame(loop)})();
playBtn.onclick=()=>{
  const a=act();
  if(!primed){primed=true;const b=A[1-ai];if(b.getAttribute("src")){b.muted=true;b.play().then(()=>{b.pause();b.muted=false}).catch(()=>{b.muted=false})}}
  if(a.ended&&nextK(cur)<0)goTo(0,0,true);else a.paused?a.play().catch(()=>{}):a.pause();
};
$("vol").oninput=e=>A.forEach(a=>{a.volume=+e.target.value});
$("prevBtn").onclick=()=>goTo(cur-1,0,!act().paused);
$("nextBtn").onclick=()=>goTo(cur+1,0,!act().paused);
repeatBtn.onclick=()=>{repeatOn=!repeatOn;repeatBtn.classList.toggle("active",repeatOn);repeatBtn.textContent="🔁 تكرار الآية: "+(repeatOn?"تشغيل":"إيقاف")};
const fmt=s=>arn(Math.floor(s/60)+":"+String(Math.floor(s%60)).padStart(2,"0"));
seekEl.oninput=()=>{dragging=true;const a=act();if(isFinite(a.duration)){a.currentTime=seekEl.value/1000*a.duration;advFrom=-2}};
seekEl.onchange=()=>{dragging=false};
seekEl.addEventListener("pointerup",()=>{dragging=false});
sel.onchange=()=>goTo(+sel.value,0,true);
load().catch(()=>fail("تعذّر تحميل البيانات (تأكد من اتصال الإنترنت)."));
