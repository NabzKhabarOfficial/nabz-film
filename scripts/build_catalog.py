#!/usr/bin/env python3
"""NABZ FILM catalog builder.

Builds a light list for the app, one detail file per title, a static SEO page
per title and a full sitemap.

Sources:
* TMDB (metadata, posters, cast, trailers, seasons, legal watch providers).
* Internet Archive feature-film and cartoon collections (public-domain films).
  For every film the builder reads Archive's file list and stores the direct
  MP4 files in every available quality plus any subtitle files, so the site's
  own NABZ player plays them. Nothing depends on YouTube.
* Blender open movies (Creative Commons), also played from their Archive copies.
* Optional: English subtitles are machine-translated to Persian when an AI key
  (GROQ_API_KEY or AI_API_KEY for Gemini) is set; a few films per run.

Run in GitHub Actions with TMDB_TOKEN set. Without a token (or with
--from-legacy catalog.json) it converts an existing catalog instead.
"""

import argparse
import html
import json
import os
import re
import shutil
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

SITE = "https://nabzkhabarofficial.github.io/nabz-film/"
CHANNEL = "https://t.me/NabzKhabarOfficial"
IMG = "https://image.tmdb.org/t/p/"
BASE = "https://api.themoviedb.org/3"
REGIONS = ("US", "GB", "CA", "DE", "TR", "AZ")
MIN_VOTES = 200  # Bayesian prior: a title needs votes before it can top the list

GNAME = {
    "Action": "اکشن", "Adventure": "ماجراجویی", "Animation": "انیمیشن", "Comedy": "کمدی",
    "Crime": "جنایی", "Documentary": "مستند", "Drama": "درام", "Family": "خانوادگی",
    "Fantasy": "فانتزی", "History": "تاریخی", "Horror": "ترسناک", "Music": "موسیقی",
    "Mystery": "معمایی", "Romance": "عاشقانه", "Science Fiction": "علمی‌تخیلی",
    "Thriller": "هیجان‌انگیز", "War": "جنگی", "Western": "وسترن",
    "Action & Adventure": "اکشن", "Sci-Fi & Fantasy": "علمی‌تخیلی", "War & Politics": "جنگی",
    "TV Movie": "فیلم تلویزیونی", "Kids": "کودک", "Reality": "واقع‌نما", "Soap": "درام",
    "Talk": "گفتگو محور", "News": "خبری",
}
# Persian TMDB genre names are normalised to the same short set.
GFA = {"اکشن و ماجراجویی": "اکشن", "علمی-تخیلی": "علمی‌تخیلی", "علمی تخیلی": "علمی‌تخیلی",
       "علمی‌تخیلی و فانتزی": "علمی‌تخیلی", "جنگ و سیاست": "جنگی", "مهیج": "هیجان‌انگیز",
       "رازآلود": "معمایی", "ماجرایی": "ماجراجویی", "درام ": "درام"}

ARCHIVE_GENRES = (
    ("comedy", "کمدی"), ("horror", "ترسناک"), ("western", "وسترن"), ("noir", "جنایی"),
    ("crime", "جنایی"), ("mystery", "معمایی"), ("drama", "درام"), ("science fiction", "علمی‌تخیلی"),
    ("sci-fi", "علمی‌تخیلی"), ("war", "جنگی"), ("romance", "عاشقانه"), ("cartoon", "انیمیشن"),
    ("animation", "انیمیشن"), ("documentary", "مستند"), ("adventure", "ماجراجویی"),
    ("thriller", "هیجان‌انگیز"), ("musical", "موسیقی"), ("silent", "صامت"),
)

OPEN_MOVIES = [
    ("open-big-buck-bunny", "Big Buck Bunny", "باک بانی بزرگ", 2008, ["انیمیشن", "کمدی"],
     "خرگوش غول‌پیکر و مهربانی که آرامشش را سه جونده‌ی مزاحم به هم می‌زنند، تصمیم می‌گیرد حسابشان را برسد."),
    ("open-elephants-dream", "Elephants Dream", "رویای فیل‌ها", 2006, ["انیمیشن", "علمی‌تخیلی"],
     "دو شخصیت در دنیایی مکانیکی و سورئال سرگردان‌اند؛ نخستین فیلم آزاد پروژه Open Movie بلندر."),
    ("open-sintel", "Sintel", "سینتل", 2010, ["انیمیشن", "فانتزی", "ماجراجویی"],
     "دختری تنها برای پیدا کردن بچه‌اژدهایی که نجاتش داده بود، به سفری خطرناک می‌رود."),
    ("open-tears-of-steel", "Tears of Steel", "اشک‌های فولادی", 2012, ["علمی‌تخیلی", "اکشن"],
     "گروهی از دانشمندان در آمستردامِ آینده تلاش می‌کنند جهان را از ربات‌های ویرانگر نجات دهند."),
    ("open-cosmos-laundromat", "Cosmos Laundromat", "رخت‌شوی‌خانه کیهان", 2015, ["انیمیشن", "کمدی", "فانتزی"],
     "گوسفندی ناامید در جزیره‌ای دورافتاده با فروشنده‌ای عجیب آشنا می‌شود که زندگی‌های دیگری به او پیشنهاد می‌دهد."),
    ("open-spring", "Spring", "بهار", 2019, ["انیمیشن", "فانتزی"],
     "دختری چوپان و سگش با ارواح باستانی روبه‌رو می‌شوند تا چرخه زندگی دوباره آغاز شود."),
    ("open-agent-327", "Agent 327: Operation Barbershop", "مأمور ۳۲۷: عملیات آرایشگاه", 2017, ["انیمیشن", "اکشن", "کمدی"],
     "مأمور مخفی هلندی برای کشف یک توطئه وارد آرایشگاهی مشکوک می‌شود."),
]

OPEN_EN = {
    "open-big-buck-bunny": "A giant, gentle rabbit takes revenge on three bullying rodents who ruin his peaceful day.",
    "open-elephants-dream": "Two men wander through a surreal mechanical world; the first Blender Open Movie.",
    "open-sintel": "A lonely girl sets out on a dangerous journey to find the baby dragon she once saved.",
    "open-tears-of-steel": "In a future Amsterdam, a group of scientists tries to save the world from destructive robots.",
    "open-cosmos-laundromat": "A suicidal sheep on a desolate island meets a strange salesman who offers him other lives.",
    "open-spring": "A shepherd girl and her dog face ancient spirits to continue the cycle of life.",
    "open-agent-327": "Dutch secret agent 327 investigates a suspicious barbershop to uncover a conspiracy.",
}

