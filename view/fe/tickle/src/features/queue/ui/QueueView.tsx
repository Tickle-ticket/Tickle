'use client';

import React, { useEffect, useState, useRef } from 'react';
import { enterQueue, getQueueToken, leaveQueue, getQueueStreamUrl } from '@/src/shared/api/queueApi';
import { Box } from '@/src/shared/components/Box';
import { Text } from '@/src/shared/components/Text';
import { Modal } from '@/src/shared/components/Modal';
import { useUserProfile } from '@/src/shared/api/useUserProfile';
import { createBookFlowPolicy } from '@/src/features/book/api/bookFlowPolicy';
import {
  getReconnectDelay,
  shouldRetry,
  QUEUE_MAX_RECONNECT_ATTEMPTS,
} from '@/src/shared/lib/sseReconnect';

interface QueueViewProps {
  eventId: string;
  onAdmitted: (admitToken: string, queueToken?: string) => void;
  onClose: () => void;
  fastMode?: boolean;
  scope?: 'BOOKING' | 'CANCELLATION_WAIT';
  onTokenFetched?: (queueToken: string) => void;
}

export const QueueView = ({ eventId, onAdmitted, onClose, fastMode, scope = 'BOOKING', onTokenFetched }: QueueViewProps) => {
  // Storybook은 MSW 핸들러로 실제 대기열 흐름을 그대로 태우므로 예외를 두지 않는다.
  const queuePolicy = createBookFlowPolicy('BOOK', eventId);

  const [status, setStatus] = useState<'PENDING' | 'WAITING' | 'ERROR'>('PENDING');
  const [rank, setRank] = useState<number | null>(null);
  const [waitingCount, setWaitingCount] = useState<number | null>(null);
  const [estimatedWaitSeconds, setEstimatedWaitSeconds] = useState<number | null>(null);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [errorModalConfig, setErrorModalConfig] = useState<{ isOpen: boolean; title: string; message: string; action?: () => void; confirmText?: string; showCancelButton?: boolean }>({
    isOpen: false,
    title: '',
    message: ''
  });

  const queueTokenRef = useRef<string | null>(null);
  const isLeavingRef = useRef<boolean>(false);
  const isExitModalOpenRef = useRef<boolean>(false);
  const pendingAdmitTokenRef = useRef<string | null>(null);

  // useUserProfile 훅을 통해 현재 유저 데이터 가져오기 (없으면 fallback)
  const { data: userProfile, isLoading: isUserProfileLoading } = useUserProfile();

  useEffect(() => {
    if (isUserProfileLoading) return;

    const userId = userProfile?.userId;
    // 가상 공연은 비회원으로도 대기열 시나리오를 진행한다.
    // (Storybook은 아래 skipsServerCalls 분기에서 걸러지므로 여기서는 shadow만 본다)
    if (!queuePolicy.isShadow && !userId) {
      setErrorModalConfig({
        isOpen: true,
        title: '로그인 필요',
        message: '로그인이 필요한 서비스입니다.',
        confirmText: '로그인 하기',
        showCancelButton: true,
        action: () => {
          const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = `/login?redirect=${currentPath}`;
        }
      });
      return;
    }

    let isCancelled = false;
    let source: EventSource | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;

    const startQueue = async (): Promise<void> => {
      if (isCancelled) return;
      if (!eventId || eventId === 'undefined') return;

      if (queuePolicy.skipsServerCalls) {
        setStatus('WAITING');
        setRank(1);
        setWaitingCount(0);
        setEstimatedWaitSeconds(1);
        setTimeout(() => {
          if (!isCancelled) onAdmitted('shadow-token', undefined);
        }, 1500);
        return;
      }

      if (fastMode) {
        setStatus('WAITING');
        setRank(1);
        setWaitingCount(1);
        setEstimatedWaitSeconds(1);
        setTimeout(() => {
          if (!isCancelled) onAdmitted('test-fast-token', undefined);
        }, 500);
        return;
      }

      try {
        // 1. Enter Queue
        const enterRes = await enterQueue(eventId, scope);
        if (isCancelled) return;
        const { requestId } = enterRes.data;

        if (!requestId) {
          setStatus('ERROR');
          return;
        }

        // 2. Get Queue Token
        const tokenRes = await getQueueToken(eventId, requestId, scope);
        if (isCancelled) return;
        const { queueToken } = tokenRes.data;
        queueTokenRef.current = queueToken;
        onTokenFetched?.(queueToken);

        if (tokenRes.data.status === 'ADMITTED') {
          onAdmitted('at-immediate', queueToken);
          return;
        }

        setStatus('WAITING');

        // 3. SSE 연결
        const streamUrl = getQueueStreamUrl(eventId, queueToken, scope);

        // 서버가 순번을 밀어주는 통로다. 끊긴 채로 두면 화면의 순번이 멈춘 줄
        // 모르고 계속 기다리게 되므로, 끊기면 다시 붙는다.
        let reconnectAttempt = 0;
        // 서버가 대기열에서 내보냈거나(LEFT·EXPIRED) 입장이 확정된 경우처럼
        // 다시 붙을 이유가 없는 종료를 재연결과 구분한다.
        let isStreamFinished = false;

        const connectStream = () => {
          if (isCancelled || isStreamFinished) return;

          source = new EventSource(streamUrl);

          source.onopen = () => {
            // 붙었으면 이전 실패는 흘려보낸다. 누적해두면 오래 대기하는 동안
            // 띄엄띄엄 끊긴 것만으로도 재연결을 포기하게 된다.
            reconnectAttempt = 0;
          };

          source.addEventListener('queue-status', (event) => {
            try {
              const data = JSON.parse(event.data);

              if (data.status === 'WAITING') {
                setRank(data.rank);
                setWaitingCount(data.waitingCount);
                setEstimatedWaitSeconds(data.estimatedWaitSeconds);
              } else if (data.status === 'ADMITTED') {
                isStreamFinished = true;
                source?.close();
                if (isExitModalOpenRef.current) {
                  pendingAdmitTokenRef.current = data.admitToken;
                } else {
                  onAdmitted(data.admitToken, queueTokenRef.current || undefined);
                }
              } else if (data.status === 'LEFT' || data.status === 'EXPIRED') {
                isStreamFinished = true;
                setStatus('ERROR');
                source?.close();
              }
            } catch (parseError) {
              // 형식이 어긋난 이벤트 하나로 대기열을 끊지는 않는다. 다만 조용히
              // 넘기면 서버 계약이 바뀐 것을 알 수 없어 로그는 남긴다.
              console.warn('[Queue SSE] 이벤트 파싱 실패', parseError);
            }
          });

          source.onerror = () => {
            source?.close();
            source = null;

            if (isCancelled || isStreamFinished) return;

            if (!shouldRetry(reconnectAttempt, QUEUE_MAX_RECONNECT_ATTEMPTS)) {
              console.error(`[Queue SSE] 재연결 포기 (${reconnectAttempt}회 실패)`);
              setStatus('ERROR');
              return;
            }

            const delay = getReconnectDelay(reconnectAttempt);
            reconnectAttempt += 1;
            console.warn(
              `[Queue SSE] 연결 끊김. ${delay}ms 후 재연결 (${reconnectAttempt}/${QUEUE_MAX_RECONNECT_ATTEMPTS})`,
            );
            reconnectTimer = setTimeout(connectStream, delay);
          };
        };

        connectStream();

      } catch (err: any) {
        if (isCancelled) return;
        if (err.status === 400) {
          setErrorModalConfig({
            isOpen: true,
            title: '진입 불가',
            message: '예매 오픈 전이거나 이미 종료된 회차입니다.',
            action: () => { if (!isCancelled) onClose(); }
          });
          return;
        }
        if (err.status === 404) {
          setErrorModalConfig({
            isOpen: true,
            title: '정보 없음',
            message: '대기열 진입용 회차 오픈 정보를 찾을 수 없습니다.',
            action: () => { if (!isCancelled) onClose(); }
          });
          return;
        }

        setStatus('ERROR');
      }
    };

    startQueue();

    return () => {
      isCancelled = true;
      if (source) {
        source.close();
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [eventId, onAdmitted, isUserProfileLoading]);

  const handleCloseClick = () => {
    setIsExitModalOpen(true);
    isExitModalOpenRef.current = true;
  };

  const handleConfirmExit = () => {
    setIsExitModalOpen(false);
    isExitModalOpenRef.current = false;
    isLeavingRef.current = true;
    if (queueTokenRef.current) {
      // 실패해도 서버가 대기열 만료로 정리한다. 다만 조용히 넘기면 이탈 API가
      // 계속 깨져도 알 수 없어 로그는 남긴다.
      leaveQueue(eventId, queueTokenRef.current, scope).catch((err) =>
        console.warn('[Queue] 대기열 이탈 요청 실패', err),
      );
    }
    onClose();
  };

  const handleCancelExit = () => {
    setIsExitModalOpen(false);
    isExitModalOpenRef.current = false;
    if (pendingAdmitTokenRef.current) {
      onAdmitted(pendingAdmitTokenRef.current, queueTokenRef.current || undefined);
    }
  };

  const formatWaitTime = (seconds: number | null) => {
    if (seconds === null) return '계산 중...';
    if (seconds < 60) return `${seconds}초`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}분 ${s}초`;
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-surface-subtle/95 backdrop-blur-sm z-50 p-4 sm:p-6 relative overflow-hidden">
      {/* 장식용 배경 요소 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <Box variant="flat" padding="large" className="z-10 w-full max-w-sm sm:max-w-md bg-surface rounded-3xl shadow-2xl border border-line-subtle flex flex-col items-center animate-fade-in relative">
        <button
          onClick={handleCloseClick}
          className="absolute top-6 right-6 p-2 hover:bg-surface-muted rounded-full transition-colors text-content-tertiary"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {status === 'PENDING' && (
          <div className="flex flex-col items-center gap-6 py-8 w-full">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <div className="text-center flex flex-col items-center">
              <Text typography="t3" fontWeight="bold" color="primary" className="text-center">대기열 진입 중...</Text>
              <Text typography="t6" color="secondary" className="mt-4 break-keep text-center">잠시만 기다려주세요</Text>
            </div>
          </div>
        )}

        {status === 'WAITING' && (
          <div className="flex flex-col items-center gap-8 w-full py-4">
            <div className="w-20 h-20 bg-primary-subtle text-primary rounded-full flex items-center justify-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>

            <div className="text-center w-full flex flex-col items-center">
              <Text typography="t3" fontWeight="bold" color="primary" className="text-center">
                {scope === 'CANCELLATION_WAIT' ? '취소표 대기 중입니다' : '예매 대기 중입니다'}
              </Text>
              <Text typography="t6" color="secondary" className="mt-4 break-keep leading-relaxed text-center">
                현재 접속 인원이 많아 대기 중입니다.<br />
                새로고침하거나 뒤로가기 시 순서가 초기화됩니다.
              </Text>
            </div>

            <div className="w-full flex flex-col gap-3 bg-surface-subtle p-6 rounded-2xl border border-line-subtle">
              <div className="flex justify-between items-center">
                <Text typography="t6" color="secondary">내 대기 순서</Text>
                <Text typography="t4" fontWeight="bold" className="text-primary">
                  {rank !== null ? `${rank.toLocaleString()}번째` : '계산 중...'}
                </Text>
              </div>
              <div className="h-px w-full bg-surface-active" />
              <div className="flex justify-between items-center">
                <Text typography="t6" color="secondary">예상 대기 시간</Text>
                <Text typography="t5" fontWeight="bold" color="primary">
                  {formatWaitTime(estimatedWaitSeconds)}
                </Text>
              </div>
            </div>
          </div>
        )}

        {status === 'ERROR' && (
          <div className="flex flex-col items-center gap-6 py-8 w-full text-center">
            <div className="w-16 h-16 bg-danger-subtle text-danger rounded-full flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>
            <div className="flex flex-col items-center">
              <Text typography="t3" fontWeight="bold" className="text-danger text-center">대기열 접속 오류</Text>
              <Text typography="t6" color="secondary" className="mt-4 break-keep leading-relaxed text-center">
                일시적인 오류가 발생했습니다.<br />다시 시도해주세요.
              </Text>
            </div>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-3 bg-content text-white font-bold rounded-xl w-full hover:bg-surface-inverse transition-colors"
            >
              확인
            </button>
          </div>
        )}
      </Box>

      <Modal
        isOpen={isExitModalOpen}
        onClose={handleCancelExit}
        title="대기열 퇴장"
        description="대기열에서 퇴장하시겠습니까? 다시 진입 시 대기 순서가 초기화됩니다."
        confirmText="퇴장하기"
        cancelText="계속 대기"
        onConfirm={handleConfirmExit}
        onCancel={handleCancelExit}
      />

      <Modal
        isOpen={errorModalConfig.isOpen}
        onClose={() => {
          setErrorModalConfig(prev => ({ ...prev, isOpen: false }));
          if (errorModalConfig.action) errorModalConfig.action();
        }}
        title={errorModalConfig.title}
        description={errorModalConfig.message}
        confirmText={errorModalConfig.confirmText || "확인"}
        showCancelButton={errorModalConfig.showCancelButton ?? false}
        onConfirm={() => {
          setErrorModalConfig(prev => ({ ...prev, isOpen: false }));
          if (errorModalConfig.action) errorModalConfig.action();
        }}
      />
    </div>
  );
};
