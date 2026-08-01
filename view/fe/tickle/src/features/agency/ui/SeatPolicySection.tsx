'use client';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { RegistrationErrorTarget } from '@/src/features/agency/model/registrationTypes';
import { getAgencySeatPolicySummary } from '@/src/shared/components/AgencySeatPolicyModal';
import { Box } from '@/src/shared/components/Box';
import { Button } from '@/src/shared/components/Button';
import { Badge } from '@/src/shared/components/Badge';
import type { AgencyVenueTemplate } from '@/src/shared/api/types/agency.types';

/**
 * 좌석 등급·비활성 설정 섹션입니다.
 */
export const SeatPolicySection = ({
  activeRegistrationStep,
  getRegistrationSectionHighlightClass,
  isSeatTemplateLoading,
  registrationFieldErrorTarget,
  resolvedSelectedVenue,
  seatPolicyBlockRef,
  seatPolicySectionRef,
  seatPolicySummary,
  seatTemplateErrorMessage,
  setIsSeatPolicyModalOpen,
  loadSeatTemplate,
}: {
  activeRegistrationStep: number;
  getRegistrationSectionHighlightClass: (target: RegistrationErrorTarget) => string;
  isSeatTemplateLoading: boolean;
  registrationFieldErrorTarget: RegistrationErrorTarget | null;
  resolvedSelectedVenue: number | null;
  seatPolicy: unknown;
  seatPolicyBlockRef: RefObject<HTMLDivElement | null>;
  seatPolicySectionRef: RefObject<HTMLDivElement | null>;
  seatPolicySummary: ReturnType<typeof getAgencySeatPolicySummary>;
  seatTemplateErrorMessage: string | null;
  setIsSeatPolicyModalOpen: Dispatch<SetStateAction<boolean>>;
  loadSeatTemplate: (venueId: number) => Promise<AgencyVenueTemplate>;
}) => (
  <div
    ref={seatPolicySectionRef}
    className={`rounded-[20px] ${getRegistrationSectionHighlightClass('seatPolicy')}`}
    style={{ display: activeRegistrationStep === 2 ? undefined : 'none' }}
  >
    <Box
      variant="shadow"
      className="space-y-5"
    >
    <div
      ref={seatPolicyBlockRef}
      className="flex flex-col gap-4 rounded-3xl lg:flex-row lg:items-end lg:justify-between"
    >
      <div>
        <h2 className="text-[18px] font-black text-slate-950">좌석 등급/비활성 설정</h2>
        {seatTemplateErrorMessage ? (
          <p className="mt-2 text-xs font-semibold text-danger">
            {seatTemplateErrorMessage}
          </p>
        ) : null}
      </div>
      <Button
        color="primary"
        variant="weak"
        size="medium"
        className={registrationFieldErrorTarget === 'seatPolicy' ? 'border border-danger' : ''}
        isLoading={isSeatTemplateLoading}
        onClick={async () => {
          setIsSeatPolicyModalOpen(true);

          if (resolvedSelectedVenue !== null) {
            try {
              await loadSeatTemplate(resolvedSelectedVenue);
            } catch {
              // Keep the modal usable even when template loading fails.
            }
          }
        }}
      >
        좌석 등급 설정 열기
      </Button>
    </div>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      <div className="rounded-3xl border border-danger-light bg-danger-subtle/70 p-5">
        <div className="flex items-center">
          <Badge color="red" size="small">VIP</Badge>
        </div>
        <p className="mt-4 whitespace-nowrap text-[28px] font-black tracking-tight text-slate-950">
          {seatPolicySummary.vip}
          <span className="ml-1 text-lg font-bold text-content-tertiary">석</span>
        </p>
      </div>

      <div className="rounded-3xl border border-primary-light bg-primary-subtle/70 p-5">
        <div className="flex items-center">
          <Badge color="blue" size="small">R석</Badge>
        </div>
        <p className="mt-4 whitespace-nowrap text-[28px] font-black tracking-tight text-slate-950">
          {seatPolicySummary.r}
          <span className="ml-1 text-lg font-bold text-content-tertiary">석</span>
        </p>
      </div>

      <div className="rounded-3xl border border-success-light bg-success-subtle/70 p-5">
        <div className="flex items-center">
          <Badge color="green" size="small">S석</Badge>
        </div>
        <p className="mt-4 whitespace-nowrap text-[28px] font-black tracking-tight text-slate-950">
          {seatPolicySummary.s}
          <span className="ml-1 text-lg font-bold text-content-tertiary">석</span>
        </p>
      </div>

      <div className="rounded-3xl border border-line bg-surface-subtle p-5">
        <div className="flex items-center">
          <Badge color="grey" size="small">A석</Badge>
        </div>
        <p className="mt-4 whitespace-nowrap text-[28px] font-black tracking-tight text-slate-950">
          {seatPolicySummary.a}
          <span className="ml-1 text-lg font-bold text-content-tertiary">석</span>
        </p>
      </div>

      <div className="rounded-3xl border border-line-strong bg-surface p-5">
        <div className="flex items-center">
          <Badge color="grey" variant="outline" size="small">비활성</Badge>
        </div>
        <p className="mt-4 whitespace-nowrap text-[28px] font-black tracking-tight text-slate-950">
          {seatPolicySummary.disabled}
          <span className="ml-1 text-lg font-bold text-content-tertiary">석</span>
        </p>
      </div>
    </div>
    </Box>
  </div>

);
