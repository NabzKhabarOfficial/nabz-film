const FALLBACK=window.NABZ_DATA||[];
const $=s=>document.querySelector(s);
const grid=$("#catalog"),search=$("#search"),type=$("#type"),genre=$("#genre"),sort=$("#sort"),count=$("#count"),modal=$("#modal"),detail=$("#detail"),hero=$("#hero");
let data=[], activeGenre="";

const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const img=v=>v||"";
function normalize(x){
  return {...x,fa:x.fa||x.title||"بدون عنوان",genres:Array.isArray(x.genres)?x.genres:(Array.isArray(x.genre)?x.genre:[])};
}
function setupGenres(){
  const gs=[...new Set(data.flatMap(x=>x.genres||[]))].filter(Boolean).sort((a,b)=>a.localeCompare(b,"fa"));
  genre.innerHTML='<option value="">همه ژانرها</option>'+gs.map(g=>'<option value="'+esc(g)+'">'+esc(g)+'</option>').join("");
  const chips=$("#genreChips");
  chips.innerHTML=gs.slice(0,12).map(g=>'<button class="chip" data-genre="'+esc(g)+'">'+esc(g)+'</button>').join("");
}
function setHero(){
  const x=data[0]; if(!x)return;
  hero.style.backgroundImage=x.backdrop?'linear-gradient(90deg,rgba(5,7,12,.98) 8%,rgba(5,7,12,.78) 48%,rgba(5,7,12,.2)),url("'+x.backdrop+'")':'';
  $("#heroType").textContent=x.type==="movie"?"فیلم":"سریال";
  $("#heroTitle").textContent=x.fa;
  $("#heroOverview").textContent=x.overview||"برای این عنوان توضیحی ثبت نشده است.";
  $("#heroRating").textContent="★ "+(x.rating||"—");
  $("#heroYear").textContent=x.year||"—";
  $("#heroBtn").onclick=()=>openDetail(x);
}
function card(x){
  return '<article class="card" data-id="'+esc(x.id)+'"><div class="poster-wrap"><img loading="lazy" src="'+esc(img(x.poster))+'" alt="'+esc(x.fa)+'"><span class="rating">★ '+esc(x.rating||"—")+'</span><span class="type">'+(x.type==="movie"?"فیلم":"سریال")+'</span></div><div class="info"><h3>'+esc(x.fa)+'</h3><p>'+esc(x.year||"—")+' • '+esc((x.genres||[]).slice(0,2).join("، "))+'</p></div></article>';
}
function render(){
  const q=search.value.trim().toLocaleLowerCase("fa");
  let list=data.filter(x=>(type.value==="all"||x.type===type.value)&&(!genre.value||x.genres.includes(genre.value))&&(!q||(x.fa+" "+x.title).toLocaleLowerCase("fa").includes(q)));
  if(sort.value==="rating")list.sort((a,b)=>(b.rating||0)-(a.rating||0));
  if(sort.value==="year")list.sort((a,b)=>(b.year||0)-(a.year||0));
  if(sort.value==="az")list.sort((a,b)=>a.fa.localeCompare(b.fa,"fa"));
  grid.innerHTML=list.length?list.map(card).join(""):'<div class="empty">نتیجه‌ای پیدا نشد. عبارت دیگری امتحان کن.</div>';
  count.textContent=list.length+" عنوان";
}
function openDetail(x){
  const cast=(x.cast||[]).map(p=>'<div class="cast"><img src="'+esc(p.photo||"https://via.placeholder.com/185x278?text=%E2%98%85")+'" alt="'+esc(p.name)+'"><span>'+esc(p.name)+'</span><small>'+esc(p.character)+'</small></div>').join("");
  const facts=[];
  if(x.year)facts.push("📅 "+x.year);
  if(x.rating)facts.push("⭐ "+x.rating);
  if(x.runtime)facts.push("⏱ "+x.runtime+" دقیقه");
  if(x.seasons)facts.push("📺 "+x.seasons+" فصل");
  if(x.episodes)facts.push("🎞 "+x.episodes+" قسمت");
  detail.innerHTML='<button class="close" aria-label="بستن">×</button><div class="detail-hero" style="background-image:linear-gradient(0deg,#0c1019 0%,rgba(12,16,25,.5) 55%,rgba(12,16,25,.15)),url("'+esc(x.backdrop||x.poster)+'")"></div><div class="detail-body"><div class="detail-poster"><img src="'+esc(x.poster)+'" alt="'+esc(x.fa)+'"></div><div class="detail-copy"><span class="eyebrow">'+(x.type==="movie"?"فیلم":"سریال")+'</span><h2>'+esc(x.fa)+'</h2><p class="en">'+esc(x.title||"")+'</p><div class="facts">'+facts.map(f=>'<span>'+esc(f)+'</span>').join("")+'</div><div class="genre-line">'+esc((x.genres||[]).join(" • "))+'</div><p class="overview">'+esc(x.overview||"توضیحی برای این عنوان ثبت نشده است.")+'</p><div class="detail-actions">'+(x.trailer?'<a class="btn" target="_blank" rel="noopener" href="https://www.youtube.com/watch?v='+esc(x.trailer)+'">▶ تریلر</a>':'')+'<a class="btn secondary" target="_blank" rel="noopener" href="'+esc(x.tmdb_url||("https://www.themoviedb.org/"+(x.type==="movie"?"movie/":"tv/")+x.id))+'">TMDB ↗</a></div></div></div><div class="cast-section"><h3>بازیگران</h3><div class="cast-grid">'+cast+'</div></div><div class="legal-note">اطلاعات این صفحه از TMDB تهیه شده است. نبض فیلم برای تماشای اثر، فقط منابع قانونی و دارای مجوز را معرفی خواهد کرد.</div>';
  modal.classList.add("show");document.body.classList.add("locked");
}
grid.addEventListener("click",e=>{const c=e.target.closest(".card");if(c){const x=data.find(a=>String(a.id)===String(c.dataset.id));if(x)openDetail(x)}});
modal.addEventListener("click",e=>{if(e.target===modal||e.target.closest(".close")){modal.classList.remove("show");document.body.classList.remove("locked")}});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){modal.classList.remove("show");document.body.classList.remove("locked")}});
[search,type,genre,sort].forEach(x=>x.addEventListener("input",render));
$("#genreChips").addEventListener("click",e=>{const b=e.target.closest(".chip");if(!b)return;genre.value=b.dataset.genre;render();$("#catalog").scrollIntoView({behavior:"smooth"})});
$("#allGenres").addEventListener("click",()=>{genre.value="";render();$("#catalog").scrollIntoView({behavior:"smooth"})});
function loadStats(){ $("#movieCount").textContent=data.filter(x=>x.type==="movie").length; $("#seriesCount").textContent=data.filter(x=>x.type==="series").length; $("#genreCount").textContent=new Set(data.flatMap(x=>x.genres||[])).size; }
async function loadCatalog(){
  try{
    const r=await fetch("catalog.json?v="+Date.now(),{cache:"no-store"}); if(!r.ok)throw Error(r.status);
    const remote=await r.json(); if(!Array.isArray(remote)||!remote.length)throw Error("empty");
    data=remote.map(normalize);
  }catch(e){data=FALLBACK.map(normalize)}
  data.sort((a,b)=>(b.rating||0)-(a.rating||0)); setHero(); setupGenres(); loadStats(); render();
}
loadCatalog();