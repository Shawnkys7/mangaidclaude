import { NextResponse } from 'next/server';
import { getTopManga } from '@/lib/top-manga';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getTopManga(33);
    return NextResponse.json({
      success: true,
      data,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    console.warn('Error in /api/manga/top:', error);
    return NextResponse.json({
      success: false,
      data: [],
    });
  }
}
