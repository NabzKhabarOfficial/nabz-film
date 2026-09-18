const FALLBACK=window.NABZ_DATA||[];
const GENRES={28:"اکشن",12:"ماجراجویی",16:"انیمیشن",35:"کمدی",80:"جنایی",99:"مستند",18:"درام",10751:"خانوادگی",14:"فانتزی",36:"تاریخی",27:"ترسناک",10402:"موسیقی",9648:"معمایی",10749:"عاشقانه",878:"علمی‌تخیلی",10770:"فیلم تلویزیونی",53:"هیجان‌انگیز",10752:"جنگی",37:"وسترن",10759:"اکشن و ماجراجویی",10765:"علمی‌تخیلی و فانتزی",10768:"جنگ و سیاست"};
const GNAME={"Action":"اکشن","Adventure":"ماجراجویی","Animation":"انیمیشن","Comedy":"کمدی","Crime":"جنایی","Documentary":"مستند","Drama":"درام","Family":"خانوادگی","Fantasy":"فانتزی","History":"تاریخی","Horror":"ترسناک","Music":"موسیقی","Mystery":"معمایی","Romance":"عاشقانه","Science Fiction":"علمی‌تخیلی","Thriller":"هیجان‌انگیز","War":"جنگی","Western":"وسترن","Action & Adventure":"اکشن و ماجراجویی","Sci-Fi & Fantasy":"علمی‌تخیلی و فانتزی","War & Politics":"جنگ و سیاست","TV Movie":"فیلم تلویزیونی"};
const $=s=>document.querySelector(s),esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const grid=$("#catalogGrid"),topGrid=$("#topGrid"),search=$("#search"),catalogSearch=$("#catalogSearch"),type=$("#type"),genre=$("#genre"),sort=$("#sort"),modal=$("#modal"),detail=$("#detail"),hero=$("#hero");
let data=[],shown=18,onlyFav=false;
const favKey="nabzfilm:favorites";
const getFav=()=>{try{return JSON.parse(localStorage.getItem(favKey)||"[]")}catch{return[]}};
const setFav=a=>{localStorage.setItem(favKey,JSON.stringify(a));updateFavUI()};
function updateFavUI(){const n=getFav().length;$("#favCount").textContent=n;$("#favStat").textContent=n}
function toggleFav(id,e){if(e)e.stopPropagation();let a=getFav(),s=String(id);a=a.includes(s)?a.filter(x=>x!==s):[...a,s];setFav(a);render();renderTop()}
function normalize(x){
 const ids=Array.isArray(x.genre_ids)?x.genre_ids:[];
 const raw=Array.isArray(x.genres)?x.genres:(Array.isArray(x.genre)?x.genre:ids.map(id=>GENRES[id]||"سایر"));
 return {...x,fa:x.fa||x.title||"بدون عنوان",genres:raw.map(g=>GNAME[g]||g)};
}
function setupGenres(){
 const gs=[...new Set(data.flatMap(x=>x.genres||[]))].filter(Boolean).sort((a,b)=>a.localeCompare(b,"fa"));
 genre.innerHTML='<option value="">همه ژانرها</option>'+gs.map(g=>'<option value="'+esc(g)+'">'+esc(g)+'</option>').join("");
 const html=gs.slice(0,16).map(g=>'<button class="chip" data-genre="'+esc(g)+'">'+esc(g)+'</button>').join("");
 $("#genreChips").innerHTML=html;$("#genreChips2").innerHTML=html;
}
function setHero(){
 const x=data[0];if(!x)return;
 hero.style.backgroundImage=x.backdrop?'url("'+x.backdrop+'")':"";
 $("#heroType").textContent=x.type==="movie"?"فیلم":"سریال";$("#heroTitle").textContent=x.fa;
 $("#heroRating").textContent="★ "+(x.rating||"—");$("#heroYear").textContent=x.year||"—";
 $("#heroGenres").textContent=(x.genres||[]).slice(0,3).join(" • ");
 $("#heroOverview").textContent=x.overview||"برای این عنوان خلاصه‌ای ثبت نشده است.";
 $("#heroBtn").onclick=()=>openDetail(x);
}
function card(x){
 const fav=getFav().includes(String(x.id));
 return '<article class="card" data-id="'+esc(x.id)+'"><div class="poster"><img loading="lazy" src="'+esc(x.poster||"")+'" alt="'+esc(x.fa)+'"><span class="badge rate">★ '+esc(x.rating||"—")+'</span><span class="badge kind">'+(x.type==="movie"?"فیلم":"سریال")+'</span><button class="fav '+(fav?"on":"")+'" data-fav="'+esc(x.id)+'" aria-label="علاقه‌مندی">'+(fav?"♥":"♡")+'</button></div><div class="info"><h3>'+esc(x.fa)+'</h3><p>'+esc(x.year||"—")+' • '+esc((x.genres||[]).slice(0,2).join("، "))+'</p></div></article>';
}
function filtered(){
 const q=(search.value+" "+catalogSearch.value).trim().toLocaleLowerCase("fa"),fq=search.value.trim().toLocaleLowerCase("fa");
 let list=data.filter(x=>{
  const text=(x.fa+" "+x.title).toLocaleLowerCase("fa");
  return (type.value==="all"||type.value==="favorite"||x.type===type.value)&&(!genre.value||(x.genres||[]).includes(genre.value))&&(!q||text.includes(q)||!fq&&text.includes(catalogSearch.value.trim().toLocaleLowerCase("fa")))&&(type.value!=="favorite"||getFav().includes(String(x.id)));
 });
 if(sort.value==="rating")list.sort((a,b)=>(b.rating||0)-(a.rating||0));
 if(sort.value==="year")list.sort((a,b)=>(b.year||0)-(a.year||0));
 if(sort.value==="az")list.sort((a,b)=>a.fa.localeCompare(b.fa,"fa"));
 return list;
}
function render(){
 const list=filtered(),view=list.slice(0,shown);
 grid.innerHTML=view.length?view.map(card).join(""):'<div class="empty">نتیجه‌ای پیدا نشد.</div>';
 $("#count").textContent=list.length+" عنوان";$("#loadMore").style.display=shown<list.length?"inline-flex":"none";
}
function renderTop(){topGrid.innerHTML=[...data].sort((a,b)=>(b.rating||0)-(a.rating||0)).slice(0,6).map(card).join("")}
function openDetail(x){
 const cast=(x.cast||[]).map(p=>'<div class="cast"><img loading="lazy" src="'+esc(p.photo||"")+'" alt="'+esc(p.name)+'"><span>'+esc(p.name)+'</span><small>'+esc(p.character||"")+'</small></div>').join("");
 const facts=[];if(x.year)facts.push("📅 "+x.year);if(x.rating)facts.push("⭐ "+x.rating);if(x.runtime)facts.push("⏱ "+x.runtime+" دقیقه");if(x.seasons)facts.push("📺 "+x.seasons+" فصل");if(x.episodes)facts.push("🎞 "+x.episodes+" قسمت");
 detail.innerHTML='<button class="close" aria-label="بستن">×</button><div class="detail-cover" style="background-image:linear-gradient(0deg,#0b0f17,transparent),url("'+esc(x.backdrop||x.poster||"")+'")"></div><div class="detail"><div class="detail-poster"><img src="'+esc(x.poster||"")+'" alt="'+esc(x.fa)+'"></div><div class="copy"><span class="eyebrow">'+(x.type==="movie"?"فیلم":"سریال")+'</span><h2>'+esc(x.fa)+'</h2><p class="en">'+esc(x.title||"")+'</p><div class="facts">'+facts.map(f=>"<span>"+esc(f)+"</span>").join("")+'</div><div class="genres">'+esc((x.genres||[]).join(" • "))+'</div><p class="overview">'+esc(x.overview||"توضیحی ثبت نشده است.")+'</p><div class="detail-actions">'+(x.trailer?'<a class="btn" target="_blank" rel="noopener" href="https://www.youtube.com/watch?v='+esc(x.trailer)+'">▶ تریلر</a>':"")+'<a class="btn secondary" target="_blank" rel="noopener" href="'+esc(x.tmdb_url||"https://www.themoviedb.org/")+'">اطلاعات و تماشا ↗</a><button class="btn ghost" data-detail-fav="'+esc(x.id)+'">'+(getFav().includes(String(x.id))?"♥ حذف از علاقه‌مندی":"♡ افزودن به علاقه‌مندی")+'</button></div></div></div><div class="cast-section"><h3>بازیگران</h3><div class="cast-grid">'+(cast||"<span>اطلاعات بازیگران موجود نیست.</span>")+'</div></div><div class="note">اطلاعات این صفحه از TMDB تهیه شده است. نبض فیلم لینک غیرمجاز دانلود یا تماشای آثار ارائه نمی‌کند. برای اطلاعات مربوط به در دسترس بودن قانونی اثر، از صفحه TMDB استفاده کنید.</div>';
 modal.classList.add("show");modal.setAttribute("aria-hidden","false");document.body.classList.add("lock");location.hash="title-"+x.type+"-"+x.id;
}
function closeModal(){modal.classList.remove("show");modal.setAttribute("aria-hidden","true");document.body.classList.remove("lock");if(location.hash.startsWith("#title-"))history.replaceState(null,"",location.pathname+location.search)}
grid.addEventListener("click",e=>{const f=e.target.closest("[data-fav]");if(f)return toggleFav(f.dataset.fav,e);const c=e.target.closest(".card");if(c){const x=data.find(a=>String(a.id)===String(c.dataset.id));if(x)openDetail(x)}});
topGrid.addEventListener("click",e=>{const f=e.target.closest("[data-fav]");if(f)return toggleFav(f.dataset.fav,e);const c=e.target.closest(".card");if(c){const x=data.find(a=>String(a.id)===String(c.dataset.id));if(x)openDetail(x)}});
detail.addEventListener("click",e=>{const b=e.target.closest("[data-detail-fav]");if(b){toggleFav(b.dataset.detailFav);b.textContent=getFav().includes(String(b.dataset.detailFav))?"♥ حذف از علاقه‌مندی":"♡ افزودن به علاقه‌مندی"}if(e.target.closest(".close"))closeModal()});
modal.addEventListener("click",e=>{if(e.target===modal)closeModal()});document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});
[search,catalogSearch,type,genre,sort].forEach(el=>el.addEventListener("input",()=>{shown=18;render()}));
$("#loadMore").onclick=()=>{shown+=18;render()};
function chooseGenre(g){genre.value=g;shown=18;render();document.querySelector("#catalog").scrollIntoView({behavior:"smooth"})}
["#genreChips","#genreChips2"].forEach(id=>$(id).addEventListener("click",e=>{const b=e.target.closest("[data-genre]");if(b)chooseGenre(b.dataset.genre)}));
$("#allGenres").onclick=()=>chooseGenre("");
$("#favNav").onclick=()=>{type.value="favorite";shown=18;render();document.querySelector("#catalog").scrollIntoView({behavior:"smooth"})};
function stats(){$("#movieCount").textContent=data.filter(x=>x.type==="movie").length;$("#seriesCount").textContent=data.filter(x=>x.type==="series").length;$("#genreCount").textContent=new Set(data.flatMap(x=>x.genres||[])).size;updateFavUI()}
async function load(){
 try{const r=await fetch("catalog.json?v="+Date.now(),{cache:"no-store"});if(!r.ok)throw Error(r.status);const j=await r.json();if(!Array.isArray(j)||!j.length)throw Error("empty");data=j.map(normalize)}catch{data=FALLBACK.map(normalize)}
 data.sort((a,b)=>(b.rating||0)-(a.rating||0));setupGenres();stats();setHero();render();renderTop();
 const m=location.hash.match(/^#title-(movie|series)-(.+)$/);if(m){const x=data.find(a=>a.type===m[1]&&String(a.id)===m[2]);if(x)openDetail(x)}
}
load();