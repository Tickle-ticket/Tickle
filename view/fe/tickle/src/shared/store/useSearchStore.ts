import { create } from 'zustand';

interface SearchState {
  searchValue: string;
  setSearchValue: (val: string) => void;
  clearSearch: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  searchValue: '',
  setSearchValue: (val) => set({ searchValue: val }),
  clearSearch: () => set({ searchValue: '' }),
}));
