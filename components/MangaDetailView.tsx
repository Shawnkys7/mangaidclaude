'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Search,
  X,
  Bookmark,
} from 'lucide-react';
import { MangaDetail, ReadingProgress } from '@/lib/types';

interface MangaDetailViewProps {
  endpoint: string;
  history?: ReadingProgress[];
  onBack: () => void;
  onOpenChapter: (
    chapterEndpoint: string,
    chapterTitle: string,
    mangaDetail: MangaDetail
  ) => void;
  onSelectManga?: (endpoint: string) => void;
}

const detailCache = new Map<string, MangaDetail>();

function MangaDetailSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="relative z-10 max-w-lg mx-auto px-4 pt-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white"
        >
          <ChevronLeft className="w-5 h-5 -ml-0.5" />
        </button>
        <div className="w-10 h-10 rounded-full bg-black/60 border border-white/10" />
      </div>

      <div className="flex flex-col items-center">
        <div className="w-40 sm:w-44 aspect-[3/4.2] rounded-[20px] bg-zinc-800 animate-shimmer shadow-2xl mb-4" />
        <div className="h-6 w-48 bg-zinc-800 rounded-full animate-shimmer" />
        <div className="h-4 w-40 bg-zinc-800 rounded-full mt-3 animate-shimmer" />
        <div className="flex items-center justify-center gap-2 mt-4">
          <div className="h-7 w-20 rounded-full bg-zinc-800 animate-shimmer" />
          <div className="h-7 w-20 rounded-full bg-zinc-800 animate-shimmer" />
          <div className="h-7 w-20 rounded-full bg-zinc-800 animate-shimmer" />
        </div>
      </div>

      <div className="bg-[#12141c]/90 border border-[#232733] rounded-[24px] p-5 flex flex-col gap-2">
        <div className="h-3.5 w-full bg-zinc-800 rounded-full animate-shimmer" />
        <div className="h-3.5 w-5/6 bg-zinc-800 rounded-full animate-shimmer" />
        <div className="h-3.5 w-2/3 bg-zinc-800 rounded-full animate-shimmer" />
      </div>

      <div className="flex flex-col gap-2.5 w-full">
        <div className="h-4 w-20 bg-zinc-800 rounded-full animate-shimmer" />
        <div className="flex gap-2.5 overflow-hidden py-1">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="w-28 sm:w-32 shrink-0 flex flex-col gap-2">
              <div className="w-full aspect-[3/4.2] rounded-2xl bg-zinc-800 animate-shimmer border border-zinc-800/60" />
              <div className="h-3 w-4/5 bg-zinc-800 rounded-full animate-shimmer" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-9 rounded-full bg-[#181a24] border border-[#232733] animate-shimmer" />
        <div className="w-11 h-11 rounded-full bg-[#161722] border border-[#232733] animate-shimmer" />
      </div>

      <div className="flex flex-col gap-2.5 mt-1">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="w-full py-3.5 px-4 rounded-[12px] bg-[#141622]/90 border border-[#24293a] flex items-center justify-between"
          >
            <div className="h-4 w-28 bg-zinc-800 rounded-full animate-shimmer" />
            <div className="h-3 w-16 bg-zinc-800 rounded-full animate-shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}

function sanitizeThumbUrl(url: string | undefined): string {
  if (!url) return '';
  let u = url.trim();
  if (u.startsWith('//')) u = 'https:' + u;
  u = u.replace(/^http:\/\//i, 'https://');
  u = u.split('?')[0];
  if (u.includes('manga_img_horizontal-')) {
    u = u.replace('manga_img_horizontal-', 'manga_thumbnail-');
  }
  return u;
}

export default function MangaDetailView({
  endpoint,
  history,
  onBack,
  onOpenChapter,
  onSelectManga,
}: MangaDetailViewProps) {
  const cached = detailCache.get(endpoint) || null;
  const [detail, setDetail] = useState<MangaDetail | null>(cached);
  const [loading, setLoading] = useState<boolean>(!cached);
  const [error, setError] = useState<string | null>(null);
  const [searchChapter, setSearchChapter] = useState('');
  const [expandedSynopsis, setExpandedSynopsis] = useState(false);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [imgSrc, setImgSrc] = useState<string>(cached ? sanitizeThumbUrl(cached.thumb) : '');
  const [relatedManga, setRelatedManga] = useState<any[]>([]);
  const [loadingRelated, setLoadingRelated] = useState<boolean>(true);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [fetchedHistory, setFetchedHistory] = useState<ReadingProgress[]>([]);

  const userHistory = history && history.length > 0 ? history : fetchedHistory;

  useEffect(() => {
    if (!history || history.length === 0) {
      let isSubscribed = true;
      fetch('/api/user')
        .then((res) => res.json())
        .then((data) => {
          if (isSubscribed && data.success && Array.isArray(data.data?.history)) {
            setFetchedHistory(data.data.history);
          }
        })
        .catch(() => {});
      return () => {
        isSubscribed = false;
      };
    }
  }, [history]);

  // Check initial favorite status
  useEffect(() => {
    let isSubscribed = true;
    fetch('/api/user')
      .then((res) => res.json())
      .then((data) => {
        if (isSubscribed && data.success && Array.isArray(data.data?.bookmarks)) {
          const exists = data.data.bookmarks.some(
            (b: any) => b.mangaEndpoint === endpoint || b.mangaEndpoint.endsWith(endpoint) || endpoint.endsWith(b.mangaEndpoint)
          );
          setIsFavorite(exists);
        }
      })
      .catch(() => {});
    return () => {
      isSubscribed = false;
    };
  }, [endpoint]);

  const handleToggleFavorite = async () => {
    const nextState = !isFavorite;
    setIsFavorite(nextState);
    try {
      await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_bookmark',
          payload: {
            mangaEndpoint: endpoint,
            mangaTitle: detail?.title || endpoint,
            mangaThumb: detail?.thumb || '',
            type: detail?.type || 'Manga',
          },
        }),
      });
    } catch (err) {
      console.warn('Toggle favorite error:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function fetchDetail() {
      if (detailCache.has(endpoint)) {
        const cachedItem = detailCache.get(endpoint)!;
        setDetail(cachedItem);
        setImgSrc(sanitizeThumbUrl(cachedItem.thumb));
        setLoading(false);
      } else {
        setLoading(true);
      }
      setError(null);
      setLoadingRelated(true);
      setRelatedManga([]);
      try {
        const res = await fetch(`/api/manga/detail?endpoint=${encodeURIComponent(endpoint)}`);
        const data = await res.json();
        if (data.success && data.data) {
          if (isMounted) {
            detailCache.set(endpoint, data.data);
            setDetail(data.data);
            setImgSrc(sanitizeThumbUrl(data.data.thumb));
          }
        } else {
          if (isMounted && !detailCache.has(endpoint)) {
            setError(data.error || 'Gagal memuat detail komik');
          }
        }
      } catch (err) {
        console.error('Error fetching manga detail:', err);
        if (isMounted && !detailCache.has(endpoint)) {
          setError('Terjadi kesalahan saat memuat data');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [endpoint]);

  useEffect(() => {
    let isMounted = true;
    if (!detail) return;
    const targetGenre = detail.genres?.[0] || detail.type || 'Action';
    async function fetchRelated() {
      setLoadingRelated(true);
      try {
        const res = await fetch(`/api/manga/genre?genre=${encodeURIComponent(targetGenre)}&page=1`);
        const json = await res.json();
        if (isMounted) {
          if (json.success && Array.isArray(json.data)) {
            const filtered = json.data.filter((m: any) => m.endpoint !== endpoint);
            setRelatedManga(filtered);
          } else {
            setRelatedManga([]);
          }
        }
      } catch (err) {
        console.warn('Error fetching related manga:', err);
        if (isMounted) {
          setRelatedManga([]);
        }
      } finally {
        if (isMounted) {
          setLoadingRelated(false);
        }
      }
    }
    fetchRelated();
    return () => {
      isMounted = false;
    };
  }, [detail, endpoint]);

  const handleImageError = () => {
    if (detail?.thumb && !imgSrc.includes('/api/proxy-image')) {
      setImgSrc(`/api/proxy-image?url=${encodeURIComponent(detail.thumb)}`);
    }
  };

  const getProcessedChapters = () => {
    if (!detail?.chapters) return [];
    let list = [...detail.chapters];
    if (searchChapter.trim()) {
      const q = searchChapter.trim().toLowerCase();
      list = list.filter((ch) => ch.title.toLowerCase().includes(q));
    }
    if (sortOrder === 'asc') {
      list.reverse();
    }
    return list;
  };

  const formatChapterTitle = (raw: string) => {
    const trimmed = raw.trim();
    const match = trimmed.match(/chapter\s*(\d+(\.\d+)?)/i);
    if (match) {
      return match[1];
    }
    return trimmed;
  };

  const processedChapters = getProcessedChapters();

  // Find history record for this manga
  const matchManga = (userHistory || []).find(
    (h) =>
      h.mangaEndpoint === endpoint ||
      h.mangaEndpoint.endsWith(endpoint) ||
      endpoint.endsWith(h.mangaEndpoint)
  );

  return (
    <div className="relative min-h-screen bg-[#0c0d12] text-[#e4e6eb] pb-16 overflow-x-hidden">
      {imgSrc && (
        <div className="absolute top-0 inset-x-0 h-[490px] pointer-events-none z-0 overflow-hidden">
          <img
            src={imgSrc}
            alt=""
            aria-hidden="true"
            onError={handleImageError}
            referrerPolicy="no-referrer"
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            className="w-full h-full object-cover filter blur-2xl scale-125 opacity-35 select-none"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0c0d12]/30 via-[#0c0d12]/65 via-60% to-[#0c0d12]" />
        </div>
      )}

      {loading && !detail ? (
        <MangaDetailSkeleton onBack={onBack} />
      ) : error || !detail ? (
        <div className="relative z-10 max-w-lg mx-auto px-4 pt-12">
          <div className="py-24 text-center bg-[#13151e]/80 border border-[#232733] rounded-[32px] p-8">
            <p className="text-sm text-[#8e95a7] mb-4">{error || 'Komik tidak ditemukan'}</p>
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-2.5 rounded-full bg-[#202432] text-xs font-medium text-white hover:bg-[#282d3d] active:scale-95 transition-all"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      ) : (
        <div className="relative z-10 max-w-lg mx-auto px-4 pt-6 flex flex-col gap-6">
          {/* Top Bar with Back and ONLY Favorite SVG */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/80 transition-colors shadow-lg active:scale-95"
            >
              <ChevronLeft className="w-5 h-5 -ml-0.5" />
            </button>
            <button
              type="button"
              onClick={handleToggleFavorite}
              className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/80 transition-colors shadow-lg active:scale-95"
            >
              <Bookmark
                className={`w-5 h-5 transition-transform active:scale-125 ${
                  isFavorite ? 'fill-red-500 text-red-500' : 'text-white'
                }`}
              />
            </button>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-40 sm:w-44 aspect-[3/4.2] rounded-[20px] overflow-hidden bg-[#1f1c26] border border-white/15 shadow-2xl mb-4 relative">
              <div className="absolute inset-0 z-0 animate-shimmer" />
              {imgSrc ? (
                <img
                  src={imgSrc}
                  alt={detail.title}
                  onError={handleImageError}
                  referrerPolicy="no-referrer"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-full h-full object-cover object-top select-none relative z-10"
                />
              ) : null}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
              {detail.title}
            </h1>

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-[#c4cad7] mt-3">
              <span>
                Type : <span className="text-white">{detail.type || 'Manga'}</span>
              </span>
              <span>
                Author : <span className="text-white">{detail.author || 'Komikus'}</span>
              </span>
              <span>
                Rating : <span className="text-white">10+</span>
              </span>
            </div>

            {detail.genres && detail.genres.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                {detail.genres.slice(0, 5).map((genre, idx) => (
                  <span
                    key={idx}
                    className="px-5 py-1.5 rounded-full bg-[#141620]/90 backdrop-blur-md border border-[#272b3a] text-xs text-[#d6d8df] font-medium"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#12141c]/90 backdrop-blur-md border border-[#232733] rounded-[24px] p-5 text-xs text-[#a0a5b5] leading-relaxed">
            <p>
              {expandedSynopsis ? (
                detail.synopsis
              ) : (
                <>
                  {detail.synopsis.slice(0, 160)}
                  {detail.synopsis.length > 160 && '... '}
                </>
              )}
              {detail.synopsis.length > 160 && (
                <button
                  type="button"
                  onClick={() => setExpandedSynopsis(!expandedSynopsis)}
                  className="font-semibold text-white ml-1 hover:underline inline-block"
                >
                  {expandedSynopsis ? 'tutup' : 'baca selengkapnya'}
                </button>
              )}
            </p>
          </div>

          {(loadingRelated || relatedManga.length > 0) && (
            <div className="flex flex-col gap-2.5 w-full">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Terkait
                </h3>
                {detail.genres?.[0] && (
                  <span className="text-[11px] text-zinc-400 capitalize">
                    {detail.genres[0]}
                  </span>
                )}
              </div>

              {loadingRelated ? (
                <div className="flex gap-2.5 overflow-x-auto scrollbar-none py-1">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="w-28 sm:w-32 shrink-0 flex flex-col gap-2">
                      <div className="w-full aspect-[3/4.2] rounded-2xl bg-zinc-800 animate-shimmer border border-zinc-800/60" />
                      <div className="h-3 w-4/5 bg-zinc-800 rounded-full animate-shimmer" />
                      <div className="h-2.5 w-1/2 bg-zinc-800 rounded-full animate-shimmer" />
                    </div>
                  ))}
                </div>
              ) : relatedManga.length > 0 ? (
                <div className="flex gap-2.5 overflow-x-auto scrollbar-none py-1">
                  {relatedManga.slice(0, 12).map((item) => (
                    <div
                      key={item.endpoint}
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
                        }
                        if (onSelectManga) {
                          onSelectManga(item.endpoint);
                        }
                      }}
                      className="w-28 sm:w-32 shrink-0 flex flex-col cursor-pointer group select-none text-left active:opacity-80 transition-opacity"
                    >
                      <div className="w-full aspect-[3/4.2] rounded-2xl overflow-hidden bg-zinc-800 transition-transform duration-150 group-hover:scale-[1.02] shadow-sm border border-zinc-800/60 relative">
                        <div className="absolute inset-0 z-0 animate-shimmer" />
                        {item.thumb ? (
                          <img
                            src={item.thumb}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            draggable={false}
                            onContextMenu={(e) => e.preventDefault()}
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (!target.src.includes('/api/proxy-image')) {
                                target.src = `/api/proxy-image?url=${encodeURIComponent(item.thumb)}`;
                              }
                            }}
                            className="w-full h-full object-cover object-top select-none relative z-10"
                          />
                        ) : null}
                      </div>
                      <span className="text-xs font-semibold text-white line-clamp-1 mt-1.5 group-hover:text-zinc-200 tracking-tight">
                        {item.title}
                      </span>
                      <span className="text-[11px] text-zinc-400 line-clamp-1">
                        {item.latestChapter || item.type || 'Manga'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          <div className="flex items-center gap-2.5 w-full">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchChapter}
                onChange={(e) => setSearchChapter(e.target.value)}
                placeholder="Cari chapter"
                className="w-full pl-5 pr-11 py-3 bg-[#13161e]/90 border border-[#252a38] rounded-full text-xs text-[#e4e6eb] placeholder-[#6d7385] focus:outline-none focus:border-[#3d4458]"
              />
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-[#6d7385]">
                <Search className="w-4 h-4" />
              </div>
              {searchChapter && (
                <button
                  type="button"
                  onClick={() => setSearchChapter('')}
                  className="absolute inset-y-0 right-10 flex items-center text-[#7e8597] hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              className="w-11 h-11 rounded-full border border-zinc-700/80 bg-[#161722] hover:bg-[#202330] active:scale-95 text-white flex items-center justify-center shrink-0 transition-all shadow-md"
            >
              {sortOrder === 'desc' ? (
                <ChevronDown className="w-5 h-5 text-white" />
              ) : (
                <ChevronUp className="w-5 h-5 text-white" />
              )}
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            {processedChapters.map((ch) => {
              const cleanChEndpoint = ch.endpoint.replace(/^\//, '').replace(/\/$/, '');
              let chProgress = matchManga?.chaptersRead?.[cleanChEndpoint];
              if (!chProgress && matchManga) {
                const mainClean = (matchManga.chapterEndpoint || '').replace(/^\//, '').replace(/\/$/, '');
                if (
                  mainClean === cleanChEndpoint ||
                  mainClean.endsWith(cleanChEndpoint) ||
                  cleanChEndpoint.endsWith(mainClean)
                ) {
                  chProgress = {
                    currentPage: matchManga.currentPage,
                    totalPages: matchManga.totalPages,
                  };
                }
              }

              const progressPercent =
                chProgress && chProgress.totalPages > 0
                  ? Math.min(100, Math.max(3, Math.round((chProgress.currentPage / chProgress.totalPages) * 100)))
                  : 0;

              return (
                <button
                  key={ch.endpoint}
                  type="button"
                  onClick={() => onOpenChapter(ch.endpoint, ch.title, detail)}
                  className="relative overflow-hidden w-full py-3 px-4 rounded-[12px] bg-[#141622]/90 hover:bg-[#1f2436] border border-[#24293a] hover:border-[#39425d] text-sm font-semibold text-white text-left transition-all shadow-sm active:scale-[0.99] flex items-center justify-between group"
                >
                  <span className="font-semibold text-white tracking-tight">
                    {formatChapterTitle(ch.title)}
                  </span>
                  <div className="flex items-center gap-2">
                    {ch.releaseDate && (
                      <span className="text-[11px] text-zinc-500 font-normal">
                        {ch.releaseDate}
                      </span>
                    )}
                  </div>
                  {progressPercent > 0 && (
                    <div
                      className="absolute bottom-0 left-0 h-[2.5px] bg-red-600 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  )}
                </button>
              );
            })}

            {processedChapters.length === 0 && (
              <div className="py-12 text-center text-xs text-[#717789] bg-[#12141c]/60 rounded-[20px] border border-[#232733]">
                Tidak ada chapter yang ditemukan
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
