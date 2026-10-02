/* NABZ FILM v2 — single-page app (hash router, no build step). */
(()=>{"use strict";
const IMG="https://image.tmdb.org/t/p/",CHANNEL="https://t.me/NabzKhabarOfficial",SITE=location.origin+location.pathname.replace(/index\.html$/,"");
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const norm=s=>String(s||"").replace(/\u200c/g," ").replace(/ي/g,"ی").replace(/ك/g,"ک").toLowerCase().replace(/\s+/g," ").trim();
const fa=n=>String(n).replace(/\d/g,d=>"۰۱۲۳۴۵۶۷۸۹"[d]);
const img=(p,s)=>!p?"":(p.startsWith("http")?p:IMG+s+p);
const GN={"Action":"اکشن","Adventure":"ماجراجویی","Animation":"انیمیشن","Comedy":"کمدی","Crime":"جنایی","Documentary":"مستند","Drama":"درام","Family":"خانوادگی","Fantasy":"فانتزی","History":"تاریخی","Horror":"ترسناک","Music":"موسیقی","Mystery":"معمایی","Romance":"عاشقانه","Science Fiction":"علمی‌تخیلی","Thriller":"هیجان‌انگیز","War":"جنگی","Western":"وسترن","Action & Adventure":"اکشن","Sci-Fi & Fantasy":"علمی‌تخیلی","War & Politics":"جنگی","اکشن و ماجراجویی":"اکشن","علمی‌تخیلی و فانتزی":"علمی‌تخیلی","جنگ و سیاست":"جنگی"};
const REG={US:"🇺🇸 آمریکا",GB:"🇬🇧 بریتانیا",CA:"🇨🇦 کانادا",DE:"🇩🇪 آلمان",TR:"🇹🇷 ترکیه",AZ:"🇦🇿 آذربایجان"};
const KIND={flatrate:"اشتراکی",free:"رایگان",ads:"رایگان با تبلیغ",rent:"اجاره",buy:"خرید"};
const app=$("#app");let ALL=[],BY={},LEGACY={},META={},heroTimer=null;const DET={};
const store={get(k,d){try{return JSON.parse(localStorage.getItem("nabzfilm:"+k))??d}catch{return d}},set(k,v){try{localStorage.setItem("nabzfilm:"+k,JSON.stringify(v))}catch{}}};
const favs=()=>store.get("favorites",[]).map(String),hist=()=>store.get("history",[]);
function toast(t){const e=$("#toast");e.textContent=t;e.classList.add("on");clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove("on"),1800)}
function toggleFav(k){let a=favs();a=a.includes(k)?a.filter(x=>x!==k):[k,...a];store.set("favorites",a);toast(a.includes(k)?"به لیست من اضافه شد ♥":"از لیست من حذف شد");$$(`[data-fav="${CSS.escape(k)}"]`).forEach(b=>b.innerHTML=a.includes(k)?"♥ در لیست من":"♡ لیست من")}
function pushHist(k){let h=hist().filter(x=>x.k!==k);h.unshift({k,at:Date.now()});store.set("history",h.slice(0,30))}

/* ---------- data ---------- */
function fromLegacy(x){const t=x.type==="movie"?"m":"s",raw=String(x.id),k=raw.startsWith("ia-")?raw:(/^\d+$/.test(raw)?t+raw:raw);const g=(x.genres||x.genre||[]).map(n=>GN[n]||n);const play=!!(x.embed_url||x.video_url);
LEGACY[k]={overview:x.overview||"",runtime:x.runtime,episodes:x.episodes,seasons:[],cast:(x.cast||[]).map(c=>({name:c.name,role:c.character,photo:c.photo||""})),trailer:x.trailer||"",tmdb:x.tmdb_url||"",embed:x.embed_url||"",video:x.video_url||"",source:x.source_label||"",watch:Object.fromEntries(Object.entries(x.watch||{}).map(([r,w])=>[r,{link:w.link,p:[...new Set(["flatrate","free","ads","rent","buy"].flatMap(b=>(w[b]||[]).map(p=>JSON.stringify({n:p.provider_name,kind:b,logo:p.logo_path||""}))))].map(s=>JSON.parse(s)).filter((p,i,a)=>a.findIndex(q=>q.n===p.n)===i).slice(0,8)}]).filter(([,w])=>w.p.length)),recs:[]};
return{k,t,fa:x.fa||x.title||"",en:x.title||"",y:x.year,g,r:x.rating||0,v:0,w:(x.rating||0)*.9,p:x.poster||"",b:x.backdrop||"",tags:play?["free"]:[],play:play?1:0}}
async function load(){try{const r=await fetch("data/list.json",{cache:"no-cache"});if(!r.ok)throw 0;const j=await r.json();ALL=j.items;META=j.meta||{}}catch{try{const r=await fetch("catalog.json",{cache:"no-cache"});if(!r.ok)throw 0;ALL=(await r.json()).map(fromLegacy)}catch{ALL=(window.NABZ_DATA||[]).map(fromLegacy)}}
ALL.forEach(x=>{x.g=x.g||[];x.tags=x.tags||[];x._s=norm(x.fa+" "+x.en);BY[x.k]=x})}
async function detail(k){if(DET[k])return DET[k];if(LEGACY[k])return DET[k]=LEGACY[k];try{const r=await fetch("data/t/"+encodeURIComponent(k)+".json");if(!r.ok)throw 0;return DET[k]=await r.json()}catch{return DET[k]={overview:"",cast:[],recs:[],watch:{},seasons:[]}}}

/* ---------- pieces ---------- */
const by={w:(a,b)=>(b.w||0)-(a.w||0)||(b.pop||0)-(a.pop||0),pop:(a,b)=>(b.pop||0)-(a.pop||0),year:(a,b)=>(b.y||0)-(a.y||0)||(b.w||0)-(a.w||0),tr:(a,b)=>(a.tr??1e9)-(b.tr??1e9)};
function card(x,wide){if(!x)return"";const h=hist().find(e=>e.k===x.k);return`<a class="card${wide?" wide":""}" href="#/t/${esc(x.k)}"><div class="ph">${(wide?img(x.b,"w780"):"")||img(x.p,"w342")?`<img loading="lazy" decoding="async" src="${esc(wide&&x.b?img(x.b,"w780"):img(x.p,"w342"))}" alt="${esc(x.fa)}">`:""}</div>${x.r?`<span class="bd rt">★ ${esc(x.r)}</span>`:""}${x.play?`<span class="bd fr">▶ رایگان</span>`:""}${h&&wide?`<span class="prog" style="width:60%"></span>`:""}<div class="nm"><h3>${esc(x.fa)}</h3><small>${x.t==="m"?"فیلم":"سریال"}${x.y?" · "+x.y:""}${x.g[0]?" · "+esc(x.g[0]):""}</small></div></a>`}
function row(title,list,link,wide){list=list.filter(Boolean);if(!list.length)return"";return`<section class="row"><div class="row-h"><h2>${title}</h2>${link?`<a href="${link}">مشاهده همه ‹</a>`:""}</div><div class="rail${wide?" wide":""}">${list.slice(0,20).map(x=>card(x,wide)).join("")}</div></section>`}
function head(title,desc,image){document.title=title?`${title} | نبض فیلم`:"نبض فیلم | فیلم و سریال، تماشای رایگان و قانونی";const m=$('meta[name="description"]');if(m&&desc)m.content=desc}
function setNav(r){$$("[data-nav]").forEach(a=>a.classList.toggle("on",a.dataset.nav===r))}

/* ---------- pages ---------- */
function home(){head();setNav("home");const free=ALL.filter(x=>x.play).sort(by.pop),trend=ALL.filter(x=>x.tags.includes("trend")).sort(by.tr);const heroList=(trend.length?trend:[...ALL].sort(by.w)).filter(x=>x.b&&!x.play).slice(0,6);
const h=hist().map(e=>BY[e.k]).filter(Boolean),f=favs().map(k=>BY[k]).filter(Boolean),tag=t=>ALL.filter(x=>x.tags.includes(t)),G=g=>ALL.filter(x=>x.g.includes(g)&&!x.play).sort(by.w);
app.innerHTML=`<section class="hero" id="hero"><div class="in" id="heroIn"></div></section>
${row("▶ فیلم کامل رایگان، همین‌جا ببین",free,"#/free")}
${row("⏯ ادامه تماشا و بازدیدهای اخیر",h,"",true)}
${row("🔥 ترند امروز",trend,"#/browse?tag=trend")}
${row("🆕 تازه‌های سینما",tag("new").sort(by.pop),"#/browse?tag=new")}
${row("🏆 برترین فیلم‌ها",ALL.filter(x=>x.t==="m"&&!x.play).sort(by.w),"#/browse?type=m")}
${row("📺 برترین سریال‌ها",ALL.filter(x=>x.t==="s").sort(by.w),"#/browse?type=s")}
${row("🇮🇷 سینما و سریال ایرانی",tag("iran").sort(by.pop),"#/browse?tag=iran")}
${row("🇰🇷 سریال کره‌ای",tag("korea").sort(by.pop),"#/browse?tag=korea")}
${row("🇹🇷 سریال ترکی",tag("turkey").sort(by.pop),"#/browse?tag=turkey")}
${row("🍥 انیمه",tag("anime").sort(by.pop),"#/browse?tag=anime")}
${row("♥ لیست من",f,"#/list")}
${["اکشن","کمدی","جنایی","علمی‌تخیلی","ترسناک","انیمیشن","درام"].map(g=>row("🎭 "+g,G(g),"#/browse?genre="+encodeURIComponent(g))).join("")}`;
let i=0;const show=()=>{const x=heroList[i%heroList.length];if(!x)return;$("#hero").style.backgroundImage=`url("${img(x.b,"w1280")}")`;$("#heroIn").innerHTML=`<span class="eyebrow">${x.tags.includes("trend")?"🔥 ترند امروز · ":""}${x.t==="m"?"فیلم":"سریال"}</span><h1>${esc(x.fa)}</h1><div class="meta">${x.r?`<span class="gold">★ ${esc(x.r)}</span>`:""}${x.y?`<span>${x.y}</span>`:""}<span>${esc(x.g.slice(0,3).join(" • "))}</span></div><p id="heroOv"></p><div class="actions"><a class="btn" href="#/t/${esc(x.k)}">▶ جزئیات و تریلر</a><button class="btn ghost" data-fav="${esc(x.k)}">${favs().includes(x.k)?"♥ در لیست من":"♡ لیست من"}</button></div><div class="dots">${heroList.map((_,j)=>`<i class="${j===i%heroList.length?"on":""}" data-dot="${j}"></i>`).join("")}</div>`;detail(x.k).then(d=>{const o=$("#heroOv");if(o)o.textContent=d.overview||""})};
clearInterval(heroTimer);show();heroTimer=setInterval(()=>{if(!$("#hero"))return clearInterval(heroTimer);i++;show()},8000);$("#hero").addEventListener("click",e=>{const d=e.target.closest("[data-dot]");if(d){i=+d.dataset.dot;show()}})}

function browse(params,preset){const q=Object.fromEntries(new URLSearchParams(params||""));const st={type:q.type||preset?.type||"",genre:q.genre||"",year:q.year||"",sort:q.sort||preset?.sort||"w",tag:q.tag||preset?.tag||"",q:q.q||"",n:36};
const titles={trend:"🔥 ترند امروز",new:"🆕 تازه‌های سینما",iran:"🇮🇷 سینما و سریال ایرانی",korea:"🇰🇷 سریال کره‌ای",turkey:"🇹🇷 سریال ترکی",anime:"🍥 انیمه",free:"▶ فیلم کامل رایگان"};
const title=preset?.title||titles[st.tag]||(st.type==="m"?"🎬 فیلم‌ها":st.type==="s"?"📺 سریال‌ها":"🎞 همه فیلم‌ها و سریال‌ها");head(title.replace(/^\S+\s/,""));setNav(preset?.nav||(st.type==="s"?"series":st.type==="m"?"movies":"browse"));
const genres=[...new Set(ALL.flatMap(x=>x.g))].sort((a,b)=>a.localeCompare(b,"fa")),years=[...new Set(ALL.map(x=>x.y).filter(Boolean))].sort((a,b)=>b-a);
app.innerHTML=`<div class="wrap page"><h1>${title}</h1><div class="sub" id="cnt"></div>${preset?.note||""}<div class="filters"><input id="fq" placeholder="جستجو در این بخش..." value="${esc(st.q)}"><select id="ft"><option value="">فیلم و سریال</option><option value="m">فقط فیلم</option><option value="s">فقط سریال</option></select><select id="fy"><option value="">همه سال‌ها</option>${years.map(y=>`<option>${y}</option>`).join("")}</select><select id="fs"><option value="w">بهترین‌ها</option><option value="pop">محبوب‌ترین</option><option value="year">جدیدترین</option></select></div><div class="chips"><button class="chip" data-g="">همه ژانرها</button>${genres.map(g=>`<button class="chip" data-g="${esc(g)}">${esc(g)}</button>`).join("")}</div><div class="grid" id="bg"></div><div class="more"><button class="btn ghost" id="bm">نمایش بیشتر</button></div></div>`;
$("#ft").value=st.type;$("#fy").value=st.year;$("#fs").value=st.sort;
const draw=()=>{const qq=norm(st.q);let l=ALL.filter(x=>(!st.type||x.t===st.type)&&(!st.genre||x.g.includes(st.genre))&&(!st.year||String(x.y)===st.year)&&(!st.tag||(st.tag==="free"?x.play:st.tag==="list"?favs().includes(x.k):x.tags.includes(st.tag)))&&(!qq||x._s.includes(qq)));l.sort(st.tag==="trend"&&st.sort==="w"?by.tr:by[st.sort]||by.w);
$("#cnt").textContent=fa(l.length)+" عنوان";$("#bg").innerHTML=l.length?l.slice(0,st.n).map(x=>card(x)).join(""):'<div class="empty">چیزی پیدا نشد. فیلترها را تغییر بده.</div>';$("#bm").style.display=l.length>st.n?"":"none";$$(".chip[data-g]").forEach(c=>c.classList.toggle("on",c.dataset.g===st.genre))};
$("#fq").oninput=e=>{st.q=e.target.value;st.n=36;draw()};$("#ft").onchange=e=>{st.type=e.target.value;st.n=36;draw()};$("#fy").onchange=e=>{st.year=e.target.value;st.n=36;draw()};$("#fs").onchange=e=>{st.sort=e.target.value;draw()};
$(".chips").onclick=e=>{const c=e.target.closest("[data-g]");if(c){st.genre=c.dataset.g;st.n=36;draw()}};$("#bm").onclick=()=>{st.n+=36;draw()};draw()}

function providers(d){const regs=Object.entries(d.watch||{});if(!regs.length)return`<div class="notice">برای این عنوان سرویس تماشای قانونی در مناطق بررسی‌شده ثبت نشده. اگر در ایران هستی، در فیلیمو، نماوا یا سرویس‌های رسمی دیگر جستجو کن.</div>`;
return`<div class="prov">${regs.map(([r,w])=>`<div class="prov-r"><strong>${REG[r]||r}</strong><div class="prov-l">${w.p.map(p=>`<a target="_blank" rel="noopener" href="${esc(w.link||d.tmdb)}">${p.logo?`<img src="${esc(img(p.logo,"w92"))}" alt="" loading="lazy">`:""}${esc(p.n)} <em>${KIND[p.kind]||""}</em></a>`).join("")}</div></div>`).join("")}</div><div class="src">اطلاعات سرویس‌ها: JustWatch از طریق TMDB.</div>`}
function playerHtml(x,d){if(d.video)return`<div class="player"><video controls playsinline preload="metadata" poster="${esc(img(x.b,"w1280")||img(x.p,"w500"))}"><source src="${esc(d.video)}"></video></div>`;if(d.embed)return`<div class="player"><iframe src="${esc(d.embed)}" title="پخش ${esc(x.fa)}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe></div><div class="src">منبع پخش قانونی: ${esc(d.source||"")} ${d.source_url?`· <a href="${esc(d.source_url)}" target="_blank" rel="noopener">صفحه اصلی اثر ↗</a>`:""}</div>`;return""}

async function title(k,autoplay){const x=BY[k];if(!x)return notFound();clearInterval(heroTimer);app.innerHTML=`<div class="dt-cover skeleton"></div>`;const d=await detail(k);if(location.hash.indexOf(k)<0)return;
head(x.fa+(x.y?` (${x.y})`:""),(d.overview||"").slice(0,155));setNav(x.play?"free":x.t==="m"?"movies":"series");const real=(d.seasons||[]).filter(s=>s.n);
const facts=[x.y&&"📅 "+x.y,x.r&&"⭐ "+x.r+(x.v?` (${fa(x.v)} رأی)`:""),d.runtime&&"⏱ "+d.runtime+" دقیقه",real.length&&"📺 "+fa(real.length)+" فصل",d.episodes&&"🎞 "+fa(d.episodes)+" قسمت",d.status==="Ended"&&"پایان‌یافته",d.status==="Returning Series"&&"در حال پخش"].filter(Boolean);
const share=SITE+"t/"+encodeURIComponent(k)+".html",recs=(d.recs||[]).map(r=>BY[r]).filter(Boolean),similar=recs.length?recs:ALL.filter(y=>y.k!==k&&y.t===x.t&&y.g.some(g=>x.g.includes(g))).sort(by.w).slice(0,16);
app.innerHTML=`<div class="dt-cover" style="background-image:url('${esc(img(x.b,"w1280")||img(x.p,"w780"))}')"></div><div class="wrap"><div class="dt"><img class="dt-poster" src="${esc(img(x.p,"w500"))}" alt="${esc(x.fa)}"><div class="txt"><span class="eyebrow">${x.t==="m"?"فیلم":"سریال"}${x.play?" · ▶ تماشای کامل رایگان":""}</span><h1>${esc(x.fa)}</h1><p class="en">${x.en&&x.en!==x.fa?esc(x.en):""}</p><div class="facts">${facts.map(f=>`<span>${esc(f)}</span>`).join("")}</div><p class="genres">${esc(x.g.join(" • "))}</p>${d.tagline?`<p class="tagline">«${esc(d.tagline)}»</p>`:""}<p class="overview">${esc(d.overview||"خلاصه‌ای برای این عنوان ثبت نشده است.")}</p>${d.crew?.length?`<p class="crew">${x.t==="m"?"کارگردان":"سازندگان"}: ${esc(d.crew.join("، "))}</p>`:""}
<div class="actions">${x.play?`<a class="btn" href="#/watch/${esc(k)}">▶ پخش فیلم کامل</a>`:""}${d.trailer?`<button class="btn${x.play?" ghost":""}" id="trBtn">🎞 تریلر</button>`:""}<button class="btn ghost" data-fav="${esc(k)}">${favs().includes(k)?"♥ در لیست من":"♡ لیست من"}</button><button class="btn ghost" id="shBtn">🔗 اشتراک‌گذاری</button></div></div></div>
<div id="play" class="sec"></div>
${x.play?"":`<section class="sec"><h2>▶ کجا ببینم؟</h2>${providers(d)}</section>`}
${real.length?`<section class="sec"><h2>📺 فصل‌ها</h2><div class="seasons">${real.map(s=>`<div class="season"><div class="ph" style="background-image:url('${esc(img(s.poster||x.p,"w342"))}')"></div><div><b>${esc(s.name)}</b><small>${fa(s.ep)} قسمت${s.y?" · "+s.y:""}</small></div></div>`).join("")}</div></section>`:""}
${d.cast?.length?`<section class="sec"><h2>🎭 بازیگران</h2><div class="cast">${d.cast.map(c=>`<div><div class="ph" style="background-image:url('${esc(img(c.photo,"w185"))}')"></div><b>${esc(c.name)}</b><small>${esc(c.role||"")}</small></div>`).join("")}</div></section>`:""}
</div>${row(x.play?"▶ فیلم‌های رایگان دیگر":"✨ شبیه این",x.play?ALL.filter(y=>y.play&&y.k!==k).sort(by.pop):similar)}
<div class="wrap"><p class="src">${d.tmdb?`<a href="${esc(d.tmdb)}" target="_blank" rel="noopener">اطلاعات کامل در TMDB ↗</a>`:""}</p></div>`;
const pl=$("#play");if(autoplay&&x.play){pl.innerHTML=playerHtml(x,d);pushHist(k);pl.scrollIntoView({behavior:"smooth",block:"center"})}
$("#trBtn")?.addEventListener("click",()=>{pl.innerHTML=`<div class="player"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(d.trailer)}?autoplay=1&rel=0" title="تریلر" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;pushHist(k);pl.scrollIntoView({behavior:"smooth",block:"center"})});
$("#shBtn").onclick=async()=>{const data={title:x.fa+" | نبض فیلم",url:share};try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(share);toast("لینک کپی شد")}}catch{}};
if(!autoplay)scrollTo(0,0)}

function notFound(){app.innerHTML=`<div class="wrap page"><div class="empty">این صفحه پیدا نشد. <a class="btn sm" href="#/">بازگشت به خانه</a></div></div>`}

/* ---------- search ---------- */
function wireSearch(){const i=$("#q"),box=$("#sr");let t;i.addEventListener("input",()=>{clearTimeout(t);t=setTimeout(()=>{const q=norm(i.value);if(q.length<2){box.classList.remove("on");return}const res=ALL.filter(x=>x._s.includes(q)).sort((a,b)=>(b._s.startsWith(q)-a._s.startsWith(q))||by.w(a,b)).slice(0,8);
box.innerHTML=res.length?res.map(x=>`<a href="#/t/${esc(x.k)}"><img src="${esc(img(x.p,"w92"))}" alt="" loading="lazy"><span><b>${esc(x.fa)}</b><small>${x.t==="m"?"فیلم":"سریال"}${x.y?" · "+x.y:""}${x.play?" · ▶ رایگان":""}</small></span></a>`).join("")+`<a href="#/browse?q=${encodeURIComponent(i.value)}"><span><b>همه نتایج «${esc(i.value)}» ‹</b></span></a>`:'<a><span><small>نتیجه‌ای پیدا نشد</small></span></a>';box.classList.add("on")},140)});
i.addEventListener("keydown",e=>{if(e.key==="Enter"){location.hash="#/browse?q="+encodeURIComponent(i.value);box.classList.remove("on");i.blur()}});document.addEventListener("click",e=>{if(!e.target.closest(".search"))box.classList.remove("on")});box.addEventListener("click",()=>{box.classList.remove("on");i.value=""})}

/* ---------- router ---------- */
function route(){const h=location.hash.replace(/^#/,"")||"/";const [path,qs]=h.split("?");const p=path.split("/").filter(Boolean);
if(!p.length)return home();if(p[0]==="t")return title(decodeURIComponent(p[1]||""));if(p[0]==="watch")return title(decodeURIComponent(p[1]||""),true);
if(p[0]==="browse")return browse(qs);if(p[0]==="movies")return browse(qs,{type:"m",nav:"movies"});if(p[0]==="series")return browse(qs,{type:"s",nav:"series"});
if(p[0]==="free")return browse(qs,{tag:"free",sort:"pop",nav:"free",title:"▶ فیلم کامل رایگان",note:'<div class="notice" style="margin-bottom:16px">این فیلم‌ها قانونی‌اند (مالکیت عمومی یا Creative Commons) و از پخش‌کننده رسمی آرشیو اینترنت یا یوتیوب، همین‌جا در سایت پخش می‌شوند.</div>'});
if(p[0]==="list")return browse(qs,{tag:"list",nav:"list",title:"♥ لیست من"});
if(/^title-(movie|series)-/.test(p[0])){const m=p[0].match(/^title-(movie|series)-(.+)$/);location.replace("#/t/"+(m[2].startsWith("ia-")||m[2].startsWith("open-")?m[2]:(m[1]==="movie"?"m":"s")+m[2]));return}
notFound()}
document.addEventListener("click",e=>{const b=e.target.closest("[data-fav]");if(b){e.preventDefault();toggleFav(b.dataset.fav)}});
window.addEventListener("hashchange",()=>{route();if(!/^#\/(t|watch)\//.test(location.hash))scrollTo(0,0)});
load().then(()=>{wireSearch();const fc=$("#footStats");if(fc)fc.textContent=`${fa(ALL.filter(x=>x.t==="m").length)} فیلم · ${fa(ALL.filter(x=>x.t==="s").length)} سریال · ${fa(ALL.filter(x=>x.play).length)} فیلم کامل رایگان`;route()});
})();
