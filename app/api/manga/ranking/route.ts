import { NextRequest, NextResponse } from 'next/server';
import { getRankingData } from '@/lib/scraper';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tab = searchParams.get('tab')?.toLowerCase() || 'terpopuler';
    const type = searchParams.get('type')?.toLowerCase();
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '100', 10)));

    const ranking = await getRankingData();
    let pool = ranking.popular;
    if (tab === 'trending' || tab === 'tren') {
      pool = ranking.trending;
    } else if (tab === 'terbaru') {
      pool = ranking.terbaru;
    }

    if (type === 'manga' || type === 'manhwa' || type === 'manhua') {
      const filtered = pool.filter((m) => (m.type || '').toLowerCase() === type);
      return NextResponse.json({
        success: true,
        data: filtered.slice(0, limit),
      });
    }

    return NextResponse.json({
      success: true,
      data: pool.slice(0, limit),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.warn('Warning in /api/manga/ranking:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve ranking data',
    }, { status: 500 });
  }
}