# Extra TMDB lists (endpoint, type, tag, params, pages)
LISTS = [
    ("/trending/movie/day", "m", "trend", {}, 5),
    ("/trending/tv/day", "s", "trend", {}, 5),
    ("/movie/popular", "m", "popular", {}, 8),
    ("/tv/popular", "s", "popular", {}, 8),
    ("/movie/top_rated", "m", "top", {}, 8),
    ("/tv/top_rated", "s", "top", {}, 8),
    ("/movie/now_playing", "m", "new", {}, 3),
    ("/discover/movie", "m", "iran", {"with_original_language": "fa", "sort_by": "popularity.desc"}, 4),
    ("/discover/tv", "s", "iran", {"with_original_language": "fa", "sort_by": "popularity.desc"}, 2),
    ("/discover/tv", "s", "korea", {"with_original_language": "ko", "sort_by": "popularity.desc", "vote_count.gte": 50}, 3),
    ("/discover/tv", "s", "turkey", {"with_original_language": "tr", "sort_by": "popularity.desc", "vote_count.gte": 20}, 3),
    ("/discover/tv", "s", "anime", {"with_original_language": "ja", "with_genres": "16", "sort_by": "popularity.desc"}, 3),
    ("/discover/movie", "m", "anime", {"with_original_language": "ja", "with_genres": "16", "sort_by": "popularity.desc"}, 2),
]


# --------------------------------------------------------------------------
# HTTP helpers
# --------------------------------------------------------------------------

