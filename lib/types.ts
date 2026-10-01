export interface ChapterProgressInfo {
  currentPage: number;
  totalPages: number;
  updatedAt?: string;
  chapterTitle?: string;
}

export interface ReadingProgress {
  mangaEndpoint: string;
  mangaTitle: string;
  mangaThumb: string;
  chapterEndpoint: string;
  chapterTitle: string;
  currentPage: number;
  totalPages: number;
  updatedAt: string;
  type?: string;
  author?: string;
  chaptersRead?: Record<string, ChapterProgressInfo>;
}

export interface BookmarkItem {
  mangaEndpoint: string;
  mangaTitle: string;
  mangaThumb: string;
  type?: string;
  addedAt: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatarSeed: string;
  avatarUrl?: string;
  isLoggedIn?: boolean;
  authProvider?: 'google' | 'email' | null;
  level: number;
  exp?: number;
  readingSeconds: number;
  joinedDate: string;
}

export interface AppDatabase {
  user: UserProfile;
  history: ReadingProgress[];
  bookmarks: BookmarkItem[];
}

export interface RankingData {
  manga: MangaItem[];
  manhwa: MangaItem[];
  manhua: MangaItem[];
}

export interface MangaItem {
  title: string;
  endpoint: string;
  thumb: string;
  type: 'Manga' | 'Manhwa' | 'Manhua' | string;
  latestChapter: string;
  latestChapterEndpoint: string;
  genreOrRating?: string;
  description?: string;
  desc?: string;
  author?: string;
  uploadedAt?: string;
  views?: number | string;
  rank?: number;
  score?: string | number;
}

export interface ChapterItem {
  title: string;
  endpoint: string;
  releaseDate?: string;
}

export interface MangaDetail {
  title: string;
  endpoint: string;
  thumb: string;
  synopsis: string;
  type: string;
  status: string;
  author: string;
  genres: string[];
  totalChapters: number;
  chapters: ChapterItem[];
}

export interface ChapterDetail {
  title: string;
  chapterTitle: string;
  chapterEndpoint: string;
  mangaEndpoint: string;
  mangaTitle: string;
  prevChapterEndpoint: string | null;
  nextChapterEndpoint: string | null;
  images: string[];
  totalPages: number;
}
