import * as cheerio from 'cheerio';
import { execSync } from 'child_process';
import {
  MangaItem,
  ChapterItem,
  MangaDetail,
  ChapterDetail,
} from './types';
import { getMangaAuthor } from './authors';
import {
  GLOBAL_TOP_POPULAR,
  INITIAL_TRENDING,
  INITIAL_ONGOING,
} from './initial-data';
import { INITIAL_RANKING } from './initial-ranking';

export type {
  MangaItem,
  ChapterItem,
  MangaDetail,
  ChapterDetail,
};

export {
  GLOBAL_TOP_POPULAR,
  INITIAL_TRENDING,
  INITIAL_ONGOING,
  INITIAL_RANKING,
};

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export const ENDPOINT_ALIASES: Record<string, string> = {
  'one-piece': 'komik-one-piece-indo',
  'komik-one-piece': 'komik-one-piece-indo',
  'jujutsu-kaisen': 'jujutsu-kaisen-modulo',
  'boruto': 'boruto-two-blue-vortex',
  'chainsaw-man': '123213-chainsaw-man',
  'solo-leveling': 'solo-leveling-id',
  'boku-no-hero-academia': 'boku-no-hero-academia-indonesia',
  'my-hero-academia': 'boku-no-hero-academia-indonesia',
  'black-clover': 'black-clover-indonesia',
  'kimetsu-no-yaiba': 'kimetsu-no-yaiba-indonesia',
  'demon-slayer': 'kimetsu-no-yaiba-indonesia',
  'one-punch-man': 'manga-one-punch-man',
  'haikyuu': 'haikyuu-indonesia',
  'overgeared': 'overgeared-new',
  'solo-max-level-newbie': '131241-solo-max-level-newbie',
  'reincarnator': '312312-reincarnator',
  'academys-genius-swordmaster': '12321-academys-genius-swordmaster',
  'grand-blue': '31514-grand-blue',
  'frieren': 'sousou-no-frieren',
  'frieren-at-the-funerals': 'sousou-no-frieren',
  'jojo-part-7-steel-ball-run': 'steel-ball-run',
};

