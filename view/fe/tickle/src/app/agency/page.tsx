'use client';

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  AgencySeatPolicyModal,
  getAgencySeatPolicySummary,
} from '@/src/shared/components/AgencySeatPolicyModal';
import { submitAgencyEventRegistration } from '@/src/shared/api/agencyApi';
import type {
} from '@/src/shared/api/types/agency.types';
import { ApiError } from '@/src/shared/api/types';
import { useVenues } from '@/src/shared/api/useVenues';
import { Box } from '@/src/shared/components/Box';
import { Button } from '@/src/shared/components/Button';
import { STAGE_4001_SEAT_IDS } from '@/src/shared/components/Stage_4001';
import { useScheduleDraft } from '@/src/features/agency/hooks/useScheduleDraft';
import { useRegistrationImages } from '@/src/features/agency/hooks/useRegistrationImages';
import { useSeatPricing } from '@/src/features/agency/hooks/useSeatPricing';
import { useTicketSchedulePreview } from '@/src/features/agency/hooks/useTicketSchedulePreview';
import { usePerformancePeriod } from '@/src/features/agency/hooks/usePerformancePeriod';
import { useCategoryOptions } from '@/src/features/agency/hooks/useCategoryOptions';
import { useSeatTemplate } from '@/src/features/agency/hooks/useSeatTemplate';
import { getRegistrationStepValidationResult as validateRegistrationStep } from '@/src/features/agency/model/registrationValidation';
import { buildRegistrationRequest } from '@/src/features/agency/model/buildRegistrationRequest';
import { HashtagSection } from '@/src/features/agency/ui/HashtagSection';
import { ScheduleRegistrationSection } from '@/src/features/agency/ui/ScheduleRegistrationSection';
import { PosterContentSection } from '@/src/features/agency/ui/PosterContentSection';
import { BasicInfoSection } from '@/src/features/agency/ui/BasicInfoSection';
import { SalesPolicySection } from '@/src/features/agency/ui/SalesPolicySection';
import { SeatDiscountSection } from '@/src/features/agency/ui/SeatDiscountSection';
import { SeatPolicySection } from '@/src/features/agency/ui/SeatPolicySection';
import { AgencyPerformancePreviewModal } from '@/src/features/agency/ui/AgencyPerformancePreviewModal';
import { DateRangeModal } from '@/src/features/agency/ui/DateRangeModal';
import type {
  RegistrationErrorTarget,
  RegistrationValidationResult,
  TicketScheduleRule,
  VenueOption,
} from '@/src/features/agency/model/registrationTypes';
import {
  basicInfoErrorTargets,
  createDefaultPerformanceEndAt,
  createDefaultPerformanceStartAt,
  fallbackVenueOption,
  formatDateTimeLabel,
  registrationStepItems,
} from '@/src/features/agency/model/registrationHelpers';

