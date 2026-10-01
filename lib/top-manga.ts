import { MangaItem } from './types';
import topMangaJson from '@/data/top_manga_34.json';
import { fetchWithHeaders } from './scraper';
import * as cheerio from 'cheerio';

// Known MAL Title to Komiku Slug & Verified Cover mapping
const MAL_TO_KOMIKU_MAP: Record<string, { slug: string; thumb: string; author?: string }> = {
  'berserk': {
    slug: 'berserk',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/berserk/manga_thumbnail-Manga-Berserk.jpg',
    author: 'Kentaro Miura',
  },
  'vagabond': {
    slug: 'vagabond',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/vagabond/manga_thumbnail-Manga-Vagabond.jpg',
    author: 'Takehiko Inoue',
  },
  'one piece': {
    slug: 'komik-one-piece-indo',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/komik-one-piece-indo/manga_thumbnail-Komik-One-Piece.jpg',
    author: 'Eiichiro Oda',
  },
  'slam dunk': {
    slug: 'slam-dunk',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/slam-dunk/manga_thumbnail-Komik-Slam-Dunk.jpg',
    author: 'Takehiko Inoue',
  },
  'vinland saga': {
    slug: 'vinland-saga',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/vinland-saga/manga_thumbnail-Komik-Vinland-Saga.jpg',
    author: 'Makoto Yukimura',
  },
  'fullmetal alchemist': {
    slug: 'fullmetal-alchemist',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/fullmetal-alchemist/manga_thumbnail-Fullmetal-Alchemist-1.jpg',
    author: 'Hiromu Arakawa',
  },
  'grand blue': {
    slug: '31514-grand-blue',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/31514-grand-blue/manga_thumbnail-Komik-Grand-Blue.jpg',
    author: 'Kenji Inoue',
  },
  'kingdom': {
    slug: 'kingdom',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/kingdom/manga_thumbnail-Komik-Kingdom.jpg',
    author: 'Yasuhisa Hara',
  },
  'houseki no kuni': {
    slug: 'houseki-no-kuni',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/houseki-no-kuni/manga_thumbnail-Komik-Houseki-no-Kuni.png',
    author: 'Haruko Ichikawa',
  },
  'land of the lustrous': {
    slug: 'houseki-no-kuni',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/houseki-no-kuni/manga_thumbnail-Komik-Houseki-no-Kuni.png',
    author: 'Haruko Ichikawa',
  },
  'oyasumi punpun': {
    slug: 'oyasumi-punpun',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/oyasumi-punpun/manga_thumbnail-Manga-Oyasumi-Punpun.jpg',
    author: 'Inio Asano',
  },
  'goodnight punpun': {
    slug: 'oyasumi-punpun',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/oyasumi-punpun/manga_thumbnail-Manga-Oyasumi-Punpun.jpg',
    author: 'Inio Asano',
  },
  '20th century boys': {
    slug: '20th-century-boys',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/20th-century-boys/manga_thumbnail-20th-Century-Boys-1.jpg',
    author: 'Naoki Urasawa',
  },
  'yotsuba to!': {
    slug: 'yotsuba-to',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/yotsuba-to/manga_thumbnail-Manga-Yotsuba-to.jpg',
    author: 'Kiyohiko Azuma',
  },
  'sousou no frieren': {
    slug: 'sousou-no-frieren',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/sousou-no-frieren/manga_thumbnail-Manga-Sousou-no-Frieren.jpg',
    author: 'Kanehito Yamada',
  },
  'frieren: beyond journeys end': {
    slug: 'sousou-no-frieren',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/sousou-no-frieren/manga_thumbnail-Manga-Sousou-no-Frieren.jpg',
    author: 'Kanehito Yamada',
  },
  'haikyuu!!': {
    slug: 'haikyuu-indonesia',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/haikyuu-indonesia/manga_thumbnail-Manga-Haikyuu.jpg',
    author: 'Haruichi Furudate',
  },
  'koe no katachi': {
    slug: 'koe-no-katachi',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/koe-no-katachi/manga_thumbnail-Manga-Koe-no-Katachi.jpg',
    author: 'Yoshitoki Oima',
  },
  'a silent voice': {
    slug: 'koe-no-katachi',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/koe-no-katachi/manga_thumbnail-Manga-Koe-no-Katachi.jpg',
    author: 'Yoshitoki Oima',
  },
  'kokou no hito': {
    slug: 'kokou-no-hito',
    thumb: 'https://thumbnail.komiku.to/new/img/images/2026/05/25/20260525233045_9cf124379c1f8171_0cc77de5.webp',
    author: 'Shinichi Sakamoto',
  },
  'the climber': {
    slug: 'kokou-no-hito',
    thumb: 'https://thumbnail.komiku.to/new/img/images/2026/05/25/20260525233045_9cf124379c1f8171_0cc77de5.webp',
    author: 'Shinichi Sakamoto',
  },
  'akatsuki no yona': {
    slug: 'akatsuki-no-yona',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/akatsuki-no-yona/manga_thumbnail-Komik-Akatsuki-no-Yona.jpg',
    author: 'Mizuho Kusanagi',
  },
  'yona of the dawn': {
    slug: 'akatsuki-no-yona',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/akatsuki-no-yona/manga_thumbnail-Komik-Akatsuki-no-Yona.jpg',
    author: 'Mizuho Kusanagi',
  },
  'dungeon meshi': {
    slug: 'dungeon-meshi',
    thumb: 'https://thumbnail.komiku.to/img/upload/dungeon_meshi/img_6836b870bac982.55344401.jpg',
    author: 'Ryoko Kui',
  },
  'delicious in dungeon': {
    slug: 'dungeon-meshi',
    thumb: 'https://thumbnail.komiku.to/img/upload/dungeon_meshi/img_6836b870bac982.55344401.jpg',
    author: 'Ryoko Kui',
  },
  'hunter x hunter': {
    slug: 'hunter-x-hunter',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/hunter-x-hunter/manga_thumbnail-Manga-Hunter-x-Hunter.jpg',
    author: 'Yoshihiro Togashi',
  },
  'shingeki no kyojin': {
    slug: 'shingeki-no-kyojin',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/shingeki-no-kyojin/manga_thumbnail-Komik-Shingeki-no-Kyojin.jpg',
    author: 'Hajime Isayama',
  },
  'attack on titan': {
    slug: 'shingeki-no-kyojin',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/shingeki-no-kyojin/manga_thumbnail-Komik-Shingeki-no-Kyojin.jpg',
    author: 'Hajime Isayama',
  },
  'death note': {
    slug: 'death-note',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/death-note/manga_thumbnail-Manga-Death-Note.jpg',
    author: 'Tsugumi Ohba',
  },
  'one punch-man': {
    slug: 'manga-one-punch-man',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/manga-one-punch-man/manga_thumbnail-Komik-One-Punch-Man.jpg',
    author: 'ONE / Yusuke Murata',
  },
  'one punch man': {
    slug: 'manga-one-punch-man',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/manga-one-punch-man/manga_thumbnail-Komik-One-Punch-Man.jpg',
    author: 'ONE / Yusuke Murata',
  },
  'chainsaw man': {
    slug: '123213-chainsaw-man',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/123213-chainsaw-man/manga_thumbnail-Manga-Chainsaw-Man.jpg',
    author: 'Tatsuki Fujimoto',
  },
  'jujutsu kaisen': {
    slug: 'jujutsu-kaisen-modulo',
    thumb: 'https://thumbnail.komiku.to/img/upload/jujutsu_kaisen_modulo/img_68bff6e7da51b8.28076817.jpg',
    author: 'Gege Akutami',
  },
  'tokyo ghoul': {
    slug: 'tokyo-ghoul',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/tokyo-ghoul/manga_thumbnail-Manga-Tokyo-Ghoul.jpg',
    author: 'Sui Ishida',
  },
  'dandadan': {
    slug: 'dandadan',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/dandadan/manga_thumbnail-Manga-DANDADAN.jpg',
    author: 'Yukinobu Tatsu',
  },
  'spy x family': {
    slug: 'spy-x-family',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/spy-x-family/manga_thumbnail-Komik-Spy-X-Family.jpg',
    author: 'Tatsuya Endo',
  },
  'sakamoto days': {
    slug: 'sakamoto-days',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/sakamoto-days/manga_thumbnail-Manga-Sakamoto-Days.jpg',
    author: 'Yuto Suzuki',
  },
  'blue lock': {
    slug: 'blue-lock',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/blue-lock/manga_thumbnail-Manga-Blue-Lock.jpg',
    author: 'Muneyuki Kaneshiro',
  },
  'bleach': {
    slug: 'bleach',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/bleach/manga_thumbnail-Manga-Bleach.jpg',
    author: 'Tite Kubo',
  },
  'black clover': {
    slug: 'black-clover-indonesia',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/black-clover-indonesia/manga_thumbnail-Manga-Black-Clover.jpg',
    author: 'Yuki Tabata',
  },
  'kimetsu no yaiba': {
    slug: 'kimetsu-no-yaiba-indonesia',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/kimetsu-no-yaiba-indonesia/manga_thumbnail-Komik-Kimetsu-no-Yaiba.jpg',
    author: 'Koyoharu Gotouge',
  },
  'demon slayer': {
    slug: 'kimetsu-no-yaiba-indonesia',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/kimetsu-no-yaiba-indonesia/manga_thumbnail-Komik-Kimetsu-no-Yaiba.jpg',
    author: 'Koyoharu Gotouge',
  },
  'naruto': {
    slug: 'naruto',
    thumb: 'https://thumbnail.komiku.to/uploads/manga/naruto/manga_thumbnail-Manga-Naruto.jpg',
    author: 'Masashi Kishimoto',
  },
};

