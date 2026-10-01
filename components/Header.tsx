'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  TrendingUp,
  Clock,
  BookmarkCheck,
  User,
  X,
} from 'lucide-react';

export type NavTab = 'home' | 'trending' | 'ongoing' | 'history' | 'account';

interface HeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearchSubmit: (query: string) => void;
  historyCount: number;
}

export default function Header({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  historyCount,
}: HeaderProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearch.trim()) {
      onSearchSubmit(localSearch.trim());
    }
  };

  const handleClear = () => {
    setLocalSearch('');
    setSearchQuery('');
    onSearchSubmit('');
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#0d0f14]/90 border-b border-[#1c202a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          <button
            type="button"
            onClick={() => {
              setActiveTab('home');
              setLocalSearch('');
              setSearchQuery('');
              onSearchSubmit('');
            }}
            className="flex items-center gap-3 group text-left transition-opacity hover:opacity-90"
          >
            <div className="w-11 h-11 rounded-[45px] bg-[#1a1d26] border border-[#272b38] flex items-center justify-center text-[#d6d8df] group-hover:border-[#3a4052] transition-colors">
              <BookOpen className="w-5 h-5 text-[#9ca3af]" />
            </div>
            <div>
              <div className="font-semibold text-lg tracking-tight text-[#f1f3f7]">
                MangaID
              </div>
              <div className="text-[11px] text-[#717786] tracking-wide font-normal">
                Sub Indonesia
              </div>
            </div>
          </button>

          <form
            onSubmit={handleSearch}
            className="hidden md:flex flex-1 max-w-md items-center relative"
          >
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#656b7c]">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Cari judul manga, manhwa..."
                className="w-full pl-11 pr-10 py-2.5 bg-[#141720] border border-[#232733] rounded-[45px] text-sm text-[#e4e6eb] placeholder-[#656b7c] focus:outline-none focus:border-[#3e4458] transition-all"
              />
              {localSearch && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#717786] hover:text-[#e4e6eb]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>

          <nav className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className={`flex items-center gap-2 px-4 py-2 rounded-[45px] text-xs font-medium transition-all ${
                activeTab === 'home'
                  ? 'bg-[#1e222e] text-[#f1f3f7] border border-[#2d3345]'
                  : 'text-[#858b9c] hover:text-[#d6d8df] hover:bg-[#141720]'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Beranda</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('trending')}
              className={`flex items-center gap-2 px-4 py-2 rounded-[45px] text-xs font-medium transition-all ${
                activeTab === 'trending'
                  ? 'bg-[#1e222e] text-[#f1f3f7] border border-[#2d3345]'
                  : 'text-[#858b9c] hover:text-[#d6d8df] hover:bg-[#141720]'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Trending</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ongoing')}
              className={`flex items-center gap-2 px-4 py-2 rounded-[45px] text-xs font-medium transition-all ${
                activeTab === 'ongoing'
                  ? 'bg-[#1e222e] text-[#f1f3f7] border border-[#2d3345]'
                  : 'text-[#858b9c] hover:text-[#d6d8df] hover:bg-[#141720]'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Terbaru</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-[45px] text-xs font-medium transition-all relative ${
                activeTab === 'history'
                  ? 'bg-[#1e222e] text-[#f1f3f7] border border-[#2d3345]'
                  : 'text-[#858b9c] hover:text-[#d6d8df] hover:bg-[#141720]'
              }`}
            >
              <BookmarkCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Riwayat</span>
              {historyCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-[#525970]" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('account')}
              className={`flex items-center gap-2 px-4 py-2 rounded-[45px] text-xs font-medium transition-all ${
                activeTab === 'account'
                  ? 'bg-[#1e222e] text-[#f1f3f7] border border-[#2d3345]'
                  : 'text-[#858b9c] hover:text-[#d6d8df] hover:bg-[#141720]'
              }`}
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Akun</span>
            </button>
          </nav>
        </div>

        <div className="md:hidden pb-3">
          <form onSubmit={handleSearch} className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#656b7c]">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Cari komik..."
              className="w-full pl-11 pr-10 py-2.5 bg-[#141720] border border-[#232733] rounded-[45px] text-sm text-[#e4e6eb] placeholder-[#656b7c] focus:outline-none focus:border-[#3e4458]"
            />
            {localSearch && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#717786]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>
        </div>
      </div>
    </header>
  );
}
