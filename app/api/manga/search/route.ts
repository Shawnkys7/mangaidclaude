import { NextRequest, NextResponse } from 'next/server';
import { searchManga } from '@/lib/scraper';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');

    if (!q || !q.trim()) {
      return NextResponse.json({ success: true, data: [] });
    }

    const results = await searchManga(q);
    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error in /api/manga/search:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mencari komik' },
      { status: 500 }
    );
  }
}
