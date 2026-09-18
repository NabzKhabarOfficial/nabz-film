const FALLBACK=window.NABZ_DATA||[];
const GENRES={28:"اکشن",12:"ماجراجویی",16:"انیمیشن",35:"کمدی",80:"جنایی",99:"مستند",18:"درام",10751:"خانوادگی",14:"فانتزی",36:"تاریخی",27:"ترسناک",10402:"موسیقی",9648:"معمایی",10749:"عاشقانه",878:"علمی‌تخیلی",10770:"فیلم تلویزیونی",53:"هیجان‌انگیز",10752:"جنگی",37:"وسترن",10759:"اکشن و ماجراجویی",10765:"علمی‌تخیلی و فانتزی",10768:"جنگ و سیاست"};
const $=s=>document.querySelector(s),grid=$("#catalog"),search=$("#search"),type=$("#type"),genre=$("#genre"),sort=$("#sort"),count=$("#count"),modal=$("#modal"),detail=$("#detail");
let data=[];

function normalize(x){
  const ids=Array.isArray(x.genre_ids)?x.genre_ids:[];
  const genres=Array.isArray(x.genre)?x.genre:(Array.isArray(x.genres)?x.genres:ids.map(id=>GENRES[id]||"سایر"));
  return {...x,fa:x.fa||x.title||"بدون عنوان",genre:genres};
}
function setupGenres(){
  const gs=[...new Set(data.flatMap(x=>x.genre||[]))].filter(Boolean).sort((a,b)=>a.localeCompare(b,"fa"));
  genre.innerHTML='<option value="">همه ژانرها</option>'+gs.map(g=>'<option value="'+g+'">'+g+'</option>').join("");
}
function card(x){
  return '<article class="card" data-id="'+x.id+'"><div class="poster-wrap"><img loading="lazy" src="'+x.poster+'" alt="'+x.fa+'"><span class="rating">★ '+(x.rating||"—")+'</span><span class="type">'+(x.type==="movie"?"فیلم":"سریال")+'</span></div><div class="info"><h3>'+x.fa+'</h3><p>'+x.year+' • '+(x.genre||[]).slice(0,2).join("، ")+'</p></div></article>';
}
function render(){
  let q=search.value.trim().toLowerCase();
  let list=data.filter(x=>(type.value==="all"||x.type===type.value)&&(!genre.value||x.genre.includes(genre.value))&&(!q||(x.fa+" "+x.title).toLowerCase().includes(q)));
  if(sort.value==="rating")list.sort((a,b)=>(b.rating||0)-(a.rating||0));
  if(sort.value==="year")list.sort((a,b)=>(b.year||0)-(a.year||0));
  if(sort.value==="az")list.sort((a,b)=>a.fa.localeCompare(b.fa,"fa"));
  grid.innerHTML=list.length?list.map(card).join(""):'<div class="empty">نتیجه‌ای پیدا نشد.</div>';
  count.textContent=list.length+" عنوان";
}
grid.addEventListener("click",e=>{
  const c=e.target.closest(".card"); if(!c)return;
  const x=data.find(a=>String(a.id)===String(c.dataset.id)); if(!x)return;
  detail.innerHTML='<button class="close" aria-label="بستن">×</button><div class="detail"><img src="'+x.poster+'" alt="'+x.fa+'"><div><span class="eyebrow">'+(x.type==="movie"?"فیلم":"سریال")+' • '+x.year+'</span><h2>'+x.fa+'</h2><p class="en">'+(x.title||"")+'</p><div class="meta"><b>★ '+(x.rating||"—")+'</b><span>'+x.genre.join(" • ")+'</span></div><p class="overview">'+(x.overview||"برای این عنوان هنوز توضیح فارسی ثبت نشده است.")+'</p><div class="notice">اطلاعات و پوستر این عنوان از TMDB تهیه می‌شود. برای تماشای اثر، فقط منابع قانونی و دارای مجوز در سایت اضافه خواهند شد.</div><a class="tmdb" href="https://www.themoviedb.org/'+(x.type==="movie"?"movie/":"tv/")+x.id+'" target="_blank" rel="noopener">مشاهده در TMDB ↗</a></div></div>';
  modal.classList.add("show");
});
modal.addEventListener("click",e=>{if(e.target===modal||e.target.closest(".close"))modal.classList.remove("show")});
[search,type,genre,sort].forEach(x=>x.addEventListener("input",render));

async function loadCatalog(){
  try{
    const res=await fetch("catalog.json?v="+Date.now(),{cache:"no-store"});
    if(!res.ok)throw new Error("catalog "+res.status);
    const remote=await res.json();
    if(!Array.isArray(remote)||!remote.length)throw new Error("empty catalog");
    data=remote.map(normalize);
  }catch(err){
    console.warn("catalog.json unavailable; using fallback data.js",err);
    data=FALLBACK.map(normalize);
  }
  setupGenres();
  render();
}
loadCatalog();