def _http_json(url, headers=None, timeout=30, tries=3):
    last = None
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers=headers or {"User-Agent": "nabz-film/2.0"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.load(r)
        except Exception as exc:  # network hiccups / 429
            last = exc
            time.sleep(1.5 * (attempt + 1))
    raise last


class TMDB:
    def __init__(self, token):
        self.head = {"Authorization": f"Bearer {token}", "accept": "application/json",
                     "User-Agent": "nabz-film/2.0"}

    def get(self, path, params=None):
        url = BASE + path + "?" + urllib.parse.urlencode(params or {})
        time.sleep(0.04)
        return _http_json(url, self.head)


# --------------------------------------------------------------------------
# Normalisation
# --------------------------------------------------------------------------

def genre_fa(name):
    name = str(name or "").strip()
    name = GNAME.get(name, name)
    return GFA.get(name, name)


def weighted(rating, votes, mean=6.8, m=MIN_VOTES):
    rating, votes = float(rating or 0), float(votes or 0)
    if votes <= 0:
        return 0.0
    return round((votes / (votes + m)) * rating + (m / (votes + m)) * mean, 3)


def year_of(date):
    date = str(date or "")
    return int(date[:4]) if date[:4].isdigit() else None


def safe_key(value):
    return re.sub(r"[^A-Za-z0-9._-]+", "-", str(value)).strip("-")[:90]


def strip_html(text):
    text = re.sub(r"<[^>]+>", " ", str(text or ""))
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


# --------------------------------------------------------------------------
# Collectors
# --------------------------------------------------------------------------

def collect_tmdb(api):
    picked = {}  # (type, id) -> set(tags)
    rank = {}
    for path, typ, tag, params, pages in LISTS:
        for page_no in range(1, pages + 1):
            try:
                page = api.get(path, {"language": "fa-IR", "page": page_no, **params})
            except Exception as exc:
                print(f"list skip {path} p{page_no}: {exc}")
                break
            for i, x in enumerate(page.get("results", [])):
                if not x.get("id"):
                    continue
                k = (typ, x["id"])
                picked.setdefault(k, set()).add(tag)
                if tag == "trend":
                    rank.setdefault(k, (page_no - 1) * 20 + i)
            if page_no >= int(page.get("total_pages") or 1):
                break
    print(f"TMDB candidates: {len(picked)}")
    out = []
    for n, ((typ, tid), tags) in enumerate(picked.items()):
        try:
            out.append(tmdb_title(api, typ, tid, tags, rank.get((typ, tid))))
        except Exception as exc:
            print(f"skip {typ}{tid}: {exc}")
        if n and n % 100 == 0:
            print(f"  ... {n} titles")
    return [x for x in out if x]


def tmdb_title(api, typ, tid, tags, trend_rank):
    path = f"/movie/{tid}" if typ == "m" else f"/tv/{tid}"
    d = api.get(path, {"language": "fa-IR", "include_video_language": "fa,en,null",
                       "append_to_response": "credits,videos,recommendations,watch/providers"})
    fa = d.get("title") or d.get("name") or ""
    en = d.get("original_title") or d.get("original_name") or fa
    overview = (d.get("overview") or "").strip()
    tagline = (d.get("tagline") or "").strip()
    title_en, overview_en, tagline_en = "", "", ""
    try:  # English data for the English version of the site
        e = api.get(path, {"language": "en-US", "append_to_response": "credits"})
        title_en = e.get("title") or e.get("name") or ""
        overview_en = (e.get("overview") or "").strip()
        tagline_en = (e.get("tagline") or "").strip()
    except Exception:
        e = {}
    ec = e.get("credits") or {}
    en_names = {p["id"]: p["name"] for p in ec.get("cast", []) + ec.get("crew", []) if p.get("id") and p.get("name")}
    for p in e.get("created_by", []) or []:
        if p.get("id") and p.get("name"):
            en_names[p["id"]] = p["name"]
    if not overview:
        overview = overview_en
    if not fa:
        fa = title_en or en
    if not (fa or en):
        return None
    if not d.get("poster_path"):
        return None
    credits = d.get("credits") or {}
    cast = []
    for p in credits.get("cast", [])[:12]:
        if not p.get("name"):
            continue
        c = {"name": p["name"], "role": p.get("character", ""), "photo": p.get("profile_path") or ""}
        if en_names.get(p.get("id")) and en_names[p["id"]] != p["name"]:
            c["en"] = en_names[p["id"]]
        cast.append(c)
    crew, crew_en = [], []
    people = [p for p in credits.get("crew", []) if p.get("job") == "Director"] + list(d.get("created_by", []) or [])
    for p in people:
        if p.get("name") and p["name"] not in crew:
            crew.append(p["name"])
            crew_en.append(en_names.get(p.get("id")) or p["name"])
    trailer = ""
    vids = (d.get("videos") or {}).get("results", [])
    for want in ("Trailer", "Teaser"):
        for v in vids:
            if v.get("site") == "YouTube" and v.get("type") == want and v.get("key"):
                trailer = v["key"]
                break
        if trailer:
            break
    watch = {}
    wp = (d.get("watch/providers") or {}).get("results", {})
    for rc in REGIONS:
        rr = wp.get(rc) or {}
        names = []
        for bucket in ("flatrate", "free", "ads", "rent", "buy"):
            for p in rr.get(bucket, []) or []:
                nm = p.get("provider_name")
                if nm and nm not in [x["n"] for x in names]:
                    names.append({"n": nm, "kind": bucket, "logo": p.get("logo_path") or ""})
        if names:
            watch[rc] = {"link": rr.get("link", ""), "p": names[:8]}
    seasons = []
    for s in d.get("seasons", []) or []:
        if s.get("season_number") is None:
            continue
        seasons.append({"n": s["season_number"], "name": s.get("name") or f"فصل {s['season_number']}",
                        "ep": s.get("episode_count") or 0, "y": year_of(s.get("air_date")),
                        "poster": s.get("poster_path") or ""})
    recs = [("m" if (r.get("media_type") or ("movie" if typ == "m" else "tv")) == "movie" else "s") + str(r["id"])
            for r in (d.get("recommendations") or {}).get("results", [])[:16] if r.get("id")]
    date = d.get("release_date") or d.get("first_air_date") or ""
    genres = []
    for g in d.get("genres", []) or []:
        name = genre_fa(g.get("name"))
        if name and name not in genres:
            genres.append(name)
    if d.get("original_language") == "fa":
        tags = set(tags) | {"iran"}
    item = {
        "k": f"{typ}{tid}", "t": typ, "fa": fa or en, "en": en, "y": year_of(date),
        "g": genres, "r": round(float(d.get("vote_average") or 0), 1),
        "v": int(d.get("vote_count") or 0), "pop": round(float(d.get("popularity") or 0), 1),
        "p": d.get("poster_path") or "", "b": d.get("backdrop_path") or "",
        "lang": d.get("original_language") or "", "tags": sorted(tags),
        "ten": title_en if title_en and title_en != en else "",
    }
    if trend_rank is not None:
        item["tr"] = trend_rank
    item["w"] = weighted(item["r"], item["v"])
    item["_detail"] = {
        "overview": overview, "tagline": tagline,
        "overview_en": overview_en if overview_en != overview else "", "tagline_en": tagline_en,
        "runtime": d.get("runtime") or (d.get("episode_run_time") or [None])[0],
        "status": d.get("status") or "", "seasons": seasons,
        "episodes": d.get("number_of_episodes"), "crew": crew[:4],
        "crew_en": crew_en[:4] if crew_en != crew else [],
        "countries": [c.get("iso_3166_1") for c in d.get("production_countries", []) or []][:3],
        "cast": cast, "trailer": trailer, "watch": watch, "recs": recs,
        "tmdb": f"https://www.themoviedb.org/{'movie' if typ == 'm' else 'tv'}/{tid}",
    }
    return item


def archive_genres(subjects):
    text = " ".join(subjects if isinstance(subjects, list) else [str(subjects or "")]).lower()
    out = []
    for word, fa in ARCHIVE_GENRES:
        if word in text and fa not in out:
            out.append(fa)
    return out[:3] or ["کلاسیک"]


def collect_archive():
    queries = [
        ("collection:(feature_films) AND mediatype:(movies)", 700, None),
        ("collection:(classic_cartoons) AND mediatype:(movies)", 200, "انیمیشن"),
        ('mediatype:(movies) AND licenseurl:(*publicdomain*) AND -collection:(feature_films)', 120, None),
    ]
    out, seen = [], set()
    for q, rows, forced in queries:
        params = [("q", q), ("rows", rows), ("page", 1), ("output", "json"), ("sort[]", "downloads desc")]
        for f in ("identifier", "title", "year", "date", "description", "downloads", "subject", "runtime"):
            params.append(("fl[]", f))
        url = "https://archive.org/advancedsearch.php?" + urllib.parse.urlencode(params)
        try:
            docs = _http_json(url).get("response", {}).get("docs", [])
        except Exception as exc:
            print(f"Internet Archive skip ({q[:30]}): {exc}")
            continue
        for x in docs:
            ident = x.get("identifier")
            if not ident or ident in seen:
                continue
            seen.add(ident)
            title = strip_html(x.get("title") or ident)
            if isinstance(x.get("title"), list):
                title = strip_html(x["title"][0])
            desc = x.get("description")
            if isinstance(desc, list):
                desc = " ".join(map(str, desc))
            y = year_of(x.get("year")) or year_of(x.get("date"))
            genres = archive_genres(x.get("subject"))
            if forced and forced not in genres:
                genres = [forced] + genres[:2]
            key = "ia-" + safe_key(ident)
            item = {
                "k": key, "t": "m", "fa": title, "en": title, "y": y, "g": genres,
                "r": 0, "v": 0, "pop": int(x.get("downloads") or 0), "w": 0,
                "p": f"https://archive.org/services/img/{urllib.parse.quote(ident)}",
                "b": "", "lang": "en", "tags": ["free", "classic"], "play": 1,
                "_subj": " ".join(x.get("subject") if isinstance(x.get("subject"), list) else [str(x.get("subject") or "")]),
            }
            item["_detail"] = {
                "overview": strip_html(desc)[:1200] or "فیلم کلاسیک با مالکیت عمومی از آرشیو اینترنت.",
                "embed": f"https://archive.org/embed/{urllib.parse.quote(ident)}",
                "source": "Internet Archive · مالکیت عمومی",
                "source_url": f"https://archive.org/details/{urllib.parse.quote(ident)}",
                "runtime": None, "cast": [], "recs": [], "watch": {}, "seasons": [],
                "ia": ident, "silent": "silent" in item["_subj"].lower(),
            }
            out.append(item)
    print(f"Internet Archive playable titles: {len(out)}")
    return out


EXPLOITATION = re.compile(
    r"(?:\bsex\b|sexual|nudity|nudist|burlesque|stag film|striptease|exploitation|erotic|"
    r"\bvice\b|hygiene film|reefer|marihuana|marijuana|venereal|pin-?up|peep)", re.I)
MIN_ARCHIVE_VOTES = 15
MIN_ARCHIVE_RATING = 5.8


def _clean_title(title):
    t = re.sub(r"\((?:19|20)\d\d\)", " ", str(title or ""))
    t = re.sub(r"\[.*?\]", " ", t)
    t = re.split(r"\s[-–|:]\s", t)[0] if len(t) > 40 else t
    return re.sub(r"\s+", " ", t).strip()


def _simple(t):
    return re.sub(r"[^a-z0-9]+", "", str(t or "").lower())


def enrich_archive(api, archive, tmdb_items):
    """Match Archive films to TMDB: Persian title/overview, poster, rating.

    Unmatched, low-rated or exploitation titles are dropped, so the free
    section only shows real, watchable classics. If the film is already in
    the TMDB catalog, the player is attached to that entry instead.
    """
    try:
        gl = api.get("/genre/movie/list", {"language": "fa-IR"}).get("genres", [])
        gmap = {g["id"]: genre_fa(g["name"]) for g in gl}
    except Exception:
        gmap = {}
    by_key = {x["k"]: x for x in tmdb_items}
    kept, merged, dropped = [], 0, 0
    used = set()
    for a in archive:
        title = _clean_title(a["en"])
        if EXPLOITATION.search(title + " " + a.get("_subj", "")):
            dropped += 1
            continue
        params = {"query": title, "language": "fa-IR", "include_adult": "false"}
        if a.get("y"):
            params["year"] = a["y"]
        try:
            res = api.get("/search/movie", params).get("results", [])
            if not res and a.get("y"):
                params.pop("year")
                res = api.get("/search/movie", params).get("results", [])
        except Exception:
            res = []
        hit = None
        want = _simple(title)
        for r in res[:5]:
            names = {_simple(r.get("original_title")), _simple(r.get("title"))}
            ry = year_of(r.get("release_date"))
            close_year = not a.get("y") or not ry or abs(ry - a["y"]) <= 1
            if close_year and any(n and (n == want or (len(want) > 5 and (want in n or n in want))) for n in names):
                hit = r
                break
        if not hit or hit.get("adult"):
            dropped += 1
            continue
        votes, rating = int(hit.get("vote_count") or 0), float(hit.get("vote_average") or 0)
        if votes < MIN_ARCHIVE_VOTES or rating < MIN_ARCHIVE_RATING:
            dropped += 1
            continue
        key = f"m{hit['id']}"
        if key in used:
            dropped += 1
            continue
        used.add(key)
        det = a["_detail"]
        if key in by_key:  # already in the catalog: make that entry playable
            t = by_key[key]
            t["play"] = 1
            t["tags"] = sorted(set(t.get("tags", [])) | {"free", "classic"})
            t["_detail"].update({k: det[k] for k in ("embed", "source", "source_url", "ia", "silent")})
            merged += 1
            continue
        overview = (hit.get("overview") or "").strip()
        if not overview:
            try:
                overview = (api.get(f"/movie/{hit['id']}", {"language": "en-US"}).get("overview") or "").strip()
            except Exception:
                overview = ""
        a.update({
            "fa": hit.get("title") or a["fa"], "en": hit.get("original_title") or a["en"],
            "y": year_of(hit.get("release_date")) or a.get("y"),
            "g": [gmap[g] for g in hit.get("genre_ids", []) if g in gmap][:3] or a["g"],
            "r": round(rating, 1), "v": votes, "w": weighted(rating, votes),
            "p": hit.get("poster_path") or a["p"], "b": hit.get("backdrop_path") or "",
        })
        det["overview_en"] = det["overview"] if re.search(r"[A-Za-z]{4}", det["overview"]) else ""
        det["overview"] = overview or det["overview"]
        det["tmdb"] = f"https://www.themoviedb.org/movie/{hit['id']}"
        kept.append(a)
    for a in kept:
        a.pop("_subj", None)
    print(f"Archive enrichment: kept {len(kept)}, merged into catalog {merged}, dropped {dropped}")
    return kept


def collect_open_movies(api=None):
    """Blender open movies, played from their Internet Archive copies."""
    out = []
    for key, en, fa, year, genres, overview in OPEN_MOVIES:
        q = f'title:("{en.split(":")[0]}") AND mediatype:(movies)'
        params = [("q", q), ("rows", 6), ("output", "json"), ("sort[]", "downloads desc"), ("fl[]", "identifier")]
        try:
            idents = [d["identifier"] for d in _http_json(
                "https://archive.org/advancedsearch.php?" + urllib.parse.urlencode(params)).get("response", {}).get("docs", [])]
        except Exception as exc:
            print(f"Open movie search failed ({en}): {exc}")
            idents = []
        poster, backdrop, rating, votes = "", "", 0, 0
        if api:
            try:
                hit = (api.get("/search/movie", {"query": en, "year": year}).get("results") or [None])[0]
                if hit:
                    poster, backdrop = hit.get("poster_path") or "", hit.get("backdrop_path") or ""
                    rating, votes = round(float(hit.get("vote_average") or 0), 1), int(hit.get("vote_count") or 0)
            except Exception:
                pass
        out.append({
            "k": key, "t": "m", "fa": fa, "en": en, "y": year, "g": genres, "r": rating, "v": votes,
            "pop": 10 ** 7, "w": 0, "p": poster or (f"https://archive.org/services/img/{idents[0]}" if idents else ""),
            "b": backdrop, "lang": "en", "tags": ["free", "open"], "play": 1,
            "_detail": {"overview": overview, "overview_en": OPEN_EN.get(key, ""), "ia_candidates": idents,
                        "source": "Blender Foundation · Creative Commons",
                        "source_url": "https://studio.blender.org/films/",
                        "cast": [], "recs": [], "watch": {}, "seasons": [], "runtime": None},
        })
    return out


# --------------------------------------------------------------------------
# Direct media files (qualities + subtitles) from Internet Archive
# --------------------------------------------------------------------------

VIDEO_FORMATS = ("h.264", "512kb mpeg4", "mpeg4", "h.264 ia", "hires mpeg4", "h.264 hd", "mp4")
SUB_LANGS = (("fa", ("fa", "fas", "per", "persian", "farsi")), ("en", ("en", "eng", "english")),
             ("ar", ("ar", "ara", "arabic")), ("tr", ("tr", "tur", "turkish")),
             ("fr", ("fr", "fre", "fra", "french")), ("es", ("es", "spa", "spanish")),
             ("de", ("de", "ger", "deu", "german")))
LANG_FA = {"fa": "فارسی", "en": "انگلیسی", "ar": "عربی", "tr": "ترکی", "fr": "فرانسوی",
           "es": "اسپانیایی", "de": "آلمانی", "xx": "زیرنویس"}
ARCHIVE_DL = "https://archive.org/download/"


def _length(v):
    if v in (None, ""):
        return 0.0
    try:
        return float(v)
    except (TypeError, ValueError):
        pass
    parts = [p for p in str(v).split(":") if p.strip()]
    try:
        sec = 0.0
        for p in parts:
            sec = sec * 60 + float(p)
        return sec
    except ValueError:
        return 0.0


def quality_label(w, h, fmt):
    w, h = int(float(w or 0)), int(float(h or 0))
    eff = max(h, int(w * 9 / 16)) if w else h
    if not eff:
        eff = 240 if "512kb" in fmt else 480
    for cut, lab in ((1000, 1080), (650, 720), (430, 480), (300, 360)):
        if eff >= cut:
            return f"{lab}p", lab
    return "240p", 240


def _sub_lang(name):
    base = re.sub(r"\.(srt|vtt)$", "", name.lower())
    toks = set(re.split(r"[^a-z]+", base))
    for code, words in SUB_LANGS:
        if toks & set(words):
            return code
    return "xx"


def archive_media(ident):
    """Return (sources, subtitle_files, duration_sec) for an Archive item."""
    try:
        files = _http_json(f"https://archive.org/metadata/{urllib.parse.quote(ident)}/files", timeout=25, tries=2).get("result", [])
    except Exception:
        return [], [], 0
    vids = []
    for f in files:
        name, fmt = str(f.get("name") or ""), str(f.get("format") or "").lower()
        if not name.lower().endswith(".mp4") or ".thumbs/" in name.lower():
            continue
        if fmt and not any(fmt == v or fmt.startswith(v) for v in VIDEO_FORMATS):
            continue
        vids.append({"name": name, "fmt": fmt, "len": _length(f.get("length")), "size": int(f.get("size") or 0),
                     "w": f.get("width"), "h": f.get("height"), "root": f.get("original") or name})
    if not vids:
        return [], [], 0
    longest = max(v["len"] for v in vids) or 0
    if longest:
        vids = [v for v in vids if v["len"] >= longest * 0.85 or not v["len"]]
    # Multi-reel uploads (part 1, part 2...) cannot be shown as one film: keep the main one.
    roots = {}
    for v in vids:
        roots.setdefault(v["root"], []).append(v)
    best_root = sorted(roots, key=lambda r: ("surround" in r.lower(), -max(x["len"] for x in roots[r]),
                                             -max(x["size"] for x in roots[r])))[0]
    by_label = {}
    for v in sorted(roots[best_root] + [x for r, xs in roots.items() if r != best_root for x in xs],
                    key=lambda v: ("surround" in v["name"].lower(), v["root"] != best_root, -("h.264" in v["fmt"]))):
        label, h = quality_label(v["w"], v["h"], v["fmt"])
        if label in by_label:
            continue
        by_label[label] = {"src": ARCHIVE_DL + urllib.parse.quote(ident) + "/" + urllib.parse.quote(v["name"]),
                           "label": label, "h": h, "size": v["size"]}
    sources = sorted(by_label.values(), key=lambda s: -s["h"])
    subs = []
    for f in files:
        name = str(f.get("name") or "")
        if not re.search(r"\.(srt|vtt)$", name, re.I) or int(f.get("size") or 0) >= 2_000_000:
            continue
        # Archive's automatic speech-recognition subtitles are mostly nonsense.
        if re.search(r"(?:^|[._ -])asr(?:[._ -]|$)", name, re.I) or "speech recognition" in str(f.get("format", "")).lower():
            continue
        subs.append((name, _sub_lang(name)))
    return sources, subs, longest


def srt_to_vtt(text):
    text = text.replace("\ufeff", "").replace("\r\n", "\n").replace("\r", "\n")
    is_vtt = text.lstrip().startswith("WEBVTT")
    text = re.sub(r"(\d\d:\d\d:\d\d)[,.](\d{1,3})(?!\d)",
                  lambda m: f"{m.group(1)}.{m.group(2).ljust(3, '0')}", text)
    if is_vtt:
        return text
    text = re.sub(r"(?m)^\d+\s*\n(?=\d\d:\d\d)", "", text)
    return "WEBVTT\n\n" + text.strip() + "\n"


def _http_text(url, timeout=30):
    req = urllib.request.Request(url, headers={"User-Agent": "nabz-film/2.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        raw = r.read()
    for enc in ("utf-8-sig", "cp1256", "latin-1"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", "ignore")


def _probe(item):
    det = item["_detail"]
    if det.get("ia"):
        sources, subs, dur = archive_media(det["ia"])
        return (item, det["ia"], sources, subs, dur) if sources else (item, None, [], [], 0)
    best = (item, None, [], [], 0)
    for ident in det.get("ia_candidates", [])[:4]:  # open movies: pick the copy with the most qualities
        sources, subs, dur = archive_media(ident)
        if sources and (len(sources), sources[0]["h"], len(subs)) > (len(best[2]), best[2][0]["h"] if best[2] else 0, len(best[3])):
            best = (item, ident, sources, subs, dur)
    return best


def list_subs(key, sub_dir):
    """Subtitle files on disk for a title (Persian machine translations are kept between runs)."""
    out = []
    for lang in ("fa", "en", "ar", "tr", "fr", "es", "de", "xx"):
        path = os.path.join(sub_dir, f"{key}.{lang}.vtt")
        if os.path.exists(path):
            label = LANG_FA[lang]
            if lang == "fa" and os.path.exists(path + ".ai"):
                label = "فارسی (ترجمه ماشینی)"
            out.append({"src": f"data/sub/{key}.{lang}.vtt", "lang": lang, "label": label})
    return out


def refresh_subs(items, out_dir):
    sub_dir = os.path.join(out_dir, "data", "sub")
    for x in items:
        det = x.get("_detail") or {}
        if det.get("sources"):
            det["subs"] = list_subs(x["k"], sub_dir)


def attach_media(items, out_dir):
    """Give every playable title direct MP4 sources; drop titles with no playable file."""
    targets = [x for x in items if x.get("_detail", {}).get("ia") or x.get("_detail", {}).get("ia_candidates")]
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(_probe, targets))
    sub_dir = os.path.join(out_dir, "data", "sub")
    os.makedirs(sub_dir, exist_ok=True)
    for name in os.listdir(sub_dir):  # re-fetched below; drops old speech-recognition files
        if name.endswith(".xx.vtt"):
            os.remove(os.path.join(sub_dir, name))
    ok, dead, nsubs = 0, set(), 0
    for item, ident, sources, subs, dur in results:
        det = item["_detail"]
        det.pop("ia_candidates", None)
        if not sources:
            if item["k"].startswith(("ia-", "open-")):
                dead.add(item["k"])
            else:  # TMDB title whose Archive copy has no file: back to info-only
                item["play"] = 0
                item["tags"] = [t for t in item.get("tags", []) if t not in ("free", "classic")]
                for k in ("embed", "ia", "source", "source_url"):
                    det.pop(k, None)
            continue
        ok += 1
        det["ia"] = ident
        det["sources"] = sources
        det.pop("embed", None)
        det["source_url"] = det.get("source_url") if item["k"].startswith("open-") else f"https://archive.org/details/{urllib.parse.quote(ident)}"
        if dur and not det.get("runtime"):
            det["runtime"] = int(round(dur / 60))
        det["subs"] = []
        seen = set()
        for name, lang in subs[:6]:
            if lang in seen:
                continue
            path = os.path.join(sub_dir, f"{item['k']}.{lang}.vtt")
            try:
                if os.path.exists(path):
                    fixed = srt_to_vtt(open(path, encoding="utf-8").read())
                    with open(path, "w", encoding="utf-8") as fh:
                        fh.write(fixed)
                else:
                    vtt = srt_to_vtt(_http_text(ARCHIVE_DL + urllib.parse.quote(ident) + "/" + urllib.parse.quote(name)))
                    if "-->" not in vtt:
                        continue
                    with open(path, "w", encoding="utf-8") as fh:
                        fh.write(vtt)
            except Exception:
                continue
            seen.add(lang)
        det["subs"] = list_subs(item["k"], sub_dir)
        nsubs += bool(det["subs"])
    print(f"Direct media: {ok} playable, {len(dead)} dropped (no MP4), {nsubs} with subtitles")
    return [x for x in items if x["k"] not in dead]


# --------------------------------------------------------------------------
# Optional Persian subtitle translation (Groq or Gemini)
# --------------------------------------------------------------------------

def _ai_translate(lines):
    prompt = ("Translate these film subtitle lines into natural, fluent Persian (Farsi) for Iranian viewers. "
              "Keep the numbering exactly, one line per number, no explanations.\n\n"
              + "\n".join(f"{i + 1}. {t}" for i, t in enumerate(lines)))
    groq, gem = os.environ.get("GROQ_API_KEY", "").strip(), os.environ.get("AI_API_KEY", "").strip()
    if groq:
        out = None
        models = [m for m in (os.environ.get("GROQ_MODEL", ""), "openai/gpt-oss-120b", "openai/gpt-oss-20b") if m]
        for n, model in enumerate(models):  # Groq retires models often: fall through to the next one
            body = {"model": model, "temperature": 0.2, "messages": [{"role": "user", "content": prompt}]}
            if model.startswith("openai/gpt-oss"):
                body["reasoning_effort"] = "low"
            req = urllib.request.Request("https://api.groq.com/openai/v1/chat/completions", data=json.dumps(body).encode(),
                                         headers={"Authorization": f"Bearer {groq}", "Content-Type": "application/json",
                                                  "User-Agent": "nabz-film/2.0"})
            try:
                with urllib.request.urlopen(req, timeout=120) as r:
                    out = json.load(r)["choices"][0]["message"]["content"]
                break
            except urllib.error.HTTPError as he:
                if he.code in (400, 404) and n < len(models) - 1:
                    continue
                raise
    elif gem:
        body = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.2}}
        model = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
        req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gem}",
                                     data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=90) as r:
            out = json.load(r)["candidates"][0]["content"]["parts"][0]["text"]
    else:
        return None
    got = {}
    for line in out.splitlines():
        m = re.match(r"\s*(\d+)[.)\-:]\s*(.+)", line)
        if m:
            got[int(m.group(1)) - 1] = m.group(2).strip()
    return [got.get(i, lines[i]) for i in range(len(lines))]


