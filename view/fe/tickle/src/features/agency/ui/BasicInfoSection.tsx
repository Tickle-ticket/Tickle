'use client';
import type { ChangeEvent, Dispatch, ReactNode, RefObject, SetStateAction } from 'react';
import type { RegistrationErrorTarget } from '@/src/features/agency/model/registrationTypes';
import type { TicketSchedulePreview } from '@/src/features/agency/model/registrationTypes';
import type { VenueOption } from '@/src/features/agency/model/registrationTypes';
import type { AgencyVenueTemplate } from '@/src/shared/api/types/agency.types';
import { Box } from '@/src/shared/components/Box';
import { Input } from '@/src/shared/components/Input';
import { Badge } from '@/src/shared/components/Badge';
import { SegmentedControl } from '@/src/shared/components/SegmentedControl';
import { DateTimeTriggerField } from '@/src/features/agency/ui/DateTimeTriggerField';
import { TicketScheduleRuleField } from '@/src/features/agency/ui/TicketScheduleRuleField';
import type { TicketScheduleRule } from '@/src/features/agency/model/registrationTypes';
import { formatDateTimeLabel, formatScheduleDateTimePreviewLabel } from '@/src/features/agency/model/registrationHelpers';

/**
 * 기본 정보(공연명·기간·공연장·카테고리)와 티켓 일정 기준 섹션입니다.
 *
 * <p>두 블록이 같은 래퍼를 공유합니다. 1단계에서는 기본 정보만, 2단계에서는
 * 티켓 기준만 보이도록 래퍼가 display와 order를 함께 정하기 때문에 나눌 수
 * 없습니다.</p>
 */
