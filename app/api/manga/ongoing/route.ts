import { NextResponse } from 'next/server';
import { getOngoingManga } from '@/lib/scraper';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const ongoing = await getOngoingManga(35);
    return NextResponse.json({
      success: true,
      data: ongoing,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.warn('Error in /api/manga/ongoing:', error);
    return NextResponse.json({
      success: true,
      data: [],
    });
  }
}
