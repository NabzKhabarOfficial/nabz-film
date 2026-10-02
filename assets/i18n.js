/* NABZ FILM i18n: Persian (default) + English.
   The UI is written in Persian; in English mode every rendered text node and
   UI attribute is translated with the phrase table below. A node is changed
   only when the result contains no Persian letters left, so Persian film
   titles or untranslated data are never half-translated. */
(function(){
"use strict";
const q=new URLSearchParams(location.search).get("lang");
let lang=q||(()=>{try{return localStorage.getItem("nabzfilm:lang")}catch{return null}})()||"fa";
if(lang!=="en")lang="fa";
if(q){try{localStorage.setItem("nabzfilm:lang",lang)}catch{}}
window.LANG=lang;
const root=document.documentElement;
root.lang=lang==="en"?"en":"fa";root.dir=lang==="en"?"ltr":"rtl";
window.setLang=l=>{try{localStorage.setItem("nabzfilm:lang",l)}catch{}const u=new URL(location.href);u.searchParams.delete("lang");location.replace(u.toString())};

const GENRES={"اکشن":"Action","ماجراجویی":"Adventure","انیمیشن":"Animation","کمدی":"Comedy","جنایی":"Crime","مستند":"Documentary","درام":"Drama","خانوادگی":"Family","فانتزی":"Fantasy","تاریخی":"History","ترسناک":"Horror","موسیقی":"Music","معمایی":"Mystery","عاشقانه":"Romance","علمی‌تخیلی":"Sci-Fi","هیجان‌انگیز":"Thriller","جنگی":"War","وسترن":"Western","فیلم تلویزیونی":"TV Movie","کودک":"Kids","واقع‌نما":"Reality","گفتگو محور":"Talk","خبری":"News","صامت":"Silent","کلاسیک":"Classic"};
window.GENRE_EN=GENRES;
if(lang!=="en")return;

const P=[
["فیلم و سریال، تماشای رایگان و قانونی","Movies & series, free and legal streaming"],
["نبض فیلم: کشف فیلم و سریال با خلاصه داستان، بازیگران، تریلر و جای تماشای قانونی؛ به‌علاوه صدها فیلم کامل رایگان که همین‌جا پخش می‌شوند.","NABZ FILM: discover movies and series with synopses, cast, trailers and where to watch legally, plus hundreds of full free films you can play right here."],
["تریلرها فقط از یوتیوب رسمی قابل پخش‌اند و در ایران ممکن است بدون اینترنت آزاد باز نشوند. فیلم‌های کامل رایگان به یوتیوب وابسته نیستند.","Trailers play from official YouTube only. Full free films do not depend on YouTube."],
["این فیلم‌ها قانونی‌اند (مالکیت عمومی یا Creative Commons) و با پلیر اختصاصی نبض، مستقیم و بدون یوتیوب همین‌جا پخش می‌شوند؛ با انتخاب کیفیت و زیرنویس (هر جا موجود باشد).","These films are legal (public domain or Creative Commons) and play right here in the NABZ player, directly and without YouTube, with quality and subtitle choice where available."],
["فیلم‌های «تماشای رایگان» آثار با مالکیت عمومی یا مجوز Creative Commons هستند و با پخش‌کننده اختصاصی نبض مستقیماً از Internet Archive پخش می‌شوند (بدون وابستگی به یوتیوب). برای سایر عناوین فقط تریلر رسمی و لینک سرویس‌های قانونی ارائه می‌شود؛ هیچ فایل غیرمجازی در این سایت قرار نمی‌گیرد.","“Watch free” films are public-domain or Creative Commons works, streamed by the NABZ player directly from the Internet Archive (no YouTube needed). Other titles only get the official trailer and links to legal services; no unauthorised file is hosted here."],
["برای این عنوان سرویس تماشای قانونی در مناطق بررسی‌شده ثبت نشده. اگر در ایران هستی، در فیلیمو، نماوا یا سرویس‌های رسمی دیگر جستجو کن.","No legal streaming service is listed for this title in the checked regions."],
["ممکن است archive.org روی اینترنت شما کند یا محدود باشد. کیفیت پایین‌تر یا اینترنت دیگری را امتحان کن، یا فایل را مستقیم دانلود کن.","archive.org may be slow or blocked on your connection. Try a lower quality, another network, or download the file directly."],
["اینترنت ضعیف داری؟ کیفیت پایین‌تر را انتخاب کن.","Slow connection? Pick a lower quality."],
["خلاصه‌ای برای این عنوان ثبت نشده است.","No synopsis available for this title."],
["فایل پخش برای این عنوان پیدا نشد.","No playable file was found for this title."],
["فایل پخش این عنوان در دسترس نیست.","The video file for this title is not available."],
["اطلاعات سرویس‌ها: JustWatch از طریق TMDB.","Streaming data: JustWatch via TMDB."],
["چیزی پیدا نشد. فیلترها را تغییر بده.","Nothing found. Try other filters."],
["این صفحه پیدا نشد.","Page not found."],
["▶ فیلم کامل رایگان، همین‌جا ببین","▶ Full free movies, watch here"],
["⏯ ادامه تماشا و بازدیدهای اخیر","⏯ Continue watching & recently viewed"],
["همه فیلم‌ها و سریال‌ها","All movies & series"],
["سینما و سریال ایرانی","Iranian cinema & series"],
["فیلم‌های رایگان دیگر","More free movies"],
["کانال تلگرام نبض خبر","NABZ news Telegram channel"],
["جستجوی فیلم یا سریال...","Search movies or series..."],
["جستجو در این بخش...","Search in this section..."],
["به لیست من اضافه شد ♥","Added to My List ♥"],
["از لیست من حذف شد","Removed from My List"],
["تماشای کامل رایگان","Watch full movie free"],
["نتیجه‌ای پیدا نشد","No results"],
["فیلم کامل رایگان","Full free movies"],
["دانلود این کیفیت","Download this quality"],
["اطلاعات کامل در TMDB","Full details on TMDB"],
["تغییر خودکار به","Switched to"],
["رایگان با تبلیغ","Free with ads"],
["برترین سریال‌ها","Top series"],
["برترین فیلم‌ها","Top movies"],
["تازه‌های سینما","New in cinemas"],
["اندازه زیرنویس","Subtitle size"],
["صفحه اصلی فیلم","Film page"],
["بازگشت به خانه","Back home"],
["جزئیات و تریلر","Details & trailer"],
["تصویر در تصویر","Picture in picture"],
["تماشای رایگان","Watch free"],
["پخش انجام نشد","Playback failed"],
["دانلود مستقیم","Direct download"],
["پخش فیلم کامل","Play full movie"],
["چیزی پیدا نشد","Nothing found"],
["سریال کره‌ای","Korean series"],
["سریال ترکی","Turkish series"],
["ادامه بدیم؟","continue?"],
["ادامه تماشا","Resume"],
["اشتراک‌گذاری","Share"],
["۱۰ ثانیه جلو","Forward 10s"],
["۱۰ ثانیه عقب","Back 10s"],
["فیلم و سریال","Movies & series"],
["کیفیت تصویر","Video quality"],
["نمایش بیشتر","Show more"],
["لینک کپی شد","Link copied"],
["بدون یوتیوب","No YouTube"],
["پخش مستقیم","direct stream"],
["فیلم صامت (میان‌نویس)","Silent film (intertitles)"],
["کجا ببینم؟","Where to watch?"],
["محبوب‌ترین","Most popular"],
["همه ژانرها","All genres"],
["ترند امروز","Trending today"],
["مشاهده همه","See all"],
["در لیست من","In My List"],
["همه سال‌ها","All years"],
["همه نتایج","All results for"],
["بلندی صدا","Volume"],
["تمام‌صفحه","Fullscreen"],
["فقط سریال","Series only"],
["بهترین‌ها","Best rated"],
["جدیدترین","Newest"],
["خیلی بزرگ","Extra large"],
["(یوتیوب)","(YouTube)"],
["از یوتیوب","from YouTube"],
["در حال پخش","Airing"],
["پایان‌یافته","Ended"],
["سرعت پخش","Playback speed"],
["فقط فیلم","Movies only"],
["سازندگان","Creators"],
["کارگردان","Director"],
["بازیگران","Cast"],
["صفحه اثر","source page"],
["شبیه این","More like this"],
["فیلم‌ها","Movies"],
["سریال‌ها","Series"],
["فصل‌ها","Seasons"],
["لیست من","My List"],
["تنظیمات","Settings"],
["زیرنویس","Subtitles"],
["نبض فیلم","NABZ FILM"],
["نبض خبر","NABZ News"],
["اخبار روز در","Daily news on"],
["ترجمه ماشینی","machine translated"],
["آذربایجان","Azerbaijan"],
["بریتانیا","UK"],
["آمریکا","USA"],
["کانادا","Canada"],
["آلمان","Germany"],
["ترکیه","Turkey"],
["اشتراکی","Subscription"],
["رایگان","Free"],
["اجاره","Rent"],
["خرید","Buy"],
["انیمه","Anime"],
["تریلر","Trailer"],
["کیفیت","quality"],
["خاموش","Off"],
["عادی","Normal"],
["کوچک","Small"],
["بزرگ","Large"],
["ثانیه","sec"],
["دقیقه","min"],
["قسمت","episodes"],
["فصل","seasons"],
["عنوان","titles"],
["رأی","votes"],
["منبع","Source"],
["سریال","Series"],
["فیلم","Movie"],
["خانه","Home"],
["جستجو","Search"],
["پخش","Play"],
["مکث","Pause"],
["صدا","Volume"],
["فارسی","Persian"],["انگلیسی","English"],["عربی","Arabic"],["ترکی","Turkish"],["فرانسوی","French"],["اسپانیایی","Spanish"],["آلمانی","German"],
["از اول","Start over"],
["از ","From "],
["گیگ","GB"],["مگ","MB"],
["اکشن و ماجراجویی","Action"],["علمی‌تخیلی و فانتزی","Sci-Fi"],["جنگ و سیاست","War"],
...Object.entries(GENRES),
["، ",", "],["«","“"],["»","”"],["؟","?"],["٪","%"],["؛",";"],["‹","›"],
];
P.sort((a,b)=>b[0].length-a[0].length);
const FA_DIG="۰۱۲۳۴۵۶۷۸۹",LETTER=/[\u0621-\u064A\u0671-\u06D3\u06FA-\u06FF]/;
function tr(s){if(!s||!LETTER.test(s)&&!/[۰-۹،«»؟٪؛]/.test(s))return null;let o=s;for(const [a,b] of P){if(o.includes(a))o=o.split(a).join(b)}o=o.replace(/[۰-۹]/g,d=>FA_DIG.indexOf(d));if(LETTER.test(o))return null;return o===s?null:o}
const ATTR=["placeholder","title","aria-label","alt"];
function walk(n){
  if(n.nodeType===3){const t=tr(n.nodeValue);if(t!==null)n.nodeValue=t;return}
  if(n.nodeType!==1||n.tagName==="SCRIPT"||n.tagName==="STYLE"||n.hasAttribute("data-nt"))return;
  for(const a of ATTR){const v=n.getAttribute(a);if(v){const t=tr(v);if(t!==null)n.setAttribute(a,t)}}
  for(const c of n.childNodes)walk(c);
}
window.T=s=>tr(s)??s;
const run=()=>{walk(document.body);const t=tr(document.title);if(t)document.title=t};
new MutationObserver(ms=>{for(const m of ms){if(m.type==="characterData")walk(m.target);else m.addedNodes.forEach(walk);if(m.type==="attributes")walk(m.target)}const t=tr(document.title);if(t)document.title=t})
  .observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTR});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run);else run();
})();
