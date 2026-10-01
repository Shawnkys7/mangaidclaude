import { NextResponse } from 'next/server';
import { getRankingData, getOngoingManga } from '@/lib/scraper';
import { getTopManga } from '@/lib/top-manga';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [rankingRes, ongoingRes, topRes] = await Promise.allSettled([
      getRankingData(),
      getOngoingManga(35),
      getTopManga(33),
    ]);

    const ranking =
      rankingRes.status === 'fulfilled'
        ? rankingRes.value
        : {
            popular: [],
            trending: [],
            terbaru: [],
            komikBerwarna: [],
            baruDitambahkan: { semua: [], manga: [], manhwa: [], manhua: [] },
          };

    const ongoing = ongoingRes.status === 'fulfilled' ? ongoingRes.value : [];
    const topManga = topRes.status === 'fulfilled' ? topRes.value : [];
    const komikBerwarna = ranking.komikBerwarna || [];

    return NextResponse.json(
      {
        success: true,
        data: {
          popular: ranking.popular || [],
          trending: ranking.trending || [],
          terbaru: ranking.terbaru || ongoing || [],
          komikBerwarna: komikBerwarna || [],
          baruDitambahkan: ranking.baruDitambahkan || {
            semua: ongoing,
            manga: [],
            manhwa: [],
            manhua: [],
          },
          ongoing: ongoing || [],
          topManga: topManga || [],
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.warn('Recovered warning in /api/manga/home:', error);
    return NextResponse.json({
      success: true,
      data: {
        popular: [],
        trending: [],
        terbaru: [],
        baruDitambahkan: { semua: [], manga: [], manhwa: [], manhua: [] },
        ongoing: [],
        topManga: [],
      },
    });
  }
}