STATUS = {"translated": [], "translation_errors": []}


def write_status(out_dir, meta):
    """Small public build report (no secrets) so problems can be checked without opening the Actions log."""
    sub_dir = os.path.join(out_dir, "data", "sub")
    subs = sorted(os.listdir(sub_dir)) if os.path.isdir(sub_dir) else []
    rep = {"built": meta.get("built"), "count": meta.get("count"), "free": meta.get("free"),
           "ai_key": "groq" if os.environ.get("GROQ_API_KEY") else ("gemini" if os.environ.get("AI_API_KEY") else "none"),
           "subtitle_files": len([n for n in subs if n.endswith(".vtt")]),
           "en_subtitles": [n for n in subs if n.endswith(".en.vtt")][:50],
           "fa_subtitles": [n for n in subs if n.endswith(".fa.vtt")][:50], **STATUS}
    with open(os.path.join(out_dir, "data", "status.json"), "w", encoding="utf-8") as fh:
        json.dump(rep, fh, ensure_ascii=False, indent=1)


def translate_subs(out_dir, budget_files=3, budget_sec=600):
    if not (os.environ.get("GROQ_API_KEY") or os.environ.get("AI_API_KEY")):
        print("Persian subtitle translation: no AI key, skipped")
        return 0
    sub_dir = os.path.join(out_dir, "data", "sub")
    if not os.path.isdir(sub_dir):
        return 0
    started, done = time.time(), 0
    for name in sorted(os.listdir(sub_dir)):
        if not name.endswith(".en.vtt") or done >= budget_files or time.time() - started > budget_sec:
            continue
        fa_path = os.path.join(sub_dir, name.replace(".en.vtt", ".fa.vtt"))
        if os.path.exists(fa_path):
            continue
        blocks = open(os.path.join(sub_dir, name), encoding="utf-8").read().split("\n\n")
        cues = [(i, b.split("\n")) for i, b in enumerate(blocks) if "-->" in b]
        texts = [" ".join(l for l in lines if "-->" not in l and l.strip()).strip() for _, lines in cues]
        try:
            fa_texts = []
            for j in range(0, len(texts), 40):
                for attempt in range(4):  # free tiers rate-limit (HTTP 429): wait and retry
                    try:
                        part = _ai_translate(texts[j:j + 40])
                        break
                    except urllib.error.HTTPError as he:
                        if he.code != 429 or attempt == 3:
                            raise
                        time.sleep(20 * (attempt + 1))
                if part is None:
                    raise RuntimeError("no provider")
                fa_texts += part
                time.sleep(2)
        except Exception as exc:
            detail = ""
            try:
                detail = exc.read().decode("utf-8", "ignore")[:300]
            except Exception:
                pass
            print(f"Subtitle translation failed for {name}: {type(exc).__name__}: {exc} {detail}")
            STATUS["translation_errors"].append(f"{name}: {type(exc).__name__}: {exc} {detail}"[:400])
            continue
        for (i, lines), t in zip(cues, fa_texts):
            stamp = next(l for l in lines if "-->" in l)
            blocks[i] = stamp + "\n" + t
        with open(fa_path, "w", encoding="utf-8") as fh:
            fh.write("\n\n".join(b for b in blocks if b.strip()) + "\n")
        open(fa_path + ".ai", "w").close()
        done += 1
        STATUS["translated"].append(name)
        print(f"Persian subtitle created: {fa_path}")
    return done