// In-memory server-side cache
let cachedTopManga: MangaItem[] = (topMangaJson as unknown as MangaItem[]).slice(0, 33);
let lastFetchTime = Date.now();
let isFetching = false;
const CACHE_TTL_MS = 2 * 3600 * 1000;

// Base view counts decreasing smoothly by rank
const BASE_VIEWS = [
  654210, 632140, 620202, 584320, 561200, 543180, 521400, 498300, 472190, 451800,
  432500, 412300, 395400, 378200, 361900, 345600, 328400, 312100, 295800, 281400,
  265200, 251800, 238400, 224100, 210500, 198200, 185600, 173400, 161800, 149200,
  137500, 125800, 114200,
];

interface MALEntry {
  title: string;
  rank?: number;
}

// Fetch Top Manga from MAL (Tries Jikan API first, then falls back to direct MAL scraping)
export async function fetchMALTopManga(): Promise<MALEntry[]> {
  // 1. Try Jikan API
  try {
    const jikanUrl = 'https://api.jikan.moe/v4/top/manga?type=manga&limit=25';
    const raw = await fetchWithHeaders(jikanUrl, 3500);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.data) && parsed.data.length > 0) {
        return parsed.data.map((item: any, idx: number) => ({
          title: item.title || item.title_english || item.titles?.[0]?.title || '',
          rank: item.rank || (idx + 1),
        })).filter((m: MALEntry) => Boolean(m.title));
      }
    }
  } catch {
    // ignore Jikan error and use direct MAL scraper
  }

  // 2. Direct MAL Top Manga Scraper
  try {
    const urls = [
      'https://myanimelist.net/topmanga.php?type=manga',
      'https://myanimelist.net/topmanga.php?type=manga&limit=50',
    ];

    const results = await Promise.allSettled(
      urls.map((u) => fetchWithHeaders(u, 5000))
    );

    const malList: MALEntry[] = [];
    for (const res of results) {
      if (res.status === 'fulfilled' && res.value) {
        const $ = cheerio.load(res.value);
        $('.ranking-list').each((i, el) => {
          const title = $(el).find('h3 a').text().trim();
          if (title) {
            malList.push({
              title,
              rank: malList.length + 1,
            });
          }
        });
      }
    }

    if (malList.length > 0) {
      return malList;
    }
  } catch (err) {
    console.warn('Notice fetching direct MAL:', err);
  }

  return [];
}

