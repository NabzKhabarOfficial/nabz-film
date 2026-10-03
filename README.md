# نبض فیلم | NABZ FILM

کاتالوگ دوزبانه (فارسی/انگلیسی) فیلم و سریال با خلاصه داستان، بازیگران، تریلر رسمی و جای تماشای قانونی، به‌علاوه فیلم‌های کامل رایگان (مالکیت عمومی یا Creative Commons) که با پلیر اختصاصی، مستقیم از Internet Archive و بدون وابستگی به یوتیوب پخش می‌شوند.

🌐 سایت: https://nabzkhabarofficial.github.io/nabz-film/

## نحوه‌ی کار

سایت یک SPA بدون مرحله‌ی build است (`index.html` + `assets/app.js`) و داده را به این ترتیب بارگذاری می‌کند:

1. `data/list.json` — فهرست اصلی کاتالوگ (خروجی سازنده‌ی خودکار)
2. `data/t/<key>.json` — جزئیات هر عنوان، به‌صورت تنبل هنگام باز کردن صفحه
3. `catalog.json` — فقط پشتیبان قدیمی (legacy) اگر `data/list.json` در دسترس نباشد
4. `data.js` — آخرین پشتیبان آفلاین

صفحه‌های ایستای هر عنوان برای سئو در `t/` (فارسی) و `en/t/` (انگلیسی) ساخته می‌شوند.

## ساختار

- `index.html` ، `assets/` (اپ، پلیر، i18n، استایل)
- `data/` داده‌ی کاتالوگ و جزئیات
- `t/` و `en/t/` صفحه‌های ایستای عناوین
- `scripts/build_catalog.py` سازنده‌ی کاتالوگ
- `sitemap.xml` ، `robots.txt` ، `manifest.webmanifest` ، `404.html`
- `app.js` (ریشه) و `catalog.json` نسخه‌ی قدیمی v1 هستند و فقط برای سازگاری نگه داشته شده‌اند

## خودکارسازی

- `.github/workflows/update-catalog.yml` هر ۶ ساعت کاتالوگ را از TMDB و Internet Archive می‌سازد، خلاصه‌های فارسی را ترجمه می‌کند، `data/` و `t/` و `en/` و `sitemap.xml` را کامیت و سایت را منتشر می‌کند.
- `.github/workflows/deploy.yml` فایل‌های کلیدی را بررسی و روی GitHub Pages منتشر می‌کند.

سکرت‌های لازم: `TMDB_TOKEN` و `GROQ_API_KEY` (برای ترجمه‌ی خلاصه‌ها).

اجرای محلی سازنده:

```bash
python scripts/build_catalog.py --out .
```

## سیاست محتوا

- پخش کامل فقط برای آثار مالکیت عمومی یا دارای مجوز Creative Commons.
- برای سایر عناوین فقط تریلر رسمی و لینک سرویس‌های قانونی (JustWatch از طریق TMDB).
- هیچ فایل غیرمجازی در سایت قرار نمی‌گیرد.

This product uses the TMDB API but is not endorsed or certified by TMDB. Streaming availability data is provided by JustWatch.