export function cleanEndpoint(raw: string | undefined): string {
  if (!raw) return '';
  let ep = raw.trim();
  ep = ep.replace(/^https?:\/\/[^/]+/i, '');
  ep = ep.replace(/^\/manga\//i, '');
  ep = ep.replace(/^\//, '');
  ep = ep.replace(/\/$/, '');
  return ep;
}

export function resolveEndpoint(raw: string | undefined): string {
  const clean = cleanEndpoint(raw);
  return ENDPOINT_ALIASES[clean] || clean;
}

export function cleanImage(url: string | undefined): string {
  if (!url) return '';
  let u = url.trim();
  if (u.startsWith('//')) {
    u = 'https:' + u;
  }
  u = u.replace(/&#038;/g, '&');
  u = u.replace(/^http:\/\//i, 'https://');
  u = u.split('?')[0];
  return u;
}

export function extractSlugFromThumbOrTitle(thumb: string | undefined, title: string): string {
  if (thumb) {
    const m1 = thumb.match(/\/uploads\/manga\/([^/]+)\//);
    if (m1) return resolveEndpoint(m1[1]);
    const m2 = thumb.match(/\/img\/upload\/([^/]+)\//);
    if (m2) return resolveEndpoint(m2[1].replace(/_/g, '-'));
  }
  const rawSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return resolveEndpoint(rawSlug);
}

export function formatViews(views: number | string | undefined): string {
  if (!views && views !== 0) return '100K views';
  if (typeof views === 'string') {
    if (views.includes('views') || views.includes('online')) return views;
    const num = parseInt(views.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(num) && num > 0) return formatViews(num);
    return `${views} views`;
  }
  const n = Number(views);
  if (isNaN(n) || n <= 0) return '100K views';
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M views`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K views`;
  }
  return `${n} views`;
}

export async function fetchWithHeaders(url: string, timeoutMs = 6000): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': 'https://komiku.org/',
        'Accept':
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'id,en-US;q=0.9,en;q=0.8',
      },
      signal: controller.signal,
      next: { revalidate: 60 },
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const text = await res.text();
      if (text && text.length > 50) return text;
    }
  } catch {
    clearTimeout(timeoutId);
  }

  // Fallback to curl
  try {
    const curlCmd = `curl -s -L -A "${USER_AGENT}" -e "https://komiku.org/" -m 6 "${url}"`;
    const stdout = execSync(curlCmd, { maxBuffer: 15 * 1024 * 1024 });
    const text = stdout.toString('utf-8');
    if (text && text.length > 50) {
      return text;
    }
  } catch {
    // ignore
  }

  // Fallback to komiku.org if api.komiku.org was requested
  if (url.includes('api.komiku.org')) {
    const mirrorUrl = url.replace('api.komiku.org', 'komiku.org');
    try {
      const curlCmd = `curl -s -L -A "${USER_AGENT}" -e "https://komiku.org/" -m 6 "${mirrorUrl}"`;
      const stdout = execSync(curlCmd, { maxBuffer: 15 * 1024 * 1024 });
      const text = stdout.toString('utf-8');
      if (text && text.length > 50) {
        return text;
      }
    } catch {
      // ignore
    }
  }

  return '';
}

export async function scrapeBgeList(url: string): Promise<MangaItem[]> {
  try {
    const html = await fetchWithHeaders(url, 6000);
    if (!html) return [];
    const $ = cheerio.load(html);
    const items: MangaItem[] = [];

    $('.bge').each((_, el) => {
      const kan = $(el).find('.kan');
      const bgei = $(el).find('.bgei');
      const title = kan.find('h3').text().trim();
      const rawHref = kan.find('a').attr('href');
      const endpoint = resolveEndpoint(cleanEndpoint(rawHref));
      const imgEl = bgei.find('img');
      const rawImg = imgEl.attr('src') || imgEl.attr('data-src');
      const thumb = cleanImage(rawImg);

      let type = bgei.find('.tpe1_inf b').text().trim();
      if (!type) {
        if (thumb.toLowerCase().includes('manhwa') || title.toLowerCase().includes('manhwa')) {
          type = 'Manhwa';
        } else if (thumb.toLowerCase().includes('manhua') || title.toLowerCase().includes('manhua')) {
          type = 'Manhua';
        } else {
          type = 'Manga';
        }
      }

      const sub = kan.find('.judul2').text().trim();
      const desc = kan.find('p').text().trim();
      const lastNew1 = kan.find('.new1').last();
      const latestChapter =
        lastNew1.find('a span').last().text().trim() || 'Chapter Terbaru';
      const latestChapterEndpoint = cleanEndpoint(lastNew1.find('a').attr('href'));

      let uploadedAt = '';
      if (sub.includes('|')) {
        const parts = sub.split('|').map((s) => s.trim());
        const timePart = parts.find((p) => /menit|jam|hari|detik|minggu|bulan/i.test(p));
        if (timePart) uploadedAt = timePart;
      } else if (sub.includes(' ')) {
        const parts = sub.split(' ').map((s) => s.trim());
        const timePart = parts.find((p) => /menit|jam|hari|detik|minggu|bulan/i.test(p));
        if (timePart) uploadedAt = timePart;
      }

      if (title && endpoint) {
        items.push({
          title,
          endpoint,
          thumb,
          type,
          latestChapter,
          latestChapterEndpoint,
          genreOrRating: sub || type,
          uploadedAt,
          description: desc,
          author: getMangaAuthor(title, endpoint),
        });
      }
    });

    return items;
  } catch {
    return [];
  }
}

// Fetch live 100 items from Analytics API (Total Popular)
export async function fetchAnalyticsPopular(limit = 100): Promise<MangaItem[]> {
  try {
    const url = `https://analytics.komiku.org/api/popular/total/?format=json&limit=${limit}`;
    const raw = await fetchWithHeaders(url, 4500);
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items)) return [];

    return parsed.items.map((item: any, idx: number) => {
      const typeStr = item.type
        ? item.type.charAt(0).toUpperCase() + item.type.slice(1).toLowerCase()
        : 'Manga';
      const thumbUrl = item.thumbnail || item.fields?.thumbnail || '';
      const slug = extractSlugFromThumbOrTitle(thumbUrl, item.title);
      const viewsNum = Number(item.views) || 100000;

      return {
        title: item.title,
        endpoint: slug,
        thumb: cleanImage(thumbUrl),
        type: typeStr,
        latestChapter: 'Chapter Terbaru',
        latestChapterEndpoint: `${slug}-chapter-terbaru`,
        genreOrRating: (item.genres && item.genres.length > 0) ? item.genres.slice(0, 3).join(', ') : typeStr,
        views: viewsNum,
        rank: idx + 1,
        author: getMangaAuthor(item.title, slug),
        uploadedAt: 'Hari ini',
      };
    });
  } catch (err) {
    console.warn('Notice in fetchAnalyticsPopular:', err);
    return [];
  }
}

