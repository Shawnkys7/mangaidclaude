'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MangaItem } from '@/lib/types';

interface GenresViewProps {
  onBack: () => void;
  onSelectManga: (endpoint: string) => void;
}

const GENRE_LIST = [
  'Isekai',
  'Action',
  'Adventure',
  'Psikologi',
  'Romance',
  'Fantasy',
  'Comedy',
  'Thriller',
  'Super Power',
  'Sports',
  'Magic',
  'Martial Arts',
  'Shounen',
  'Seinen',
  'Mystery',
  'Supernatural',
  'Sci-Fi',
  'Horror',
  'Reincarnation',
  'Drama',
  'School Life',
  'Slice of Life',
  'Military',
  'Tragedy',
  'Survival',
  'Demons',
  'Game',
  'Historical',
  'Shoujo',
  'Time Travel',
  'manga',
  'manhwa',
  'manhua',
  'tamat',
  'on going',
];

function formatChapter(chText?: string) {
  if (!chText) return 'ch 1';
  const match = chText.match(/(\d+(\.\d+)?)/);
  if (match) return `ch ${match[1]}`;
  return chText.toLowerCase().replace('chapter', 'ch').trim();
}

export default function GenresView({ onSelectManga }: GenresViewProps) {
  const [selectedGenre, setSelectedGenre] = useState<string>('Isekai');
  const [mangaList, setMangaList] = useState<MangaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const genreDataCache = useRef<Map<string, { items: MangaItem[]; hasMore: boolean }>>(new Map());

  useEffect(() => {
    let isCancelled = false;
    async function loadGenreData() {
      const cacheKey = `${selectedGenre}-1`;
      if (genreDataCache.current.has(cacheKey)) {
        const cached = genreDataCache.current.get(cacheKey)!;
        setMangaList(cached.items);
        setHasMore(cached.hasMore);
        setPage(1);
        setLoading(false);
        return;
      }
      setLoading(true);
      setPage(1);
      try {
        const res = await fetch(
          `/api/manga/genre?genre=${encodeURIComponent(selectedGenre)}&page=1`
        );
        const json = await res.json();
        if (!isCancelled && json.success && Array.isArray(json.data)) {
          setMangaList(json.data);
          const more = Boolean(json.hasMore && json.data.length > 0);
          setHasMore(more);
          genreDataCache.current.set(cacheKey, { items: json.data, hasMore: more });
        } else if (!isCancelled) {
          setMangaList([]);
          setHasMore(false);
        }
      } catch (err) {
        console.warn('Error fetching genre manga:', err);
        if (!isCancelled) {
          setMangaList([]);
          setHasMore(false);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }
    loadGenreData();
    return () => {
      isCancelled = true;
    };
  }, [selectedGenre]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/manga/genre?genre=${encodeURIComponent(selectedGenre)}&page=${nextPage}`
      );
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setMangaList((prev) => {
          const seen = new Set(prev.map((m) => m.endpoint));
          const newItems = json.data.filter((m: MangaItem) => !seen.has(m.endpoint));
          return [...prev, ...newItems];
        });
        setPage(nextPage);
        setHasMore(Boolean(json.hasMore));
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.warn('Error loading more genre manga:', err);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full pb-8">
      {/* Top Header - No back button and no bottom divider line */}
      <div className="bg-[#121214] px-4 pt-3 pb-2 flex items-center">
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Jelajahi
        </h1>
      </div>

      {/* Horizontal Scrollable Genres Bar */}
      <div className="w-full px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
          {GENRE_LIST.map((genre) => {
            const isActive = selectedGenre.toLowerCase() === genre.toLowerCase();
            return (
              <button
                key={genre}
                type="button"
                onClick={() => {
                  if (!isActive) {
                    setSelectedGenre(genre);
                  }
                }}
                className={`px-4 py-2 rounded-full text-xs transition-all shrink-0 active:scale-95 capitalize ${
                  isActive
                    ? 'bg-white text-black font-bold shadow-md'
                    : 'bg-zinc-900/90 text-zinc-400 hover:text-white border border-zinc-800/90 font-medium'
                }`}
              >
                {genre}
              </button>
            );
          })}
        </div>
      </div>

      {/* Manga Grid (3 columns across) */}
      <div className="px-4 mt-3">
        {loading ? (
          <div className="grid grid-cols-3 gap-2.5">
            {Array.from({ length: 9 }).map((_, idx) => (
              <div key={idx} className="flex flex-col gap-2">
                <div className="w-full aspect-[3/4.2] rounded-2xl bg-zinc-800 animate-shimmer" />
                <div className="h-3.5 w-4/5 bg-zinc-800/70 rounded-full animate-shimmer" />
                <div className="h-3 w-1/2 bg-zinc-800/50 rounded-full animate-shimmer" />
              </div>
            ))}
          </div>
        ) : mangaList.length === 0 ? (
          <div className="py-20 text-center text-zinc-500 text-xs">
            Belum ada komik untuk genre ini
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-2.5">
              {mangaList.map((manga) => (
                <div
                  key={manga.endpoint}
                  onClick={() => onSelectManga(manga.endpoint)}
                  className="flex flex-col cursor-pointer group select-none text-left active:opacity-80 transition-opacity"
                >
                  <div className="relative w-full aspect-[3/4.2] rounded-2xl overflow-hidden bg-zinc-900 transition-transform duration-150 group-hover:scale-[1.02] shadow-sm border border-zinc-800/50">
                    <div className="absolute inset-0 z-0 animate-shimmer" />
                    {manga.thumb ? (
                      <img
                        src={manga.thumb}
                        alt={manga.title}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.src.includes('/api/proxy-image')) {
                            target.src = `/api/proxy-image?url=${encodeURIComponent(manga.thumb)}`;
                          }
                        }}
                        className="w-full h-full object-cover object-top relative z-10"
                      />
                    ) : null}
                  </div>
                  <h3 className="text-xs font-semibold text-white line-clamp-1 mt-1.5 group-hover:text-zinc-200 tracking-tight">
                    {manga.title}
                  </h3>
                  <span className="text-[11px] text-zinc-400 line-clamp-1 font-normal">
                    {formatChapter(manga.latestChapter)}
                  </span>
                </div>
              ))}
            </div>

            {loadingMore && (
              <div className="grid grid-cols-3 gap-2.5 pt-2">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="flex flex-col gap-2">
                    <div className="w-full aspect-[3/4.2] rounded-2xl bg-zinc-800 animate-shimmer" />
                    <div className="h-3.5 w-4/5 bg-zinc-800/70 rounded-full animate-shimmer" />
                    <div className="h-3 w-1/2 bg-zinc-800/50 rounded-full animate-shimmer" />
                  </div>
                ))}
              </div>
            )}

            {hasMore && (
              <div className="pt-2 pb-4 flex justify-center w-full">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={handleLoadMore}
                  className="w-full py-3 px-4 rounded-xl bg-zinc-800/90 hover:bg-zinc-700/90 text-white font-semibold text-xs flex items-center justify-center gap-2 border border-zinc-700/70 active:scale-[0.99] transition-all shadow-sm disabled:opacity-50"
                >
                  {loadingMore ? 'Memuat komik...' : 'Muat Lebih Banyak'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
