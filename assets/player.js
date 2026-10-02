/* NABZ PLAYER: custom HTML5 player for nabz-film (no YouTube, no iframes).
   NabzPlayer.mount(el, {sources:[{src,label,h,size}], subs:[{src,lang,label}], poster, title, key, page}) */
(function(){
"use strict";
const FA="۰۱۲۳۴۵۶۷۸۹";const fa=n=>String(n).replace(/\d/g,d=>FA[d]);
const tf=s=>{s=Math.max(0,Math.floor(s||0));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return fa((h?h+":"+String(m).padStart(2,"0"):m)+":"+String(x).padStart(2,"0"))};
const mb=b=>b?(b>=1073741824?fa((b/1073741824).toFixed(1))+" گیگ":fa(Math.round(b/1048576))+" مگ"):"";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const LS={get:(k,d)=>{try{const v=localStorage.getItem(k);return v===null?d:JSON.parse(v)}catch{return d}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
const I={
play:'<svg viewBox="0 0 24 24"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
pause:'<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4.2" height="14" rx="1.2"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.2"/></svg>',
back:'<svg viewBox="0 0 24 24"><path d="M12 5V2L7 6l5 4V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z"/><text x="12" y="16.3" font-size="6.5" text-anchor="middle" font-family="sans-serif" font-weight="700">10</text></svg>',
fwd:'<svg viewBox="0 0 24 24"><path d="M12 5V2l5 4-5 4V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8z"/><text x="12" y="16.3" font-size="6.5" text-anchor="middle" font-family="sans-serif" font-weight="700">10</text></svg>',
vol:'<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
mute:'<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 9.5l5 5m0-5l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
cc:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10.5 10.2a2.2 2.2 0 1 0 0 3.6M17 10.2a2.2 2.2 0 1 0 0 3.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
gear:'<svg viewBox="0 0 24 24"><path d="M19.4 13a7.5 7.5 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.7-1L15 3.5h-4l-.4 2.5a7 7 0 0 0-1.7 1l-2.4-1-2 3.4L6.6 11a7.5 7.5 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2.1-1.6zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" transform="translate(-1 0)"/></svg>',
pip:'<svg viewBox="0 0 24 24"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><rect x="12" y="11" width="7" height="6" rx="1.2"/></svg>',
full:'<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
exit:'<svg viewBox="0 0 24 24"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
dl:'<svg viewBox="0 0 24 24"><path d="M12 3v11m0 0l-4.5-4.5M12 14l4.5-4.5M4 17v3h16v-3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'};

function pickDefault(src){
  const pref=LS.get("np:q",null);
  if(pref){const hit=src.find(s=>s.h===pref)||src.slice().sort((a,b)=>Math.abs(a.h-pref)-Math.abs(b.h-pref))[0];if(hit)return hit}
  const c=navigator.connection||{};const slow=/(^|-)2g|3g/.test(c.effectiveType||"")||c.saveData||(c.downlink&&c.downlink<1.5);
  const cap=slow?360:480;const ok=src.filter(s=>s.h<=cap);
  return ok.length?ok[0]:src[src.length-1];
}

function mount(el,o){
  const src=(o.sources||[]).filter(s=>s&&s.src).sort((a,b)=>(b.h||0)-(a.h||0));
  const subs=o.subs||[];const key="np:pos:"+(o.key||"");
  if(!src.length){el.innerHTML='<div class="np-err">فایل پخش برای این عنوان پیدا نشد.</div>';return}
  let cur=pickDefault(src),tried=new Set(),hideT=0,subOn=LS.get("np:sub",null),subSize=LS.get("np:subsize",1);
  el.innerHTML=`<div class="np" tabindex="0" dir="rtl">
  <video playsinline preload="metadata" poster="${esc(o.poster||"")}"></video>
  <div class="np-sub"><span></span></div>
  <div class="np-cover"${o.poster?` style="background-image:url('${esc(o.poster)}')"`:""}><div class="np-shade"></div>
    <div class="np-meta"><span class="np-badge">NABZ PLAYER</span><b>${esc(o.title||"")}</b><small>${src.length>1?fa(src.length)+" کیفیت":"کیفیت "+esc(src[0].label)}${subs.length?" · زیرنویس":""} · بدون یوتیوب</small></div>
    <button class="np-big" aria-label="پخش">${I.play}</button></div>
  <div class="np-spin"></div><div class="np-flash"></div>
  <div class="np-resume" hidden><span></span><button class="np-r-yes">ادامه تماشا</button><button class="np-r-no">از اول</button></div>
  <div class="np-tap np-tap-l"></div><div class="np-tap np-tap-r"></div>
  <div class="np-top"><b>${esc(o.title||"")}</b></div>
  <div class="np-bar">
    <div class="np-prog" dir="ltr"><div class="np-buf"></div><div class="np-done"></div><div class="np-knob"></div><div class="np-tip">0:00</div></div>
    <div class="np-row">
      <div class="np-grp">
        <button class="np-b np-pp" aria-label="پخش/مکث">${I.play}</button>
        <button class="np-b np-fw" aria-label="۱۰ ثانیه جلو">${I.fwd}</button>
        <button class="np-b np-bk" aria-label="۱۰ ثانیه عقب">${I.back}</button>
        <div class="np-vol"><button class="np-b np-mu" aria-label="صدا">${I.vol}</button><input type="range" min="0" max="1" step="0.05" value="1" dir="ltr" aria-label="بلندی صدا"></div>
        <span class="np-time" dir="ltr">0:00 / 0:00</span>
      </div>
      <div class="np-grp">
        ${subs.length?`<button class="np-b np-cc" aria-label="زیرنویس">${I.cc}</button>`:""}
        <button class="np-b np-set" aria-label="تنظیمات">${I.gear}<i class="np-ql"></i></button>
        ${document.pictureInPictureEnabled?`<button class="np-b np-pip" aria-label="تصویر در تصویر">${I.pip}</button>`:""}
        <button class="np-b np-fs" aria-label="تمام‌صفحه">${I.full}</button>
      </div>
    </div>
  </div>
  <div class="np-menu" hidden></div>
  <div class="np-err" hidden></div></div>`;
  const R=el.querySelector(".np"),V=R.querySelector("video"),$=s=>R.querySelector(s);
  const prog=$(".np-prog"),done=$(".np-done"),buf=$(".np-buf"),knob=$(".np-knob"),tip=$(".np-tip"),menu=$(".np-menu");
  V.volume=LS.get("np:vol",1);V.muted=false;$(".np-vol input").value=V.volume;

  subs.forEach((s,i)=>{const t=document.createElement("track");t.kind="subtitles";t.src=s.src;t.srclang=s.lang||"und";t.label=s.label||s.lang;t.dataset.i=i;V.appendChild(t)});
  const subBox=$(".np-sub span");
  let lastSub="";function renderSub(){if(subOn===null)return;const t=V.textTracks[subOn];if(!t)return;let act=[...(t.activeCues||[])];if(!act.length&&t.cues){const now=V.currentTime;act=[...t.cues].filter(c=>c.startTime<=now&&c.endTime>=now)}const c=act.map(c=>c.text.replace(/<[^>]+>/g,"")).join("\n");if(c!==lastSub){lastSub=c;subBox.textContent=c;subBox.style.display=c?"inline":"none"}}
  function applySubs(){lastSub="";[...V.textTracks].forEach((t,i)=>{t.mode=(subOn!==null&&i===subOn)?"hidden":"disabled";t.oncuechange=renderSub});if(subOn===null){subBox.textContent="";subBox.style.display="none"}R.classList.toggle("np-hascc",subOn!==null);$(".np-sub").style.fontSize=[0.8,1,1.3,1.6][subSize]+"em"}
  if(subOn===null&&subs.length){const f=subs.findIndex(s=>s.lang==="fa");if(f>=0)subOn=f}
  if(subOn!==null&&subOn>=subs.length)subOn=null;

  function setSrc(s,keepTime){const t=keepTime?V.currentTime:0,wasPlaying=keepTime&&!V.paused;cur=s;V.src=s.src;$(".np-ql").textContent=s.label.replace("p","");
    if(keepTime){V.addEventListener("loadedmetadata",function f(){V.removeEventListener("loadedmetadata",f);V.currentTime=t;if(wasPlaying)V.play().catch(()=>{})})}V.load();applySubs()}
  setSrc(cur,false);

  const start=()=>{R.classList.add("np-started");V.play().catch(()=>{})};
  $(".np-big").onclick=start;
  const toggle=()=>{if(!R.classList.contains("np-started"))return start();V.paused?V.play().catch(()=>{}):V.pause()};
  $(".np-pp").onclick=toggle;
  V.addEventListener("click",()=>{if(menu.hidden)toggle();else closeMenu()});
  const flash=h=>{const f=$(".np-flash");f.innerHTML=h;f.classList.remove("on");void f.offsetWidth;f.classList.add("on")};
  const seek=d=>{V.currentTime=Math.min(Math.max(0,V.currentTime+d),V.duration||1e9);flash(`<span>${d>0?"+":"−"}${fa(Math.abs(d))} ثانیه</span>`);wake()};
  $(".np-fw").onclick=()=>seek(10);$(".np-bk").onclick=()=>seek(-10);
  V.addEventListener("play",()=>{R.classList.add("np-playing","np-started");$(".np-pp").innerHTML=I.pause;wake()});
  V.addEventListener("pause",()=>{R.classList.remove("np-playing");$(".np-pp").innerHTML=I.play;R.classList.add("np-show")});
  V.addEventListener("waiting",()=>R.classList.add("np-load"));
  ["playing","canplay","seeked"].forEach(e=>V.addEventListener(e,()=>R.classList.remove("np-load")));
  const upd=()=>{const d=V.duration||0,p=d?V.currentTime/d:0;done.style.width=p*100+"%";knob.style.left=p*100+"%";$(".np-time").textContent=tf(V.currentTime)+" / "+tf(d);
    try{if(V.buffered.length&&d)buf.style.width=V.buffered.end(V.buffered.length-1)/d*100+"%"}catch{}};
  V.addEventListener("timeupdate",()=>{upd();renderSub();if(V.currentTime>20&&V.duration&&V.currentTime<V.duration-90)LS.set(key,Math.floor(V.currentTime));else if(V.duration&&V.currentTime>=V.duration-90)LS.set(key,0)});
  V.addEventListener("progress",upd);V.addEventListener("seeked",renderSub);V.addEventListener("durationchange",upd);
  V.addEventListener("loadedmetadata",function once(){V.removeEventListener("loadedmetadata",once);const s=LS.get(key,0);if(s>30&&(!V.duration||s<V.duration-90)){const r=$(".np-resume");r.hidden=false;r.querySelector("span").textContent="از "+tf(s)+" ادامه بدیم؟";
    r.querySelector(".np-r-yes").onclick=()=>{V.currentTime=s;r.hidden=true;start()};r.querySelector(".np-r-no").onclick=()=>{LS.set(key,0);r.hidden=true;start()}}});
  V.addEventListener("ended",()=>{LS.set(key,0);R.classList.add("np-show")});
  V.addEventListener("error",()=>{if(!V.currentSrc&&!V.src)return;tried.add(cur.src);const next=src.find(s=>!tried.has(s.src)&&s.h<=cur.h)||src.find(s=>!tried.has(s.src));
    if(next){setSrc(next,true);flash("<span>تغییر خودکار به "+esc(next.label)+"</span>");return}
    R.classList.remove("np-load");const e=$(".np-err");e.hidden=false;e.innerHTML=`<b>پخش انجام نشد</b><p>ممکن است archive.org روی اینترنت شما کند یا محدود باشد. کیفیت پایین‌تر یا اینترنت دیگری را امتحان کن، یا فایل را مستقیم دانلود کن.</p>${o.page?`<a href="${esc(o.page)}" target="_blank" rel="noopener">صفحه اصلی فیلم ↗</a>`:""}<a href="${esc(src[src.length-1].src)}" target="_blank" rel="noopener" download>دانلود مستقیم ↓</a>`});

  /* progress bar */
  const pos=e=>{const r=prog.getBoundingClientRect(),x=(e.touches?e.touches[0].clientX:e.clientX);return Math.min(1,Math.max(0,(x-r.left)/r.width))};
  let drag=false;
  const dn=e=>{drag=true;R.classList.add("np-drag");mv(e)},mv=e=>{const p=pos(e);if(V.duration){tip.textContent=tf(p*V.duration);tip.style.left=p*100+"%"}if(drag&&V.duration){V.currentTime=p*V.duration;upd()}},up=()=>{drag=false;R.classList.remove("np-drag")};
  prog.addEventListener("pointerdown",e=>{prog.setPointerCapture?.(e.pointerId);dn(e)});prog.addEventListener("pointermove",mv);prog.addEventListener("pointerup",up);prog.addEventListener("pointercancel",up);

  /* volume */
  const vi=$(".np-vol input");vi.oninput=()=>{V.volume=+vi.value;V.muted=V.volume===0;LS.set("np:vol",V.volume)};
  const volIcon=()=>{$(".np-mu").innerHTML=(V.muted||V.volume===0)?I.mute:I.vol;vi.value=V.muted?0:V.volume};
  V.addEventListener("volumechange",volIcon);$(".np-mu").onclick=()=>{V.muted=!V.muted;if(!V.muted&&V.volume===0)V.volume=.6};

  /* menus */
  function closeMenu(){menu.hidden=true;R.classList.remove("np-menuon")}
  function openMenu(kind){if(!menu.hidden&&menu.dataset.k===kind)return closeMenu();menu.dataset.k=kind;menu.hidden=false;R.classList.add("np-menuon");draw(kind)}
  function draw(kind){
    if(kind==="main"){menu.innerHTML=`<div class="np-mh">تنظیمات</div>
      <button data-go="q"><span>کیفیت</span><em>${esc(cur.label)} ‹</em></button>
      <button data-go="speed"><span>سرعت پخش</span><em>${V.playbackRate===1?"عادی":fa(V.playbackRate)+"×"} ‹</em></button>
      ${subs.length?`<button data-go="subs"><span>زیرنویس</span><em>${subOn===null?"خاموش":esc(subs[subOn].label)} ‹</em></button><button data-go="size"><span>اندازه زیرنویس</span><em>${["کوچک","عادی","بزرگ","خیلی بزرگ"][subSize]} ‹</em></button>`:""}
      <a href="${esc(cur.src)}" target="_blank" rel="noopener" download><span>${I.dl} دانلود این کیفیت</span><em>${mb(cur.size)}</em></a>`}
    if(kind==="q")menu.innerHTML=`<div class="np-mh"><button data-go="main">›</button> کیفیت تصویر</div>`+src.map((s,i)=>`<button data-q="${i}" class="${s===cur?"on":""}"><span>${esc(s.label)}${s.h>=720?' <b class="np-hd">HD</b>':""}</span><em>${mb(s.size)}</em></button>`).join("")+`<p class="np-hint">اینترنت ضعیف داری؟ کیفیت پایین‌تر را انتخاب کن.</p>`;
    if(kind==="speed")menu.innerHTML=`<div class="np-mh"><button data-go="main">›</button> سرعت پخش</div>`+[0.5,0.75,1,1.25,1.5,2].map(r=>`<button data-r="${r}" class="${V.playbackRate===r?"on":""}"><span>${r===1?"عادی":fa(r)+"×"}</span></button>`).join("");
    if(kind==="subs")menu.innerHTML=`<div class="np-mh">${menu.dataset.from==="cc"?"":'<button data-go="main">›</button> '}زیرنویس</div><button data-s="-1" class="${subOn===null?"on":""}"><span>خاموش</span></button>`+subs.map((s,i)=>`<button data-s="${i}" class="${subOn===i?"on":""}"><span>${esc(s.label)}</span></button>`).join("");
    if(kind==="size")menu.innerHTML=`<div class="np-mh"><button data-go="main">›</button> اندازه زیرنویس</div>`+["کوچک","عادی","بزرگ","خیلی بزرگ"].map((n,i)=>`<button data-z="${i}" class="${subSize===i?"on":""}"><span>${n}</span></button>`).join("");
  }
  menu.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;e.stopPropagation();
    if(b.dataset.go){menu.dataset.from="";menu.dataset.k=b.dataset.go;return draw(b.dataset.go)}
    if(b.dataset.q){const s=src[+b.dataset.q];LS.set("np:q",s.h);tried.clear();if(s!==cur){setSrc(s,true);flash("<span>کیفیت "+esc(s.label)+"</span>")}return closeMenu()}
    if(b.dataset.r){V.playbackRate=+b.dataset.r;return closeMenu()}
    if(b.dataset.s){const v=+b.dataset.s;subOn=v<0?null:v;LS.set("np:sub",subOn);applySubs();return closeMenu()}
    if(b.dataset.z){subSize=+b.dataset.z;LS.set("np:subsize",subSize);applySubs();return closeMenu()}});
  $(".np-set").onclick=e=>{e.stopPropagation();menu.dataset.from="";openMenu("main")};
  $(".np-cc")&&($(".np-cc").onclick=e=>{e.stopPropagation();menu.dataset.from="cc";openMenu("subs")});

  /* fullscreen / pip */
  const fsEl=()=>document.fullscreenElement||document.webkitFullscreenElement;
  $(".np-fs").onclick=()=>{if(fsEl())(document.exitFullscreen||document.webkitExitFullscreen).call(document);else if(R.requestFullscreen)R.requestFullscreen().then(()=>screen.orientation?.lock?.("landscape").catch(()=>{})).catch(()=>{});else if(V.webkitEnterFullscreen)V.webkitEnterFullscreen()};
  document.addEventListener("fullscreenchange",()=>{R.classList.toggle("np-isfs",fsEl()===R);$(".np-fs").innerHTML=fsEl()?I.exit:I.full});
  $(".np-pip")&&($(".np-pip").onclick=()=>{(document.pictureInPictureElement?document.exitPictureInPicture():V.requestPictureInPicture()).catch(()=>{})});

  /* auto-hide */
  function wake(){R.classList.add("np-show");clearTimeout(hideT);hideT=setTimeout(()=>{if(!V.paused&&menu.hidden&&!drag)R.classList.remove("np-show")},2600)}
  R.addEventListener("pointermove",wake);R.addEventListener("touchstart",wake,{passive:true});

  /* double tap to seek on touch */
  let lastTap=0;[["l",-10],["r",10]].forEach(([s,d])=>{$(".np-tap-"+s).addEventListener("click",e=>{const n=Date.now();if(n-lastTap<320){seek(d);lastTap=0}else{lastTap=n;setTimeout(()=>{if(lastTap===n){R.classList.contains("np-show")&&!V.paused?R.classList.remove("np-show"):wake()}},330)}})});

  /* keyboard */
  R.addEventListener("keydown",e=>{const k=e.key.toLowerCase();if(e.target.tagName==="INPUT"&&k!==" ")return;
    if(k===" "||k==="k"){e.preventDefault();toggle()}else if(k==="arrowright"){e.preventDefault();seek(10)}else if(k==="arrowleft"){e.preventDefault();seek(-10)}
    else if(k==="arrowup"){e.preventDefault();V.volume=Math.min(1,V.volume+.1);flash("<span>صدا "+fa(Math.round(V.volume*100))+"٪</span>")}
    else if(k==="arrowdown"){e.preventDefault();V.volume=Math.max(0,V.volume-.1);flash("<span>صدا "+fa(Math.round(V.volume*100))+"٪</span>")}
    else if(k==="f"||k==="ب")$(".np-fs").click();else if(k==="m"||k==="پ")$(".np-mu").click();
    else if((k==="c"||k==="ز")&&subs.length){subOn=subOn===null?0:(subOn+1<subs.length?subOn+1:null);LS.set("np:sub",subOn);applySubs();flash("<span>زیرنویس: "+(subOn===null?"خاموش":esc(subs[subOn].label))+"</span>")}
    else if(k==="escape")closeMenu();});
  document.addEventListener("click",e=>{if(!R.contains(e.target))closeMenu()});
  applySubs();R.classList.add("np-show");
  return {video:V,root:R};
}
window.NabzPlayer={mount};
})();