// Match MAL items with Komiku covers & slugs
export async function fetchTopMangaLive(limit = 33): Promise<MangaItem[]> {
  try {
    const malList = await fetchMALTopManga();
    if (!malList || malList.length === 0) {
      return cachedTopManga.slice(0, limit);
    }

    const items: MangaItem[] = [];
    const seenSlugs = new Set<string>();

    for (const malItem of malList) {
      const rawTitle = malItem.title.trim();
      const normKey = rawTitle.toLowerCase();

      // Check known mapping first
      let matched = MAL_TO_KOMIKU_MAP[normKey];
      if (!matched) {
        // Check partial match in map
        for (const [key, val] of Object.entries(MAL_TO_KOMIKU_MAP)) {
          if (normKey.includes(key) || key.includes(normKey)) {
            matched = val;
            break;
          }
        }
      }

      // If in MAL but not found on Komiku, skip and take the next one as requested!
      if (!matched) {
        continue;
      }

      if (seenSlugs.has(matched.slug)) {
        continue;
      }
      seenSlugs.add(matched.slug);

      const rankIndex = items.length;
      const views = BASE_VIEWS[rankIndex] || (110000 - rankIndex * 1500);

      items.push({
        title: rawTitle, // Title from MAL
        rank: rankIndex + 1, // Rank from MAL order
        thumb: matched.thumb, // Cover from Komiku
        endpoint: matched.slug,
        views, // View count ordered to match ranking
        type: 'Manga',
        latestChapter: 'Chapter Terbaru',
        latestChapterEndpoint: `${matched.slug}-chapter-terbaru`,
        author: matched.author || 'Komikus',
      });

      if (items.length >= limit) {
        break;
      }
    }

    // If we collected at least 25 items, update server cache
    if (items.length >= 25) {
      // Pad to limit if slightly under
      for (const fallback of (topMangaJson as unknown as MangaItem[])) {
        if (items.length >= limit) break;
        if (!seenSlugs.has(fallback.endpoint)) {
          seenSlugs.add(fallback.endpoint);
          items.push({
            ...fallback,
            rank: items.length + 1,
            views: BASE_VIEWS[items.length] || 100000,
          });
        }
      }

      cachedTopManga = items.slice(0, limit);
      lastFetchTime = Date.now();
      return cachedTopManga;
    }
  } catch (err) {
    console.warn('Notice in fetchTopMangaLive:', err);
  }

  return cachedTopManga.slice(0, limit);
}

export async function getTopManga(limit = 33): Promise<MangaItem[]> {
  const now = Date.now();
  if (now - lastFetchTime > CACHE_TTL_MS && !isFetching) {
    isFetching = true;
    fetchTopMangaLive(limit)
      .catch(() => {})
      .finally(() => {
        isFetching = false;
      });
  }
  return cachedTopManga.slice(0, limit);
}
