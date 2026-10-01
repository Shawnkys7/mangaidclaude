'use client';

import React, { useState } from 'react';
import { MangaItem } from '@/lib/types';

interface MangaCardProps {
  manga: MangaItem;
  rank?: number;
  onClick: () => void;
}

export default function MangaCard({
  manga,
  rank,
  onClick,
}: MangaCardProps) {
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [failedThumb, setFailedThumb] = useState<string | null>(null);

  const imgSrc = failedThumb === manga.thumb
    ? `/api/proxy-image?url=${encodeURIComponent(manga.thumb)}`
    : manga.thumb;

  const handleImageError = () => {
    if (failedThumb !== manga.thumb && manga.thumb) {
      setFailedThumb(manga.thumb);
    }
  };

  const formatChapter = (chText: string) => {
    if (!chText) return 'ch 1';
    const match = chText.match(/(\d+(\.\d+)?)/);
    if (match) {
      return `ch ${match[1]}`;
    }
    return chText.toLowerCase().replace('chapter', 'ch').trim();
  };

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
      className="group flex flex-col cursor-pointer select-none text-left"
    >
      <div className="relative w-full aspect-[3/4.2] rounded-[24px] sm:rounded-[28px] overflow-hidden bg-zinc-900 border border-[#2b2734] transition-transform duration-200 group-hover:scale-[1.02]">
        {!isLoaded && (
          <div className="absolute inset-0 z-0 animate-shimmer" />
        )}
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={manga.title}
            onLoad={() => setIsLoaded(true)}
            onError={handleImageError}
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            className={`w-full h-full object-cover object-top relative z-10 transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
        ) : null}
        {typeof rank === 'number' && (
          <div className="absolute top-2.5 left-2.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/75 backdrop-blur-sm border border-white/20 flex items-center justify-center text-[11px] sm:text-xs font-bold text-white shadow-md z-20">
            {rank}
          </div>
        )}
      </div>
      <h3 className="font-semibold text-xs sm:text-sm text-[#f1f3f7] mt-2 line-clamp-1 group-hover:text-white transition-colors">
        {manga.title}
      </h3>
      <span className="text-[11px] text-[#818798] line-clamp-1 font-normal">
        {formatChapter(manga.latestChapter)}
      </span>
    </div>
  );
}
