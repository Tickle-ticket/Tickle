'use client';

import { Badge } from '@/src/shared/components/Badge';
import type { TicketScheduleRule } from '@/src/features/agency/model/registrationTypes';
import { parseOffsetDayValue } from '@/src/features/agency/model/registrationHelpers';

/**
 * 티켓 오픈·마감을 공연일 기준 며칠 전으로 정하는 필드입니다.
 */
export function TicketScheduleRuleField({
  label,
  rule,
  onDaysChange,
  hasError = false,
}: {
  label: string;
  rule: TicketScheduleRule;
  onDaysChange: (days: string) => void;
  hasError?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-line bg-surface p-5 shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-base font-black text-slate-950">{label}</p>
        </div>
        {rule.days ? (
          <Badge color="blue" variant="outline">
            공연일 {rule.days}일 전
          </Badge>
        ) : null}
      </div>

      <div className="mt-4">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-bold tracking-[0.08em] text-content-muted">공연일 기준 일수</span>
          <input
            type="number"
            min={0}
            step={1}
            value={rule.days}
            onChange={(event) => onDaysChange(parseOffsetDayValue(event.target.value))}
            placeholder="예: 14"
            className={`rounded-2xl border bg-surface-subtle px-4 py-3 text-sm font-semibold text-content outline-none transition focus:ring-4 ${
              hasError
                ? 'border-danger focus:border-danger focus:ring-danger-light'
                : 'border-line focus:border-primary focus:ring-primary-light'
            }`}
          />
        </label>
      </div>
    </div>
  );
}
