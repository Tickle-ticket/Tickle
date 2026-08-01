'use client';

import type { useSeatPricing } from '@/src/features/agency/hooks/useSeatPricing';
import type { RefObject } from 'react';
import type { RegistrationErrorTarget } from '@/src/features/agency/model/registrationTypes';
import { Box } from '@/src/shared/components/Box';
import { Input } from '@/src/shared/components/Input';
import { Badge } from '@/src/shared/components/Badge';
import { seatGradeFields } from '@/src/features/agency/model/registrationHelpers';

/**
 * 판매 정책(좌석 등급별 금액) 섹션입니다.
 */
export const SalesPolicySection = ({
  pricing,
  activeRegistrationStep,
  formatSeatPriceInput,
  getRegistrationSectionHighlightClass,
  registrationFieldErrorTarget,
  seatPriceBlockRef,
  seatPriceSectionRef,
}: {
  pricing: ReturnType<typeof useSeatPricing>;
  activeRegistrationStep: number;
  formatSeatPriceInput: (value: string) => string;
  getRegistrationSectionHighlightClass: (target: RegistrationErrorTarget) => string;
  registrationFieldErrorTarget: RegistrationErrorTarget | null;
  seatPriceBlockRef: RefObject<HTMLDivElement | null>;
  seatPriceSectionRef: RefObject<HTMLDivElement | null>;
}) => (
  <div
    ref={seatPriceSectionRef}
    className={`rounded-[20px] ${getRegistrationSectionHighlightClass('seatPrice')}`}
    style={{ display: activeRegistrationStep === 2 ? undefined : 'none' }}
  >
    <Box
      variant="shadow"
      className="space-y-5"
    >
    <div ref={seatPriceBlockRef} className="rounded-3xl">
      <h2 className="text-[18px] font-black text-slate-950">판매 정책</h2>
    </div>

    <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex h-full flex-col gap-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-content-tertiary">좌석 금액 설정</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {seatGradeFields.map((field) => (
              <Input
                key={field.key}
                label={field.label}
                fullWidth
                inputMode="numeric"
                value={formatSeatPriceInput(pricing.seatPrices[field.key])}
                onChange={pricing.handleSeatPriceChange(field.key)}
                placeholder="금액 입력"
                className={`[&_input]:text-[20px] [&_input]:tracking-[0.08em] sm:[&_input]:text-[22px] ${
                  registrationFieldErrorTarget === 'seatPrice' && pricing.seatPrices[field.key].trim().length === 0
                    ? '[&_input]:border-danger [&_input]:focus:border-danger'
                    : ''
                }`}
              />
            ))}
          </div>
        </div>

      </div>

      <div className="rounded-3xl border border-line bg-surface-subtle p-4">
        <p className="text-sm font-bold text-content-tertiary">좌석 금액 요약</p>

        <div className="mt-3 space-y-2.5">
          {pricing.seatPriceSummary.map((field) => (
            <div
              key={field.key}
              className="rounded-2xl bg-surface px-4 py-3 ring-1 ring-black/5"
            >
              <div className="flex items-center justify-between gap-3">
                <Badge color={field.badgeColor} size="small">
                  {field.label}
                </Badge>
                <span className="text-sm font-black text-slate-950">
                  {pricing.seatPrices[field.key].trim().length > 0 ? `₩${field.formattedValue}` : '미입력'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    </Box>
  </div>

);
