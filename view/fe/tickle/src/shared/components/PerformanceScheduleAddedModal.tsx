import { Badge } from './Badge';
import { Modal } from './Modal';

export interface PerformanceScheduleAddedModalProps {
  isOpen: boolean;
  onClose: () => void;
  addedTime: string;
  addedDateLabels: string[];
}

const formatDateSummary = (dateLabels: string[]) => {
  if (dateLabels.length <= 3) {
    return dateLabels.join(' · ');
  }

  return `${dateLabels.slice(0, 3).join(' · ')} 외 ${dateLabels.length - 3}일`;
};

export function PerformanceScheduleAddedModal({
  isOpen,
  onClose,
  addedTime,
  addedDateLabels,
}: PerformanceScheduleAddedModalProps) {
  const addedDateCount = addedDateLabels.length;
  const dateSummary = formatDateSummary(addedDateLabels);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onClose}
      confirmText="확인"
      showCancelButton={false}
      title="회차가 추가되었습니다"
      description={`${addedTime} 회차를 선택한 일정에 반영했습니다.`}
      className="!max-w-[420px] !rounded-[28px] !px-6 !py-6"
    >
      <div className="mt-2 w-full text-left">
        <div className="rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,rgba(239,246,255,0.92)_0%,rgba(255,255,255,0.98)_100%)] p-4 ring-1 ring-blue-100/80">
          <div className="flex flex-wrap gap-2">
            <Badge color="blue" size="small">
              {addedTime}
            </Badge>
            <Badge color="grey" size="small">
              {addedDateCount}일 반영
            </Badge>
          </div>

          <p className="mt-3 text-sm font-black text-slate-950">
            {addedDateCount > 1
              ? `${addedDateCount}개 날짜에 같은 회차를 한 번에 추가했어요.`
              : '선택한 날짜에 회차를 추가했어요.'}
          </p>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
            {dateSummary || '등록된 공연 시간에서 바로 확인할 수 있습니다.'}
          </p>
        </div>
      </div>
    </Modal>
  );
}

export default PerformanceScheduleAddedModal;
