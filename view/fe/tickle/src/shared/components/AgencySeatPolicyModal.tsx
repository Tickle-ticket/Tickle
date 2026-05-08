'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from './Badge';
import { Button } from './Button';
import { InteractiveMapViewer } from './InteractiveMapViewer';
import { Modal } from './Modal';
import { Stage_4001, STAGE_4001_SEAT_IDS } from './Stage_4001';
import type { SeatColor, SeatStatus } from './types';

export type AgencySeatAssignmentMode = 'VIP' | 'R' | 'S' | 'A' | 'disabled';
export type AgencySeatPolicy = Record<string, AgencySeatAssignmentMode>;

type SeatTool = {
  key: AgencySeatAssignmentMode;
  label: string;
  description: string;
  badgeColor: 'red' | 'blue' | 'green' | 'grey';
};

const seatToolOptions: SeatTool[] = [
  { key: 'VIP', label: 'VIP', description: '프리미엄 구역으로 지정', badgeColor: 'red' },
  { key: 'R', label: 'R석', description: '주요 시야 구역으로 지정', badgeColor: 'blue' },
  { key: 'S', label: 'S석', description: '일반 판매 구역으로 지정', badgeColor: 'green' },
  { key: 'A', label: 'A석', description: '입문형 좌석으로 지정', badgeColor: 'grey' },
  { key: 'disabled', label: '비활성 적용', description: '선택한 좌석을 판매 제외 상태로 바꿉니다', badgeColor: 'grey' },
];

const seatEditingGuide = [
  '좌석을 클릭하거나 드래그하면 현재 도구가 바로 적용됩니다.',
  '빈 공간에서 드래그하면 좌석도 이동, 휠과 우측 버튼으로 확대/축소가 됩니다.',
  '판매 제외가 필요한 좌석은 비활성 적용 도구로 한 번에 칠할 수 있습니다.',
];

const assignmentToSeatAppearance: Record<
  AgencySeatAssignmentMode,
  { color: SeatColor; status: SeatStatus }
> = {
  VIP: { color: 'pink', status: 'selectable' },
  R: { color: 'yellow', status: 'selectable' },
  S: { color: 'orange', status: 'selectable' },
  A: { color: 'blue', status: 'selectable' },
  disabled: { color: 'gray', status: 'disabled' },
};

const getDefaultSeatAssignment = (seatId: string): AgencySeatAssignmentMode => {
  const row = seatId.replace(/[0-9]/g, '');
  const number = Number(seatId.replace(/\D/g, ''));

  if (['A', 'B', 'C'].includes(row)) {
    return 'VIP';
  }

  if (['D', 'E', 'F', 'G'].includes(row)) {
    return number >= 4 && number <= 11 ? 'R' : 'S';
  }

  if (row === 'H') {
    return number >= 5 && number <= 12 ? 'R' : 'S';
  }

  if (['I', 'J', 'K', 'L', 'M'].includes(row)) {
    return 'A';
  }

  return 'A';
};

export const createDefaultAgencySeatPolicy = (): AgencySeatPolicy =>
  Object.fromEntries(STAGE_4001_SEAT_IDS.map((seatId) => [seatId, getDefaultSeatAssignment(seatId)]));

export const getAgencySeatPolicySummary = (seatPolicy: AgencySeatPolicy) =>
  STAGE_4001_SEAT_IDS.reduce(
    (summary, seatId) => {
      const assignment = seatPolicy[seatId] ?? getDefaultSeatAssignment(seatId);

      if (assignment === 'VIP') {
        summary.vip += 1;
      } else if (assignment === 'R') {
        summary.r += 1;
      } else if (assignment === 'S') {
        summary.s += 1;
      } else if (assignment === 'A') {
        summary.a += 1;
      } else if (assignment === 'disabled') {
        summary.disabled += 1;
      }

      return summary;
    },
    {
      vip: 0,
      r: 0,
      s: 0,
      a: 0,
      disabled: 0,
      total: STAGE_4001_SEAT_IDS.length,
    },
  );

