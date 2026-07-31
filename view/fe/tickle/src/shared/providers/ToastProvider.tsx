'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * 토스트의 성격. 색만 다르고 동작은 같다.
 */
export type ToastVariant = 'error' | 'success' | 'info';

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  /**
   * 화면 하단에 잠깐 떴다 사라지는 알림을 띄운다.
   *
   * 사용자의 다음 동작을 막지 않아도 되는 알림에 쓴다. 확인을 받아야 하거나
   * 직후에 화면을 전환해야 하는 경우는 Modal이 맞다.
   */
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** 토스트가 화면에 머무는 시간. */
const TOAST_DURATION_MS = 3500;

/**
 * 동시에 쌓아둘 최대 개수.
 *
 * 실패가 연달아 나면 화면이 토스트로 덮인다. 오래된 것부터 밀어낸다.
 */
const MAX_VISIBLE_TOASTS = 3;

const VARIANT_STYLES: Record<ToastVariant, string> = {
  error: 'bg-danger text-white',
  success: 'bg-primary text-white',
  info: 'bg-surface-inverse text-content-inverse',
};

/**
 * 전역 토스트를 제공합니다.
 *
 * <p>이전에는 실패 안내에 브라우저 `alert`을 쓰고 있었습니다. `alert`은 탭 전체를
 * 멈추고, 스타일을 맞출 수 없으며, 사용자가 확인을 누를 때까지 뒤 화면의 상태
 * 갱신도 보이지 않습니다. 로그아웃 실패처럼 "알려주기만 하면 되는" 알림에는
 * 과한 수단이라 토스트로 대체했습니다.</p>
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // setState 함수형 업데이트 안에서 id를 만들면 StrictMode의 이중 호출로 같은
  // id가 두 번 나올 수 있다. ref로 렌더와 무관하게 증가시킨다.
  const nextIdRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'error') => {
      const id = nextIdRef.current++;
      setToasts((prev) => [...prev, { id, message, variant }].slice(-MAX_VISIBLE_TOASTS));
      setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        // 스크린리더가 화면 전환 없이도 내용을 읽도록 라이브 리전으로 둔다.
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex flex-col items-center gap-2 px-4"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
              onClick={() => dismiss(toast.id)}
              className={`pointer-events-auto max-w-md cursor-pointer whitespace-pre-line rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${VARIANT_STYLES[toast.variant]}`}
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

/**
 * 전역 토스트를 띄우는 훅입니다.
 *
 * @throws ToastProvider 밖에서 호출한 경우
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast는 ToastProvider 안에서만 사용할 수 있습니다.');
  }
  return context;
}
