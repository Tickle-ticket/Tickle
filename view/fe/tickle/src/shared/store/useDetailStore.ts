import { create } from 'zustand';

interface DetailState {
  selectedDetailId: string | null;
  clickedLayoutId: string | null;
  isDetailBannerOpen: boolean;
  openDetail: (id: string, layoutId?: string) => void;
  closeDetail: () => void;
  setDetailBannerOpen: (isOpen: boolean) => void;
}

export const useDetailStore = create<DetailState>((set) => ({
  selectedDetailId: null,
  clickedLayoutId: null,
  isDetailBannerOpen: true,
  openDetail: (id, layoutId) => {
    window.history.pushState({}, '', `/detail?id=${id}`);
    set({ selectedDetailId: id, clickedLayoutId: layoutId || null });
  }, 
  closeDetail: () => {
    if (window.location.pathname === '/detail') {
      window.history.pushState({}, '', '/');
    }
    set({ selectedDetailId: null, clickedLayoutId: null });
  }, 
  setDetailBannerOpen: (isOpen) => set({ isDetailBannerOpen: isOpen }),
}));

// 클라이언트 사이드에서만 실행
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const isDetail = window.location.pathname.includes('/detail');
    
    if (isDetail && id) {
      useDetailStore.getState().setDetailBannerOpen(true);
      useDetailStore.setState({ selectedDetailId: id });
    } else {
      useDetailStore.getState().closeDetail();
    }
  });
}
