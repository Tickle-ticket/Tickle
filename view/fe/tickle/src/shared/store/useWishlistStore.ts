import { create } from 'zustand';

interface WishlistState {
  wishlistMap: Record<string, boolean>;
  initWishlist: (ids: string[]) => void;
  addWishlist: (eventId: string) => void;
  removeWishlist: (eventId: string) => void;
}

export const useWishlistStore = create<WishlistState>((set) => ({
  wishlistMap: {},
  initWishlist: (ids) => set((state) => {
    const next = { ...state.wishlistMap };
    ids.forEach(id => {
      if (state.wishlistMap[id] !== false) {
        next[id] = true;
      }
    });
    return { wishlistMap: next };
  }),
  addWishlist: (eventId) => set((state) => ({
    wishlistMap: { ...state.wishlistMap, [eventId]: true }
  })),
  removeWishlist: (eventId) => set((state) => {
    const next = { ...state.wishlistMap };
    next[eventId] = false; // instead of delete to ensure reactivity for false checks
    return { wishlistMap: next };
  }),
}));
