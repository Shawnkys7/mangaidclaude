'use client';

import React, { useState } from 'react';
import {
  ChevronLeft,
  BookmarkCheck,
  Bookmark,
  Camera,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { BookmarkItem, ReadingProgress, UserProfile } from '@/lib/types';

interface SettingsViewProps {
  user: UserProfile;
  history: ReadingProgress[];
  bookmarks: BookmarkItem[];
  onBack: () => void;
  onOpenHistory: () => void;
  onOpenBookmarks: () => void;
  onOpenManga: (endpoint: string) => void;
  onUpdateUsername: (newUsername: string) => void;
  onUpdateAvatar: (avatarUrl: string) => void;
  onClearHistory: () => void;
}

export default function SettingsView({
  user,
  history,
  bookmarks,
  onBack,
  onOpenHistory,
  onOpenBookmarks,
  onUpdateUsername,
  onUpdateAvatar,
  onClearHistory,
}: SettingsViewProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user.username);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onUpdateAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      onUpdateUsername(nameInput.trim());
      setIsEditingName(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0d12] text-[#e4e6eb] pb-16">
      <div className="max-w-lg mx-auto px-4 pt-6 flex flex-col gap-6">
        <div className="flex items-center gap-4 border-b border-[#1c202a] pb-4">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-[#161822] border border-[#252938] flex items-center justify-center text-white hover:bg-[#1f2331] transition-colors"
          >
            <ChevronLeft className="w-5 h-5 -ml-0.5" />
          </button>
          <h1 className="text-xl font-bold text-white tracking-wide">
            Pengaturan
          </h1>
        </div>

        <div className="bg-[#12141c] border border-[#232733] rounded-[36px] p-6 flex flex-col items-center text-center gap-4">
          <div className="relative group">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-full bg-[#4a4e5d] border-2 border-[#5a6074] overflow-hidden flex items-center justify-center cursor-pointer transition-transform group-hover:scale-105 shadow-xl"
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#3c4150]" />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 rounded-full bg-[#202534] border border-[#353d52] text-white hover:bg-[#2b3246] transition-colors shadow-md"
              title="Pilih foto dari galeri"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div>
            {isEditingName ? (
              <form onSubmit={handleSaveName} className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="px-4 py-1.5 bg-[#1b1f2c] border border-[#2d3448] rounded-[45px] text-sm text-white focus:outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-[45px] bg-[#272e42] text-xs font-semibold text-white hover:bg-[#343d57]"
                >
                  Simpan
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-lg font-bold text-white">{user.username}</h2>
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  className="text-xs text-[#7e8597] hover:text-white underline"
                >
                  Ubah
                </button>
              </div>
            )}
            <div className="text-xs text-[#7c8396] mt-0.5">
              Level Pembaca: <span className="font-semibold text-white">Lv {user.level ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onOpenHistory}
            className="w-full py-4 px-6 rounded-[45px] bg-[#12141c] hover:bg-[#1a1d29] border border-[#232733] hover:border-[#353b4e] flex items-center justify-between text-left transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-[45px] bg-[#1a1e2a] border border-[#272c3d] flex items-center justify-center text-[#9ca3af] group-hover:text-white transition-colors">
                <BookmarkCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-sm text-white">
                  Riwayat Bacaan
                </div>
                <div className="text-xs text-[#737a8c]">
                  {history.length} komik telah dibaca
                </div>
              </div>
            </div>
            <span className="text-xs text-[#7c8396] group-hover:text-white transition-colors">
              Lihat
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenBookmarks}
            className="w-full py-4 px-6 rounded-[45px] bg-[#12141c] hover:bg-[#1a1d29] border border-[#232733] hover:border-[#353b4e] flex items-center justify-between text-left transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-[45px] bg-[#1a1e2a] border border-[#272c3d] flex items-center justify-center text-[#9ca3af] group-hover:text-white transition-colors">
                <Bookmark className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-sm text-white">
                  Favorit / Bookmark
                </div>
                <div className="text-xs text-[#737a8c]">
                  {bookmarks.length} komik tersimpan
                </div>
              </div>
            </div>
            <span className="text-xs text-[#7c8396] group-hover:text-white transition-colors">
              Lihat
            </span>
          </button>
        </div>

        <div className="bg-[#12141c] border border-[#232733] rounded-[36px] p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-[#7c8396]">
            <span>Sinkronisasi Data</span>
            <span className="text-white flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#8690a2]" />
              Aktif
            </span>
          </div>
          {history.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="mt-2 py-2.5 px-4 rounded-[45px] bg-[#181a24] hover:bg-[#202330] border border-[#272b38] text-xs font-medium text-[#8f96a8] hover:text-white flex items-center justify-center gap-2 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Riwayat Bacaan</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