// Fetch live 100 items from Analytics API (Active Trending)
export async function fetchAnalyticsTrending(limit = 100): Promise<MangaItem[]> {
  try {
    const url = `https://analytics.komiku.org/api/popular/active/?format=json&limit=${limit}`;
    const raw = await fetchWithHeaders(url, 4500);
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items)) return [];

    return parsed.items.map((item: any, idx: number) => {
      const typeStr = item.type
        ? item.type.charAt(0).toUpperCase() + item.type.slice(1).toLowerCase()
        : 'Manga';
      const thumbUrl = item.thumbnail || item.fields?.thumbnail || '';
      const slug = extractSlugFromThumbOrTitle(thumbUrl, item.title);
      const viewsNum = Number(item.views?.total || item.views || (item.activeUsers ? item.activeUsers * 450 : 80000));

      return {
        title: item.title,
        endpoint: slug,
        thumb: cleanImage(thumbUrl),
        type: typeStr,
        latestChapter: 'Chapter Terbaru',
        latestChapterEndpoint: `${slug}-chapter-terbaru`,
        genreOrRating: (item.genres && item.genres.length > 0) ? item.genres.slice(0, 3).join(', ') : typeStr,
        views: viewsNum,
        rank: idx + 1,
        author: getMangaAuthor(item.title, slug),
        uploadedAt: `${(idx % 5) + 1} jam lalu`,
      };
    });
  } catch (err) {
    console.warn('Notice in fetchAnalyticsTrending:', err);
    return [];
  }
}

export async function fetchTerbaruList(targetCount = 100): Promise<MangaItem[]> {
  try {
    const pages = [1, 2, 3, 4, 5];
    const results = await Promise.allSettled(
      pages.map((p) => scrapeBgeList(p === 1 ? 'https://api.komiku.org/manga/' : `https://api.komiku.org/manga/page/${p}/`))
    );

    const items: MangaItem[] = [];
    const seen = new Set<string>();

    for (const res of results) {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        for (const item of res.value) {
          if (!seen.has(item.endpoint)) {
            seen.add(item.endpoint);
            items.push(item);
          }
        }
      }
    }

    if (items.length >= 15) {
      for (const m of INITIAL_ONGOING) {
        if (items.length >= targetCount) break;
        if (!seen.has(m.endpoint)) {
          seen.add(m.endpoint);
          items.push(m);
        }
      }
      return items.slice(0, targetCount).map((item, idx) => ({ ...item, rank: idx + 1 }));
    }

    return INITIAL_ONGOING.slice(0, targetCount);
  } catch (err) {
    console.warn('Notice in fetchTerbaruList:', err);
    return INITIAL_ONGOING.slice(0, targetCount);
  }
}

export async function fetchBaruDitambahkan(typeFilter?: string): Promise<MangaItem[]> {
  try {
    let url = 'https://api.komiku.org/manga/?orderby=date';
    if (typeFilter && typeFilter.toLowerCase() !== 'semua') {
      url = `https://api.komiku.org/manga/?tipe=${encodeURIComponent(typeFilter.toLowerCase())}&orderby=date`;
    }
    const items = await scrapeBgeList(url);
    if (items.length > 0) return items;
    return await scrapeBgeList(`${url}&page=2`);
  } catch (err) {
    console.warn('Notice in fetchBaruDitambahkan:', err);
    return [];
  }
}