def from_legacy(path):
    """Convert the old single catalog.json into the new format (no network)."""
    data = json.load(open(path, encoding="utf-8"))
    out = []
    for x in data:
        typ = "m" if x.get("type") == "movie" else "s"
        raw = str(x.get("id"))
        playable = bool(x.get("embed_url") or x.get("video_url"))
        key = ("ia-" + safe_key(raw[3:])) if raw.startswith("ia-") else (
            safe_key(raw) if not raw.isdigit() else f"{typ}{raw}")
        poster = x.get("poster") or ""
        backdrop = x.get("backdrop") or ""
        for size in ("w500", "w1280", "w342", "original"):
            poster = poster.replace(IMG + size, "")
            backdrop = backdrop.replace(IMG + size, "")
        item = {
            "k": key, "t": typ, "fa": x.get("fa") or x.get("title") or "", "en": x.get("title") or "",
            "y": x.get("year"), "g": [genre_fa(g) for g in (x.get("genres") or x.get("genre") or [])],
            "r": x.get("rating") or 0, "v": 0, "pop": 0, "p": poster, "b": backdrop, "lang": "",
            "tags": ["free"] if playable else [], "w": float(x.get("rating") or 0) * 0.9,
        }
        if playable:
            item["play"] = 1
        watch = {}
        for rc, w in (x.get("watch") or {}).items():
            names = []
            for bucket in ("flatrate", "free", "ads", "rent", "buy"):
                for p in w.get(bucket, []) or []:
                    if p.get("provider_name") and p["provider_name"] not in [n["n"] for n in names]:
                        names.append({"n": p["provider_name"], "kind": bucket, "logo": p.get("logo_path") or ""})
            if names:
                watch[rc] = {"link": w.get("link", ""), "p": names[:8]}
        item["_detail"] = {
            "overview": x.get("overview") or "", "runtime": x.get("runtime"),
            "episodes": x.get("episodes"), "seasons": [], "status": x.get("status") or "",
            "cast": [{"name": c.get("name"), "role": c.get("character", ""),
                      "photo": (c.get("photo") or "").replace(IMG + "w185", "")} for c in x.get("cast") or []],
            "trailer": x.get("trailer") or "", "watch": watch, "recs": [],
            "tmdb": x.get("tmdb_url") or "", "embed": x.get("embed_url") or "",
            "video": x.get("video_url") or "", "source": x.get("source_label") or "",
        }
        out.append(item)
    return out


