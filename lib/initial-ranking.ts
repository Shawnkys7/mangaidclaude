import { MangaItem } from "./types";
import { GLOBAL_TOP_POPULAR } from "./initial-data";

export const INITIAL_RANKING: {
  manga: MangaItem[];
  manhwa: MangaItem[];
  manhua: MangaItem[];
} = {
  manga: GLOBAL_TOP_POPULAR.filter((m) => (m.type || '').toLowerCase() === 'manga'),
  manhwa: GLOBAL_TOP_POPULAR.filter((m) => (m.type || '').toLowerCase() === 'manhwa'),
  manhua: GLOBAL_TOP_POPULAR.filter((m) => (m.type || '').toLowerCase() === 'manhua'),
};