export async function fetchKomikBerwarnaList(limit = 15): Promise<MangaItem[]> {
  try {
    const [res1, res2] = await Promise.allSettled([
      scrapeBgeList('https://api.komiku.org/manga/?tipe=manhwa'),
      scrapeBgeList('https://api.komiku.org/page/2/?tipe=manhwa'),
    ]);
    const items: MangaItem[] = [];
    const seen = new Set<string>();

    for (const res of [res1, res2]) {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        for (const item of res.value) {
          if (!seen.has(item.endpoint)) {
            seen.add(item.endpoint);
            items.push({
              ...item,
              type: item.type || 'Manhwa',
            });
          }
        }
      }
    }
    if (items.length >= 10) {
      return items.slice(0, limit);
    }
  } catch (err) {
    console.warn('Notice in fetchKomikBerwarnaList:', err);
  }
  return [];
}

// In-Memory Live Cache
let cachedPopularAll: MangaItem[] = [...GLOBAL_TOP_POPULAR];
let cachedTrendingAll: MangaItem[] = [...INITIAL_TRENDING];
let cachedTerbaruAll: MangaItem[] = [...INITIAL_ONGOING];
let cachedBaruSemua: MangaItem[] = [];
let cachedBaruManga: MangaItem[] = [];
let cachedBaruManhwa: MangaItem[] = [];
let cachedBaruManhua: MangaItem[] = [];
let cachedKomikBerwarna: MangaItem[] = [];
let lastRefreshTime = 0;
let isRefreshingAll = false;

function ensure100Items(sourceList: MangaItem[], fallbackList: MangaItem[]): MangaItem[] {
  const result: MangaItem[] = [];
  const seen = new Set<string>();

  for (const m of sourceList) {
    if (!seen.has(m.endpoint)) {
      seen.add(m.endpoint);
      result.push(m);
    }
  }

  for (const m of fallbackList) {
    if (result.length >= 100) break;
    if (!seen.has(m.endpoint)) {
      seen.add(m.endpoint);
      result.push(m);
    }
  }

  return result.slice(0, 100).map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));
}

export async function refreshAllData(): Promise<void> {
  if (isRefreshingAll) return;
  isRefreshingAll = true;

  try {
    const [popRes, trenRes, terRes, baruAll, baruM, baruMh, baruMhu, berwarnaRes] =
      await Promise.allSettled([
        fetchAnalyticsPopular(100),
        fetchAnalyticsTrending(100),
        fetchTerbaruList(100),
        fetchBaruDitambahkan('semua'),
        fetchBaruDitambahkan('manga'),
        fetchBaruDitambahkan('manhwa'),
        fetchBaruDitambahkan('manhua'),
        fetchKomikBerwarnaList(15),
      ]);

    if (popRes.status === 'fulfilled' && popRes.value.length >= 5) {
      cachedPopularAll = ensure100Items(popRes.value, GLOBAL_TOP_POPULAR);
    }
    if (trenRes.status === 'fulfilled' && trenRes.value.length >= 5) {
      cachedTrendingAll = ensure100Items(trenRes.value, INITIAL_TRENDING);
    }
    if (terRes.status === 'fulfilled' && terRes.value.length >= 5) {
      cachedTerbaruAll = ensure100Items(terRes.value, INITIAL_ONGOING);
    }
    if (baruAll.status === 'fulfilled' && baruAll.value.length > 0) {
      cachedBaruSemua = baruAll.value;
    }
    if (baruM.status === 'fulfilled' && baruM.value.length > 0) {
      cachedBaruManga = baruM.value;
    }
    if (baruMh.status === 'fulfilled' && baruMh.value.length > 0) {
      cachedBaruManhwa = baruMh.value;
    }
    if (baruMhu.status === 'fulfilled' && baruMhu.value.length > 0) {
      cachedBaruManhua = baruMhu.value;
    }
    if (berwarnaRes.status === 'fulfilled' && berwarnaRes.value.length > 0) {
      cachedKomikBerwarna = berwarnaRes.value;
    }

    lastRefreshTime = Date.now();
  } catch (err) {
    console.warn('Refresh notice:', err);
  } finally {
    isRefreshingAll = false;
  }
}

