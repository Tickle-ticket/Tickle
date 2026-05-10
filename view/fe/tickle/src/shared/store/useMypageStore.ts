import { create } from 'zustand';

export type MypageTabType = 'USER' | 'UPCOMING' | 'MY_TICKETS' | 'PAST_TICKETS' | 'WAITLIST' | 'PAYMENTS';

interface MypageState {
  isMypageOpen: boolean;
  activeTab: MypageTabType;
  openMypage: (tab?: MypageTabType) => void;
  closeMypage: () => void;
  setActiveTab: (tab: MypageTabType) => void;
}

export const useMypageStore = create<MypageState>((set) => ({
  isMypageOpen: false,
  activeTab: 'USER',
  openMypage: (tab = 'USER') => set({ isMypageOpen: true, activeTab: tab }),
  closeMypage: () => set({ isMypageOpen: false }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const tab = params.get('tab');

    if (view === 'mypage') {
      useMypageStore.getState().openMypage((tab as MypageTabType) || 'USER');
    } else {
      useMypageStore.getState().closeMypage();
    }
  });
}
