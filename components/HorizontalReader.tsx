'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft } from 'lucide-react';
import { ChapterDetail } from '@/lib/types';

interface HorizontalReaderProps {
  chapterEndpoint: string;
  mangaEndpoint: string;
  mangaTitle: string;
  mangaThumb: string;
  initialPage?: number;
  fromHistory?: boolean;
  mangaType?: string;
  mangaAuthor?: string;
  initialReadingSeconds: number;
  currentLevel: number;
  onClose: () => void;
  onChapterChange: (nextEndpoint: string, nextTitle: string) => void;
  onTimeUpdate: (currentSeconds: number, currentLevel: number) => void;
  onProgressSync: (progress: {
    mangaEndpoint: string;
    mangaTitle: string;
    mangaThumb: string;
    chapterEndpoint: string;
    chapterTitle: string;
    currentPage: number;
    totalPages: number;
    type?: string;
    author?: string;
  }) => void;
}

const chapterCache = new Map<string, ChapterDetail>();

function extractChapterNumber(title?: string, endpoint?: string): string {
  if (title) {
    const match = title.match(/chapter\s*(\d+(\.\d+)?)/i);
    if (match) return match[1];
    const matchNum = title.match(/(\d+(\.\d+)?)/);
    if (matchNum) return matchNum[1];
  }
  if (endpoint) {
    const match = endpoint.match(/chapter-(\d+(\.\d+)?)/i);
    if (match) return match[1];
    const matchNum = endpoint.match(/(\d+(\.\d+)?)/);
    if (matchNum) return matchNum[1];
  }
  return title || '1';
}