export interface AgencySeatPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  seatPolicy: AgencySeatPolicy;
  onConfirm: (nextSeatPolicy: AgencySeatPolicy) => void;
}

export const AgencySeatPolicyModal = ({
  isOpen,
  onClose,
  seatPolicy,
  onConfirm,
}: AgencySeatPolicyModalProps) => {
  const [draftSeatPolicy, setDraftSeatPolicy] = useState<AgencySeatPolicy>(() => ({ ...seatPolicy }));
  const [selectedTool, setSelectedTool] = useState<AgencySeatAssignmentMode>('VIP');
  const [lastEditedSeatId, setLastEditedSeatId] = useState<string | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const isPaintingSeatsRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const paintedSeatIdsRef = useRef<Set<string>>(new Set());
  const guidePopoverRef = useRef<HTMLDivElement | null>(null);

  const seatPolicySummary = useMemo(
    () => getAgencySeatPolicySummary(draftSeatPolicy),
    [draftSeatPolicy],
  );

  const seatMapData = useMemo(
    () =>
      Object.fromEntries(
        STAGE_4001_SEAT_IDS.map((seatId) => {
          const assignment = draftSeatPolicy[seatId] ?? getDefaultSeatAssignment(seatId);
          const appearance = assignmentToSeatAppearance[assignment];

          return [
            seatId,
            {
              ...appearance,
            },
          ];
        }),
      ),
    [draftSeatPolicy],
  );

  const activeTool = seatToolOptions.find((tool) => tool.key === selectedTool) ?? seatToolOptions[0];

  useEffect(() => {
    const handlePointerEnd = () => {
      isPaintingSeatsRef.current = false;
      activePointerIdRef.current = null;
      paintedSeatIdsRef.current.clear();
    };

    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);

    return () => {
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, []);

  useEffect(() => {
    if (!isGuideOpen) {
      return;
    }

    const handlePointerDownOutside = (event: PointerEvent) => {
      if (!guidePopoverRef.current?.contains(event.target as Node)) {
        setIsGuideOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDownOutside);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDownOutside);
    };
  }, [isGuideOpen]);

  const applySeatTool = (seatId: string) => {
    setDraftSeatPolicy((current) => {
      if (current[seatId] === selectedTool) {
        return current;
      }

      return {
        ...current,
        [seatId]: selectedTool,
      };
    });
    setLastEditedSeatId(seatId);
  };

  const handleSeatPointerDown = (seatId: string, event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.stopPropagation();

    isPaintingSeatsRef.current = true;
    activePointerIdRef.current = event.pointerId;
    paintedSeatIdsRef.current = new Set([seatId]);
    applySeatTool(seatId);
  };

  const handleSeatPointerEnter = (seatId: string, event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPaintingSeatsRef.current || activePointerIdRef.current !== event.pointerId) {
      return;
    }

    if (paintedSeatIdsRef.current.has(seatId)) {
      return;
    }

    paintedSeatIdsRef.current.add(seatId);
    applySeatTool(seatId);
  };

  const handleSeatPointerUp = (_seatId: string, event: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    isPaintingSeatsRef.current = false;
    activePointerIdRef.current = null;
    paintedSeatIdsRef.current.clear();
  };

  const handleReset = () => {
    setDraftSeatPolicy(createDefaultAgencySeatPolicy());
    setSelectedTool('VIP');
    setLastEditedSeatId(null);
  };

  const handleConfirm = () => {
    onConfirm(draftSeatPolicy);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="좌석 등급 설정"
      description="좌석을 클릭하거나 드래그하면 현재 선택한 등급 또는 비활성 상태가 즉시 적용됩니다."
      cancelText="닫기"
      confirmText="적용하기"
      onCancel={onClose}
      onConfirm={handleConfirm}
      className="!max-w-[1180px] !overflow-hidden !rounded-[32px] !p-0"
    >
      <div className="mt-4 w-full text-left">
        <div className="grid max-h-[72vh] overflow-hidden border-t border-slate-200 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="relative h-[420px] bg-slate-100 lg:h-[640px]">
            <InteractiveMapViewer showZoomControls={true}>
              <Stage_4001
                seatsData={seatMapData}
                onSeatPointerDown={handleSeatPointerDown}
                onSeatPointerEnter={handleSeatPointerEnter}
                onSeatPointerUp={handleSeatPointerUp}
                className="!rounded-none !bg-white !shadow-none"
              />
            </InteractiveMapViewer>
            <div ref={guidePopoverRef} className="absolute left-4 top-4 z-20">
              <button
                type="button"
                className="flex items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-4 py-3 text-sm font-bold text-gray-800 shadow-lg backdrop-blur-sm transition hover:scale-105"
                aria-expanded={isGuideOpen}
                aria-haspopup="dialog"
                onClick={() => setIsGuideOpen((current) => !current)}
              >
                작업 가이드
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`text-gray-500 transition-transform ${isGuideOpen ? 'rotate-180' : ''}`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {isGuideOpen ? (
                <div className="mt-3 w-[320px] rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-[0_18px_46px_rgba(15,23,42,0.12)] backdrop-blur-sm">
                  <div className="space-y-2">
                    {seatEditingGuide.map((item, index) => (
                      <div key={item} className="flex gap-3 text-sm text-slate-600">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-black text-blue-700">
                          {index + 1}
                        </span>
                        <p className="font-medium leading-5">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex max-h-[360px] flex-col gap-5 overflow-y-auto border-t border-slate-200 bg-white p-6 lg:max-h-[640px] lg:border-l lg:border-t-0">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-black text-slate-900">현재 편집 도구</p>
              <div className="mt-3 flex items-center gap-2">
                <Badge color={activeTool.badgeColor}>{activeTool.label}</Badge>
                {lastEditedSeatId ? (
                  <span className="text-sm font-semibold text-slate-500">마지막 수정: {lastEditedSeatId}</span>
                ) : (
                  <span className="text-sm font-semibold text-slate-500">아직 수정한 좌석이 없습니다.</span>
                )}
              </div>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                {activeTool.description}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-slate-900">좌석 도구</p>
                <button
                  type="button"
                  className="text-sm font-bold text-blue-600 transition hover:text-blue-700"
                  onClick={handleReset}
                >
                  기본 배치 복원
                </button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {seatToolOptions.map((tool) => {
                  const isSelected = tool.key === selectedTool;
                  const selectedClass =
                    tool.key === 'disabled'
                      ? 'border-slate-400 bg-slate-200 shadow-[0_12px_24px_rgba(148,163,184,0.18)]'
                      : 'border-blue-500 bg-blue-50 shadow-[0_12px_24px_rgba(59,130,246,0.12)]';

                  return (
                    <button
                      key={tool.key}
                      type="button"
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        isSelected
                          ? selectedClass
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                      onClick={() => setSelectedTool(tool.key)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-black text-slate-900">{tool.label}</span>
                        <Badge color={tool.badgeColor} variant={isSelected ? 'fill' : 'outline'} size="small">
                          적용
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
                        {tool.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-sm font-black text-slate-900">배치 요약</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <Badge color="red" size="small">VIP</Badge>
                    <span className="text-sm font-black text-slate-950">{seatPolicySummary.vip}석</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <Badge color="blue" size="small">R석</Badge>
                    <span className="text-sm font-black text-slate-950">{seatPolicySummary.r}석</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <Badge color="green" size="small">S석</Badge>
                    <span className="text-sm font-black text-slate-950">{seatPolicySummary.s}석</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <Badge color="grey" size="small">A석</Badge>
                    <span className="text-sm font-black text-slate-950">{seatPolicySummary.a}석</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <Badge color="grey" variant="outline" size="small">비활성</Badge>
                    <span className="text-sm font-black text-slate-950">{seatPolicySummary.disabled}석</span>
                  </div>
                </div>
              </div>
            </div>

            <Button color="dark" variant="weak" size="medium" display="block" onClick={handleReset}>
              기본 배치로 다시 시작
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
