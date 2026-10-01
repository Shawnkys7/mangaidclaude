import { NextRequest, NextResponse } from 'next/server';
import { getMangaByGenre } from '@/lib/scraper';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const genre = searchParams.get('genre') || 'action';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

    const result = await getMangaByGenre(genre, page);
    return NextResponse.json({
      success: true,
      data: result.items,
      hasMore: result.hasMore,
      page,
    });
  } catch (error) {
    console.error('Error in /api/manga/genre:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil komik berdasarkan genre' },
      { status: 500 }
    );
  }
}