export default function AgencyRegistrationPage() {
  const { data: venueList = [], isLoading: isVenueListLoading } = useVenues();
  const [activeRegistrationStep, setActiveRegistrationStep] = useState(0);
  const [performanceTitle, setPerformanceTitle] = useState('');
  const [selectedVenue, setSelectedVenue] = useState<number | null>(null);
  const [isVenueOpen, setIsVenueOpen] = useState(false);
  const [ticketOpenRule, setTicketOpenRule] = useState<TicketScheduleRule>({
    days: '',
  });
  const [ticketCloseRule, setTicketCloseRule] = useState<TicketScheduleRule>({
    days: '',
  });
  const [noticeText, setNoticeText] = useState('');
  const [performanceHashtags, setPerformanceHashtags] = useState<string[]>([]);
  const [isSeatPolicyModalOpen, setIsSeatPolicyModalOpen] = useState(false);
  const [isPerformanceDateModalOpen, setIsPerformanceDateModalOpen] = useState(false);
  const [isPerformancePreviewOpen, setIsPerformancePreviewOpen] = useState(false);
  const [isSubmittingRegistration, setIsSubmittingRegistration] = useState(false);
  const [registrationErrorMessage, setRegistrationErrorMessage] = useState<string | null>(null);
  const [registrationSuccessMessage, setRegistrationSuccessMessage] = useState<string | null>(null);
  const [highlightedRegistrationBlock, setHighlightedRegistrationBlock] = useState<RegistrationErrorTarget | null>(null);
  const [registrationFieldErrorTarget, setRegistrationFieldErrorTarget] = useState<RegistrationErrorTarget | null>(null);

  const clearRegistrationFieldError = (target: RegistrationErrorTarget) => {
    setRegistrationFieldErrorTarget((current) => (current === target ? null : current));
  };

  const [performanceOpenAt, setPerformanceOpenAt] = useState<Date | null>(null);
  const [performanceCloseAt, setPerformanceCloseAt] = useState<Date | null>(null);
  const schedule = useScheduleDraft({
    performanceOpenAt,
    performanceCloseAt,
    clearFieldError: clearRegistrationFieldError,
  });
  const {
    performanceSchedules,
    selectedScheduleDate,
    selectedScheduleDateKeys,
    selectedScheduleDateKey,
    setSelectedScheduleDate,
    setSelectedScheduleDateKeys,
    setPerformanceSchedules,
  } = schedule;
  const {
    performanceOpenInputValue,
    setPerformanceOpenInputValue,
    performanceCloseInputValue,
    setPerformanceCloseInputValue,
    performanceOpenPlaceholder,
    performanceClosePlaceholder,
    syncSchedulesToPerformanceRange,
    handlePerformanceOpenInputChange,
    handlePerformanceCloseInputChange,
  } = usePerformancePeriod({
    performanceSchedules,
    setPerformanceSchedules,
    selectedScheduleDateKeys,
    setSelectedScheduleDateKeys,
    selectedScheduleDateKey,
    setSelectedScheduleDate,
    clearRegistrationFieldError,
    performanceOpenAt,
    setPerformanceOpenAt,
    performanceCloseAt,
    setPerformanceCloseAt,
  });
  const images = useRegistrationImages({ clearFieldError: clearRegistrationFieldError });
  const { posterImage, introImages } = images;

  const pricing = useSeatPricing({ clearFieldError: clearRegistrationFieldError });
  const { seatPrices, seatDiscounts } = pricing;
  const {
    categoryOptions,
    selectedCategoryId,
    setSelectedCategoryId,
    selectedCategoryInfo,
    isCategoryListLoading,
    categoryListErrorMessage,
  } = useCategoryOptions();
  const {
    seatPolicy,
    setSeatPolicy,
    seatPolicyVenueId,
    setSeatPolicyVenueId,
    setIsSeatPolicyDirty,
    seatTemplate,
    setSeatTemplate,
    isSeatTemplateLoading,
    seatTemplateErrorMessage,
    setSeatTemplateErrorMessage,
    loadSeatTemplate,
  } = useSeatTemplate();
  const venueDropdownRef = useRef<HTMLDivElement | null>(null);
  const posterImageInputRef = useRef<HTMLInputElement | null>(null);
  const introImageInputRef = useRef<HTMLInputElement | null>(null);
  const registrationPageTopRef = useRef<HTMLDivElement | null>(null);
  const exposureContentBlockRef = useRef<HTMLDivElement | null>(null);
  const basicInfoBlockRef = useRef<HTMLDivElement | null>(null);
  const posterBlockRef = useRef<HTMLDivElement | null>(null);
  const performanceTitleBlockRef = useRef<HTMLDivElement | null>(null);
  const performanceDateBlockRef = useRef<HTMLDivElement | null>(null);
  const venueBlockRef = useRef<HTMLDivElement | null>(null);
  const categoryBlockRef = useRef<HTMLDivElement | null>(null);
  const ticketRuleBlockRef = useRef<HTMLDivElement | null>(null);
  const scheduleSectionRef = useRef<HTMLDivElement | null>(null);
  const scheduleBlockRef = useRef<HTMLDivElement | null>(null);
  const seatPriceSectionRef = useRef<HTMLDivElement | null>(null);
  const seatPolicySectionRef = useRef<HTMLDivElement | null>(null);
  const seatPolicyBlockRef = useRef<HTMLDivElement | null>(null);
  const seatPriceBlockRef = useRef<HTMLDivElement | null>(null);
  const discountBlockRef = useRef<HTMLDivElement | null>(null);
  const registrationBlockRefs: Record<RegistrationErrorTarget, RefObject<HTMLDivElement | null>> = {
    poster: exposureContentBlockRef,
    performanceTitle: basicInfoBlockRef,
    performanceDate: basicInfoBlockRef,
    venue: basicInfoBlockRef,
    category: basicInfoBlockRef,
    ticketRule: ticketRuleBlockRef,
    schedule: scheduleSectionRef,
    seatPolicy: seatPolicySectionRef,
    seatPrice: seatPriceSectionRef,
    discount: discountBlockRef,
  };

  const venueOptions = useMemo<VenueOption[]>(
    () =>
      venueList.map((venue) => ({
        value: venue.venueId,
        label: venue.venueName,
      })),
    [venueList],
  );
  const resolvedSelectedVenue = useMemo(() => {
    if (selectedVenue !== null && venueOptions.some((venue) => venue.value === selectedVenue)) {
      return selectedVenue;
    }

    return null;
  }, [selectedVenue, venueOptions]);

  const selectedDateLabel = useMemo(() => {
    if (!selectedScheduleDate) {
      return '미선택';
    }

    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    }).format(selectedScheduleDate);
  }, [selectedScheduleDate]);

  const registeredPerformanceCount = useMemo(
    () => Object.values(performanceSchedules).reduce((total, times) => total + times.length, 0),
    [performanceSchedules],
  );
  const selectedScheduleDateCount = selectedScheduleDateKeys.length;

  const selectedVenueInfo = useMemo(
    () =>
      venueOptions.find((venue) => venue.value === resolvedSelectedVenue) ??
      fallbackVenueOption,
    [resolvedSelectedVenue, venueOptions],
  );
  const performanceDateModalInitialStartAt = useMemo(
    () => performanceOpenAt ?? createDefaultPerformanceStartAt(),
    [performanceOpenAt],
  );
  const performanceDateModalInitialEndAt = useMemo(
    () => performanceCloseAt ?? createDefaultPerformanceEndAt(performanceDateModalInitialStartAt),
    [performanceCloseAt, performanceDateModalInitialStartAt],
  );

  const {
    registeredTicketSchedulePreviews,
    activeTicketSchedulePreviews,
    ticketSchedulePreviewItems,
    hasInvalidTicketWindow,
    areTicketScheduleRulesComplete,
    hasTicketWindowAfterScheduleStart,
  } = useTicketSchedulePreview({
    performanceCloseAt,
    performanceSchedules,
    ticketOpenRule,
    ticketCloseRule,
    selectedScheduleDateKeys,
  });
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!venueDropdownRef.current?.contains(event.target as Node)) {
        setIsVenueOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);


  const seatPolicySummary = useMemo(() => getAgencySeatPolicySummary(seatPolicy), [seatPolicy]);
  const seatPolicyModalKey = useMemo(
    () =>
      `${resolvedSelectedVenue ?? 'none'}:${STAGE_4001_SEAT_IDS.map((seatId) => seatPolicy[seatId] ?? 'disabled').join('|')}`,
    [resolvedSelectedVenue, seatPolicy],
  );
  const introImageCountLabel = `${introImages.length}장`;
  const isFirstRegistrationStep = activeRegistrationStep === 0;
  const isLastRegistrationStep = activeRegistrationStep === registrationStepItems.length - 1;
  const canSubmitRegistration =
    performanceTitle.trim().length > 0 &&
    performanceOpenAt !== null &&
    performanceCloseAt !== null &&
    selectedCategoryId.length > 0 &&
    resolvedSelectedVenue !== null &&
    posterImage !== null &&
    registeredTicketSchedulePreviews.length > 0 &&
    areTicketScheduleRulesComplete &&
    !hasInvalidTicketWindow &&
    !isVenueListLoading &&
    !isCategoryListLoading;

  const formatSeatPriceInput = (value: string) => {
    if (value.length === 0) {
      return '';
    }

    return new Intl.NumberFormat('ko-KR').format(Number(value));
  };

  const openIntroImagePicker = () => {
    introImageInputRef.current?.click();
  };

  const openPosterImagePicker = () => {
    posterImageInputRef.current?.click();
  };




  const scrollRegistrationPageToTop = () => {
    window.requestAnimationFrame(() => {
      registrationPageTopRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  const getRegistrationBlockHighlightClass = (target: RegistrationErrorTarget) =>
    highlightedRegistrationBlock === target && !basicInfoErrorTargets.has(target)
      ? 'animate-registration-block-error ring-2 ring-danger ring-offset-2 ring-offset-white'
      : '';

  const getBasicInfoSectionHighlightClass = () =>
    highlightedRegistrationBlock && basicInfoErrorTargets.has(highlightedRegistrationBlock)
      ? 'animate-registration-block-error ring-2 ring-danger ring-offset-2 ring-offset-white'
      : '';

  const getRegistrationSectionHighlightClass = (target: RegistrationErrorTarget) =>
    highlightedRegistrationBlock === target
      ? 'animate-registration-block-error ring-2 ring-danger ring-offset-2 ring-offset-white'
      : '';

  const getRegistrationFieldErrorClass = (target: RegistrationErrorTarget) =>
    registrationFieldErrorTarget === target ? '[&_input]:border-danger [&_input]:focus:border-danger' : '';

  const showRegistrationError = ({
    message,
    target,
    stepIndex,
  }: RegistrationValidationResult) => {
    setRegistrationSuccessMessage(null);
    setRegistrationErrorMessage(message);
    setHighlightedRegistrationBlock(null);
    setRegistrationFieldErrorTarget(target);

    if (activeRegistrationStep !== stepIndex) {
      setActiveRegistrationStep(stepIndex);
    }

    window.setTimeout(() => {
      setHighlightedRegistrationBlock(target);
      window.requestAnimationFrame(() => {
        registrationBlockRefs[target].current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      });
    }, activeRegistrationStep === stepIndex ? 0 : 100);

    window.setTimeout(() => {
      setHighlightedRegistrationBlock((current) => (current === target ? null : current));
    }, 1600);
  };

  const goToPreviousRegistrationStep = () => {
    moveToRegistrationStep(Math.max(0, activeRegistrationStep - 1));
  };

  const getRegistrationStepValidationResult = (stepIndex: number) =>
    validateRegistrationStep(stepIndex, {
      isCategoryListLoading,
      isVenueListLoading,
      performanceTitle,
      performanceOpenAt,
      performanceCloseAt,
      selectedCategoryId,
      resolvedSelectedVenue,
      posterImage,
      registeredTicketSchedulePreviews,
      areTicketScheduleRulesComplete,
      hasInvalidTicketWindow,
    });

  const moveToRegistrationStep = (targetStep: number) => {
    if (targetStep <= activeRegistrationStep) {
      setRegistrationErrorMessage(null);
      setRegistrationSuccessMessage(null);
      setRegistrationFieldErrorTarget(null);
      setActiveRegistrationStep(targetStep);
      scrollRegistrationPageToTop();
      return;
    }

    for (let stepIndex = activeRegistrationStep; stepIndex < targetStep; stepIndex += 1) {
      const validationResult = getRegistrationStepValidationResult(stepIndex);

      if (validationResult) {
        showRegistrationError(validationResult);
        return;
      }
    }

    setRegistrationErrorMessage(null);
    setRegistrationSuccessMessage(null);
    setRegistrationFieldErrorTarget(null);
    setActiveRegistrationStep(targetStep);
    scrollRegistrationPageToTop();
  };

  const goToNextRegistrationStep = () => {
    moveToRegistrationStep(Math.min(registrationStepItems.length - 1, activeRegistrationStep + 1));
  };

  const handlePerformancePreviewOpen = () => {
    const validationResult =
      getRegistrationStepValidationResult(0) ?? getRegistrationStepValidationResult(1);

    if (validationResult) {
      showRegistrationError(validationResult);
      return;
    }

    setRegistrationErrorMessage(null);
    setRegistrationSuccessMessage(null);
    setRegistrationFieldErrorTarget(null);
    setIsPerformancePreviewOpen(true);
  };

  const handleRegistrationSubmit = async () => {
    setRegistrationErrorMessage(null);
    setRegistrationSuccessMessage(null);
    setRegistrationFieldErrorTarget(null);

    const built = await buildRegistrationRequest({
      performanceTitle,
      selectedCategoryId,
      performanceOpenAt,
      performanceCloseAt,
      resolvedSelectedVenue,
      posterImage,
      introImages,
      performanceHashtags,
      noticeText,
      registeredTicketSchedulePreviews,
      areTicketScheduleRulesComplete,
      hasInvalidTicketWindow,
      seatTemplate,
      seatPolicy,
      seatPolicyVenueId,
      loadSeatTemplate,
      seatPrices,
      seatDiscounts,
    });

    if (built.error) {
      showRegistrationError(built.error);
      return;
    }

    setIsSubmittingRegistration(true);

    try {
      const result = await submitAgencyEventRegistration(built.request);
      setRegistrationSuccessMessage(`공연 등록이 완료되었습니다. eventId=${result.eventId}`);
    } catch (error) {
      if (error instanceof ApiError) {
        setRegistrationErrorMessage(error.message);
      } else if (error instanceof Error) {
        setRegistrationErrorMessage(error.message);
      } else {
        setRegistrationErrorMessage('공연 등록 중 알 수 없는 오류가 발생했습니다.');
      }
    } finally {
      setIsSubmittingRegistration(false);
    }
  };

  const hashtagSection = (
    <HashtagSection hashtags={performanceHashtags} onChange={setPerformanceHashtags} />
  );

  return (
    <div ref={registrationPageTopRef} className="space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <header className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-bold text-primary">공연 등록</p>
          <h1 className="mt-1 text-2xl font-black tracking-normal text-slate-950">공연 등록 대시보드</h1>
        </div>
      </header>

      <nav
        aria-label="공연 등록 단계"
        className="grid gap-3 lg:grid-cols-3 xl:mr-[360px]"
      >
        {registrationStepItems.map((step, index) => {
          const isActive = activeRegistrationStep === index;

          return (
            <button
              key={step.title}
              type="button"
              onClick={() => moveToRegistrationStep(index)}
              className={`rounded-3xl border px-5 py-4 text-left transition ${
                isActive
                  ? 'border-primary bg-primary-subtle shadow-[0_14px_34px_rgba(49,130,246,0.14)]'
                  : 'border-line bg-surface hover:border-line-strong hover:bg-surface-subtle'
              }`}
              aria-current={isActive ? 'step' : undefined}
            >
              <div className="flex items-center justify-between gap-3">
                <span className={`text-xs font-black ${isActive ? 'text-primary' : 'text-content-muted'}`}>
                  STEP {index + 1}
                </span>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${isActive ? 'bg-primary' : 'bg-surface-active'}`}
                  aria-hidden="true"
                />
              </div>
              <p className="mt-3 text-base font-black text-slate-950">{step.title}</p>
            </button>
          );
        })}
      </nav>

      <section className="grid gap-5 items-start xl:grid-cols-[minmax(0,1.6fr)_340px]">
        <div className="flex flex-col gap-5">
          <PosterContentSection
            images={images}
            activeRegistrationStep={activeRegistrationStep}
            exposureContentBlockRef={exposureContentBlockRef}
            getRegistrationSectionHighlightClass={getRegistrationSectionHighlightClass}
            introImageCountLabel={introImageCountLabel}
            introImageInputRef={introImageInputRef}
            noticeText={noticeText}
            openIntroImagePicker={openIntroImagePicker}
            openPosterImagePicker={openPosterImagePicker}
            posterBlockRef={posterBlockRef}
            posterImageInputRef={posterImageInputRef}
            registrationFieldErrorTarget={registrationFieldErrorTarget}
            setNoticeText={setNoticeText}
          />
          <BasicInfoSection
            activeRegistrationStep={activeRegistrationStep}
            activeTicketSchedulePreviews={activeTicketSchedulePreviews}
            basicInfoBlockRef={basicInfoBlockRef}
            categoryBlockRef={categoryBlockRef}
            categoryListErrorMessage={categoryListErrorMessage}
            categoryOptions={categoryOptions}
            clearRegistrationFieldError={clearRegistrationFieldError}
            getBasicInfoSectionHighlightClass={getBasicInfoSectionHighlightClass}
            getRegistrationBlockHighlightClass={getRegistrationBlockHighlightClass}
            getRegistrationFieldErrorClass={getRegistrationFieldErrorClass}
            handlePerformanceCloseInputChange={handlePerformanceCloseInputChange}
            handlePerformanceOpenInputChange={handlePerformanceOpenInputChange}
            hasInvalidTicketWindow={hasInvalidTicketWindow}
            hasTicketWindowAfterScheduleStart={hasTicketWindowAfterScheduleStart}
            hashtagSection={hashtagSection}
            isCategoryListLoading={isCategoryListLoading}
            isVenueOpen={isVenueOpen}
            performanceCloseAt={performanceCloseAt}
            performanceCloseInputValue={performanceCloseInputValue}
            performanceDateBlockRef={performanceDateBlockRef}
            performanceOpenAt={performanceOpenAt}
            performanceOpenInputValue={performanceOpenInputValue}
            performanceTitle={performanceTitle}
            performanceTitleBlockRef={performanceTitleBlockRef}
            registrationFieldErrorTarget={registrationFieldErrorTarget}
            resolvedSelectedVenue={resolvedSelectedVenue}
            selectedCategoryId={selectedCategoryId}
            selectedVenueInfo={selectedVenueInfo}
            setIsPerformanceDateModalOpen={setIsPerformanceDateModalOpen}
            setIsSeatPolicyDirty={setIsSeatPolicyDirty}
            setIsVenueOpen={setIsVenueOpen}
            setPerformanceCloseInputValue={setPerformanceCloseInputValue}
            setPerformanceOpenInputValue={setPerformanceOpenInputValue}
            setPerformanceTitle={setPerformanceTitle}
            setSeatPolicyVenueId={setSeatPolicyVenueId}
            setSeatTemplate={setSeatTemplate}
            setSeatTemplateErrorMessage={setSeatTemplateErrorMessage}
            setSelectedCategoryId={setSelectedCategoryId}
            setSelectedVenue={setSelectedVenue}
            setTicketCloseRule={setTicketCloseRule}
            setTicketOpenRule={setTicketOpenRule}
            ticketCloseRule={ticketCloseRule}
            ticketOpenRule={ticketOpenRule}
            ticketRuleBlockRef={ticketRuleBlockRef}
            ticketSchedulePreviewItems={ticketSchedulePreviewItems}
            venueBlockRef={venueBlockRef}
            venueDropdownRef={venueDropdownRef}
            venueOptions={venueOptions}
            isVenueListLoading={isVenueListLoading}
            performanceClosePlaceholder={performanceClosePlaceholder}
            performanceOpenPlaceholder={performanceOpenPlaceholder}
            selectedScheduleDateKeys={selectedScheduleDateKeys}
          />


          <SalesPolicySection
            pricing={pricing}
            activeRegistrationStep={activeRegistrationStep}
            formatSeatPriceInput={formatSeatPriceInput}
            getRegistrationSectionHighlightClass={getRegistrationSectionHighlightClass}
            registrationFieldErrorTarget={registrationFieldErrorTarget}
            seatPriceBlockRef={seatPriceBlockRef}
            seatPriceSectionRef={seatPriceSectionRef}
          />
          <SeatDiscountSection
            pricing={pricing}
            activeRegistrationStep={activeRegistrationStep}
            discountBlockRef={discountBlockRef}
            getRegistrationBlockHighlightClass={getRegistrationBlockHighlightClass}
          />

          <SeatPolicySection
            activeRegistrationStep={activeRegistrationStep}
            getRegistrationSectionHighlightClass={getRegistrationSectionHighlightClass}
            isSeatTemplateLoading={isSeatTemplateLoading}
            registrationFieldErrorTarget={registrationFieldErrorTarget}
            resolvedSelectedVenue={resolvedSelectedVenue}
            seatPolicy={seatPolicy}
            seatPolicyBlockRef={seatPolicyBlockRef}
            seatPolicySectionRef={seatPolicySectionRef}
            seatPolicySummary={seatPolicySummary}
            seatTemplateErrorMessage={seatTemplateErrorMessage}
            setIsSeatPolicyModalOpen={setIsSeatPolicyModalOpen}
            loadSeatTemplate={loadSeatTemplate}
          />
          <ScheduleRegistrationSection
            schedule={schedule}
            activeRegistrationStep={activeRegistrationStep}
            performanceOpenAt={performanceOpenAt}
            performanceCloseAt={performanceCloseAt}
            registeredPerformanceCount={registeredPerformanceCount}
            selectedScheduleDateCount={selectedScheduleDateCount}
            selectedDateLabel={selectedDateLabel}
            registrationFieldErrorTarget={registrationFieldErrorTarget}
            getRegistrationSectionHighlightClass={getRegistrationSectionHighlightClass}
            clearRegistrationFieldError={clearRegistrationFieldError}
            scheduleSectionRef={scheduleSectionRef}
            scheduleBlockRef={scheduleBlockRef}
          />
        </div>

        <div className="space-y-5 xl:fixed xl:right-8 xl:top-6 xl:z-20 xl:max-h-[calc(100vh-3rem)] xl:w-[340px] xl:overflow-y-auto xl:pr-1">
          <Box variant="outline" className="space-y-4">
            <div>
              <h2 className="text-[18px] font-black text-slate-950">진행 단계</h2>
            </div>

            <div className="space-y-3">
              {registrationStepItems.map((item, index) => {
                const isActive = activeRegistrationStep === index;

                return (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => moveToRegistrationStep(index)}
                    className={`flex w-full gap-3 rounded-2xl px-4 py-3 text-left transition ${
                      isActive ? 'bg-primary-subtle' : 'bg-surface-subtle hover:bg-surface-muted'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                        isActive ? 'bg-primary-light text-primary-hover' : 'bg-surface text-content-muted'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span>
                      <span className="block text-sm font-black text-content">{item.title}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Box>

          <Box variant="outline" className="space-y-4">
            <div>
              <h2 className="text-[18px] font-black text-slate-950">다음 액션</h2>
            </div>

            {isLastRegistrationStep ? (
              <>
                <Button
                  color="primary"
                  display="block"
                  size="medium"
                  onClick={handleRegistrationSubmit}
                  isLoading={isSubmittingRegistration}
                  disabled={!canSubmitRegistration}
                >
                  공연 등록 신청하기
                </Button>
                <Button
                  color="primary"
                  variant="weak"
                  display="block"
                  size="medium"
                  onClick={handlePerformancePreviewOpen}
                  disabled={isSubmittingRegistration}
                >
                  미리보기
                </Button>
              </>
            ) : (
              <Button color="primary" display="block" size="medium" onClick={goToNextRegistrationStep}>
                다음 단계
              </Button>
            )}

            {isFirstRegistrationStep ? null : (
              <Button
                color="dark"
                variant="weak"
                display="block"
                size="medium"
                onClick={goToPreviousRegistrationStep}
              >
                이전 단계
              </Button>
            )}

            {registrationErrorMessage ? (
              <div className="rounded-2xl border border-danger-light bg-danger-subtle px-4 py-3 text-sm font-medium leading-6 text-danger">
                {registrationErrorMessage}
              </div>
            ) : null}

            {registrationSuccessMessage ? (
              <div className="rounded-2xl border border-success-light bg-success-subtle px-4 py-3 text-sm font-medium leading-6 text-success-hover">
                {registrationSuccessMessage}
              </div>
            ) : null}
          </Box>
        </div>
      </section>

      {performanceOpenAt && performanceCloseAt ? (
        <AgencyPerformancePreviewModal
          isOpen={isPerformancePreviewOpen}
          onClose={() => setIsPerformancePreviewOpen(false)}
          title={performanceTitle.trim()}
          categoryName={selectedCategoryInfo?.categoryName ?? ''}
          venueName={selectedVenueInfo.label}
          startAt={performanceOpenAt}
          endAt={performanceCloseAt}
          posterImage={posterImage}
          introImages={introImages}
          notice={noticeText}
          hashtags={performanceHashtags}
          seatPrices={seatPrices}
          seatDiscounts={seatDiscounts}
          schedules={registeredTicketSchedulePreviews}
        />
      ) : null}

      {isSeatPolicyModalOpen ? (
        <AgencySeatPolicyModal
          key={seatPolicyModalKey}
          isOpen={isSeatPolicyModalOpen}
          onClose={() => setIsSeatPolicyModalOpen(false)}
          seatPolicy={seatPolicy}
          onConfirm={(nextSeatPolicy) => {
            setSeatPolicy(nextSeatPolicy);
            setSeatPolicyVenueId(resolvedSelectedVenue);
            setIsSeatPolicyDirty(true);
            clearRegistrationFieldError('seatPolicy');
          }}
        />
      ) : null}

      {isPerformanceDateModalOpen ? (
        <DateRangeModal
          isOpen={isPerformanceDateModalOpen}
          title="공연 일정 설정"
          description="공연 시작일과 종료일을 한 번에 확인하면서 날짜와 시간을 함께 설정합니다."
          startLabel="공연 시작일"
          endLabel="공연 종료일"
          initialStartAt={performanceDateModalInitialStartAt}
          initialEndAt={performanceDateModalInitialEndAt}
          onClose={() => setIsPerformanceDateModalOpen(false)}
          onConfirm={(nextStartAt, nextEndAt) => {
            setPerformanceOpenAt(nextStartAt);
            setPerformanceCloseAt(nextEndAt);
            setPerformanceOpenInputValue(formatDateTimeLabel(nextStartAt));
            setPerformanceCloseInputValue(formatDateTimeLabel(nextEndAt));
            syncSchedulesToPerformanceRange(nextStartAt, nextEndAt);
            clearRegistrationFieldError('performanceDate');
            setIsPerformanceDateModalOpen(false);
          }}
        />
      ) : null}

    </div>
  );
}