export async function getRankingData(): Promise<{
  popular: MangaItem[];
  trending: MangaItem[];
  terbaru: MangaItem[];
  komikBerwarna: MangaItem[];
  baruDitambahkan: {
    semua: MangaItem[];
    manga: MangaItem[];
    manhwa: MangaItem[];
    manhua: MangaItem[];
  };
}> {
  const now = Date.now();
  if (now - lastRefreshTime > 60000) {
    if (lastRefreshTime === 0) {
      await refreshAllData();
    } else {
      refreshAllData().catch(() => {});
    }
  }

  const popular100 = ensure100Items(cachedPopularAll, GLOBAL_TOP_POPULAR);
  const trending100 = ensure100Items(cachedTrendingAll, INITIAL_TRENDING);
  const terbaru100 = ensure100Items(cachedTerbaruAll, INITIAL_ONGOING);

  // 15 Komik Berwarna from Komiku (Manhwa & Manhua are full-color webtoons)
  const coloredPool = cachedPopularAll.filter((m) => {
    const t = (m.type || '').toLowerCase();
    return t === 'manhwa' || t === 'manhua';
  });
  const fallbackColored = GLOBAL_TOP_POPULAR.filter((m) => {
    const t = (m.type || '').toLowerCase();
    return t === 'manhwa' || t === 'manhua';
  });
  const coloredSeen = new Set<string>();
  const komikBerwarna: MangaItem[] = [];

  for (const m of [...cachedKomikBerwarna, ...coloredPool, ...fallbackColored]) {
    if (!coloredSeen.has(m.endpoint)) {
      coloredSeen.add(m.endpoint);
      komikBerwarna.push(m);
      if (komikBerwarna.length >= 15) break;
    }
  }

  return {
    popular: popular100,
    trending: trending100,
    terbaru: terbaru100,
    komikBerwarna,
    baruDitambahkan: {
      semua: cachedBaruSemua.length > 0 ? cachedBaruSemua : INITIAL_ONGOING.slice(0, 30),
      manga:
        cachedBaruManga.length > 0
          ? cachedBaruManga
          : INITIAL_ONGOING.filter((m) => (m.type || '').toLowerCase() === 'manga'),
      manhwa:
        cachedBaruManhwa.length > 0
          ? cachedBaruManhwa
          : INITIAL_ONGOING.filter((m) => (m.type || '').toLowerCase() === 'manhwa'),
      manhua:
        cachedBaruManhua.length > 0
          ? cachedBaruManhua
          : INITIAL_ONGOING.filter((m) => (m.type || '').toLowerCase() === 'manhua'),
    },
  };
}

export async function getColoredManga(limit = 15): Promise<MangaItem[]> {
  const data = await getRankingData();
  return data.komikBerwarna.slice(0, limit);
}

export async function getOngoingManga(targetCount = 35): Promise<MangaItem[]> {
  const data = await getRankingData();
  return data.terbaru.slice(0, targetCount);
}

export async function getPopularManga(): Promise<MangaItem[]> {
  const data = await getRankingData();
  return data.popular;
}

export async function getTrendingManga(): Promise<MangaItem[]> {
  const data = await getRankingData();
  return data.trending;
}

const searchCache = new Map<string, { data: MangaItem[]; timestamp: number }>();

