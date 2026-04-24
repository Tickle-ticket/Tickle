'use client';

import React, { useEffect, useState, useRef } from 'react';
import { enterQueue, getQueueToken, leaveQueue, getStreamUrl } from '@/src/features/queue/api/queueApi';
import { Box } from '@/src/shared/components/Box';
import { Text } from '@/src/shared/components/Text';
import { Modal } from '@/src/shared/components/Modal';

interface QueueViewProps {
  sessionId: string;
  onAdmitted: (admitToken: string) => void;
  onClose: () => void;
}

export const QueueView = ({ sessionId, onAdmitted, onClose }: QueueViewProps) => {
  const [status, setStatus] = useState<'PENDING' | 'WAITING' | 'ERROR'>('PENDING');
  const [rank, setRank] = useState<number | null>(null);
  const [waitingCount, setWaitingCount] = useState<number | null>(null);
  const [estimatedWaitSeconds, setEstimatedWaitSeconds] = useState<number | null>(null);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  
  const queueTokenRef = useRef<string | null>(null);
  const isLeavingRef = useRef<boolean>(false);
  const isExitModalOpenRef = useRef<boolean>(false);
  const pendingAdmitTokenRef = useRef<string | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;

    const startQueue = async () => {
      try {
        // 1. Enter Queue
        const enterRes = await enterQueue(sessionId);
        const { requestId } = enterRes.data;

        // 2. Get Queue Token
        const tokenRes = await getQueueToken(sessionId, requestId);
        const { queueToken } = tokenRes.data;
        queueTokenRef.current = queueToken;

        if (tokenRes.data.status === 'ADMITTED') {
          // Immediately admitted (rare but possible)
          onAdmitted('at-immediate');
          return;
        }

        setStatus('WAITING');

        // 3. Setup SSE
        eventSource = new EventSource(getStreamUrl(sessionId, queueToken));

        eventSource.addEventListener('queue-status', (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.status === 'WAITING') {
              setRank(data.rank);
              setWaitingCount(data.waitingCount);
              setEstimatedWaitSeconds(data.estimatedWaitSeconds);
            } else if (data.status === 'ADMITTED') {
              if (eventSource) {
                eventSource.close();
              }
              if (isExitModalOpenRef.current) {
                pendingAdmitTokenRef.current = data.admitToken;
              } else {
                onAdmitted(data.admitToken);
              }
            } else if (data.status === 'LEFT' || data.status === 'EXPIRED') {
              setStatus('ERROR');
              if (eventSource) eventSource.close();
            }
          } catch (e) {
            console.error('SSE parsing error', e);
          }
        });

        eventSource.onerror = () => {
          // EventSource attempts to reconnect automatically
          console.warn('EventSource connection error');
        };

      } catch (err) {
        console.error('Queue connection failed', err);
        setStatus('ERROR');
      }
    };

    startQueue();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      // 명시적 이탈 처리 (창을 닫거나 뒤로 갈 때)
      if (queueTokenRef.current && !isLeavingRef.current) {
        // 백그라운드에서 이탈 호출을 위해 fire-and-forget
        leaveQueue(sessionId, queueTokenRef.current).catch(console.error);
      }
    };
  }, [sessionId, onAdmitted]);

  const handleCloseClick = () => {
    setIsExitModalOpen(true);
    isExitModalOpenRef.current = true;
  };

  const handleConfirmExit = () => {
    setIsExitModalOpen(false);
    isExitModalOpenRef.current = false;
    isLeavingRef.current = true;
    if (queueTokenRef.current) {
      leaveQueue(sessionId, queueTokenRef.current).catch(console.error);
    }
    onClose();
  };

  const handleCancelExit = () => {
    setIsExitModalOpen(false);
    isExitModalOpenRef.current = false;
    if (pendingAdmitTokenRef.current) {
      onAdmitted(pendingAdmitTokenRef.current);
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
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gray-50/95 backdrop-blur-sm z-50 p-6 relative overflow-hidden">
      {/* 장식용 배경 요소 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

      <Box variant="flat" padding="large" className="z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col items-center animate-fade-in relative">
        <button
          onClick={handleCloseClick}
          className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {status === 'PENDING' && (
          <div className="flex flex-col items-center gap-6 py-8 w-full">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-center flex flex-col items-center">
              <Text typography="t3" fontWeight="bold" color="primary" className="text-center">대기열 진입 중...</Text>
              <Text typography="t6" color="secondary" className="mt-4 break-keep text-center">잠시만 기다려주세요</Text>
            </div>
          </div>
        )}

        {status === 'WAITING' && (
          <div className="flex flex-col items-center gap-8 w-full py-4">
            <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            
            <div className="text-center w-full flex flex-col items-center">
              <Text typography="t3" fontWeight="bold" color="primary" className="text-center">예매 대기 중입니다</Text>
              <Text typography="t6" color="secondary" className="mt-4 break-keep leading-relaxed text-center">
                현재 접속 인원이 많아 대기 중입니다.<br />
                새로고침하거나 뒤로가기 시 순서가 초기화됩니다.
              </Text>
            </div>

            <div className="w-full flex flex-col gap-3 bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <div className="flex justify-between items-center">
                <Text typography="t6" color="secondary">내 대기 순서</Text>
                <Text typography="t4" fontWeight="bold" className="text-blue-600">
                  {rank !== null ? `${rank.toLocaleString()}번째` : '계산 중...'}
                </Text>
              </div>
              <div className="h-px w-full bg-gray-200" />
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
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>
            <div className="flex flex-col items-center">
              <Text typography="t3" fontWeight="bold" className="text-red-600 text-center">대기열 접속 오류</Text>
              <Text typography="t6" color="secondary" className="mt-4 break-keep leading-relaxed text-center">
                일시적인 오류가 발생했습니다.<br/>다시 시도해주세요.
              </Text>
            </div>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-3 bg-gray-900 text-white font-bold rounded-xl w-full hover:bg-gray-800 transition-colors"
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
    </div>
  );
};