export const BasicInfoSection = ({
  activeRegistrationStep,
  activeTicketSchedulePreviews,
  basicInfoBlockRef,
  categoryBlockRef,
  categoryListErrorMessage,
  categoryOptions,
  clearRegistrationFieldError,
  getBasicInfoSectionHighlightClass,
  getRegistrationBlockHighlightClass,
  getRegistrationFieldErrorClass,
  handlePerformanceCloseInputChange,
  handlePerformanceOpenInputChange,
  hasInvalidTicketWindow,
  hasTicketWindowAfterScheduleStart,
  hashtagSection,
  isCategoryListLoading,
  isVenueOpen,
  performanceCloseAt,
  performanceCloseInputValue,
  performanceDateBlockRef,
  performanceOpenAt,
  performanceOpenInputValue,
  performanceTitle,
  performanceTitleBlockRef,
  registrationFieldErrorTarget,
  resolvedSelectedVenue,
  selectedCategoryId,
  selectedVenueInfo,
  setIsPerformanceDateModalOpen,
  setIsSeatPolicyDirty,
  setIsVenueOpen,
  setPerformanceCloseInputValue,
  setPerformanceOpenInputValue,
  setPerformanceTitle,
  setSeatPolicyVenueId,
  setSeatTemplate,
  setSeatTemplateErrorMessage,
  setSelectedCategoryId,
  setSelectedVenue,
  setTicketCloseRule,
  setTicketOpenRule,
  ticketCloseRule,
  ticketOpenRule,
  ticketRuleBlockRef,
  ticketSchedulePreviewItems,
  venueBlockRef,
  venueDropdownRef,
  venueOptions,
  isVenueListLoading,
  performanceClosePlaceholder,
  performanceOpenPlaceholder,
  selectedScheduleDateKeys,
}: {
  activeRegistrationStep: number;
  activeTicketSchedulePreviews: TicketSchedulePreview[];
  basicInfoBlockRef: RefObject<HTMLDivElement | null>;
  categoryBlockRef: RefObject<HTMLDivElement | null>;
  categoryListErrorMessage: string | null;
  categoryOptions: { value: string; label: string }[];
  clearRegistrationFieldError: (target: RegistrationErrorTarget) => void;
  getBasicInfoSectionHighlightClass: () => string;
  getRegistrationBlockHighlightClass: (target: RegistrationErrorTarget) => string;
  getRegistrationFieldErrorClass: (target: RegistrationErrorTarget) => string;
  handlePerformanceCloseInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handlePerformanceOpenInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  hasInvalidTicketWindow: boolean;
  hasTicketWindowAfterScheduleStart: boolean;
  hashtagSection: ReactNode;
  isCategoryListLoading: boolean;
  isVenueOpen: boolean;
  performanceCloseAt: Date | null;
  performanceCloseInputValue: string;
  performanceDateBlockRef: RefObject<HTMLDivElement | null>;
  performanceOpenAt: Date | null;
  performanceOpenInputValue: string;
  performanceTitle: string;
  performanceTitleBlockRef: RefObject<HTMLDivElement | null>;
  registrationFieldErrorTarget: RegistrationErrorTarget | null;
  resolvedSelectedVenue: number | null;
  selectedCategoryId: string;
  selectedVenueInfo?: VenueOption;
  setIsPerformanceDateModalOpen: Dispatch<SetStateAction<boolean>>;
  setIsSeatPolicyDirty: Dispatch<SetStateAction<boolean>>;
  setIsVenueOpen: Dispatch<SetStateAction<boolean>>;
  setPerformanceCloseInputValue: Dispatch<SetStateAction<string>>;
  setPerformanceOpenInputValue: Dispatch<SetStateAction<string>>;
  setPerformanceTitle: Dispatch<SetStateAction<string>>;
  setSeatPolicyVenueId: Dispatch<SetStateAction<number | null>>;
  setSeatTemplate: Dispatch<SetStateAction<AgencyVenueTemplate | null>>;
  setSeatTemplateErrorMessage: Dispatch<SetStateAction<string | null>>;
  setSelectedCategoryId: Dispatch<SetStateAction<string>>;
  setSelectedVenue: Dispatch<SetStateAction<number | null>>;
  setTicketCloseRule: Dispatch<SetStateAction<TicketScheduleRule>>;
  setTicketOpenRule: Dispatch<SetStateAction<TicketScheduleRule>>;
  ticketCloseRule: TicketScheduleRule;
  ticketOpenRule: TicketScheduleRule;
  ticketRuleBlockRef: RefObject<HTMLDivElement | null>;
  ticketSchedulePreviewItems: TicketSchedulePreview[];
  venueBlockRef: RefObject<HTMLDivElement | null>;
  venueDropdownRef: RefObject<HTMLDivElement | null>;
  venueOptions: VenueOption[];
  isVenueListLoading: boolean;
  performanceClosePlaceholder: string;
  performanceOpenPlaceholder: string;
  selectedScheduleDateKeys: string[];
}) => (
  <div
    ref={basicInfoBlockRef}
    className={`rounded-[20px] ${getBasicInfoSectionHighlightClass()}`}
    style={{
      display:
        activeRegistrationStep === 0 || activeRegistrationStep === 1
          ? undefined
          : 'none',
      order: activeRegistrationStep === 0 ? 1 : activeRegistrationStep === 1 ? 2 : undefined,
    }}
  >
    <Box
      variant="shadow"
      className="space-y-4"
    >
      <div
        className="flex flex-wrap items-center justify-between gap-3"
        style={{ display: activeRegistrationStep === 0 ? undefined : 'none' }}
      >
        <div>
          <h2 className="text-[18px] font-black text-slate-950">기본 정보</h2>
        </div>
      </div>

      <div
        className="grid gap-5 md:grid-cols-2"
        style={{ display: activeRegistrationStep === 0 ? undefined : 'none' }}
      >
      <div
        ref={performanceTitleBlockRef}
        className={`rounded-2xl ${getRegistrationBlockHighlightClass('performanceTitle')}`}
      >
        <Input
          label="공연명"
          value={performanceTitle}
          onChange={(event) => {
            setPerformanceTitle(event.target.value);
            clearRegistrationFieldError('performanceTitle');
          }}
          placeholder="공연 제목을 입력해 주세요"
          fullWidth
          className={`[&_input]:text-[20px] [&_input]:tracking-[0.08em] sm:[&_input]:text-[22px] ${getRegistrationFieldErrorClass('performanceTitle')}`}
        />
      </div>

      <div
        ref={venueBlockRef}
        className={`flex flex-col gap-1 rounded-2xl ${getRegistrationBlockHighlightClass('venue')}`}
      >
        <span className="mb-1 text-[13px] font-medium text-content-tertiary">공연장</span>
        <div className="relative" ref={venueDropdownRef}>
          <button
            type="button"
            className={`flex w-full items-center justify-between border-b-[2px] bg-transparent py-1 text-[20px] text-content outline-none transition-colors sm:text-[22px] ${
              registrationFieldErrorTarget === 'venue'
                ? 'border-danger'
                : isVenueOpen
                  ? 'border-primary'
                  : 'border-line-strong'
            }`}
            disabled={isVenueListLoading || venueOptions.length === 0}
            aria-expanded={isVenueOpen}
            aria-haspopup="listbox"
            onClick={() => setIsVenueOpen((current) => !current)}
          >
            <span className="truncate text-left">{selectedVenueInfo?.label}</span>
            <svg
              className={`ml-3 h-5 w-5 shrink-0 transition-transform ${
                isVenueOpen ? 'rotate-180 text-primary' : 'text-content-muted'
              }`}
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.512a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {isVenueOpen ? (
            <div
              className="absolute left-0 top-full z-20 mt-3 w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_18px_46px_rgba(15,23,42,0.12)]"
              role="listbox"
            >
                <div className="max-h-72 overflow-y-auto p-2">
                {venueOptions.map((venue) => {
                  const isSelected = venue.value === resolvedSelectedVenue;

                  return (
                    <button
                      key={venue.value}
                      type="button"
                      className={`w-full rounded-xl px-4 py-2.5 text-left transition-colors ${
                        isSelected
                          ? 'bg-primary-subtle text-primary-hover'
                          : 'text-content-secondary hover:bg-surface-subtle'
                      }`}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        setSelectedVenue(venue.value);
                        setSeatTemplate(null);
                        setSeatTemplateErrorMessage(null);
                        setSeatPolicyVenueId(null);
                        setIsSeatPolicyDirty(false);
                        setIsVenueOpen(false);
                        clearRegistrationFieldError('venue');
                      }}
                    >
                      <p className="text-sm font-black">{venue.label}</p>
                      {venue.region || venue.capacity ? (
                        <p className="mt-1 text-xs font-medium text-content-tertiary">
                          {[venue.region, venue.capacity].filter(Boolean).join(' / ')}
                        </p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div
        ref={performanceDateBlockRef}
        className={`md:col-span-2 grid gap-5 rounded-3xl md:grid-cols-2 ${getRegistrationBlockHighlightClass('performanceDate')}`}
      >
        <div className="space-y-5">
          <DateTimeTriggerField
            label="공연 오픈일"
            value={performanceOpenInputValue}
            onChange={handlePerformanceOpenInputChange}
            onBlur={() =>
              setPerformanceOpenInputValue(performanceOpenAt ? formatDateTimeLabel(performanceOpenAt) : '')
            }
            onOpen={() => setIsPerformanceDateModalOpen(true)}
            placeholder={performanceOpenPlaceholder}
            hasError={registrationFieldErrorTarget === 'performanceDate'}
          />

          <div
            ref={categoryBlockRef}
            className={`flex min-h-[268px] flex-col rounded-3xl border bg-surface p-5 shadow-[0_16px_40px_rgba(15,23,42,0.04)] ${
              registrationFieldErrorTarget === 'category' ? 'border-danger' : 'border-line'
            } ${getRegistrationBlockHighlightClass('category')}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-content-tertiary">카테고리</p>
              </div>
            </div>
            <SegmentedControl
              options={categoryOptions}
              value={selectedCategoryId}
              onChange={(nextCategoryId) => {
                setSelectedCategoryId(nextCategoryId);
                clearRegistrationFieldError('category');
              }}
              columns={Math.min(Math.max(categoryOptions.length, 1), 3)}
              rows={Math.max(1, Math.ceil(categoryOptions.length / 3))}
              size="large"
              isLoading={isCategoryListLoading}
              className="mt-2 flex-1"
            />
            {categoryListErrorMessage ? (
              <p className="mt-3 text-sm font-medium text-danger">{categoryListErrorMessage}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-5">
          <DateTimeTriggerField
            label="공연 종료일"
            value={performanceCloseInputValue}
            onChange={handlePerformanceCloseInputChange}
            onBlur={() =>
              setPerformanceCloseInputValue(performanceCloseAt ? formatDateTimeLabel(performanceCloseAt) : '')
            }
            onOpen={() => setIsPerformanceDateModalOpen(true)}
            placeholder={performanceClosePlaceholder}
            hasError={registrationFieldErrorTarget === 'performanceDate'}
          />

          {hashtagSection}
        </div>
      </div>
    </div>

    <div
      className="space-y-5"
      style={{ display: activeRegistrationStep === 1 ? undefined : 'none' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[18px] font-black text-slate-950">티켓 일정 기준</p>
        </div>
      </div>

        <div
          ref={ticketRuleBlockRef}
          className={`mt-5 grid gap-4 rounded-3xl xl:grid-cols-2 ${getRegistrationBlockHighlightClass('ticketRule')}`}
        >
          <TicketScheduleRuleField
            label="티켓 오픈 기준"
            rule={ticketOpenRule}
            onDaysChange={(days) =>
              {
                setTicketOpenRule((current) => ({ ...current, days }));
                clearRegistrationFieldError('ticketRule');
              }
            }
            hasError={registrationFieldErrorTarget === 'ticketRule' && ticketOpenRule.days.trim().length === 0}
          />

          <TicketScheduleRuleField
            label="티켓 종료 기준"
            rule={ticketCloseRule}
            onDaysChange={(days) =>
              {
                setTicketCloseRule((current) => ({ ...current, days }));
                clearRegistrationFieldError('ticketRule');
              }
            }
            hasError={registrationFieldErrorTarget === 'ticketRule' && ticketCloseRule.days.trim().length === 0}
          />
        </div>

        <div className="mt-5 rounded-3xl border border-line bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-content-tertiary">
                {selectedScheduleDateKeys.length > 0 ? '선택한 회차 미리보기' : '등록 회차 미리보기'}
              </p>
            </div>
            <Badge color="grey" variant="outline">
              {activeTicketSchedulePreviews.length}회차 기준
            </Badge>
          </div>

          {ticketSchedulePreviewItems.length > 0 ? (
            <div className="mt-4 space-y-3">
              {ticketSchedulePreviewItems.map((preview) => (
                <div
                  key={preview.id}
                  className="rounded-3xl border border-line bg-surface-subtle px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-950">
                        공연 {formatScheduleDateTimePreviewLabel(preview.scheduleAt)}
                      </p>
                      <p className="mt-1 text-xs font-medium text-content-muted">
                        회차 시간 {preview.timeValue}
                      </p>
                      <p className="mt-1 text-xs font-medium text-content-muted">
                        공연 종료 {formatDateTimeLabel(preview.sessionEndAt)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-surface px-4 py-3 ring-1 ring-black/5">
                      <p className="text-xs font-bold tracking-[0.08em] text-content-muted">티켓 오픈</p>
                      <p className="mt-2 text-sm font-black text-slate-950">
                        {formatDateTimeLabel(preview.ticketOpenAt)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-surface px-4 py-3 ring-1 ring-black/5">
                      <p className="text-xs font-bold tracking-[0.08em] text-content-muted">티켓 종료</p>
                      <p className="mt-2 text-sm font-black text-slate-950">
                        {formatDateTimeLabel(preview.ticketCloseAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-line bg-surface-subtle px-4 py-5 text-sm font-medium leading-6 text-content-muted">
              회차 없음
            </div>
          )}

          {hasInvalidTicketWindow ? (
            <div className="mt-4 rounded-2xl border border-danger-light bg-danger-subtle px-4 py-3 text-sm font-medium leading-6 text-danger">
              현재 기준에서는 일부 회차의 티켓 오픈일이 종료일보다 늦습니다. 오픈/종료 기준을 다시 조정해 주세요.
            </div>
          ) : null}

          {hasTicketWindowAfterScheduleStart ? (
            <div className="mt-4 rounded-2xl border border-warning-light bg-warning-subtle px-4 py-3 text-sm font-medium leading-6 text-warning-hover">
              일부 회차는 현재 설정대로면 티켓 오픈 또는 종료가 회차 시작 이후입니다. 기준을 다시 확인해 주세요.
            </div>
          ) : null}
        </div>
      </div>
    </Box>
  </div>
);