export async function searchManga(query: string): Promise<MangaItem[]> {
  try {
    const qTrimmed = query.trim();
    if (!qTrimmed) return [];

    const qLower = qTrimmed.toLowerCase();
    const cacheKey = qLower;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 180000) {
      return cached.data;
    }

    const encoded = encodeURIComponent(qTrimmed);

    const parseSearchPage = async (page: number): Promise<MangaItem[]> => {
      try {
        const url =
          page === 1
            ? `https://api.komiku.org/?post_type=manga&s=${encoded}`
            : `https://api.komiku.org/page/${page}/?post_type=manga&s=${encoded}`;

        const html = await fetchWithHeaders(url, 4000);
        if (!html) return [];
        const $ = cheerio.load(html);
        const pageItems: MangaItem[] = [];

        $('.bge').each((_, el) => {
          const kan = $(el).find('.kan');
          const bgei = $(el).find('.bgei');
          const title = kan.find('h3').text().trim();
          const rawHref = kan.find('a').attr('href');
          const endpoint = resolveEndpoint(cleanEndpoint(rawHref));
          const imgEl = bgei.find('img');
          const rawImg = imgEl.attr('src') || imgEl.attr('data-src');
          const thumb = cleanImage(rawImg);
          const type = bgei.find('.tpe1_inf b').text().trim() || 'Manga';
          const desc = kan.find('p').text().trim();
          const lastNew1 = kan.find('.new1').last();
          const latestChapter =
            lastNew1.find('a span').last().text().trim() || 'Chapter Terbaru';
          const latestChapterEndpoint = cleanEndpoint(lastNew1.find('a').attr('href'));

          if (title && endpoint) {
            pageItems.push({
              title,
              endpoint,
              thumb,
              type,
              latestChapter,
              latestChapterEndpoint,
              description: desc,
              author: getMangaAuthor(title, endpoint),
            });
          }
        });

        return pageItems;
      } catch {
        return [];
      }
    };

    const page1Items = await parseSearchPage(1);
    let page2Items: MangaItem[] = [];
    if (page1Items.length >= 8) {
      try {
        page2Items = await parseSearchPage(2);
      } catch {
        // ignore
      }
    }

    const seenEndpoints = new Set<string>();
    const items: MangaItem[] = [];

    for (const top of GLOBAL_TOP_POPULAR) {
      if (top.title.toLowerCase().includes(qLower) || qLower.includes(top.title.toLowerCase())) {
        seenEndpoints.add(top.endpoint);
        items.push(top);
      }
    }

    for (const item of [...page1Items, ...page2Items]) {
      if (!seenEndpoints.has(item.endpoint)) {
        seenEndpoints.add(item.endpoint);
        items.push(item);
      }
    }

    const localPool = [...cachedPopularAll, ...cachedTrendingAll, ...cachedTerbaruAll];
    for (const m of localPool) {
      if (m.title.toLowerCase().includes(qLower) && !seenEndpoints.has(m.endpoint)) {
        seenEndpoints.add(m.endpoint);
        items.push(m);
      }
    }

    const getRelevanceScore = (m: MangaItem): number => {
      const t = m.title.toLowerCase();
      let score = 0;
      if (t === qLower) {
        score += 10000;
      } else if (t.startsWith(qLower)) {
        score += 5000;
      } else if (t.includes(' ' + qLower)) {
        score += 3000;
      } else if (t.includes(qLower)) {
        score += 1000;
      }
      if (m.endpoint.toLowerCase().includes(qLower.replace(/\s+/g, '-'))) {
        score += 500;
      }
      score -= Math.min(200, t.length);
      return score;
    };

    items.sort((a, b) => getRelevanceScore(b) - getRelevanceScore(a));

    searchCache.set(cacheKey, {
      data: items,
      timestamp: Date.now(),
    });

    return items;
  } catch (err) {
    console.error('Error searching manga:', err);
    return [];
  }
}

