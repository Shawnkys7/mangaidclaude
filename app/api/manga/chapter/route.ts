import { NextRequest, NextResponse } from 'next/server';
import { getChapterDetail } from '@/lib/scraper';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get('endpoint');

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: 'Parameter endpoint wajib diisi' },
        { status: 400 }
      );
    }

    const detail = await getChapterDetail(endpoint);

    if (!detail) {
      return NextResponse.json(
        { success: false, error: 'Chapter tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: detail,
    });
  } catch (error) {
    console.error('Error in /api/manga/chapter:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil gambar chapter' },
      { status: 500 }
    );
  }
}
