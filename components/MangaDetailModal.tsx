'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  Bookmark,
  ArrowUpDown,
  Search,
  ChevronRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { MangaDetail, ReadingProgress } from '@/lib/types';

interface MangaDetailModalProps {
  endpoint: string;
  onClose: () => void;
  onOpenChapter: (chapterEndpoint: string, chapterTitle: string, mangaDetail: MangaDetail, initialPage?: number) => void;
  isBookmarked: boolean;
  onBookmarkToggle: () => void;
  historyProgress?: ReadingProgress;
}

export default function MangaDetailModal({
  endpoint,
  onClose,
  onOpenChapter,
  isBookmarked,
  onBookmarkToggle,
  historyProgress,
}: MangaDetailModalProps) {
  const [detail, setDetail] = useState<MangaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchChapter, setSearchChapter] = useState('');
  const [sortDesc, setSortDesc] = useState(true);
  const [imgSrc, setImgSrc] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    async function fetchDetail() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/manga/detail?endpoint=${encodeURIComponent(endpoint)}`);
        const data = await res.json();
        if (data.success && data.data) {
          if (isMounted) {
            setDetail(data.data);
            setImgSrc(data.data.thumb);
          }
        } else {
          if (isMounted) setError(data.error || 'Gagal memuat detail komik');
        }
      } catch (err) {
        console.error('Error fetching manga detail:', err);
        if (isMounted) setError('Terjadi kesalahan saat memuat data');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [endpoint]);

  const handleImageError = () => {
    if (detail?.thumb && !imgSrc.includes('/api/proxy-image')) {
      setImgSrc(`/api/proxy-image?url=${encodeURIComponent(detail.thumb)}`);
    }
  };

  const filteredChapters = (detail?.chapters || []).filter((ch) =>
    ch.title.toLowerCase().includes(searchChapter.toLowerCase())
  );

  const displayedChapters = sortDesc
    ? [...filteredChapters]
    : [...filteredChapters].reverse();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl bg-[#12151d] border border-[#232733] rounded-[45px] p-6 sm:p-8 max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 p-2.5 rounded-[45px] bg-[#1a1d26] border border-[#2b3040] text-[#8e95a5] hover:text-white hover:bg-[#222734] transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="py-8 flex flex-col gap-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="w-full md:w-56 shrink-0 aspect-[3/4] rounded-[36px] bg-zinc-800 animate-shimmer border border-[#272c3b]" />
              <div className="flex-1 flex flex-col gap-3 w-full">
                <div className="h-5 w-32 bg-zinc-800 rounded-full animate-shimmer" />
                <div className="h-8 w-3/4 bg-zinc-800 rounded-full animate-shimmer" />
                <div className="h-4 w-40 bg-zinc-800 rounded-full animate-shimmer" />
                <div className="h-20 w-full bg-zinc-800/80 rounded-2xl animate-shimmer mt-2" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="h-12 bg-zinc-800/70 rounded-[45px] animate-shimmer" />
              ))}
            </div>
          </div>
        ) : error || !detail ? (
          <div className="py-20 text-center">
            <p className="text-sm text-[#8e95a5] mb-4">{error || 'Komik tidak ditemukan'}</p>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-[45px] bg-[#1d212d] border border-[#2b3142] text-sm text-[#d6d8df] hover:bg-[#252b3b]"
            >
              Kembali
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="w-full md:w-56 shrink-0 aspect-[3/4] rounded-[36px] overflow-hidden bg-[#1b1e28] border border-[#272c3b] relative">
                <div className="absolute inset-0 z-0 animate-shimmer" />
                {imgSrc ? (
                  <img
                    src={imgSrc}
                    alt={detail.title}
                    onError={handleImageError}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-top relative z-10"
                  />
                ) : null}
              </div>

              <div className="flex-1 flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#8c92a2]">
                  <span className="px-3 py-1 rounded-[45px] bg-[#1b1f2b] border border-[#2a3042] text-[#d6d9e2] font-medium">
                    {detail.type || 'Manga'}
                  </span>
                  <span>{detail.status || 'Berjalan'}</span>
                  {detail.author && detail.author !== '-' && (
                    <>
                      <span aria-hidden="true">•</span>
                      <span>Karya {detail.author}</span>
                    </>
                  )}
                </div>

                <h2 className="text-2xl sm:text-3xl font-semibold text-[#f1f3f7] tracking-tight leading-snug">
                  {detail.title}
                </h2>

                <div className="flex items-center gap-2 text-xs text-[#7e8596]">
                  <BookOpen className="w-4 h-4" />
                  <span className="font-medium text-[#c4c9d4]">{detail.totalChapters} Chapter Tersedia</span>
                </div>

                {detail.genres && detail.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-xs text-[#798092] my-1">
                    {detail.genres.map((g, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-[45px] bg-[#161922] border border-[#242836] text-[#a1a7b8]"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-2 text-xs sm:text-sm text-[#9da3b4] leading-relaxed max-h-36 overflow-y-auto pr-2">
                  <p>{detail.synopsis}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-3">
                  {historyProgress ? (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenChapter(
                          historyProgress.chapterEndpoint,
                          historyProgress.chapterTitle,
                          detail,
                          historyProgress.currentPage
                        )
                      }
                      className="px-6 py-3 rounded-[45px] bg-[#232734] hover:bg-[#2b3040] border border-[#373e52] text-sm font-medium text-[#f1f3f7] flex items-center gap-2 transition-colors"
                    >
                      <Clock className="w-4 h-4 text-[#9da3b4]" />
                      <span>
                        Lanjut Baca ({historyProgress.chapterTitle} - Hal {historyProgress.currentPage})
                      </span>
                    </button>
                  ) : detail.chapters.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        const firstCh = detail.chapters[detail.chapters.length - 1];
                        onOpenChapter(firstCh.endpoint, firstCh.title, detail, 1);
                      }}
                      className="px-6 py-3 rounded-[45px] bg-[#232734] hover:bg-[#2b3040] border border-[#373e52] text-sm font-medium text-[#f1f3f7] flex items-center gap-2 transition-colors"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Mulai Baca dari Awal</span>
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={onBookmarkToggle}
                    className={`px-5 py-3 rounded-[45px] border text-sm font-medium flex items-center gap-2 transition-all ${
                      isBookmarked
                        ? 'bg-[#1e2330] border-[#384055] text-white'
                        : 'bg-[#151821] border-[#252a38] text-[#8e95a6] hover:text-[#d6d8df]'
                    }`}
                  >
                    <Bookmark className="w-4 h-4" fill={isBookmarked ? 'currentColor' : 'none'} />
                    <span>{isBookmarked ? 'Tersimpan' : 'Bookmark'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-[#202431] pt-6 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-base text-[#e5e7eb]">
                    Daftar Chapter
                  </h3>
                  <span className="text-xs text-[#717788]">
                    ({displayedChapters.length} chapter)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-48">
                    <Search className="w-3.5 h-3.5 text-[#676d7e] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchChapter}
                      onChange={(e) => setSearchChapter(e.target.value)}
                      placeholder="Cari chapter..."
                      className="w-full pl-9 pr-3 py-1.5 bg-[#161922] border border-[#252936] rounded-[45px] text-xs text-[#d6d8df] placeholder-[#676d7e] focus:outline-none focus:border-[#3d4356]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSortDesc(!sortDesc)}
                    className="p-2 rounded-[45px] bg-[#161922] border border-[#252936] text-[#7f8698] hover:text-[#d6d8df] transition-colors"
                    title={sortDesc ? 'Urutkan Terlama dahulu' : 'Urutkan Terbaru dahulu'}
                  >
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {displayedChapters.map((ch) => {
                  const isCurrentRead =
                    historyProgress?.chapterEndpoint === ch.endpoint;
                  return (
                    <button
                      key={ch.endpoint}
                      type="button"
                      onClick={() => onOpenChapter(ch.endpoint, ch.title, detail, 1)}
                      className={`group p-3 rounded-[45px] border text-left flex items-center justify-between transition-all ${
                        isCurrentRead
                          ? 'bg-[#1f2432] border-[#384157] text-[#f1f3f7]'
                          : 'bg-[#151821] border-[#222634] hover:bg-[#1a1e29] hover:border-[#2f3546] text-[#b8bdca]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        {isCurrentRead ? (
                          <CheckCircle2 className="w-4 h-4 text-[#8a92a6] shrink-0" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-[#363b4d] shrink-0 group-hover:bg-[#59627e]" />
                        )}
                        <span className="text-xs font-medium truncate">
                          {ch.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {ch.releaseDate && (
                          <span className="text-[10px] text-[#636979]">
                            {ch.releaseDate}
                          </span>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-[#5b6172] group-hover:text-[#9ea5b7] transition-colors" />
                      </div>
                    </button>
                  );
                })}
                {displayedChapters.length === 0 && (
                  <div className="col-span-full py-8 text-center text-xs text-[#737a8c]">
                    Tidak ada chapter yang cocok dengan pencarian
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