export default function HorizontalReader({
  chapterEndpoint,
  mangaEndpoint,
  mangaTitle,
  mangaThumb,
  initialPage = 1,
  fromHistory = false,
  mangaType,
  mangaAuthor,
  initialReadingSeconds,
  currentLevel,
  onClose,
  onChapterChange,
  onTimeUpdate,
  onProgressSync,
}: HorizontalReaderProps) {
  const cachedChapter = chapterCache.get(chapterEndpoint) || null;
  const [chapter, setChapter] = useState<ChapterDetail | null>(cachedChapter);
  const [loading, setLoading] = useState(!cachedChapter);
  const [error, setError] = useState<string | null>(null);

  const targetInitialPage = fromHistory && initialPage && initialPage > 1 ? initialPage : 1;
  const [currentPage, setCurrentPage] = useState<number>(targetInitialPage);
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({});
  const [fallbackUrls, setFallbackUrls] = useState<Record<number, string>>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentPageRef = useRef<number>(targetInitialPage);
  const hasScrolledToHistoryRef = useRef<boolean>(false);

  const accumulatedSecondsRef = useRef<number>(0);
  const totalSecondsRef = useRef<number>(initialReadingSeconds || 0);
  const onTimeUpdateRef = useRef(onTimeUpdate);

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  useEffect(() => {
    const timer = setInterval(() => {
      accumulatedSecondsRef.current += 1;
      totalSecondsRef.current += 1;
      // 20 minutes (1200s) = 2 levels -> 10 minutes (600s) = 1 level
      const currentCalculatedLevel = 1 + Math.floor(totalSecondsRef.current / 600);
      onTimeUpdateRef.current(totalSecondsRef.current, currentCalculatedLevel);
    }, 1000);

    const dbSyncInterval = setInterval(async () => {
      if (accumulatedSecondsRef.current > 0) {
        const toSync = accumulatedSecondsRef.current;
        accumulatedSecondsRef.current = 0;
        try {
          await fetch('/api/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'add_reading_time',
              payload: { seconds: toSync },
            }),
          });
        } catch (err) {
          console.error('Error syncing reading time:', err);
        }
      }
    }, 5000);

    return () => {
      clearInterval(timer);
      clearInterval(dbSyncInterval);
      if (accumulatedSecondsRef.current > 0) {
        const remaining = accumulatedSecondsRef.current;
        accumulatedSecondsRef.current = 0;
        fetch('/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add_reading_time',
            payload: { seconds: remaining },
          }),
        }).catch(() => {});
      }
    };
  }, []);

  // Preloader berurutan: halaman awal diprioritaskan, sisanya dimuat berurutan
  // dengan 3 koneksi paralel supaya halaman yang sedang dibaca tidak berebut bandwidth.
  useEffect(() => {
    if (!chapter?.images || chapter.images.length === 0) return;
    const imgs = chapter.images;
    const held: HTMLImageElement[] = [];
    let cancelled = false;
    let next = 0;

    const loadOne = () => {
      if (cancelled || next >= imgs.length) return;
      const idx = next++;
      const img = new window.Image();
      held.push(img);
      img.referrerPolicy = 'no-referrer';
      img.decoding = 'async';
      if (idx < 3) (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = 'high';
      const done = () => {
        img.onload = null;
        img.onerror = null;
        loadOne();
      };
      img.onload = done;
      img.onerror = done;
      img.src = imgs[idx];
    };

    const CONCURRENCY = 3;
    for (let i = 0; i < CONCURRENCY; i++) loadOne();

    return () => {
      cancelled = true;
      held.forEach((img) => {
        img.onload = null;
        img.onerror = null;
      });
    };
  }, [chapter?.images]);

  const syncProgress = useCallback(
    (page: number, total: number) => {
      onProgressSync({
        mangaEndpoint,
        mangaTitle,
        mangaThumb,
        chapterEndpoint,
        chapterTitle: chapter?.chapterTitle || chapterEndpoint,
        currentPage: page,
        totalPages: total,
        type: mangaType,
        author: mangaAuthor,
      });

      fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_progress',
          payload: {
            mangaEndpoint,
            mangaTitle,
            mangaThumb,
            chapterEndpoint,
            chapterTitle: chapter?.chapterTitle || chapterEndpoint,
            currentPage: page,
            totalPages: total,
            type: mangaType,
            author: mangaAuthor,
          },
        }),
      }).catch(() => {});
    },
    [chapter?.chapterTitle, chapterEndpoint, mangaEndpoint, mangaThumb, mangaTitle, mangaType, mangaAuthor, onProgressSync]
  );

  useEffect(() => {
    let isMounted = true;
    async function loadChapter() {
      if (chapterCache.has(chapterEndpoint)) {
        const cached = chapterCache.get(chapterEndpoint)!;
        setChapter(cached);
        setLoading(false);
      } else {
        setLoading(true);
      }
      setError(null);
      setFallbackUrls({});
      setShowPopup(false);
      hasScrolledToHistoryRef.current = false;

      const startPage = fromHistory && initialPage && initialPage > 1 ? initialPage : 1;
      setCurrentPage(startPage);
      currentPageRef.current = startPage;

      try {
        const res = await fetch(`/api/manga/chapter?endpoint=${encodeURIComponent(chapterEndpoint)}`);
        const json = await res.json();
        if (json.success && json.data) {
          if (isMounted) {
            chapterCache.set(chapterEndpoint, json.data);
            setChapter(json.data);
            setCurrentPage(startPage);
            currentPageRef.current = startPage;
          }
        } else {
          if (isMounted && !chapterCache.has(chapterEndpoint)) {
            setError(json.error || 'Gagal memuat chapter');
          }
        }
      } catch (err) {
        console.error('Error loading chapter:', err);
        if (isMounted && !chapterCache.has(chapterEndpoint)) {
          setError('Terjadi kesalahan memuat data chapter');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadChapter();
    return () => {
      isMounted = false;
    };
  }, [chapterEndpoint, fromHistory, initialPage]);

  useEffect(() => {
    if (!loading && chapter) {
      if (fromHistory && initialPage && initialPage > 1 && !hasScrolledToHistoryRef.current) {
        hasScrolledToHistoryRef.current = true;
        const targetEl = pageRefs.current[initialPage - 1];
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
      } else if (!fromHistory) {
        if (containerRef.current) {
          containerRef.current.scrollTop = 0;
        }
      }
    }
  }, [loading, chapter, fromHistory, initialPage]);

  useEffect(() => {
    return () => {
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }
    };
  }, []);

  const togglePopup = () => {
    setShowPopup((prev) => {
      const nextState = !prev;
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
        autoHideTimerRef.current = null;
      }
      if (nextState) {
        autoHideTimerRef.current = setTimeout(() => {
          setShowPopup(false);
        }, 3000);
      }
      return nextState;
    });
  };

  const handleScreenClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    togglePopup();
  };

  const handleScroll = () => {
    if (!containerRef.current || !chapter || chapter.images.length === 0) return;
    const container = containerRef.current;
    const totalImgs = chapter.images.length;

    if (container.scrollTop <= 50) {
      if (currentPageRef.current !== 1) {
        currentPageRef.current = 1;
        setCurrentPage(1);
        syncProgress(1, totalImgs);
      }
      return;
    }

    const focalLine = container.scrollTop + container.clientHeight * 0.4;
    let detectedPage = 1;

    for (let i = 0; i < totalImgs; i++) {
      const el = pageRefs.current[i];
      if (el && el.offsetHeight > 50) {
        const elTop = el.offsetTop;
        const elBottom = elTop + el.offsetHeight;
        if (focalLine >= elTop && focalLine < elBottom) {
          detectedPage = i + 1;
          break;
        } else if (focalLine < elTop && i === 0) {
          detectedPage = 1;
          break;
        } else if (focalLine >= elBottom && i === totalImgs - 1) {
          detectedPage = totalImgs;
          break;
        }
      }
    }

    if (detectedPage !== currentPageRef.current) {
      currentPageRef.current = detectedPage;
      setCurrentPage(detectedPage);
      syncProgress(detectedPage, totalImgs);
    }
  };

  const handleImageError = (idx: number, originalUrl: string) => {
    const currentAttempt = fallbackUrls[idx];
    if (!currentAttempt) {
      const matchServer = originalUrl.match(/image\d+\.komiku\.to/);
      if (matchServer) {
        const mirrorUrl = originalUrl.replace(matchServer[0], 'img.komiku.org');
        setFallbackUrls((prev) => ({ ...prev, [idx]: mirrorUrl }));
        return;
      }
    }
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(originalUrl)}`;
    if (currentAttempt !== proxyUrl) {
      setFallbackUrls((prev) => ({ ...prev, [idx]: proxyUrl }));
    }
  };

  const images = chapter?.images || [];
  const totalPagesCount = chapter?.totalPages || images.length || 1;
  const chapterNumberText = extractChapterNumber(chapter?.chapterTitle, chapterEndpoint);

  return (
    <div
      onClick={handleScreenClick}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed inset-0 z-50 bg-[#0c0d12] text-white select-none overflow-hidden"
    >
      {/* POPUP HEADER (TOP) */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 bg-[#121214]/95 backdrop-blur-md px-4 py-3 flex items-center justify-between shadow-lg transition-all duration-200 ease-in-out ${
          showPopup
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="w-10 h-10 rounded-full bg-zinc-900/90 border border-zinc-700/80 flex items-center justify-center text-white hover:bg-zinc-800 active:scale-95 transition-all shadow-md shrink-0"
        >
          <ChevronLeft className="w-6 h-6 -ml-0.5" />
        </button>
        <div className="text-center font-bold text-lg text-white tracking-tight">
          {chapterNumberText}
        </div>
        <div className="w-10 h-10 shrink-0" />
      </header>

      {/* MAIN VERTICAL SCROLL CANVAS */}
      {loading && !chapter ? (
        <div className="w-full h-full flex flex-col items-center justify-start pt-16 px-4 bg-[#0c0d12]">
          {/* Skeleton loading instead of spinning loader */}
          <div className="w-full max-w-md aspect-[3/4.5] rounded-2xl bg-zinc-900 border border-zinc-800/60 animate-shimmer" />
        </div>
      ) : error ? (
        <div className="w-full h-full flex items-center justify-center bg-[#0c0d12] p-4">
          <div className="text-center p-6 bg-zinc-900 border border-zinc-800 rounded-3xl max-w-sm">
            <p className="text-sm text-zinc-300 mb-4">{error}</p>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-full bg-zinc-800 text-xs font-medium text-white hover:bg-zinc-700 active:scale-95 transition-all"
            >
              Kembali
            </button>
          </div>
        </div>
      ) : (
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="w-full h-full overflow-y-auto overflow-x-hidden scrollbar-none bg-[#0c0d12]"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="w-full flex flex-col items-center">
            {images.map((imgSrc, idx) => {
              const activeSrc = fallbackUrls[idx] || imgSrc;
              const isLoaded = Boolean(loadedImages[idx]);
              return (
                <div
                  key={idx}
                  ref={(el) => {
                    pageRefs.current[idx] = el;
                  }}
                  data-page-index={idx}
                  className="w-full min-h-[35vh] sm:min-h-[50vh] relative flex flex-col items-center justify-center bg-[#0c0d12]"
                >
                  {/* Subtle skeleton before image loads */}
                  {!isLoaded && (
                    <div className="absolute inset-0 bg-zinc-900/60 animate-shimmer" />
                  )}
                  {activeSrc ? (
                    <img
                      src={activeSrc}
                      alt=""
                      draggable={false}
                      onContextMenu={(e) => e.preventDefault()}
                      referrerPolicy="no-referrer"
                      loading={idx < 6 ? 'eager' : 'lazy'}
                      fetchPriority={idx < 2 ? 'high' : 'auto'}
                      decoding="async"
                      onLoad={() => {
                        setLoadedImages((prev) => ({ ...prev, [idx]: true }));
                      }}
                      onError={() => handleImageError(idx, imgSrc)}
                      className="w-full h-auto block select-none pointer-events-auto relative z-10"
                    />
                  ) : null}
                </div>
              );
            })}

            <div className="w-full px-2 pt-6 pb-16 flex flex-col items-center bg-[#0c0d12]">
              {chapter?.nextChapterEndpoint ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (chapter.nextChapterEndpoint) {
                      onChapterChange(chapter.nextChapterEndpoint, 'Chapter Berikutnya');
                    }
                  }}
                  className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700/80 text-sm font-semibold rounded-[10px] text-center active:scale-[0.99] transition-colors"
                >
                  Berikutnya
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700/80 text-sm font-semibold rounded-[10px] text-center active:scale-[0.99] transition-colors"
                >
                  Keluar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* POPUP BOTTOM NAVIGATION */}
      <nav
        className={`fixed bottom-0 left-0 right-0 z-50 bg-[#121214]/95 backdrop-blur-md py-3.5 px-4 flex items-center justify-center shadow-lg transition-all duration-200 ease-in-out ${
          showPopup
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-zinc-800/60 overflow-hidden">
          <div
            className="h-full bg-red-600 transition-all duration-200 ease-out"
            style={{
              width: `${Math.min(100, Math.max(0, (currentPage / totalPagesCount) * 100))}%`,
            }}
          />
        </div>
        <span className="text-sm font-bold text-white tracking-wider tabular-nums">
          {currentPage}/{totalPagesCount}
        </span>
      </nav>
    </div>
  );
}
