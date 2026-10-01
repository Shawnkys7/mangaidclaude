import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;

const lastSent = new Map<string, number>();
const attempts = new Map<string, number>();

function secret(): string {
  return process.env.AUTH_CODE_SECRET || process.env.SMTP_PASS || '';
}

function sign(email: string, code: string, exp: number): string {
  return crypto
    .createHmac('sha256', secret())
    .update(`${email}|${code}|${exp}`)
    .digest('hex');
}

function smtpReady(): boolean {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && secret()
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action;
    const email = String(body?.email || '').trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Masukkan alamat email yang valid' },
        { status: 400 }
      );
    }

    if (action === 'send') {
      if (!smtpReady()) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Pengiriman email belum dikonfigurasi (isi SMTP_HOST, SMTP_USER, SMTP_PASS di .env).',
          },
          { status: 503 }
        );
      }

      const now = Date.now();
      const prev = lastSent.get(email) || 0;
      if (now - prev < RESEND_COOLDOWN_MS) {
        return NextResponse.json(
          { success: false, message: 'Tunggu sebentar sebelum meminta kode lagi' },
          { status: 429 }
        );
      }

      const code = crypto.randomInt(100000, 1000000).toString();
      const exp = now + CODE_TTL_MS;
      const token = `${exp}.${sign(email, code, exp)}`;

      const port = Number(process.env.SMTP_PORT) || 587;
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Kode verifikasi MangaID',
        text: `Kode verifikasi MangaID kamu: ${code}\nBerlaku 10 menit. Abaikan email ini jika kamu tidak memintanya.`,
        html: `<div style="font-family:sans-serif"><p>Kode verifikasi MangaID kamu:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>Berlaku 10 menit. Abaikan email ini jika kamu tidak memintanya.</p></div>`,
      });

      lastSent.set(email, now);
      attempts.delete(email);
      // Kode TIDAK dikirim ke browser, hanya token bertanda tangan
      return NextResponse.json({ success: true, token, message: 'Kode terkirim ke email' });
    }

    if (action === 'verify') {
      const code = String(body?.code || '').trim();
      const token = String(body?.token || '');
      const [expStr, sig] = token.split('.');
      const exp = Number(expStr);

      if (!code || !sig || !exp || exp < Date.now()) {
        return NextResponse.json(
          { success: false, message: 'Kode kedaluwarsa, kirim ulang kode' },
          { status: 400 }
        );
      }

      const tries = (attempts.get(email) || 0) + 1;
      attempts.set(email, tries);
      if (tries > MAX_ATTEMPTS) {
        return NextResponse.json(
          { success: false, message: 'Terlalu banyak percobaan, kirim ulang kode' },
          { status: 429 }
        );
      }

      const expected = sign(email, code, exp);
      const ok =
        expected.length === sig.length &&
        crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));

      if (!ok) {
        return NextResponse.json(
          { success: false, message: 'Kode verifikasi salah' },
          { status: 400 }
        );
      }
      attempts.delete(email);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, message: 'Action tidak dikenali' }, { status: 400 });
  } catch (err) {
    console.error('email-code error:', err);
    return NextResponse.json(
      { success: false, message: 'Gagal memproses permintaan email' },
      { status: 500 }
    );
  }
}
