'use client';

import React, { useState } from 'react';
import {
  User,
  Bookmark,
  BookOpen,
  CheckCircle2,
  Database,
  ArrowRight,
  Sparkles,
  Award,
  Clock,
  LogOut,
  Mail,
  KeyRound,
  ShieldCheck,
  X,
  Loader2,
  RefreshCw,
  Send,
} from 'lucide-react';
import { BookmarkItem, ReadingProgress, UserProfile } from '@/lib/types';
import { formatReadingDuration, calculateLevelAndExp } from '@/lib/utils';

interface AccountViewProps {
  user: UserProfile;
  history: ReadingProgress[];
  bookmarks: BookmarkItem[];
  onOpenManga: (endpoint: string) => void;
  onUpdateUsername: (newUsername: string) => void;
  onLoginGoogle: () => Promise<{ success: boolean; message?: string }>;
  onLoginEmail: (emailData: {
    email: string;
    password: string;
    code: string;
    token: string;
  }) => Promise<{ success: boolean; message?: string }>;
  onSendEmailOtp: (email: string) => Promise<{ success: boolean; token?: string; message?: string }>;
  onLogout: () => Promise<void>;
}

export default function AccountView({
  user,
  history,
  bookmarks,
  onOpenManga,
  onUpdateUsername,
  onLoginGoogle,
  onLoginEmail,
  onSendEmailOtp,
  onLogout,
}: AccountViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(user.username);
  const [failedThumb, setFailedThumb] = useState<Record<string, boolean>>({});

  // Modals state
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Email login form state
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpToken, setOtpToken] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Level & EXP calculations
  const totalSeconds = user.readingSeconds || 0;
  const { level, exp, nextLevelInMinutes } = calculateLevelAndExp(totalSeconds);
  const durationText = formatReadingDuration(totalSeconds);
  const totalPagesRead = history.reduce((acc, curr) => acc + (curr.currentPage || 1), 0);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      onUpdateUsername(nameInput.trim());
      setIsEditing(false);
    }
  };

  const handleSendOtp = async () => {
    if (!emailInput.trim() || !emailInput.includes('@')) {
      setFormError('Masukkan alamat email yang valid');
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    try {
      const res = await onSendEmailOtp(emailInput.trim());
      if (res.success) {
        setOtpSent(true);
        setOtpToken(res.token || '');
        setFormSuccess('Kode verifikasi 6 digit sudah dikirim ke email kamu. Cek inbox/spam.');
      } else {
        setFormError(res.message || 'Gagal mengirim kode verifikasi');
      }
    } catch {
      setFormError('Terjadi kesalahan saat mengirim kode');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !otpInput.trim() || !passwordInput) {
      setFormError('Email, kata sandi, dan kode verifikasi wajib diisi');
      return;
    }
    if (passwordInput.length < 6) {
      setFormError('Kata sandi minimal 6 karakter');
      return;
    }
    if (!otpToken) {
      setFormError('Kirim kode verifikasi dulu');
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    try {
      const res = await onLoginEmail({
        email: emailInput.trim(),
        password: passwordInput,
        code: otpInput.trim(),
        token: otpToken,
      });
      if (res.success) {
        setShowEmailModal(false);
        setEmailInput('');
        setPasswordInput('');
        setOtpInput('');
        setOtpSent(false);
        setOtpToken('');
        setFormSuccess(null);
      } else {
        setFormError(res.message || 'Gagal login');
      }
    } catch {
      setFormError('Terjadi kesalahan saat login');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleError(null);
    setIsSubmitting(true);
    try {
      const res = await onLoginGoogle();
      if (!res.success && res.message) setGoogleError(res.message);
    } catch {
      setGoogleError('Login Google gagal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoggedIn = Boolean(user.isLoggedIn);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6 animate-in fade-in duration-200">
      {/* USER PROFILE HEADER CARD */}
      <div className="bg-[#15161c] border border-zinc-800/80 rounded-[28px] p-6 sm:p-7 relative overflow-hidden shadow-2xl">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left w-full md:w-auto">
            <div className="relative group">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-zinc-800 border-2 border-zinc-700/80 flex items-center justify-center text-zinc-300 shrink-0 shadow-lg">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-400 stroke-[1.5]" />
                )}
              </div>
              {isLoggedIn && (
                <div
                  title="Akun Terverifikasi"
                  className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#15161c] flex items-center justify-center text-white shadow-md"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {isEditing ? (
                <form onSubmit={handleSaveName} className="flex items-center gap-2 mb-1 justify-center sm:justify-start">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="px-3.5 py-1 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-white focus:outline-none focus:border-red-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-3 py-1 rounded-xl bg-red-600 text-xs font-semibold text-white hover:bg-red-500 transition-colors"
                  >
                    Simpan
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200"
                  >
                    Batal
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate max-w-[240px] sm:max-w-xs">
                    {user.username || 'Pengguna'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setNameInput(user.username || 'Pengguna');
                      setIsEditing(true);
                    }}
                    className="text-xs text-zinc-400 hover:text-white underline transition-colors"
                  >
                    Ubah
                  </button>
                </div>
              )}

              <p className="text-xs text-zinc-400 mt-1">
                {user.email ? user.email : 'Belum menautkan akun'}
              </p>

              <div className="flex flex-wrap items-center gap-2 mt-2.5 justify-center sm:justify-start">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                  <Award className="w-3.5 h-3.5" />
                  Level {level}
                </span>

                {isLoggedIn ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {user.authProvider === 'google' ? 'Google Account' : 'Email Terverifikasi'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                    Tamu (Guest)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* AUTH ACTIONS SECTION */}
          <div className="w-full md:w-auto flex flex-col gap-2 shrink-0">
            {isLoggedIn ? (
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-zinc-800/90 hover:bg-red-600/90 text-zinc-200 hover:text-white border border-zinc-700/80 text-xs font-semibold active:scale-95 transition-all shadow-md"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar (Logout)</span>
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row md:flex-col gap-2 w-full">
                {/* LOGIN DENGAN GOOGLE */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleGoogleLogin}
                  className="flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-2xl bg-white hover:bg-zinc-100 disabled:opacity-60 text-zinc-900 text-xs font-bold active:scale-95 transition-all shadow-lg"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Login dengan Google</span>
                </button>

                {/* LOGIN DENGAN EMAIL */}
                <button
                  type="button"
                  onClick={() => {
                    setShowEmailModal(true);
                    setFormError(null);
                    setFormSuccess(null);
                  }}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-700/90 text-xs font-semibold active:scale-95 transition-all shadow-md"
                >
                  <Mail className="w-4 h-4 text-red-400" />
                  <span>Login dengan Email</span>
                </button>
                {googleError && (
                  <p className="text-[11px] text-red-400 max-w-[260px]">{googleError}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LEVEL & EXP PROGRESS CARD */}
      <div className="bg-[#15161c] border border-zinc-800/80 rounded-[28px] p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-bold text-white flex items-center gap-2">
                <span>Level {level}</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-mono">
                  {exp} / 100 EXP
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Sistem Level: Setiap 20 menit membaca naik 2 Level
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs text-zinc-400 font-medium">
              Naik level dalam ~{nextLevelInMinutes} menit
            </span>
          </div>
        </div>

        {/* EXP Progress Bar */}
        <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 relative">
          <div
            className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 transition-all duration-500 rounded-full shadow-[0_0_12px_rgba(239,68,68,0.5)]"
            style={{ width: `${Math.max(4, Math.min(100, exp))}%` }}
          />
        </div>
      </div>

      {/* READING STATS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-[#15161c] border border-zinc-800/80 rounded-[24px] p-4 flex flex-col gap-1.5 shadow-md">
          <div className="flex items-center gap-2 text-zinc-400">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-[11px] font-medium">Durasi Membaca</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-white tracking-tight leading-tight mt-1 truncate">
            {durationText}
          </div>
          <span className="text-[10px] text-zinc-500">Total waktu membaca</span>
        </div>

        <div className="bg-[#15161c] border border-zinc-800/80 rounded-[24px] p-4 flex flex-col gap-1.5 shadow-md">
          <div className="flex items-center gap-2 text-zinc-400">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] font-medium">Komik Dibaca</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-white tracking-tight leading-tight mt-1">
            {history.length}
          </div>
          <span className="text-[10px] text-zinc-500">Tersimpan di riwayat</span>
        </div>

        <div className="bg-[#15161c] border border-zinc-800/80 rounded-[24px] p-4 flex flex-col gap-1.5 shadow-md">
          <div className="flex items-center gap-2 text-zinc-400">
            <Bookmark className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-medium">Favorit</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-white tracking-tight leading-tight mt-1">
            {bookmarks.length}
          </div>
          <span className="text-[10px] text-zinc-500">Komik ditandai</span>
        </div>

        <div className="bg-[#15161c] border border-zinc-800/80 rounded-[24px] p-4 flex flex-col gap-1.5 shadow-md">
          <div className="flex items-center gap-2 text-zinc-400">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-[11px] font-medium">Total Halaman</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-white tracking-tight leading-tight mt-1">
            {totalPagesRead}
          </div>
          <span className="text-[10px] text-zinc-500">Halaman diselesaikan</span>
        </div>
      </div>

      {/* BOOKMARK / FAVORITE LIST */}
      <div className="flex flex-col gap-4 mt-2">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-red-500" />
              <span>Daftar Favorit & Bookmark</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Komik yang Anda simpan untuk dibaca kembali.
            </p>
          </div>
          <span className="text-xs text-zinc-400 font-mono font-medium px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800">
            {bookmarks.length} Komik
          </span>
        </div>

        {bookmarks.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500 bg-[#15161c] border border-zinc-800/80 rounded-[24px] p-6">
            Belum ada komik favorit yang disimpan. Klik ikon bookmark pada halaman manga untuk menambahkannya ke sini.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {bookmarks.map((bm) => {
              const imgSrc = failedThumb[bm.mangaEndpoint]
                ? `/api/proxy-image?url=${encodeURIComponent(bm.mangaThumb)}`
                : bm.mangaThumb;
              return (
                <div
                  key={bm.mangaEndpoint}
                  onClick={() => onOpenManga(bm.mangaEndpoint)}
                  className="group bg-[#15161c] border border-zinc-800/80 hover:border-zinc-700 rounded-[22px] p-3 flex items-center gap-3 cursor-pointer transition-all hover:bg-zinc-800/50 shadow-md active:scale-[0.98]"
                >
                  <div className="relative w-12 h-16 rounded-[14px] overflow-hidden bg-zinc-800 shrink-0 border border-zinc-700/60">
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={bm.mangaTitle}
                        onError={() =>
                          setFailedThumb((prev) => ({
                            ...prev,
                            [bm.mangaEndpoint]: true,
                          }))
                        }
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover object-top"
                      />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-xs sm:text-sm text-zinc-200 truncate group-hover:text-white transition-colors">
                      {bm.mangaTitle}
                    </h4>
                    <span className="text-[11px] text-zinc-500 font-medium">
                      {bm.type || 'Manga'}
                    </span>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-white shrink-0 transition-colors">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* EMAIL LOGIN & OTP MODAL                                        */}
      {/* ============================================================== */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181920] border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                  <Mail className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-white text-base">Login dengan Email</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3.5 mt-4">
              {formError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex flex-col gap-1">
                  <span>{formSuccess}</span>
                </div>
              )}

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Alamat Email</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    required
                    placeholder="nama@email.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-zinc-900 border border-zinc-700/80 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-500"
                  />
                  <button
                    type="button"
                    disabled={isSubmitting || !emailInput.includes('@')}
                    onClick={handleSendOtp}
                    className="px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-xs font-semibold text-white whitespace-nowrap transition-colors flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{otpSent ? 'Kirim Ulang' : 'Kirim Kode'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Kata Sandi (Password)</label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Kata sandi baru (min. 6 karakter)"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700/80 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-500"
                  />
                  <KeyRound className="w-4 h-4 text-zinc-500 absolute right-3.5 top-3" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-zinc-400">Kode Verifikasi (OTP)</label>
                </div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="6 digit kode verifikasi"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700/80 rounded-xl text-xs text-white font-mono tracking-widest text-center placeholder:text-zinc-500 focus:outline-none focus:border-red-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !otpInput.trim()}
                className="mt-2 w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-xs font-bold text-white transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Verifikasi & Masuk</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* LOGOUT CONFIRMATION MODAL                                      */}
      {/* ============================================================== */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181920] border border-zinc-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mx-auto mb-3">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-lg">Keluar dari Akun?</h3>
            <p className="text-xs text-zinc-400 mt-1.5 mb-5">
              Anda akan kembali ke mode tamu. Riwayat, favorit, level, dan EXP tetap tersimpan aman di akun Anda dan kembali muncul saat login lagi.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onLogout();
                  setShowLogoutConfirm(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white transition-colors"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