# --------------------------------------------------------------------------
# Writers
# --------------------------------------------------------------------------

def img(path, size):
    if not path:
        return ""
    return path if path.startswith("http") else IMG + size + path


def esc(v):
    return html.escape(str(v if v is not None else ""), quote=True)


def static_page(item, detail, by_key):
    kind = "فیلم" if item["t"] == "m" else "سریال"
    title = item["fa"]
    year = f" ({item['y']})" if item.get("y") else ""
    url = f"{SITE}t/{item['k']}.html"
    poster = img(item.get("p"), "w500")
    backdrop = img(item.get("b"), "w1280") or poster
    overview = detail.get("overview") or ""
    desc = (overview[:155] + "…") if len(overview) > 160 else overview
    play = ""
    if detail.get("sources"):
        srcs = "".join(f'<source src="{esc(x["src"])}" type="video/mp4" label="{esc(x["label"])}">'
                       for x in sorted(detail["sources"], key=lambda x: abs(x["h"] - 480)))
        tracks = "".join(f'<track kind="subtitles" src="../{esc(x["src"])}" srclang="{esc(x["lang"])}" label="{esc(x["label"])}">'
                         for x in detail.get("subs", []))
        play = (f'<div class="player"><video controls playsinline preload="none" poster="{esc(backdrop)}">{srcs}{tracks}</video></div>'
                f'<p class="src">پخش مستقیم بدون یوتیوب · {len(detail["sources"])} کیفیت · '
                f'<a href="{SITE}#/watch/{esc(item["k"])}">پخش با پلیر نبض ‹</a></p>')
    elif detail.get("trailer"):
        play = (f'<div class="player"><iframe src="https://www.youtube-nocookie.com/embed/{esc(detail["trailer"])}?rel=0" '
                f'title="تریلر {esc(title)}" allow="fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>'
                '<p class="src">تریلر رسمی از یوتیوب (در ایران ممکن است باز نشود)</p>')
    facts = []
    if item.get("y"):
        facts.append(f"📅 {item['y']}")
    if item.get("r"):
        facts.append(f"⭐ {item['r']}")
    if detail.get("runtime"):
        facts.append(f"⏱ {detail['runtime']} دقیقه")
    if detail.get("seasons"):
        real = [s for s in detail["seasons"] if s.get("n")]
        facts.append(f"📺 {len(real)} فصل")
    cast = "".join(f'<li>{esc(c["name"])}<small>{esc(c.get("role", ""))}</small></li>'
                   for c in detail.get("cast", [])[:10])
    recs = "".join(f'<a href="{esc(r)}.html">{esc(by_key[r]["fa"])}</a>'
                   for r in detail.get("recs", []) if r in by_key)[:4000]
    ld = {"@context": "https://schema.org", "@type": "Movie" if item["t"] == "m" else "TVSeries",
          "name": title, "alternateName": item.get("en") or None, "image": poster or None,
          "description": overview[:500] or None, "url": url,
          "datePublished": str(item["y"]) if item.get("y") else None,
          "genre": item.get("g") or None}
    if item.get("r") and item.get("v"):
        ld["aggregateRating"] = {"@type": "AggregateRating", "ratingValue": item["r"],
                                 "ratingCount": item["v"], "bestRating": 10}
    ld = {k: v for k, v in ld.items() if v}
    return f"""<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)}{esc(year)} | {kind} | نبض فیلم</title>
<meta name="description" content="{esc(desc or f'{kind} {title} در نبض فیلم: خلاصه داستان، بازیگران، تریلر و جای تماشای قانونی.')}">
<link rel="canonical" href="{esc(url)}"><link rel="alternate" hreflang="fa" href="{esc(url)}"><link rel="alternate" hreflang="en" href="{SITE}en/t/{esc(item['k'])}.html"><meta name="theme-color" content="#07090e">
<meta property="og:type" content="video.{'movie' if item['t'] == 'm' else 'tv_show'}"><meta property="og:title" content="{esc(title)}{esc(year)} | نبض فیلم">
<meta property="og:description" content="{esc(desc)}"><meta property="og:image" content="{esc(backdrop)}"><meta property="og:url" content="{esc(url)}">
<meta name="twitter:card" content="summary_large_image"><link rel="icon" href="../favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="../assets/style.css"><script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script></head>
<body class="static"><header class="top"><a class="logo" href="../">نبض <b>فیلم</b></a><a class="btn sm" href="../#/t/{esc(item['k'])}">باز کردن در اپ</a></header>
<main class="sp"><div class="sp-cover" style="background-image:url('{esc(backdrop)}')"></div>
<article class="sp-body"><img class="sp-poster" src="{esc(poster)}" alt="پوستر {esc(title)}" loading="lazy">
<div><span class="eyebrow">{kind}</span><h1>{esc(title)}</h1><p class="en">{esc(item.get('en') if item.get('en') != title else '')}</p>
<div class="facts">{''.join(f'<span>{esc(f)}</span>' for f in facts)}</div><p class="genres">{esc(' • '.join(item.get('g') or []))}</p>
<p class="overview">{esc(overview or 'خلاصه‌ای برای این عنوان ثبت نشده است.')}</p></div></article>
<section class="sp-sec">{play}</section>
{'<section class="sp-sec"><h2>بازیگران</h2><ul class="sp-cast">' + cast + '</ul></section>' if cast else ''}
{'<section class="sp-sec"><h2>پیشنهادهای مشابه</h2><div class="sp-recs">' + recs + '</div></section>' if recs else ''}
<p class="sp-sec"><a class="btn" href="../#/t/{esc(item['k'])}">▶ تماشا و جزئیات کامل در نبض فیلم</a> <a class="btn ghost" href="{CHANNEL}" rel="noopener">📢 کانال نبض خبر</a></p>
</main><footer class="foot">© نبض فیلم · داده‌ها از TMDB (This product uses the TMDB API but is not endorsed or certified by TMDB).</footer></body></html>"""