export async function getMangaDetail(endpoint: string): Promise<MangaDetail | null> {
  try {
    const rawClean = cleanEndpoint(endpoint);
    const targetEndpoint = ENDPOINT_ALIASES[rawClean] || rawClean;

    let url = `https://komiku.org/manga/${targetEndpoint}/`;
    let html = await fetchWithHeaders(url, 6000);

    if (!html && targetEndpoint !== rawClean) {
      url = `https://komiku.org/manga/${rawClean}/`;
      html = await fetchWithHeaders(url, 6000);
    }

    if (!html) {
      return null;
    }

    const $ = cheerio.load(html);
    const title =
      $('header h1 [itemprop="name"]').text().trim() ||
      $('header h1').text().replace(/^Komik\s*/i, '').trim();

    const imgEl = $('.ims img');
    const rawImg = imgEl.attr('src') || imgEl.attr('data-src');
    const thumb = cleanImage(rawImg);

    let synopsis = $('#Sinopsis p').text().trim();
    if (!synopsis) {
      synopsis = $('.desc').text().trim() || $('.sin').text().trim();
    }

    let type = 'Manga';
    let status = 'Berjalan';
    let author = '-';

    $('table.inftable tr').each((_, el) => {
      const rowText = $(el).text();
      if (rowText.includes('Jenis') || rowText.includes('Tipe')) {
        type = $(el).find('td').last().text().trim();
      }
      if (rowText.includes('Status')) {
        status = $(el).find('td').last().text().trim();
      }
      if (rowText.includes('Pengarang') || rowText.includes('Author')) {
        author = $(el).find('td').last().text().trim();
      }
    });

    if (author === '-' || !author) {
      author = getMangaAuthor(title, targetEndpoint);
    }

    const genres: string[] = [];
    $('.genre li a').each((_, el) => {
      const g = $(el).text().trim();
      if (g && !genres.includes(g)) {
        genres.push(g);
      }
    });

    const chapters: ChapterItem[] = [];
    $('#Daftar_Chapter tr').each((_, el) => {
      const a = $(el).find('a');
      if (a.length > 0) {
        const chTitle = a.text().trim();
        const chHref = cleanEndpoint(a.attr('href'));
        const releaseDate = $(el).find('.tanggalseries').text().trim();
        if (chTitle && chHref) {
          chapters.push({
            title: chTitle,
            endpoint: chHref,
            releaseDate,
          });
        }
      }
    });

    return {
      title: title || targetEndpoint.replace(/-/g, ' ').toUpperCase(),
      endpoint: targetEndpoint,
      thumb,
      synopsis: synopsis || 'Belum ada sinopsis untuk komik ini.',
      type,
      status,
      author,
      genres,
      totalChapters: chapters.length,
      chapters,
    };
  } catch {
    return null;
  }
}

export async function getChapterDetail(endpoint: string): Promise<ChapterDetail | null> {
  try {
    const cleanEp = cleanEndpoint(endpoint);
    const url = `https://komiku.org/${cleanEp}/`;
    const html = await fetchWithHeaders(url, 6000);

    if (!html) {
      return null;
    }

    const $ = cheerio.load(html);
    const fullTitle = $('h1.title').text().trim() || $('header h1').text().trim();
    const chapterTitle =
      $('h1 span.title-chapter').text().trim() ||
      fullTitle ||
      cleanEp.split('-').join(' ');

    const mangaLink = $('.nxpr a[href*="/manga/"]').attr('href') || $('a.btn[aria-label="List"]').attr('href');
    const mangaEndpoint = cleanEndpoint(mangaLink);
    const mangaTitle =
      $('.nxpr a[href*="/manga/"]').attr('title') ||
      $('a.btn[aria-label="List"]').attr('title') ||
      'Manga';

    const images: string[] = [];
    $('#Baca_Komik img').each((_, el) => {
      const src = $(el).attr('data-src') || $(el).attr('src');
      if (
        src &&
        !src.includes('promosi') &&
        !src.includes('iklan') &&
        !src.includes('komiku-promosi')
      ) {
        const clean = cleanImage(src);
        if (clean && !images.includes(clean)) {
          images.push(clean);
        }
      }
    });

    const prevHref = $('.nxpr a.rl').attr('href') || $('a.btn[aria-label="Prev"]').attr('href');
    const nextHref = $('.nxpr a.rr').attr('href') || $('a.btn[aria-label="Next"]').attr('href');

    return {
      title: fullTitle,
      chapterTitle,
      chapterEndpoint: cleanEp,
      mangaEndpoint,
      mangaTitle,
      prevChapterEndpoint: prevHref ? cleanEndpoint(prevHref) : null,
      nextChapterEndpoint: nextHref ? cleanEndpoint(nextHref) : null,
      images,
      totalPages: images.length,
    };
  } catch (err) {
    console.error(`Error getting chapter detail for ${endpoint}:`, err);
    return null;
  }
}

