'use client';

import { useMemo, useState, type ChangeEvent } from 'react';
import type {
  RegistrationErrorTarget,
  SeatDiscountDraft,
  SeatGradeKey,
} from '@/src/features/agency/model/registrationTypes';
import {
  createSeatDiscountDraft,
  seatGradeFields,
} from '@/src/features/agency/model/registrationHelpers';

/**
 * 좌석 등급별 금액과 할인 목록을 다룹니다.
 *
 * @param clearFieldError 값을 고치면 해당 필드의 오류 표시를 지운다
 */
export const useSeatPricing = ({
  clearFieldError,
}: {
  clearFieldError: (target: RegistrationErrorTarget) => void;
}) => {
  const [seatPrices, setSeatPrices] = useState<Record<SeatGradeKey, string>>({
    vip: '',
    r: '',
    s: '',
    a: '',
  });
  const [seatDiscounts, setSeatDiscounts] = useState<SeatDiscountDraft[]>([]);

  const seatPriceSummary = useMemo(
    () =>
      seatGradeFields.map((field) => ({
        ...field,
        formattedValue:
          seatPrices[field.key].length > 0
            ? new Intl.NumberFormat('ko-KR').format(Number(seatPrices[field.key]))
            : '0',
      })),
    [seatPrices],
  );

  const handleSeatPriceChange =
    (priceGrade: SeatGradeKey) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const digitsOnly = event.target.value.replace(/\D/g, '');

      setSeatPrices((current) => ({
        ...current,
        [priceGrade]: digitsOnly,
      }));
      clearFieldError('seatPrice');
    };

  const handleSeatDiscountAdd = () => {
    setSeatDiscounts((current) => [...current, createSeatDiscountDraft()]);
  };

  const handleSeatDiscountChange =
    (discountId: string, field: 'customDiscountName' | 'discountRate') =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = (() => {
        if (field !== 'discountRate') {
          return event.target.value;
        }

        const digitsOnly = event.target.value.replace(/\D/g, '');
        if (digitsOnly.length === 0) {
          return '';
        }

        return String(Math.min(Number(digitsOnly), 100));
      })();

      setSeatDiscounts((current) =>
        current.map((discount) =>
          discount.id === discountId
            ? {
                ...discount,
                [field]: nextValue,
              }
            : discount,
        ),
      );
    };

  const handleSeatDiscountPresetChange = (
    discountId: string,
    preset: SeatDiscountDraft['preset'],
  ) => {
    setSeatDiscounts((current) =>
      current.map((discount) =>
        discount.id === discountId
          ? {
              ...discount,
              preset,
              customDiscountName: preset === 'custom' ? discount.customDiscountName : '',
            }
          : discount,
      ),
    );
  };

  const handleSeatDiscountRemove = (discountId: string) => {
    setSeatDiscounts((current) => current.filter((discount) => discount.id !== discountId));
  };

  return {
    seatPrices,
    seatDiscounts,
    seatPriceSummary,
    handleSeatPriceChange,
    handleSeatDiscountAdd,
    handleSeatDiscountChange,
    handleSeatDiscountPresetChange,
    handleSeatDiscountRemove,
  };
};
