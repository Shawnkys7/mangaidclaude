'use client';

import React, { useState } from 'react';
import { Trash2, BookOpen, Check, X } from 'lucide-react';
import { ReadingProgress } from '@/lib/types';
import { getMangaAuthor } from '@/lib/authors';

interface HistoryViewProps {
  history: ReadingProgress[];
  isLoading?: boolean;
  onBack?: () => void;
  onResumeReading: (item: ReadingProgress) => void;
  onDeleteHistoryItem: (mangaEndpoint: string) => Promise<void> | void;
  onDeleteMultipleHistoryItems?: (endpoints: string[]) => Promise<void> | void;
}

function formatChapterLabel(raw: string): string {
  if (!raw) return 'Chapter 1';
  const match = raw.match(/chapter\s*(\d+(\.\d+)?)/i);
  if (match) return `Chapter ${match[1]}`;
  const matchNum = raw.match(/(\d+(\.\d+)?)/);
  if (matchNum) return `Ch. ${matchNum[1]}`;
  return raw;
}

export default function HistoryView({
  history,
  isLoading = false,
  onResumeReading,
  onDeleteHistoryItem,
  onDeleteMultipleHistoryItems,
}: HistoryViewProps) {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [selectedItem, setSelectedItem] = useState<ReadingProgress | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedEndpoints, setSelectedEndpoints] = useState<Set<string>>(new Set());

  const toggleSelectEndpoint = (endpoint: string) => {
    setSelectedEndpoints((prev) => {
      const next = new Set(prev);
      if (next.has(endpoint)) {
        next.delete(endpoint);
      } else {
        next.add(endpoint);
      }
      return next;
    });
  };

  const handleCardClick = (item: ReadingProgress) => {
    if (isSelectionMode) {
      toggleSelectEndpoint(item.mangaEndpoint);
    } else {
      setSelectedItem(item);
    }
  };

  const handleDeleteSingle = async () => {
    if (!selectedItem) return;
    try {
      setIsDeleting(true);
      await onDeleteHistoryItem(selectedItem.mangaEndpoint);
      setSelectedItem(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteMultiSelected = async () => {
    if (selectedEndpoints.size === 0) return;
    try {
      setIsDeleting(true);
      if (onDeleteMultipleHistoryItems) {
        await onDeleteMultipleHistoryItems(Array.from(selectedEndpoints));
      } else {
        for (const ep of selectedEndpoints) {
          await onDeleteHistoryItem(ep);
        }
      }
      setSelectedEndpoints(new Set());
      setIsSelectionMode(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full flex flex-col relative pb-10">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-3 pb-2 px-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          Riwayat
        </h1>
        {history.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (isSelectionMode) {
                setIsSelectionMode(false);
                setSelectedEndpoints(new Set());
              } else {
                setIsSelectionMode(true);
              }
            }}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-zinc-700/80 bg-zinc-900/60 text-zinc-300 hover:text-white hover:bg-zinc-800 active:scale-95 transition-all"
          >
            {isSelectionMode ? 'Selesai' : 'Pilih'}
          </button>
        )}
      </div>

      {/* Garis di bawah riwayat, tidak meper samping kanan kiri */}
      <div className="mx-2 mt-1 mb-3.5 h-[1px] bg-zinc-800 rounded-full" />

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-[#181920]/90 border border-zinc-800/80 rounded-2xl p-3.5 flex items-stretch gap-3.5"
            >
              <div className="w-[84px] aspect-[3/4.6] rounded-xl bg-zinc-800 animate-shimmer shrink-0" />
              <div className="flex flex-col justify-between flex-1 py-1 min-w-0">
                <div className="flex flex-col gap-2">
                  <div className="h-4 w-3/4 bg-zinc-800/90 rounded-full animate-shimmer" />
                  <div className="h-3 w-1/2 bg-zinc-800/60 rounded-full animate-shimmer" />
                </div>
                <div className="h-10 w-full bg-zinc-900 border border-zinc-800/80 rounded-full animate-shimmer" />
              </div>
            </div>
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="min-h-[50vh] flex items-center justify-center text-zinc-500 text-sm font-medium">
          Belum ada riwayat bacaan
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {history.map((item) => {
            const percent =
              item.totalPages > 0
                ? Math.min(100, Math.max(0, Math.round((item.currentPage / item.totalPages) * 100)))
                : 0;

            const imgSrc = failedImages[item.mangaEndpoint]
              ? `/api/proxy-image?url=${encodeURIComponent(item.mangaThumb)}`
              : item.mangaThumb;

            const authorName =
              item.author && item.author !== '-'
                ? item.author
                : getMangaAuthor(item.mangaTitle, item.mangaEndpoint);

            const mangaType = item.type ? item.type.toUpperCase() : 'MANGA';
            const chapterLabel = formatChapterLabel(item.chapterTitle);
            const isSelected = selectedEndpoints.has(item.mangaEndpoint);

            return (
              <div
                key={item.mangaEndpoint}
                onClick={() => handleCardClick(item)}
                className={`bg-[#181920]/95 hover:bg-[#1f2029] border ${
                  isSelected
                    ? 'border-red-500/80 bg-red-950/20'
                    : 'border-zinc-800/80 hover:border-zinc-700/80'
                } rounded-2xl p-3 sm:p-3.5 flex items-stretch gap-3.5 cursor-pointer group select-none active:scale-[0.99] transition-all shadow-md relative`}
              >
                {isSelectionMode && (
                  <div className="absolute top-3 right-3 z-10">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                        isSelected
                          ? 'bg-red-500 border-red-500 text-white'
                          : 'border-zinc-600 bg-zinc-900/80'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                )}

                <div className="relative w-[84px] sm:w-[94px] aspect-[3/4.6] rounded-xl overflow-hidden bg-zinc-800 shrink-0 shadow-md border border-zinc-700/50">
                  <div className="absolute inset-0 z-0 animate-shimmer" />
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={item.mangaTitle}
                      onError={() =>
                        setFailedImages((prev) => ({
                          ...prev,
                          [item.mangaEndpoint]: true,
                        }))
                      }
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="w-full h-full object-cover object-top relative z-10"
                    />
                  ) : null}
                </div>

                <div className="flex flex-col justify-between flex-1 py-0.5 min-w-0 pr-6">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white line-clamp-1 group-hover:text-zinc-200 tracking-tight">
                      {item.mangaTitle}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-zinc-400 line-clamp-1 mt-0.5 font-normal">
                      {authorName}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded-md bg-[#24252f] text-[10px] font-bold text-zinc-300">
                        IND
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md bg-[#24252f] text-[10px] font-bold text-zinc-300">
                        {mangaType}
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#121318] border border-zinc-800/80 rounded-xl px-3 py-2 mt-2.5 w-full flex flex-col justify-center">
                    <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold text-zinc-200 mb-1.5">
                      <span className="truncate pr-2 font-bold text-white">
                        {chapterLabel}
                      </span>
                      <span className="shrink-0 text-zinc-400 font-medium tabular-nums">
                        Hal {item.currentPage}/{item.totalPages} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-zinc-200 h-full rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isSelectionMode && selectedEndpoints.size > 0 && (
        <div className="fixed bottom-16 inset-x-4 max-w-md mx-auto z-40 bg-[#1a1b22]/95 backdrop-blur-md border border-zinc-700/80 rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="text-xs font-medium text-zinc-300 pl-1">
            {selectedEndpoints.size} dipilih
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedEndpoints(new Set())}
              className="px-3 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800/80 active:scale-95 transition-all"
            >
              Reset
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDeleteMultiSelected}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus ({selectedEndpoints.size})</span>
            </button>
          </div>
        </div>
      )}

      {selectedItem && !isSelectionMode && (
        <div
          onClick={() => setSelectedItem(null)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#16171d] border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-3 duration-200"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="w-12 aspect-[3/4.4] rounded-lg overflow-hidden bg-zinc-800 shrink-0 border border-zinc-700/60 shadow-sm relative">
                  <div className="absolute inset-0 z-0 animate-shimmer" />
                  {selectedItem.mangaThumb ? (
                    <img
                      src={selectedItem.mangaThumb}
                      alt=""
                      className="w-full h-full object-cover object-top relative z-10"
                    />
                  ) : null}
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="text-sm font-bold text-white line-clamp-1">
                    {selectedItem.mangaTitle}
                  </h3>
                  <span className="text-xs text-zinc-400 mt-0.5">
                    {formatChapterLabel(selectedItem.chapterTitle)} • Hal {selectedItem.currentPage}/{selectedItem.totalPages}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="w-8 h-8 rounded-full bg-zinc-800/80 text-zinc-400 hover:text-white flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  const target = selectedItem;
                  setSelectedItem(null);
                  onResumeReading(target);
                }}
                className="w-full py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 border border-zinc-700/80 active:scale-[0.99] transition-all"
              >
                <BookOpen className="w-4 h-4 text-zinc-300" />
                <span>Lanjut Membaca</span>
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteSingle}
                className="w-full py-3 px-4 rounded-xl bg-red-950/30 hover:bg-red-900/50 text-red-400 hover:text-red-300 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 border border-red-900/50 active:scale-[0.99] transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus Riwayat Ini</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="w-full py-2.5 rounded-xl bg-transparent hover:bg-zinc-900 text-zinc-400 text-xs font-medium active:scale-[0.99] transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