GENRE_EN = {"اکشن": "Action", "ماجراجویی": "Adventure", "انیمیشن": "Animation", "کمدی": "Comedy",
            "جنایی": "Crime", "مستند": "Documentary", "درام": "Drama", "خانوادگی": "Family",
            "فانتزی": "Fantasy", "تاریخی": "History", "ترسناک": "Horror", "موسیقی": "Music",
            "معمایی": "Mystery", "عاشقانه": "Romance", "علمی‌تخیلی": "Sci-Fi", "هیجان‌انگیز": "Thriller",
            "جنگی": "War", "وسترن": "Western", "فیلم تلویزیونی": "TV Movie", "کودک": "Kids",
            "واقع‌نما": "Reality", "گفتگو محور": "Talk", "خبری": "News", "صامت": "Silent", "کلاسیک": "Classic"}


def static_page_en(item, detail, by_key):
    kind = "Movie" if item["t"] == "m" else "TV Series"
    title = item.get("ten") or item.get("en") or item["fa"]
    year = f" ({item['y']})" if item.get("y") else ""
    url = f"{SITE}en/t/{item['k']}.html"
    poster = img(item.get("p"), "w500")
    backdrop = img(item.get("b"), "w1280") or poster
    overview = detail.get("overview_en") or (detail.get("overview") if not re.search(r"[\u0600-\u06FF]", detail.get("overview") or "") else "")
    desc = (overview[:155] + "…") if len(overview) > 160 else overview
    genres = [GENRE_EN.get(g, g) for g in item.get("g") or []]
    play = ""
    if detail.get("sources"):
        srcs = "".join(f'<source src="{esc(x["src"])}" type="video/mp4">'
                       for x in sorted(detail["sources"], key=lambda x: abs(x["h"] - 480)))
        play = (f'<div class="player"><video controls playsinline preload="none" poster="{esc(backdrop)}">{srcs}</video></div>'
                f'<p class="src">Free and legal · {len(detail["sources"])} quality option(s) · '
                f'<a href="{SITE}?lang=en#/watch/{esc(item["k"])}">Watch in the NABZ player ›</a></p>')
    elif detail.get("trailer"):
        play = (f'<div class="player"><iframe src="https://www.youtube-nocookie.com/embed/{esc(detail["trailer"])}?rel=0" '
                f'title="{esc(title)} trailer" allow="fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>')
    facts = [str(item["y"])] if item.get("y") else []
    if item.get("r"):
        facts.append(f"★ {item['r']}")
    if detail.get("runtime"):
        facts.append(f"{detail['runtime']} min")
    cast = "".join(f'<li>{esc(c.get("en") or c["name"])}<small>{esc(c.get("role", ""))}</small></li>'
                   for c in detail.get("cast", [])[:10])
    recs = "".join(f'<a href="{esc(r)}.html">{esc(by_key[r].get("ten") or by_key[r].get("en") or by_key[r]["fa"])}</a>'
                   for r in detail.get("recs", []) if r in by_key)[:4000]
    ld = {"@context": "https://schema.org", "@type": "Movie" if item["t"] == "m" else "TVSeries",
          "name": title, "image": poster or None, "description": overview[:500] or None, "url": url,
          "inLanguage": "en", "datePublished": str(item["y"]) if item.get("y") else None, "genre": genres or None}
    if item.get("r") and item.get("v"):
        ld["aggregateRating"] = {"@type": "AggregateRating", "ratingValue": item["r"],
                                 "ratingCount": item["v"], "bestRating": 10}
    ld = {k: v for k, v in ld.items() if v}
    fa_url = f"{SITE}t/{item['k']}.html"
    return f"""<!doctype html><html lang="en" dir="ltr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)}{esc(year)} | {kind} | NABZ FILM</title>
<meta name="description" content="{esc(desc or f'{title}{year}: synopsis, cast, trailer and where to watch legally on NABZ FILM.')}">
<link rel="canonical" href="{esc(url)}"><link rel="alternate" hreflang="en" href="{esc(url)}"><link rel="alternate" hreflang="fa" href="{esc(fa_url)}">
<meta name="theme-color" content="#07090e"><meta property="og:type" content="video.{'movie' if item['t'] == 'm' else 'tv_show'}">
<meta property="og:title" content="{esc(title)}{esc(year)} | NABZ FILM"><meta property="og:description" content="{esc(desc)}">
<meta property="og:image" content="{esc(backdrop)}"><meta property="og:url" content="{esc(url)}"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="../../favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="../../assets/style.css">
<style>body{{font-family:Inter,system-ui,"Segoe UI",Roboto,Arial,sans-serif}}</style>
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script></head>
<body class="static"><header class="top"><a class="logo" href="../../?lang=en">NABZ <b>FILM</b></a><a class="btn sm" href="../../?lang=en#/t/{esc(item['k'])}">Open in app</a> <a class="btn sm ghost" href="{esc(fa_url)}">فارسی</a></header>
<main class="sp"><div class="sp-cover" style="background-image:url('{esc(backdrop)}')"></div>
<article class="sp-body"><img class="sp-poster" src="{esc(poster)}" alt="{esc(title)} poster" loading="lazy">
<div><span class="eyebrow">{kind}</span><h1>{esc(title)}</h1>
<div class="facts">{''.join(f'<span>{esc(f)}</span>' for f in facts)}</div><p class="genres">{esc(' • '.join(genres))}</p>
<p class="overview">{esc(overview or 'No synopsis available yet.')}</p></div></article>
<section class="sp-sec">{play}</section>
{'<section class="sp-sec"><h2>Cast</h2><ul class="sp-cast">' + cast + '</ul></section>' if cast else ''}
{'<section class="sp-sec"><h2>More like this</h2><div class="sp-recs">' + recs + '</div></section>' if recs else ''}
<p class="sp-sec"><a class="btn" href="../../?lang=en#/t/{esc(item['k'])}">▶ Details and watch on NABZ FILM</a></p>
</main><footer class="foot">© NABZ FILM · Data from TMDB (This product uses the TMDB API but is not endorsed or certified by TMDB).</footer></body></html>"""


