'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import MangaDetailView from '@/components/MangaDetailView';
import HorizontalReader from '@/components/HorizontalReader';
import HistoryView from '@/components/HistoryView';
import GenresView from '@/components/GenresView';
import AccountView from '@/components/AccountView';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase';
import { loadCloudData, saveCloudData } from '@/lib/cloud-sync';
import { calculateLevelAndExp } from '@/lib/utils';
import {
  MangaItem,
  UserProfile,
  ReadingProgress,
  BookmarkItem,
  AppDatabase,
} from '@/lib/types';
import {
  GLOBAL_TOP_POPULAR,
  INITIAL_TRENDING,
  INITIAL_ONGOING,
} from '@/lib/initial-data';
import initialTopManga from '@/data/top_manga_34.json';
import {
  Search,
  Eye,
  ChevronRight,
  ChevronLeft,
  X,
  Home as HomeIcon,
  Flame,
  Calendar,
  Library,
  User,
  Bookmark,
  Trash2,
  Clock,
  Award,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/* ==================== CONFIG & CONSTANTS ==================== */
type MainTabType = 'home' | 'riwayat' | 'peringkat' | 'genres';
const MAIN_TABS: MainTabType[] = ['home', 'riwayat', 'peringkat', 'genres'];

function formatDisplayViews(views: number | string | undefined, defaultIdx = 0): string {
  if (typeof views === 'number' && views > 0) {
    if (views >= 1_000_000) {
      return `${(views / 1_000_000).toFixed(1).replace(/\.0$/, '')}M views`;
    }
    if (views >= 1_000) {
      return `${(views / 1_000).toFixed(1).replace(/\.0$/, '')}K views`;
    }
    return `${views} views`;
  }
  if (typeof views === 'string' && views.trim()) {
    if (views.includes('views') || views.includes('online')) return views;
    const num = parseInt(views.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(num) && num > 0) return formatDisplayViews(num);
    return `${views} views`;
  }
  const fallbackCounts = [
    '694.4K', '620.3K', '603.5K', '559.8K', '499.0K',
    '364.8K', '339.0K', '329.6K', '265.3K', '263.8K',
    '225.0K', '207.6K', '206.9K', '200.6K', '187.6K',
    '185.2K', '182.2K', '175.6K', '172.6K', '172.2K'
  ];
  return `${fallbackCounts[defaultIdx % fallbackCounts.length]} views`;
}

function sanitizeThumbUrl(url: string | undefined): string {
  if (!url) return '';
  let u = url.trim();
  if (u.startsWith('//')) u = 'https:' + u;
  u = u.replace(/^http:\/\//i, 'https://');
  u = u.split('?')[0];
  return u;
}

const loadedImageCache = new Set<string>();
const failedDirectUrls = new Set<string>();

function SafeImage({
  src,
  alt,
  className,
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const sanitized = sanitizeThumbUrl(src);
  const [retryLevel, setRetryLevel] = useState<number>(() => {
    return failedDirectUrls.has(sanitized) ? 2 : 0;
  });

  let currentSrc = sanitized;
  if (retryLevel > 0) {
    currentSrc = `/api/proxy-image?url=${encodeURIComponent(sanitized)}`;
  }

  const handleError = () => {
    failedDirectUrls.add(sanitized);
    setRetryLevel(2);
  };

  const handleLoad = () => {
    if (currentSrc) loadedImageCache.add(currentSrc);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-zinc-800">
      {currentSrc ? (
        <img
          src={currentSrc}
          alt={alt}
          referrerPolicy="no-referrer"
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          loading="eager"
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={handleLoad}
          onError={handleError}
          className={`${className || ''} relative z-10 w-full h-full object-cover`}
        />
      ) : null}
    </div>
  );
}

// Clean country tag specifically for Baru Ditambahkan
function CountryBadgeTag({ type }: { type?: string }) {
  const norm = (type || 'manga').toLowerCase();
  if (norm.includes('manhwa')) {
    return (
      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-[4px] bg-black/75 backdrop-blur-sm text-[10px] shadow-sm flex items-center justify-center font-bold text-white border border-white/20">
        KR
      </div>
    );
  }
  if (norm.includes('manhua')) {
    return (
      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-[4px] bg-black/75 backdrop-blur-sm text-[10px] shadow-sm flex items-center justify-center font-bold text-white border border-white/20">
        CN
      </div>
    );
  }
  return (
    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-[4px] bg-black/75 backdrop-blur-sm text-[10px] shadow-sm flex items-center justify-center font-bold text-white border border-white/20">
      JP
    </div>
  );
}

/* ==================== SKELETON LOADERS ==================== */
function RankingListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-1 w-full">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="flex items-start gap-2.5 py-2.5 border-b border-zinc-800/40 last:border-b-0"
        >
          <div className="w-[72px] h-[98px] rounded-2xl bg-zinc-800/90 animate-shimmer shrink-0 border border-zinc-800/60" />
          <div className="w-6 h-6 rounded-md bg-zinc-800/60 animate-shimmer shrink-0 pt-0.5" />
          <div className="flex flex-col flex-1 min-w-0 pr-1 justify-between self-stretch py-0.5">
            <div className="flex flex-col gap-2">
              <div className="h-4 w-3/4 bg-zinc-800/90 rounded-full animate-shimmer" />
              <div className="h-3 w-1/3 bg-zinc-800/60 rounded-full animate-shimmer" />
            </div>
            <div className="flex items-center justify-between mt-2.5 gap-2">
              <div className="flex gap-1.5">
                <div className="h-4 w-8 rounded-md bg-[#222226] animate-shimmer" />
                <div className="h-4 w-12 rounded-md bg-[#222226] animate-shimmer" />
              </div>
              <div className="h-3 w-16 bg-zinc-800/60 rounded-full animate-shimmer" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SearchListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div
          key={idx}
          className="flex items-center gap-3 p-2.5 bg-zinc-900/40 rounded-2xl border border-zinc-800/40"
        >
          <div className="w-14 h-18 rounded-xl bg-zinc-800/90 animate-shimmer shrink-0" />
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <div className="h-4 w-3/4 bg-zinc-800/90 rounded-full animate-shimmer" />
            <div className="h-3 w-1/3 bg-zinc-800/60 rounded-full animate-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ==================== MAIN COMPONENT ==================== */
export default function Page() {
  const [activeTab, setActiveTab] = useState<MainTabType>('home');
  const [dedicatedView, setDedicatedView] = useState<'favorite' | 'profile' | 'search' | null>(null);

  // WhatsApp-style horizontal pager ref
  const pagerRef = useRef<HTMLDivElement>(null);
  const isScrollingProgrammatically = useRef<boolean>(false);

  // Instant snap when bottom nav button is pressed
  const handleNavClick = (tab: MainTabType) => {
    setDedicatedView(null);
    setActiveTab(tab);
    const tabIndex = MAIN_TABS.indexOf(tab);
    if (pagerRef.current && tabIndex >= 0) {
      isScrollingProgrammatically.current = true;
      const targetLeft = tabIndex * pagerRef.current.clientWidth;
      pagerRef.current.scrollTo({ left: targetLeft, behavior: 'instant' });
      setTimeout(() => {
        isScrollingProgrammatically.current = false;
      }, 50);
    }
  };

  // WhatsApp-style scroll listener: real-time finger slide with auto-locking
  const handlePagerScroll = () => {
    if (isScrollingProgrammatically.current || !pagerRef.current) return;
    const container = pagerRef.current;
    const width = container.clientWidth;
    if (width <= 0) return;
    const currentScroll = container.scrollLeft;
    const closestIndex = Math.round(currentScroll / width);
    if (closestIndex >= 0 && closestIndex < MAIN_TABS.length) {
      const detectedTab = MAIN_TABS[closestIndex];
      if (detectedTab !== activeTab) {
        setActiveTab(detectedTab);
      }
    }
  };

  // Block contextmenu image download popup globally
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'IMG' || target?.closest('img')) {
        e.preventDefault();
      }
    };
    window.addEventListener('contextmenu', handleContextMenu);
    return () => window.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  const [selectedMangaEndpoint, setSelectedMangaEndpoint] = useState<string | null>(null);
  const [activeChapter, setActiveChapter] = useState<{
    chapterEndpoint: string;
    chapterTitle: string;
    mangaEndpoint: string;
    mangaTitle: string;
    mangaThumb: string;
    initialPage: number;
    fromHistory?: boolean;
    type?: string;
    author?: string;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MangaItem[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchAbortControllerRef = useRef<AbortController | null>(null);
  const activeSearchQueryRef = useRef<string>('');

  // Main Data States with exact live API order
  const [popular, setPopular] = useState<MangaItem[]>(GLOBAL_TOP_POPULAR);
  const [trending, setTrending] = useState<MangaItem[]>(INITIAL_TRENDING);
  const [ongoing, setOngoing] = useState<MangaItem[]>(INITIAL_ONGOING);
  const [topManga, setTopManga] = useState<MangaItem[]>(initialTopManga as unknown as MangaItem[]);
  const [komikBerwarna, setKomikBerwarna] = useState<MangaItem[]>(() =>
    GLOBAL_TOP_POPULAR.filter((m) => {
      const t = (m.type || '').toLowerCase();
      return t === 'manhwa' || t === 'manhua';
    }).slice(0, 15)
  );
  const [baruDitambahkan, setBaruDitambahkan] = useState<{
    semua: MangaItem[];
    manga: MangaItem[];
    manhwa: MangaItem[];
    manhua: MangaItem[];
  }>({
    semua: INITIAL_ONGOING.slice(0, 30),
    manga: INITIAL_ONGOING.filter((m) => (m.type || '').toLowerCase() === 'manga'),
    manhwa: INITIAL_ONGOING.filter((m) => (m.type || '').toLowerCase() === 'manhwa'),
    manhua: INITIAL_ONGOING.filter((m) => (m.type || '').toLowerCase() === 'manhua'),
  });

  const [loadingHome, setLoadingHome] = useState(false);

  // Tabs for Peringkat: Terpopuler, Trending, Terbaru
  const [rankingTab, setRankingTab] = useState<'terpopuler' | 'trending' | 'terbaru'>('terpopuler');
  const [isRankingLoading, setIsRankingLoading] = useState<boolean>(false);

  // Tabs for Baru Ditambahkan: Semua, Manga, Manhwa, Manhua
  const [baruTab, setBaruTab] = useState<'Semua' | 'Manga' | 'Manhwa' | 'Manhua'>('Semua');

  const handleRankingTabChange = (tab: 'terpopuler' | 'trending' | 'terbaru') => {
    if (tab === rankingTab) return;
    setIsRankingLoading(true);
    setRankingTab(tab);
    setTimeout(() => {
      setIsRankingLoading(false);
    }, 180);
  };

  const handleBaruTabChange = (tab: 'Semua' | 'Manga' | 'Manhwa' | 'Manhua') => {
    setBaruTab(tab);
  };

  const [heroIndex, setHeroIndex] = useState(0);

  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: 'user_default',
    username: 'Pembaca Manga',
    email: 'reader@mangaid.app',
    avatarSeed: 'manga-reader-avatar',
    avatarUrl: '',
    level: 1,
    readingSeconds: 360,
    joinedDate: '2026-01-01T00:00:00.000Z',
  });

  const [history, setHistory] = useState<ReadingProgress[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);

  // ---- Auth Firebase + sinkronisasi Firestore ----
  const authUidRef = useRef<string | null>(null);
  const cloudReadyRef = useRef(false);
  const dirtyRef = useRef(false);
  const customNameRef = useRef<string | undefined>(undefined);
  const stateRef = useRef({ history: [] as ReadingProgress[], bookmarks: [] as BookmarkItem[], readingSeconds: 0 });
  stateRef.current = { history, bookmarks, readingSeconds: userProfile.readingSeconds || 0 };

  const flushCloud = useCallback(async () => {
    const uid = authUidRef.current;
    if (!uid || !cloudReadyRef.current || !dirtyRef.current) return;
    dirtyRef.current = false;
    const st = stateRef.current;
    const { level, exp } = calculateLevelAndExp(st.readingSeconds);
    try {
      await saveCloudData(uid, {
        history: st.history,
        bookmarks: st.bookmarks,
        readingSeconds: st.readingSeconds,
        level,
        exp,
        customUsername: customNameRef.current,
      });
    } catch (err) {
      dirtyRef.current = true;
      console.error('Gagal menyimpan ke Firestore:', err);
    }
  }, []);

  // Tandai ada perubahan yang perlu disimpan
  useEffect(() => {
    dirtyRef.current = true;
  }, [history, bookmarks, userProfile.readingSeconds]);

  // Simpan cepat saat riwayat/favorit berubah
  useEffect(() => {
    const t = setTimeout(() => {
      flushCloud();
    }, 2000);
    return () => clearTimeout(t);
  }, [history, bookmarks, flushCloud]);

  // Simpan berkala (waktu baca berjalan tiap detik) + saat tab ditutup/disembunyikan
  useEffect(() => {
    const id = setInterval(() => {
      flushCloud();
    }, 10000);
    const onHide = () => {
      if (document.visibilityState === 'hidden') flushCloud();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
    };
  }, [flushCloud]);

  // Pantau status login Firebase
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsub = onAuthStateChanged(getFirebaseAuth(), async (fu) => {
      if (!fu) {
        authUidRef.current = null;
        cloudReadyRef.current = false;
        return;
      }
      authUidRef.current = fu.uid;
      cloudReadyRef.current = false;
      const provider: 'google' | 'email' = fu.providerData.some((p) => p?.providerId === 'google.com')
        ? 'google'
        : 'email';
      const local = (fu.email || '').split('@')[0];
      const baseName = fu.displayName || (local ? local.charAt(0).toUpperCase() + local.slice(1) : 'Pengguna');
      const identity = {
        id: fu.uid,
        email: fu.email || '',
        avatarUrl: fu.photoURL || '',
        isLoggedIn: true,
        authProvider: provider,
      };
      try {
        const cloud = await loadCloudData(fu.uid);
        if (authUidRef.current !== fu.uid) return;
        if (cloud) {
          const { level, exp } = calculateLevelAndExp(cloud.readingSeconds);
          customNameRef.current = cloud.customUsername;
          setHistory(cloud.history);
          setBookmarks(cloud.bookmarks);
          setUserProfile((prev) => ({
            ...prev,
            ...identity,
            username: cloud.customUsername || baseName,
            readingSeconds: cloud.readingSeconds,
            level,
            exp,
          }));
        } else {
          // Akun baru: mulai bersih, data disimpan ke akun ini
          customNameRef.current = undefined;
          setHistory([]);
          setBookmarks([]);
          setUserProfile((prev) => ({
            ...prev,
            ...identity,
            username: baseName,
            readingSeconds: 0,
            level: 1,
            exp: 0,
          }));
        }
        cloudReadyRef.current = true;
        dirtyRef.current = true;
      } catch (err) {
        console.error('Gagal memuat data Firestore:', err);
        setUserProfile((prev) => ({ ...prev, ...identity, username: baseName }));
        window.alert(
          'Login berhasil, tetapi database Firestore tidak bisa diakses. Pastikan Firestore sudah dibuat dan rules sudah dipublish (lihat firestore.rules).'
        );
      }
    });
    return () => unsub();
  }, []);

  // Fetch real-time live data from API
  useEffect(() => {
    let ignore = false;
    async function loadInitial() {
      setLoadingHome(true);
      try {
        const [homeRes, userRes] = await Promise.all([
          fetch('/api/manga/home'),
          fetch('/api/user'),
        ]);

        if (!ignore && homeRes.ok) {
          const homeJson = await homeRes.json();
          if (homeJson?.success && homeJson.data) {
            const d = homeJson.data;
            if (Array.isArray(d.popular) && d.popular.length > 0) setPopular(d.popular);
            if (Array.isArray(d.trending) && d.trending.length > 0) setTrending(d.trending);
            if (Array.isArray(d.terbaru) && d.terbaru.length > 0) setOngoing(d.terbaru);
            if (Array.isArray(d.komikBerwarna) && d.komikBerwarna.length > 0) setKomikBerwarna(d.komikBerwarna.slice(0, 15));
            if (d.baruDitambahkan) setBaruDitambahkan(d.baruDitambahkan);
            if (Array.isArray(d.topManga) && d.topManga.length > 0) setTopManga(d.topManga);
          }
        }

        if (!ignore && userRes.ok) {
          const userJson = await userRes.json();
          if (userJson?.success && userJson.data) {
            const db: AppDatabase = userJson.data;
            if (!authUidRef.current) {
              if (db.user) {
                setUserProfile({
                  ...db.user,
                  username: 'Pengguna',
                  email: '',
                  avatarUrl: '',
                  isLoggedIn: false,
                  authProvider: null,
                });
              }
              if (db.history) setHistory(db.history);
              if (db.bookmarks) setBookmarks(db.bookmarks);
            }
          }
        }
      } catch (err) {
        console.warn('Initial load notice:', err);
      } finally {
        if (!ignore) setLoadingHome(false);
      }
    }
    loadInitial();
    return () => {
      ignore = true;
    };
  }, []);

  const performSearch = useCallback(async (query: string) => {
    const q = query.trim();
    activeSearchQueryRef.current = q;
    if (!q) {
      if (searchAbortControllerRef.current) {
        searchAbortControllerRef.current.abort();
      }
      setSearchResults([]);
      setLoadingSearch(false);
      return;
    }

    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    searchAbortControllerRef.current = controller;

    setLoadingSearch(true);
    try {
      const res = await fetch(`/api/manga/search?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      });
      const json = await res.json();
      if (activeSearchQueryRef.current === q) {
        if (json.success && Array.isArray(json.data)) {
          setSearchResults(json.data);
        } else {
          setSearchResults([]);
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        console.warn('Search notice:', err);
      }
    } finally {
      if (activeSearchQueryRef.current === q) {
        setLoadingSearch(false);
      }
    }
  }, []);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (!query.trim()) {
      performSearch('');
      return;
    }
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 280);
  };

  const handleDeleteHistoryItem = async (mangaEndpoint: string) => {
    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_history_item',
          payload: { mangaEndpoint },
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setHistory(json.data);
      } else {
        setHistory((prev) => prev.filter((h) => h.mangaEndpoint !== mangaEndpoint));
      }
    } catch (err) {
      console.warn('History item delete error:', err);
      setHistory((prev) => prev.filter((h) => h.mangaEndpoint !== mangaEndpoint));
    }
  };

  const handleDeleteMultipleHistoryItems = async (endpoints: string[]) => {
    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_history_items',
          payload: { endpoints },
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setHistory(json.data);
      } else {
        const set = new Set(endpoints);
        setHistory((prev) => prev.filter((h) => !set.has(h.mangaEndpoint)));
      }
    } catch (err) {
      console.warn('Multiple history items delete error:', err);
      const set = new Set(endpoints);
      setHistory((prev) => prev.filter((h) => !set.has(h.mangaEndpoint)));
    }
  };

  const handleReaderTimeUpdate = React.useCallback((seconds: number, level: number) => {
    setUserProfile((prev) => {
      if (prev.readingSeconds === seconds && prev.level === level) return prev;
      return {
        ...prev,
        readingSeconds: seconds,
        level,
      };
    });
  }, []);

  const handleReaderProgressSync = (progress: {
    mangaEndpoint: string;
    mangaTitle: string;
    mangaThumb: string;
    chapterEndpoint: string;
    chapterTitle: string;
    currentPage: number;
    totalPages: number;
    type?: string;
    author?: string;
  }) => {
    setHistory((prev) => {
      const existingIdx = prev.findIndex((h) => h.mangaEndpoint === progress.mangaEndpoint);
      const existingChapters =
        existingIdx >= 0 && prev[existingIdx].chaptersRead
          ? { ...prev[existingIdx].chaptersRead }
          : {};

      const cleanCh = (progress.chapterEndpoint || '').replace(/^\//, '').replace(/\/$/, '');
      if (cleanCh) {
        existingChapters[cleanCh] = {
          currentPage: progress.currentPage,
          totalPages: progress.totalPages,
          updatedAt: new Date().toISOString(),
          chapterTitle: progress.chapterTitle,
        };
      }

      const item: ReadingProgress = {
        ...progress,
        updatedAt: new Date().toISOString(),
        chaptersRead: existingChapters,
      };

      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = item;
        return copy;
      }
      return [item, ...prev];
    });
  };

  const handleRemoveBookmark = async (mangaEndpoint: string) => {
    try {
      setBookmarks((prev) => prev.filter((b) => b.mangaEndpoint !== mangaEndpoint));
      await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_bookmark',
          payload: { mangaEndpoint },
        }),
      });
    } catch (err) {
      console.warn('Remove bookmark error:', err);
    }
  };

  const handleUpdateUsername = async (newUsername: string) => {
    try {
      setUserProfile((prev) => ({ ...prev, username: newUsername }));
      if (authUidRef.current) {
        customNameRef.current = newUsername;
        dirtyRef.current = true;
      }
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_profile',
          payload: { username: newUsername },
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setUserProfile((prev) => ({ ...prev, ...json.data }));
      }
    } catch (err) {
      console.error('Update username error:', err);
    }
  };

  const handleLoginGoogle = async (): Promise<{ success: boolean; message?: string }> => {
    if (!isFirebaseConfigured) {
      return {
        success: false,
        message: 'Firebase belum dikonfigurasi. Isi NEXT_PUBLIC_FIREBASE_* di file .env lalu restart.',
      };
    }
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(getFirebaseAuth(), provider);
      return { success: true };
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return { success: false };
      }
      if (code === 'auth/unauthorized-domain') {
        return {
          success: false,
          message: 'Domain belum diizinkan. Tambahkan di Firebase Console > Authentication > Settings > Authorized domains.',
        };
      }
      if (code === 'auth/operation-not-allowed') {
        return { success: false, message: 'Aktifkan provider Google di Firebase Console > Authentication > Sign-in method.' };
      }
      if (code === 'auth/popup-blocked') {
        return { success: false, message: 'Popup diblokir browser. Izinkan popup lalu coba lagi.' };
      }
      console.error('Login google error:', err);
      return { success: false, message: 'Login Google gagal. Coba lagi.' };
    }
  };

  const handleSendEmailOtp = async (email: string) => {
    try {
      const res = await fetch('/api/auth/email-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', email }),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Gagal mengirim kode verifikasi' };
    }
  };

  const handleLoginEmail = async (emailData: {
    email: string;
    password: string;
    code: string;
    token: string;
  }): Promise<{ success: boolean; message?: string }> => {
    if (!isFirebaseConfigured) {
      return { success: false, message: 'Firebase belum dikonfigurasi di file .env' };
    }
    try {
      const vRes = await fetch('/api/auth/email-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          email: emailData.email,
          code: emailData.code,
          token: emailData.token,
        }),
      });
      const vJson = await vRes.json();
      if (!vJson.success) {
        return { success: false, message: vJson.message || 'Kode verifikasi salah' };
      }

      const auth = getFirebaseAuth();
      try {
        await createUserWithEmailAndPassword(auth, emailData.email, emailData.password);
      } catch (err) {
        const code = (err as { code?: string })?.code || '';
        if (code === 'auth/email-already-in-use') {
          try {
            await signInWithEmailAndPassword(auth, emailData.email, emailData.password);
          } catch {
            return { success: false, message: 'Email sudah terdaftar. Kata sandi salah, atau email ini dipakai untuk login Google.' };
          }
        } else if (code === 'auth/operation-not-allowed') {
          return { success: false, message: 'Aktifkan provider Email/Password di Firebase Console > Authentication.' };
        } else if (code === 'auth/weak-password') {
          return { success: false, message: 'Kata sandi terlalu lemah (min. 6 karakter)' };
        } else {
          console.error('Login email error:', err);
          return { success: false, message: 'Login email gagal. Coba lagi.' };
        }
      }
      return { success: true };
    } catch (err) {
      console.error('Login email error:', err);
      return { success: false, message: 'Terjadi kesalahan saat login' };
    }
  };

  const handleLogout = async () => {
    try {
      await flushCloud();
      if (isFirebaseConfigured) await signOut(getFirebaseAuth());
    } catch (err) {
      console.error('Logout error:', err);
    }
    authUidRef.current = null;
    cloudReadyRef.current = false;
    customNameRef.current = undefined;
    setHistory([]);
    setBookmarks([]);
    setUserProfile((prev) => ({
      ...prev,
      id: 'user_default',
      username: 'Pengguna',
      email: '',
      avatarUrl: '',
      isLoggedIn: false,
      authProvider: null,
      level: 1,
      exp: 0,
      readingSeconds: 0,
    }));
  };

  // Get active ranked list: exactly 5 items for Home, 100 for Peringkat view
  const getRankedList = (): MangaItem[] => {
    if (rankingTab === 'terpopuler') {
      return popular;
    }
    if (rankingTab === 'trending') {
      return trending;
    }
    return ongoing;
  };

  const rankedList = getRankedList();

  // Get current "Baru Ditambahkan" items
  const getFilteredBaru = (): MangaItem[] => {
    if (baruTab === 'Manga') {
      return baruDitambahkan.manga && baruDitambahkan.manga.length > 0
        ? baruDitambahkan.manga
        : ongoing.filter((m) => (m.type || '').toLowerCase() === 'manga');
    }
    if (baruTab === 'Manhwa') {
      return baruDitambahkan.manhwa && baruDitambahkan.manhwa.length > 0
        ? baruDitambahkan.manhwa
        : ongoing.filter((m) => (m.type || '').toLowerCase() === 'manhwa');
    }
    if (baruTab === 'Manhua') {
      return baruDitambahkan.manhua && baruDitambahkan.manhua.length > 0
        ? baruDitambahkan.manhua
        : ongoing.filter((m) => (m.type || '').toLowerCase() === 'manhua');
    }
    return baruDitambahkan.semua && baruDitambahkan.semua.length > 0
      ? baruDitambahkan.semua
      : ongoing;
  };

  const filteredBaru = getFilteredBaru();

  // Hero top items
  const topHeroMangas = React.useMemo(() => {
    const source = popular.length > 0 ? popular : trending;
    return source.slice(0, 4);
  }, [popular, trending]);

  useEffect(() => {
    if (topHeroMangas.length === 0) return;
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % topHeroMangas.length);
    }, 7500);
    return () => clearInterval(interval);
  }, [topHeroMangas.length]);

  const currentHeroManga = topHeroMangas[heroIndex] || topHeroMangas[0];
  const terbaruCards = ongoing.slice(0, 3);

  // Fast cover preloading for "terbaik" (hero, ranking top, and top manga)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urls: string[] = [];
    topHeroMangas.forEach((m) => m?.thumb && urls.push(m.thumb));
    terbaruCards.forEach((m) => m?.thumb && urls.push(m.thumb));
    popular.slice(0, 5).forEach((m) => m?.thumb && urls.push(m.thumb));
    topManga.slice(0, 6).forEach((m) => m?.thumb && urls.push(m.thumb));
    komikBerwarna.slice(0, 6).forEach((m) => m?.thumb && urls.push(m.thumb));

    urls.forEach((raw) => {
      const clean = sanitizeThumbUrl(raw);
      if (clean) {
        const img = new Image();
        img.referrerPolicy = 'no-referrer';
        img.src = clean;
      }
    });
  }, [topHeroMangas, terbaruCards, popular, topManga, komikBerwarna]);

  const renderMangaRankingRow = (manga: MangaItem, idx: number) => {
    const rankNum = idx + 1;
    const isTripleDigit = rankNum >= 100;
    const viewsLabel = formatDisplayViews(manga.views, idx);

    return (
      <div
        key={`${rankingTab}-${manga.endpoint}-${idx}`}
        onClick={() => setSelectedMangaEndpoint(manga.endpoint)}
        className="flex items-start gap-2.5 py-2.5 border-b border-zinc-800/40 last:border-b-0 cursor-pointer group select-none active:opacity-75 transition-opacity"
      >
        <div className="w-[72px] h-[98px] rounded-2xl overflow-hidden bg-zinc-800 shrink-0 shadow-md border border-zinc-800/60">
          <SafeImage
            src={manga.thumb}
            alt={manga.title}
            priority={idx < 3}
            className="w-full h-full object-cover object-top"
          />
        </div>

        <div
          className={`${
            isTripleDigit ? 'w-8 sm:w-9 text-base font-extrabold' : 'w-6 text-2xl font-black'
          } text-zinc-400 tabular-nums shrink-0 pt-0.5 text-center flex items-center justify-center`}
        >
          {rankNum}
        </div>

        <div className="flex flex-col flex-1 min-w-0 pr-1 justify-between self-stretch py-0.5">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white line-clamp-1 group-hover:text-zinc-200 tracking-tight">
              {manga.title}
            </h3>
            <p className="text-[11px] sm:text-xs text-zinc-400 line-clamp-1 mt-0.5 font-normal">
              {manga.author || 'Komikus'}
            </p>
          </div>

          <div className="flex items-center justify-between mt-2.5 gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-1.5 py-0.5 rounded-md bg-[#222226] text-[10px] font-bold text-zinc-300">
                IND
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-[#222226] text-[10px] font-bold text-zinc-300">
                {manga.type ? manga.type.toUpperCase() : 'MANGA'}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] sm:text-xs text-zinc-400 font-medium shrink-0">
              <Eye className="w-3.5 h-3.5 text-zinc-400" />
              <span>{viewsLabel}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      onContextMenu={(e) => {
        const target = e.target as HTMLElement;
        if (target?.tagName === 'IMG' || target?.closest('img')) {
          e.preventDefault();
        }
      }}
      className="h-[100dvh] w-full bg-[#121214] text-white flex justify-center selection:bg-zinc-800 overflow-hidden"
    >
      <main className="w-full max-w-md h-full bg-[#121214] flex flex-col relative shadow-2xl border-x border-zinc-900/60 overflow-hidden">
        {/* ============================================================== */}
        {/* WHATSAPP-STYLE REAL-TIME HORIZONTAL SLIDER WITH SNAP LOCKING    */}
        {/* ============================================================== */}
        <div
          ref={pagerRef}
          onScroll={handlePagerScroll}
          className="flex-1 w-full flex flex-row overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth scrollbar-none relative z-10"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* TAB 0: BERANDA (HOME) */}
          <div className="w-full h-full shrink-0 snap-start snap-always overflow-y-auto overflow-x-hidden scrollbar-none flex flex-col pb-24 relative">
            {/* ATMOSPHERIC HOME VIEW TOP BACKGROUND - EXPANDED DOWNWARDS TO 980PX WITH 20 DIVERSE BRIGHTER PALETTES */}
            {currentHeroManga && (
              <div
                className="absolute top-0 inset-x-0 h-[980px] pointer-events-none overflow-hidden z-0 transition-all duration-1000 ease-in-out"
                style={{
                  background: `linear-gradient(180deg, ${
                    [
                      'rgba(18, 92, 112, 0.98)',   // 0: Vibrant Teal
                      'rgba(118, 22, 40, 0.98)',   // 1: Crimson Wine
                      'rgba(28, 68, 138, 0.98)',   // 2: Royal Sapphire
                      'rgba(20, 95, 62, 0.98)',    // 3: Emerald Forest
                      'rgba(90, 28, 120, 0.98)',   // 4: Amethyst Violet
                      'rgba(128, 58, 22, 0.98)',   // 5: Warm Amber Terracotta
                      'rgba(118, 24, 78, 0.98)',   // 6: Magenta Rose
                      'rgba(24, 88, 128, 0.98)',   // 7: Ocean Azure
                      'rgba(56, 34, 130, 0.98)',   // 8: Midnight Electric Indigo
                      'rgba(44, 98, 48, 0.98)',    // 9: Deep Jade Green
                      'rgba(132, 20, 32, 0.98)',   // 10: Blood Ruby
                      'rgba(22, 78, 148, 0.98)',   // 11: Cobalt Sky
                      'rgba(135, 46, 36, 0.98)',   // 12: Sunset Coral
                      'rgba(104, 32, 132, 0.98)',  // 13: Purple Orchid
                      'rgba(118, 72, 18, 0.98)',   // 14: Golden Bronze
                      'rgba(16, 98, 92, 0.98)',    // 15: Sea Aquamarine
                      'rgba(98, 22, 60, 0.98)',    // 16: Mulberry Plum
                      'rgba(48, 42, 138, 0.98)',   // 17: Cosmic Violet
                      'rgba(36, 88, 54, 0.98)',    // 18: Moss Spruce
                      'rgba(125, 22, 64, 0.98)',   // 19: Carmine Raspberry
                    ][heroIndex % 20]
                  } 0%, ${
                    [
                      'rgba(14, 70, 86, 0.78)',
                      'rgba(88, 16, 30, 0.78)',
                      'rgba(20, 50, 105, 0.78)',
                      'rgba(15, 72, 46, 0.78)',
                      'rgba(68, 20, 92, 0.78)',
                      'rgba(98, 42, 16, 0.78)',
                      'rgba(90, 18, 60, 0.78)',
                      'rgba(18, 66, 98, 0.78)',
                      'rgba(42, 25, 98, 0.78)',
                      'rgba(32, 74, 36, 0.78)',
                      'rgba(100, 15, 24, 0.78)',
                      'rgba(16, 58, 112, 0.78)',
                      'rgba(102, 34, 26, 0.78)',
                      'rgba(78, 24, 100, 0.78)',
                      'rgba(90, 54, 14, 0.78)',
                      'rgba(12, 74, 70, 0.78)',
                      'rgba(74, 16, 45, 0.78)',
                      'rgba(36, 32, 104, 0.78)',
                      'rgba(26, 66, 40, 0.78)',
                      'rgba(95, 16, 48, 0.78)',
                    ][heroIndex % 20]
                  } 35%, ${
                    [
                      'rgba(12, 48, 60, 0.48)',
                      'rgba(58, 12, 22, 0.48)',
                      'rgba(16, 35, 75, 0.48)',
                      'rgba(12, 48, 32, 0.48)',
                      'rgba(45, 14, 62, 0.48)',
                      'rgba(65, 28, 12, 0.48)',
                      'rgba(60, 12, 40, 0.48)',
                      'rgba(14, 45, 68, 0.48)',
                      'rgba(28, 18, 65, 0.48)',
                      'rgba(22, 50, 26, 0.48)',
                      'rgba(66, 10, 16, 0.48)',
                      'rgba(12, 38, 76, 0.48)',
                      'rgba(68, 24, 18, 0.48)',
                      'rgba(52, 16, 68, 0.48)',
                      'rgba(60, 36, 10, 0.48)',
                      'rgba(10, 50, 46, 0.48)',
                      'rgba(50, 12, 30, 0.48)',
                      'rgba(24, 22, 70, 0.48)',
                      'rgba(18, 44, 28, 0.48)',
                      'rgba(62, 12, 32, 0.48)',
                    ][heroIndex % 20]
                  } 65%, rgba(18, 18, 20, 0.85) 88%, #121214 100%)`,
                }}
              />
            )}

            {/* Header: transparent, blends directly with page background, no border/outline */}
            <header className="w-full bg-transparent border-none outline-none shadow-none px-4 py-3 flex items-center justify-between shrink-0 relative z-10">
              <h1 className="text-xl font-semibold tracking-tight text-zinc-100 select-none">
                Beranda
              </h1>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDedicatedView('favorite')}
                  className="p-1 text-zinc-300 hover:text-white transition-colors active:scale-90"
                  title="Favorit"
                >
                  <Bookmark className="w-5 h-5 stroke-[2]" />
                </button>
                <button
                  type="button"
                  onClick={() => setDedicatedView('profile')}
                  className="p-0.5 text-zinc-300 hover:text-white transition-colors active:scale-90"
                  title="Profile"
                >
                  {userProfile.avatarUrl ? (
                    <div className="w-6 h-6 rounded-full overflow-hidden border border-zinc-600">
                      <img
                        src={userProfile.avatarUrl}
                        alt="Avatar"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <User className="w-5 h-5 stroke-[2]" />
                  )}
                </button>
              </div>
            </header>

            {/* Hero Top 4 in Rounded Container with Title at Center Bottom and no outline */}
            {loadingHome && topHeroMangas.length === 0 ? (
              <div className="mx-4 mt-1 aspect-[16/9.5] sm:aspect-[16/9] rounded-[24px] bg-zinc-900 animate-shimmer shrink-0 relative z-10" />
            ) : currentHeroManga ? (
              <div
                onClick={() => setSelectedMangaEndpoint(currentHeroManga.endpoint)}
                className="mx-4 mt-1 aspect-[16/9.5] sm:aspect-[16/9] rounded-[24px] overflow-hidden cursor-pointer select-none bg-zinc-950 relative z-10 border-none outline-none shadow-md group shrink-0"
              >
                <div className="absolute inset-0 w-full h-full overflow-hidden">
                  <SafeImage
                    key={currentHeroManga.endpoint}
                    src={currentHeroManga.thumb}
                    alt={currentHeroManga.title}
                    priority={true}
                    className="w-full h-full object-cover object-top filter brightness-95 transition-opacity duration-700 animate-fade-in"
                  />
                </div>
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-transparent z-10" />
                {/* Pinned Top-Left Ranking Badge (#1, #2, #3, #4) */}
                <div className="absolute top-0 left-0 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-br-2xl text-white font-black text-xs sm:text-sm tracking-tight z-20 pointer-events-none flex items-center justify-center border-none shadow-sm">
                  <span>#{heroIndex + 1}</span>
                </div>
                {/* Title centered at bottom with low opacity black background, no outline, no extra text */}
                <div className="absolute bottom-3 inset-x-3 flex justify-center items-center z-20 pointer-events-none">
                  <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-2xl max-w-[90%] border-none outline-none shadow-sm flex items-center justify-center">
                    <h2 className="text-sm sm:text-base font-bold text-white text-center line-clamp-1 tracking-tight">
                      {currentHeroManga.title}
                    </h2>
                  </div>
                </div>
              </div>
            ) : null}

            {/* SEARCH BAR BUTTON - GRAY BLUR TRANSPARENT, NO OUTLINE, RADIUS 40-45PX, SVG SEARCH ON LEFT, "Cari Komik" ON RIGHT */}
            <div className="mx-4 mt-3 relative z-10">
              <button
                type="button"
                onClick={() => setDedicatedView('search')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-800/40 hover:bg-zinc-800/60 active:scale-[0.99] backdrop-blur-md rounded-[42px] border-none outline-none ring-0 cursor-pointer text-left transition-all select-none shadow-sm"
              >
                <Search className="w-5 h-5 text-zinc-400 stroke-[2] shrink-0" />
                <span className="text-sm font-medium text-zinc-400">Cari Komik</span>
              </button>
            </div>

            <div className="px-4 flex flex-col gap-6 mt-3.5 relative z-10">
              {/* 3 CARDS UNDER BACKDROP */}
              <div className="w-full relative z-10">
                <div className="grid grid-cols-3 gap-2.5">
                  {terbaruCards.map((manga) => (
                    <div
                      key={manga.endpoint}
                      onClick={() => setSelectedMangaEndpoint(manga.endpoint)}
                      className="flex flex-col cursor-pointer group select-none text-left active:opacity-80 transition-opacity relative z-10"
                    >
                      <div className="w-full aspect-[3/4.2] rounded-2xl overflow-hidden bg-zinc-900 shadow-md border border-white/10 relative z-10">
                        <SafeImage
                          src={manga.thumb}
                          alt={manga.title}
                          priority={true}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                      <span className="text-xs font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] line-clamp-1 mt-1.5 group-hover:text-zinc-200 tracking-tight">
                        {manga.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION: PERINGKAT (EXACTLY 5 ITEMS IN BERANDA / HOME) - SKELETON ON CHANGE, NO SPINNER */}
              <div className="w-full">
                {/* Main Tabs: Terpopuler, Trending, Terbaru */}
                <div className="grid grid-cols-3 items-center border-b border-zinc-800 pb-2 mb-3 text-sm font-semibold w-full">
                  <div className="flex justify-start">
                    <button
                      type="button"
                      onClick={() => handleRankingTabChange('terpopuler')}
                      className={`relative transition-colors pb-1.5 ${
                        rankingTab === 'terpopuler'
                          ? 'text-white font-bold'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <span>Terpopuler</span>
                      {rankingTab === 'terpopuler' && (
                        <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-white rounded-full" />
                      )}
                    </button>
                  </div>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleRankingTabChange('trending')}
                      className={`relative transition-colors pb-1.5 ${
                        rankingTab === 'trending'
                          ? 'text-white font-bold'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <span>Trending</span>
                      {rankingTab === 'trending' && (
                        <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-white rounded-full" />
                      )}
                    </button>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRankingTabChange('terbaru')}
                      className={`relative transition-colors pb-1.5 ${
                        rankingTab === 'terbaru'
                          ? 'text-white font-bold'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <span>Terbaru</span>
                      {rankingTab === 'terbaru' && (
                        <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-white rounded-full" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Ranking List Rows: Exactly 5 items in Home - Fast Skeleton instead of spinning loader */}
                {isRankingLoading ? (
                  <RankingListSkeleton count={5} />
                ) : (
                  <div key={rankingTab} className="flex flex-col animate-fade-in">
                    {rankedList.slice(0, 5).map((manga, idx) =>
                      renderMangaRankingRow(manga, idx)
                    )}
                  </div>
                )}

                {/* SECTION: BARU DITAMBAHKAN */}
                <div className="w-full mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xl font-bold text-white text-left tracking-tight">
                      Baru Ditambahkan
                    </h2>
                  </div>

                  {/* Category tabs for Baru Ditambahkan */}
                  <div className="w-full border border-zinc-700/80 rounded-xl bg-zinc-900/60 p-1 flex items-center mb-3.5">
                    {(['Semua', 'Manga', 'Manhwa', 'Manhua'] as const).map((tab) => {
                      const isActive = baruTab === tab;
                      return (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => handleBaruTabChange(tab)}
                          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all text-center active:scale-95 ${
                            isActive
                              ? 'bg-[#2f60c4] text-white shadow-sm'
                              : 'text-zinc-300 hover:text-white'
                          }`}
                        >
                          {tab}
                        </button>
                      );
                    })}
                  </div>

                  {filteredBaru.length === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-500">
                      Tidak ada komik untuk kategori ini
                    </div>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto scrollbar-none py-1">
                      {filteredBaru.slice(0, 20).map((manga) => (
                        <div
                          key={manga.endpoint}
                          onClick={() => setSelectedMangaEndpoint(manga.endpoint)}
                          className="w-[170px] sm:w-[185px] shrink-0 flex flex-col cursor-pointer group select-none text-left active:opacity-80 transition-opacity"
                        >
                          <div className="relative w-full aspect-[16/10] rounded-xl sm:rounded-2xl overflow-hidden bg-zinc-800 shadow-sm border border-zinc-800/60">
                            <SafeImage
                              src={manga.thumb}
                              alt={manga.title}
                              className="w-full h-full object-cover object-top"
                            />
                            <CountryBadgeTag type={manga.type} />
                          </div>
                          <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-1 mt-2 group-hover:text-zinc-200 tracking-tight">
                            {manga.title}
                          </h3>
                          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-normal mt-0.5 line-clamp-1">
                            {manga.latestChapter && (
                              <span className="text-zinc-300 font-medium">{manga.latestChapter}</span>
                            )}
                            {manga.uploadedAt && (
                              <>
                                <span className="text-zinc-600">•</span>
                                <span>{manga.uploadedAt}</span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* SECTION: TOP MANGA (1-33 FROM MAL) */}
                <div className="w-full mt-7">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xl font-bold text-white text-left tracking-tight">
                      Top manga
                    </h2>
                  </div>

                  {topManga.length === 0 ? (
                    <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                      {Array.from({ length: 6 }).map((_, idx) => (
                        <div key={idx} className="flex flex-col gap-2">
                          <div className="w-full aspect-[3/4.2] rounded-2xl bg-zinc-800 border border-zinc-800/60" />
                          <div className="h-3.5 w-4/5 bg-zinc-800 rounded-full" />
                          <div className="h-3 w-1/2 bg-zinc-800 rounded-full" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                      {topManga.slice(0, 33).map((manga, idx) => {
                        const rankNum = manga.rank || idx + 1;
                        const viewsLabel = formatDisplayViews(manga.views, idx);

                        return (
                          <div
                            key={`top-manga-${manga.endpoint}-${rankNum}`}
                            onClick={() => setSelectedMangaEndpoint(manga.endpoint)}
                            className="flex flex-col cursor-pointer group select-none text-left active:opacity-80 transition-opacity"
                          >
                            <div className="relative w-full aspect-[3/4.2] rounded-2xl overflow-hidden bg-zinc-900 shadow-md border border-zinc-800/60">
                              <SafeImage
                                src={manga.thumb}
                                alt={manga.title}
                                className="w-full h-full object-cover object-top"
                              />
                              {/* Tag di kiri atas cover dengan opacity black rendah dan tanpa effect blur */}
                              <div className="absolute top-2 left-2 min-w-[20px] px-1.5 py-0.5 rounded-md bg-black/35 text-[11px] font-bold text-white flex items-center justify-center z-20">
                                <span>{rankNum}</span>
                              </div>
                            </div>
                            {/* Judul */}
                            <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-1 mt-1.5 group-hover:text-zinc-200 tracking-tight">
                              {manga.title}
                            </h3>
                            {/* Jumlah Views */}
                            <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-normal mt-0.5 line-clamp-1">
                              <Eye className="w-3 h-3 text-zinc-500 shrink-0" />
                              <span>{viewsLabel}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* SECTION: KOMIK BERWARNA (15 HORIZONTAL CARDS DARI KOMIKU) */}
                <div className="w-full mt-7">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-white text-left tracking-tight">
                        Komik Berwarna
                      </h2>
                    </div>
                  </div>

                  {komikBerwarna.length === 0 ? (
                    <div className="flex gap-3 overflow-x-auto scrollbar-none py-1">
                      {Array.from({ length: 4 }).map((_, idx) => (
                        <div key={idx} className="w-[175px] sm:w-[190px] shrink-0 flex flex-col gap-2">
                          <div className="w-full aspect-[16/10] rounded-2xl bg-zinc-800 border border-zinc-800/60 animate-shimmer" />
                          <div className="h-3.5 w-4/5 bg-zinc-800 rounded-full animate-shimmer" />
                          <div className="h-3 w-1/2 bg-zinc-800 rounded-full animate-shimmer" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto scrollbar-none py-1">
                      {komikBerwarna.slice(0, 15).map((manga, idx) => {
                        const viewsLabel = formatDisplayViews(manga.views, idx);
                        return (
                          <div
                            key={`komik-berwarna-${manga.endpoint}-${idx}`}
                            onClick={() => setSelectedMangaEndpoint(manga.endpoint)}
                            className="w-[175px] sm:w-[190px] shrink-0 flex flex-col cursor-pointer group select-none text-left active:opacity-80 transition-opacity"
                          >
                            <div className="relative w-full aspect-[16/10] rounded-xl sm:rounded-2xl overflow-hidden bg-zinc-800 shadow-sm border border-zinc-800/60">
                              <SafeImage
                                src={manga.thumb}
                                alt={manga.title}
                                className="w-full h-full object-cover object-top"
                              />
                              <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-[4px] bg-black/75 backdrop-blur-sm text-[10px] shadow-sm flex items-center justify-center font-bold text-white border border-white/20">
                                COLOR
                              </div>
                            </div>
                            <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-1 mt-2 group-hover:text-zinc-200 tracking-tight">
                              {manga.title}
                            </h3>
                            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-normal mt-0.5 line-clamp-1">
                              {manga.latestChapter && (
                                <span className="text-zinc-300 font-medium">{manga.latestChapter}</span>
                              )}
                              <span className="text-zinc-600">•</span>
                              <span className="text-zinc-400">{viewsLabel}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* TAB 1: RIWAYAT */}
          <div className="w-full h-full shrink-0 snap-start snap-always overflow-y-auto overflow-x-hidden scrollbar-none px-4 pt-1 pb-24">
            <HistoryView
              history={history}
              isLoading={loadingHome}
              onResumeReading={(item) => {
                setActiveChapter({
                  chapterEndpoint: item.chapterEndpoint,
                  chapterTitle: item.chapterTitle,
                  mangaEndpoint: item.mangaEndpoint,
                  mangaTitle: item.mangaTitle,
                  mangaThumb: item.mangaThumb,
                  initialPage: item.currentPage || 1,
                  fromHistory: true,
                  type: item.type,
                  author: item.author,
                });
              }}
              onDeleteHistoryItem={handleDeleteHistoryItem}
              onDeleteMultipleHistoryItems={handleDeleteMultipleHistoryItems}
            />
          </div>

          {/* TAB 2: PERINGKAT KOMIK (No back button <, no bottom divider line) */}
          <div className="w-full h-full shrink-0 snap-start snap-always overflow-y-auto overflow-x-hidden scrollbar-none px-4 pt-3 pb-24">
            {/* Header: Title only, no back button <, no divider line */}
            <div className="flex items-center pb-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Peringkat Komik
              </h1>
            </div>

            {/* Main Tabs: Terpopuler, Trending, Terbaru */}
            <div className="grid grid-cols-3 items-center border-b border-zinc-800 pb-2.5 my-3 text-sm font-semibold w-full">
              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={() => handleRankingTabChange('terpopuler')}
                  className={`relative transition-colors pb-1.5 ${
                    rankingTab === 'terpopuler'
                      ? 'text-white font-bold'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <span>Terpopuler</span>
                  {rankingTab === 'terpopuler' && (
                    <div className="absolute -bottom-2.5 left-0 right-0 h-0.5 bg-white rounded-full" />
                  )}
                </button>
              </div>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => handleRankingTabChange('trending')}
                  className={`relative transition-colors pb-1.5 ${
                    rankingTab === 'trending'
                      ? 'text-white font-bold'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <span>Trending</span>
                  {rankingTab === 'trending' && (
                    <div className="absolute -bottom-2.5 left-0 right-0 h-0.5 bg-white rounded-full" />
                  )}
                </button>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleRankingTabChange('terbaru')}
                  className={`relative transition-colors pb-1.5 ${
                    rankingTab === 'terbaru'
                      ? 'text-white font-bold'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <span>Terbaru</span>
                  {rankingTab === 'terbaru' && (
                    <div className="absolute -bottom-2.5 left-0 right-0 h-0.5 bg-white rounded-full" />
                  )}
                </button>
              </div>
            </div>

            {/* Ranking rows with fast skeleton on tab change without spinning loader */}
            {isRankingLoading ? (
              <RankingListSkeleton count={10} />
            ) : (
              <div key={rankingTab} className="flex flex-col mt-1 animate-fade-in">
                {rankedList.slice(0, 100).map((manga, idx) =>
                  renderMangaRankingRow(manga, idx)
                )}
              </div>
            )}
          </div>

          {/* TAB 3: JELAJAHI (No back button <, no bottom divider line) */}
          <div className="w-full h-full shrink-0 snap-start snap-always overflow-y-auto overflow-x-hidden scrollbar-none pb-24">
            <GenresView
              onBack={() => handleNavClick('home')}
              onSelectManga={(endpoint) => setSelectedMangaEndpoint(endpoint)}
            />
          </div>
        </div>

        {/* ============================================================== */}
        {/* DEDICATED FULL VIEWS: FAVORITE, PROFILE, SEARCH (NO POPUP)      */}
        {/* ============================================================== */}
        <AnimatePresence>
          {dedicatedView === 'search' && (
            <motion.div
              key="search-view"
              initial={{ x: 32, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 32, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
              className="fixed inset-0 z-40 bg-[#121214] max-w-md mx-auto flex flex-col px-4 pt-3 pb-24 overflow-y-auto"
            >
              <div className="flex items-center gap-2.5 pb-2">
                <button
                  type="button"
                  onClick={() => setDedicatedView(null)}
                  className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white shrink-0 active:scale-95 transition-transform"
                >
                  <ChevronLeft className="w-5 h-5 -ml-0.5" />
                </button>
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (searchTimeoutRef.current) {
                          clearTimeout(searchTimeoutRef.current);
                        }
                        performSearch(searchQuery);
                      }
                    }}
                    placeholder="Ketik judul manga, manhwa..."
                    className="w-full pl-10 pr-10 py-2.5 bg-zinc-900/90 border border-zinc-800 rounded-2xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        if (searchTimeoutRef.current) {
                          clearTimeout(searchTimeoutRef.current);
                        }
                        setSearchQuery('');
                        performSearch('');
                      }}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 flex-1">
                {loadingSearch ? (
                  <SearchListSkeleton />
                ) : searchQuery && searchResults.length === 0 ? (
                  <div className="text-center py-16 text-zinc-500 text-sm">
                    Tidak ditemukan hasil untuk &ldquo;{searchQuery}&rdquo;
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="flex flex-col gap-2.5">
                    {searchResults.map((manga) => (
                      <div
                        key={manga.endpoint}
                        onClick={() => {
                          setSelectedMangaEndpoint(manga.endpoint);
                        }}
                        className="flex items-center gap-3 p-2 bg-zinc-900/50 hover:bg-zinc-800/60 rounded-2xl border border-zinc-800/40 cursor-pointer group active:opacity-80 transition-all"
                      >
                        <div className="w-14 h-18 rounded-xl overflow-hidden bg-zinc-800 shrink-0 shadow-sm">
                          <SafeImage
                            src={manga.thumb}
                            alt={manga.title}
                            className="w-full h-full object-cover object-top"
                          />
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-white line-clamp-1 group-hover:text-zinc-200">
                            {manga.title}
                          </h4>
                          <span className="text-xs text-zinc-400 line-clamp-1 mt-0.5">
                            {manga.latestChapter || 'Chapter Terbaru'}
                          </span>
                          <span className="text-[10px] text-zinc-500 mt-1 uppercase font-semibold">
                            {manga.type || 'Manga'}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-500" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 text-zinc-500 text-sm">
                    Ketik judul komik yang ingin Anda baca
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {dedicatedView === 'favorite' && (
            <motion.div
              key="favorite-view"
              initial={{ x: 32, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 32, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
              className="fixed inset-0 z-40 bg-[#121214] max-w-md mx-auto flex flex-col px-4 pt-3 pb-24 overflow-y-auto"
            >
              <div className="flex items-center gap-3 pb-3">
                <button
                  type="button"
                  onClick={() => setDedicatedView(null)}
                  className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white active:scale-95 transition-transform"
                >
                  <ChevronLeft className="w-5 h-5 -ml-0.5" />
                </button>
                <h1 className="text-xl font-bold text-white tracking-tight">Favorit</h1>
              </div>

              {bookmarks.length === 0 ? (
                <div className="py-24 text-center text-zinc-500 text-sm flex flex-col items-center gap-2">
                  <Bookmark className="w-10 h-10 stroke-[1.5] text-zinc-600 mb-1" />
                  <span>Belum ada komik favorit</span>
                  <span className="text-xs text-zinc-600">Tekan ikon bookmark pada detail komik untuk menambahkan</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 mt-2">
                  {bookmarks.map((bm) => (
                    <div
                      key={bm.mangaEndpoint}
                      onClick={() => {
                        setDedicatedView(null);
                        setSelectedMangaEndpoint(bm.mangaEndpoint);
                      }}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:bg-zinc-800/60 cursor-pointer group transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className="w-14 h-18 rounded-xl overflow-hidden bg-zinc-800 shrink-0">
                          <SafeImage
                            src={bm.mangaThumb}
                            alt=""
                            className="w-full h-full object-cover object-top"
                          />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <h4 className="text-sm font-bold text-white line-clamp-1 group-hover:text-zinc-200">
                            {bm.mangaTitle}
                          </h4>
                          <span className="text-xs text-zinc-400 uppercase mt-0.5">
                            {bm.type || 'Manga'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveBookmark(bm.mangaEndpoint);
                        }}
                        className="w-9 h-9 rounded-full text-zinc-500 hover:text-red-400 flex items-center justify-center shrink-0 active:scale-90 transition-transform"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {dedicatedView === 'profile' && (
            <motion.div
              key="profile-view"
              initial={{ x: 32, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 32, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
              className="fixed inset-0 z-40 bg-[#121214] max-w-md mx-auto flex flex-col px-4 pt-3 pb-24 overflow-y-auto"
            >
              <div className="flex items-center gap-3 pb-2">
                <button
                  type="button"
                  onClick={() => setDedicatedView(null)}
                  className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white active:scale-95 transition-transform"
                >
                  <ChevronLeft className="w-5 h-5 -ml-0.5" />
                </button>
                <h1 className="text-xl font-bold text-white tracking-tight">Profil Pengguna</h1>
              </div>

              <AccountView
                user={userProfile}
                history={history}
                bookmarks={bookmarks}
                onOpenManga={(endpoint) => {
                  setDedicatedView(null);
                  setSelectedMangaEndpoint(endpoint);
                }}
                onUpdateUsername={handleUpdateUsername}
                onLoginGoogle={handleLoginGoogle}
                onLoginEmail={handleLoginEmail}
                onSendEmailOtp={handleSendEmailOtp}
                onLogout={handleLogout}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ============================================================== */}
        {/* BOTTOM NAVIGATION BAR: BORDERLESS & NO OUTLINE                 */}
        {/* ============================================================== */}
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-30 bg-[#16171d]/85 backdrop-blur-2xl border-none outline-none ring-0 py-2.5 px-3 flex items-center justify-around shadow-[0_-8px_30px_rgba(0,0,0,0.6)]">
          <button
            type="button"
            onClick={() => handleNavClick('home')}
            className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors outline-none border-none ring-0 select-none ${
              activeTab === 'home' && !dedicatedView ? 'text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <HomeIcon className="w-5 h-5 stroke-[2]" />
            <span className="text-[11px] tracking-tight">Beranda</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('riwayat')}
            className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors outline-none border-none ring-0 select-none ${
              activeTab === 'riwayat' && !dedicatedView ? 'text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Calendar className="w-5 h-5 stroke-[2]" />
            <span className="text-[11px] tracking-tight">Riwayat</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('peringkat')}
            className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors outline-none border-none ring-0 select-none ${
              activeTab === 'peringkat' && !dedicatedView ? 'text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Flame className="w-5 h-5 stroke-[2]" />
            <span className="text-[11px] tracking-tight">Peringkat</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('genres')}
            className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors outline-none border-none ring-0 select-none ${
              activeTab === 'genres' && !dedicatedView ? 'text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Library className="w-5 h-5 stroke-[2]" />
            <span className="text-[11px] tracking-tight">Jelajahi</span>
          </button>
        </nav>

        {/* MANGA DETAIL VIEW */}
        {selectedMangaEndpoint && (
          <div className="fixed inset-0 z-40 bg-[#121214] overflow-y-auto">
            <MangaDetailView
              key={selectedMangaEndpoint}
              endpoint={selectedMangaEndpoint}
              history={history}
              onBack={() => setSelectedMangaEndpoint(null)}
              onSelectManga={(ep) => setSelectedMangaEndpoint(ep)}
              onOpenChapter={(chapterEndpoint, chapterTitle, mangaDetail) => {
                setActiveChapter({
                  chapterEndpoint,
                  chapterTitle,
                  mangaEndpoint: mangaDetail.endpoint,
                  mangaTitle: mangaDetail.title,
                  mangaThumb: mangaDetail.thumb,
                  initialPage: 1,
                  fromHistory: false,
                  type: mangaDetail.type,
                  author: mangaDetail.author,
                });
              }}
            />
          </div>
        )}

        {/* VERTICAL READER VIEW */}
        {activeChapter && (
          <HorizontalReader
            key={`${activeChapter.chapterEndpoint}-${activeChapter.fromHistory ? activeChapter.initialPage : 1}`}
            chapterEndpoint={activeChapter.chapterEndpoint}
            mangaEndpoint={activeChapter.mangaEndpoint}
            mangaTitle={activeChapter.mangaTitle}
            mangaThumb={activeChapter.mangaThumb}
            initialPage={activeChapter.initialPage}
            fromHistory={Boolean(activeChapter.fromHistory)}
            mangaType={activeChapter.type}
            mangaAuthor={activeChapter.author}
            initialReadingSeconds={userProfile.readingSeconds}
            currentLevel={userProfile.level}
            onClose={() => setActiveChapter(null)}
            onChapterChange={(nextEp, nextTitle) => {
              setActiveChapter((prev) =>
                prev
                  ? {
                      ...prev,
                      chapterEndpoint: nextEp,
                      chapterTitle: nextTitle,
                      initialPage: 1,
                      fromHistory: false,
                    }
                  : null
              );
            }}
            onTimeUpdate={handleReaderTimeUpdate}
            onProgressSync={handleReaderProgressSync}
          />
        )}
      </main>
    </div>
  );
}