export function resolveGenreUrl(genreKey: string, page = 1): string {
  const norm = genreKey.toLowerCase().trim();
  const pagePath = page > 1 ? `page/${page}/` : '';
  if (norm === 'manga') {
    return `https://api.komiku.org/manga/${pagePath}?tipe=manga`;
  }
  if (norm === 'manhwa') {
    return `https://api.komiku.org/manga/${pagePath}?tipe=manhwa`;
  }
  if (norm === 'manhua') {
    return `https://api.komiku.org/manga/${pagePath}?tipe=manhua`;
  }
  if (norm === 'tamat') {
    return `https://api.komiku.org/manga/${pagePath}?status=tamat`;
  }
  if (norm === 'on going' || norm === 'ongoing') {
    return `https://api.komiku.org/manga/${pagePath}?status=ongoing`;
  }
  if (norm === 'school life' || norm === 'school-life') {
    return `https://api.komiku.org/manga/${pagePath}?genre=school-life`;
  }
  if (norm === 'slice of life' || norm === 'slice-of-life') {
    return `https://api.komiku.org/manga/${pagePath}?genre=slice-of-life`;
  }
  if (norm === 'martial arts' || norm === 'martial-arts') {
    return `https://api.komiku.org/manga/${pagePath}?genre=martial-arts`;
  }
  if (norm === 'sci-fi' || norm === 'scifi') {
    return `https://api.komiku.org/manga/${pagePath}?genre=sci-fi`;
  }
  if (norm === 'psikologi' || norm === 'psychological') {
    return `https://api.komiku.org/manga/${pagePath}?genre=psychological`;
  }
  if (norm === 'thriller') {
    return `https://api.komiku.org/manga/${pagePath}?genre=thriller`;
  }
  if (norm === 'sports' || norm === 'sport' || norm === 'olahraga') {
    return `https://api.komiku.org/manga/${pagePath}?genre=sports`;
  }
  if (norm === 'magic' || norm === 'sihir') {
    return `https://api.komiku.org/manga/${pagePath}?genre=magic`;
  }
  if (norm === 'super power' || norm === 'super-power') {
    return `https://api.komiku.org/manga/${pagePath}?genre=super-power`;
  }
  if (norm === 'military' || norm === 'militer') {
    return `https://api.komiku.org/manga/${pagePath}?genre=military`;
  }
  if (norm === 'tragedy' || norm === 'tragedi') {
    return `https://api.komiku.org/manga/${pagePath}?genre=tragedy`;
  }
  if (norm === 'harem') {
    return `https://api.komiku.org/manga/${pagePath}?genre=harem`;
  }
  if (norm === 'survival') {
    return `https://api.komiku.org/manga/${pagePath}?genre=survival`;
  }
  if (norm === 'demons' || norm === 'demon' || norm === 'iblis') {
    return `https://api.komiku.org/manga/${pagePath}?genre=demons`;
  }
  if (norm === 'game') {
    return `https://api.komiku.org/manga/${pagePath}?genre=game`;
  }
  if (norm === 'shoujo') {
    return `https://api.komiku.org/manga/${pagePath}?genre=shoujo`;
  }
  if (norm === 'time travel' || norm === 'time-travel') {
    return `https://api.komiku.org/manga/${pagePath}?genre=time-travel`;
  }
  const encoded = encodeURIComponent(norm.replace(/\s+/g, '-'));
  return `https://api.komiku.org/manga/${pagePath}?genre=${encoded}`;
}

const genreCache = new Map<string, { timestamp: number; items: MangaItem[] }>();

export async function getMangaByGenre(
  genre: string,
  page = 1
): Promise<{ items: MangaItem[]; hasMore: boolean }> {
  try {
    const norm = genre.toLowerCase().trim();
    const cacheKey = `${norm}-p${page}`;
    const cached = genreCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < 300000) {
      return { items: cached.items, hasMore: cached.items.length >= 10 };
    }

    const basePage = (page - 1) * 2 + 1;
    const pageNumbers = [basePage, basePage + 1];

    const results = await Promise.allSettled(
      pageNumbers.map((p) => scrapeBgeList(resolveGenreUrl(norm, p)))
    );

    const items: MangaItem[] = [];
    const seen = new Set<string>();

    for (const res of results) {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        for (const item of res.value) {
          if (!seen.has(item.endpoint)) {
            seen.add(item.endpoint);
            items.push(item);
          }
        }
      }
    }

    if (items.length > 0) {
      genreCache.set(cacheKey, { timestamp: Date.now(), items });
    }

    return {
      items,
      hasMore: items.length >= 10,
    };
  } catch {
    return { items: [], hasMore: false };
  }
}