def write_all(items, out_dir):
    items = [x for x in items if x.get("fa")]
    # Free/playable first within ties; list sorted by weighted score.
    items.sort(key=lambda x: (x.get("w") or 0, x.get("pop") or 0), reverse=True)
    by_key = {}
    for x in items:
        by_key.setdefault(x["k"], x)
    items = list(by_key.values())

    for sub in ("data/t", "t", "en/t"):
        path = os.path.join(out_dir, sub)
        if os.path.isdir(path):
            shutil.rmtree(path)
        os.makedirs(path, exist_ok=True)

    light = []
    for x in items:
        detail = x.pop("_detail", {}) or {}
        x.pop("_subj", None)
        detail["recs"] = [r for r in detail.get("recs", []) if r in by_key][:12]
        row = {k: v for k, v in x.items() if v not in (None, "", [], 0) or k in ("k", "t")}
        light.append(row)
        with open(os.path.join(out_dir, "data/t", x["k"] + ".json"), "w", encoding="utf-8") as fh:
            json.dump(detail, fh, ensure_ascii=False, separators=(",", ":"))
        with open(os.path.join(out_dir, "t", x["k"] + ".html"), "w", encoding="utf-8") as fh:
            fh.write(static_page(x, detail, by_key))
        with open(os.path.join(out_dir, "en/t", x["k"] + ".html"), "w", encoding="utf-8") as fh:
            fh.write(static_page_en(x, detail, by_key))

    meta = {"built": int(time.time()), "count": len(light),
            "movies": sum(1 for x in light if x["t"] == "m"),
            "series": sum(1 for x in light if x["t"] == "s"),
            "free": sum(1 for x in light if x.get("play"))}
    with open(os.path.join(out_dir, "data/list.json"), "w", encoding="utf-8") as fh:
        json.dump({"meta": meta, "items": light}, fh, ensure_ascii=False, separators=(",", ":"))

    urls = [f"<url><loc>{SITE}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>"]
    urls.append(f"<url><loc>{SITE}?lang=en</loc><changefreq>daily</changefreq><priority>0.9</priority></url>")
    urls += [f"<url><loc>{SITE}t/{esc(x['k'])}.html</loc><changefreq>weekly</changefreq></url>" for x in light]
    urls += [f"<url><loc>{SITE}en/t/{esc(x['k'])}.html</loc><changefreq>weekly</changefreq></url>" for x in light]
    with open(os.path.join(out_dir, "sitemap.xml"), "w", encoding="utf-8") as fh:
        fh.write('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
                 + "".join(urls) + "</urlset>")
    print(f"Wrote {meta}")
    return meta


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=".")
    ap.add_argument("--from-legacy", default="")
    ap.add_argument("--no-archive", action="store_true")
    args = ap.parse_args()

    token = os.environ.get("TMDB_TOKEN", "").strip()
    items = []
    if args.from_legacy:
        items = from_legacy(args.from_legacy)
    elif token:
        items = collect_tmdb(TMDB(token))
    else:
        print("TMDB_TOKEN missing and no --from-legacy given", file=sys.stderr)
        return 1
    tmdb_count = len(items)
    if not args.no_archive and not args.from_legacy:
        archive = collect_archive()
        if token:
            archive = enrich_archive(TMDB(token), archive, items)
        items += archive
    items += collect_open_movies(TMDB(token) if token else None)
    if not args.from_legacy:
        items = attach_media(items, args.out)
        if translate_subs(args.out):
            refresh_subs(items, args.out)
    if tmdb_count < 50 and not args.from_legacy:
        print("Too few TMDB titles; keeping the previous catalog.", file=sys.stderr)
        return 1
    meta = write_all(items, args.out)
    write_status(args.out, meta)
    return 0


if __name__ == "__main__":
    sys.exit(main())
