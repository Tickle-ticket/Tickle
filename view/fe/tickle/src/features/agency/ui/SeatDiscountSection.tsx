'use client';

import type { useSeatPricing } from '@/src/features/agency/hooks/useSeatPricing';
import type { RefObject } from 'react';
import type { RegistrationErrorTarget } from '@/src/features/agency/model/registrationTypes';
import { Box } from '@/src/shared/components/Box';
import { Input } from '@/src/shared/components/Input';
import { Button } from '@/src/shared/components/Button';
import { DiscountPresetSelectField } from '@/src/features/agency/ui/DiscountPresetSelectField';

/**
 * 좌석 할인 설정 섹션입니다.
 */
export const SeatDiscountSection = ({
  pricing,
  activeRegistrationStep,
  discountBlockRef,
  getRegistrationBlockHighlightClass,
}: {
  pricing: ReturnType<typeof useSeatPricing>;
  activeRegistrationStep: number;
  discountBlockRef: RefObject<HTMLDivElement | null>;
  getRegistrationBlockHighlightClass: (target: RegistrationErrorTarget) => string;
}) => (
  <Box
    variant="shadow"
    className="space-y-5 !overflow-visible"
    style={{ display: activeRegistrationStep === 2 ? undefined : 'none' }}
  >
    <div
      ref={discountBlockRef}
      className={`flex flex-col gap-4 rounded-3xl lg:flex-row lg:items-end lg:justify-between ${getRegistrationBlockHighlightClass('discount')}`}
    >
      <div>
        <h2 className="text-[18px] font-black text-slate-950">
          {'할인 정보'}
        </h2>
      </div>
      <Button
        color="primary"
        variant="weak"
        size="medium"
        onClick={pricing.handleSeatDiscountAdd}
      >
        {'할인 추가'}
      </Button>
    </div>

    {pricing.seatDiscounts.length > 0 ? (
      <div className="space-y-4">
        {pricing.seatDiscounts.map((discount, index) => (
          <div
            key={discount.id}
            className="rounded-3xl border border-line bg-surface-subtle p-4"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1 space-y-4">
                <p className="text-sm font-bold text-content-tertiary">
                  {`할인 ${index + 1}`}
                </p>

                <DiscountPresetSelectField
                  value={discount.preset}
                  onChange={(preset) =>
                    pricing.handleSeatDiscountPresetChange(discount.id, preset)
                  }
                />

                <div className={`grid gap-4 ${discount.preset === 'custom' ? 'md:grid-cols-2' : ''}`}>
                  {discount.preset === 'custom' ? (
                    <Input
                      label={'할인명'}
                      fullWidth
                      value={discount.customDiscountName}
                      onChange={pricing.handleSeatDiscountChange(
                        discount.id,
                        'customDiscountName',
                      )}
                      placeholder={'할인명 입력'}
                    />
                  ) : null}

                  <Input
                    label={'할인율 (%)'}
                    fullWidth
                    inputMode="numeric"
                    value={discount.discountRate}
                    onChange={pricing.handleSeatDiscountChange(discount.id, 'discountRate')}
                    maxLength={3}
                    placeholder={'1-100'}
                  />
                </div>
              </div>

              <Button
                color="dark"
                variant="weak"
                size="medium"
                onClick={() => pricing.handleSeatDiscountRemove(discount.id)}
              >
                {'삭제'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="rounded-2xl border border-dashed border-line bg-surface-subtle px-4 py-5 text-sm font-medium leading-6 text-content-tertiary">
        할인 없음
      </div>
    )}
  </Box>
);
