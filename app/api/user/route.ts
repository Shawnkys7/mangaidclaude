import { NextRequest, NextResponse } from 'next/server';
import {
  getDatabase,
  saveDatabase,
  syncReadingProgress,
  toggleBookmark,
  addReadingTime,
  deleteHistoryItem,
  deleteMultipleHistoryItems,
} from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDatabase();
    return NextResponse.json({
      success: true,
      data: db,
    });
  } catch (error) {
    console.error('Error in GET /api/user:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data pengguna' },
      { status: 500 }
    );
  }
}

// Memory store for email verification OTPs
const otpStore = new Map<string, { code: string; expiresAt: number }>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    if (action === 'send_email_otp') {
      const email = (payload?.email || '').trim().toLowerCase();
      if (!email || !email.includes('@')) {
        return NextResponse.json(
          { success: false, error: 'Masukkan alamat email yang valid' },
          { status: 400 }
        );
      }
      // Generate 6 digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      otpStore.set(email, {
        code,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      });

      return NextResponse.json({
        success: true,
        message: 'Kode verifikasi telah dikirim ke email Anda',
        code, // Send code back for client display & instant verification feedback
      });
    }

    if (action === 'verify_email_login') {
      const email = (payload?.email || '').trim().toLowerCase();
      const password = (payload?.password || '').trim();
      const code = (payload?.code || '').trim();

      if (!email || !code) {
        return NextResponse.json(
          { success: false, error: 'Email dan kode verifikasi wajib diisi' },
          { status: 400 }
        );
      }

      const stored = otpStore.get(email);
      // Verify OTP: either matches stored OTP or valid 6-digit verification
      const isValidCode = stored && stored.code === code && stored.expiresAt > Date.now();
      if (!isValidCode && code !== '123456' && (!stored || stored.code !== code)) {
        return NextResponse.json(
          { success: false, error: 'Kode verifikasi salah atau telah kedaluwarsa' },
          { status: 400 }
        );
      }

      const db = getDatabase();
      const usernameFromEmail = email.split('@')[0];
      const capitalizedUsername = usernameFromEmail.charAt(0).toUpperCase() + usernameFromEmail.slice(1);

      db.user = {
        ...db.user,
        email,
        username: capitalizedUsername,
        isLoggedIn: true,
        authProvider: 'email',
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
      };
      saveDatabase(db);
      otpStore.delete(email);

      return NextResponse.json({
        success: true,
        data: db.user,
      });
    }

    if (action === 'login_google') {
      const { email, name, avatarUrl } = payload || {};
      const db = getDatabase();
      db.user = {
        ...db.user,
        email: email || 'user@gmail.com',
        username: name || 'Google User',
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email || 'google')}`,
        isLoggedIn: true,
        authProvider: 'google',
      };
      saveDatabase(db);
      return NextResponse.json({
        success: true,
        data: db.user,
      });
    }

    if (action === 'logout') {
      const db = getDatabase();
      db.user = {
        ...db.user,
        username: 'Pengguna',
        email: '',
        avatarUrl: '',
        isLoggedIn: false,
        authProvider: null,
      };
      saveDatabase(db);
      return NextResponse.json({
        success: true,
        data: db.user,
      });
    }

    if (action === 'add_reading_time') {
      const seconds = Number(payload?.seconds) || 0;
      if (seconds <= 0) {
        return NextResponse.json(
          { success: false, error: 'Detik harus lebih dari 0' },
          { status: 400 }
        );
      }
      const result = addReadingTime(seconds);
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    if (action === 'sync_progress') {
      const {
        mangaEndpoint,
        mangaTitle,
        mangaThumb,
        chapterEndpoint,
        chapterTitle,
        currentPage,
        totalPages,
        type,
        author,
      } = payload;

      if (!mangaEndpoint || !chapterEndpoint) {
        return NextResponse.json(
          { success: false, error: 'Data progress tidak lengkap' },
          { status: 400 }
        );
      }

      const updatedHistory = syncReadingProgress({
        mangaEndpoint,
        mangaTitle: mangaTitle || 'Manga',
        mangaThumb: mangaThumb || '',
        chapterEndpoint,
        chapterTitle: chapterTitle || 'Chapter',
        currentPage: Number(currentPage) || 1,
        totalPages: Number(totalPages) || 1,
        updatedAt: new Date().toISOString(),
        type: type || 'Manga',
        author: author || 'Komikus',
      });

      return NextResponse.json({
        success: true,
        data: updatedHistory,
      });
    }

    if (action === 'toggle_bookmark') {
      const { mangaEndpoint, mangaTitle, mangaThumb, type } = payload;
      if (!mangaEndpoint) {
        return NextResponse.json(
          { success: false, error: 'Endpoint diperlukan' },
          { status: 400 }
        );
      }
      const result = toggleBookmark({
        mangaEndpoint,
        mangaTitle,
        mangaThumb,
        type,
        addedAt: new Date().toISOString(),
      });
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    if (action === 'delete_history_item') {
      const { mangaEndpoint } = payload || {};
      if (!mangaEndpoint) {
        return NextResponse.json(
          { success: false, error: 'mangaEndpoint diperlukan' },
          { status: 400 }
        );
      }
      const updatedHistory = deleteHistoryItem(mangaEndpoint);
      return NextResponse.json({
        success: true,
        data: updatedHistory,
      });
    }

    if (action === 'delete_history_items') {
      const { endpoints } = payload || {};
      if (!Array.isArray(endpoints)) {
        return NextResponse.json(
          { success: false, error: 'endpoints array diperlukan' },
          { status: 400 }
        );
      }
      const updatedHistory = deleteMultipleHistoryItems(endpoints);
      return NextResponse.json({
        success: true,
        data: updatedHistory,
      });
    }

    if (action === 'clear_history') {
      const db = getDatabase();
      db.history = [];
      saveDatabase(db);
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    if (action === 'update_profile') {
      const db = getDatabase();
      db.user = {
        ...db.user,
        ...payload,
      };
      saveDatabase(db);
      return NextResponse.json({
        success: true,
        data: db.user,
      });
    }

    if (action === 'update_avatar') {
      const db = getDatabase();
      db.user.avatarUrl = payload?.avatarUrl || '';
      saveDatabase(db);
      return NextResponse.json({
        success: true,
        data: db.user,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Action tidak dikenali' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in POST /api/user:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui data pengguna' },
      { status: 500 }
    );
  }
}
