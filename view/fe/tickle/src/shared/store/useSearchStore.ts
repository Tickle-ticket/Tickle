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

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    
    if (q) {
      useSearchStore.getState().setSearchValue(q);
    } else {
      useSearchStore.getState().clearSearch();
    }
  });
}
