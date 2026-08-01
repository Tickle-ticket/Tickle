'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type RefObject } from 'react';
import {
  AgencySeatPolicyModal,
  createDefaultAgencySeatPolicy,
  getAgencySeatPolicySummary,
} from '@/src/shared/components/AgencySeatPolicyModal';
import { fetchAgencyVenueTemplate, submitAgencyEventRegistration } from '@/src/shared/api/agencyApi';
import { fetchCategories } from '@/src/shared/api/eventApi';
import type {
  AgencyRegistrationFlowRequest,
  AgencyVenueTemplate,
} from '@/src/shared/api/types/agency.types';
import type { Category } from '@/src/shared/api/types/event.types';
import { ApiError } from '@/src/shared/api/types';
import { useVenues } from '@/src/shared/api/useVenues';
import { Badge } from '@/src/shared/components/Badge';
import { Box } from '@/src/shared/components/Box';
import { Button } from '@/src/shared/components/Button';
import { Input } from '@/src/shared/components/Input';
import { SegmentedControl } from '@/src/shared/components/SegmentedControl';
import { STAGE_4001_SEAT_IDS } from '@/src/shared/components/Stage_4001';
import { useScheduleDraft } from '@/src/features/agency/hooks/useScheduleDraft';
import { AgencyPerformancePreviewModal } from '@/src/features/agency/ui/AgencyPerformancePreviewModal';
import { DateRangeModal } from '@/src/features/agency/ui/DateRangeModal';
import { DateTimeTriggerField } from '@/src/features/agency/ui/DateTimeTriggerField';
import { DiscountPresetSelectField } from '@/src/features/agency/ui/DiscountPresetSelectField';
import { TicketScheduleRuleField } from '@/src/features/agency/ui/TicketScheduleRuleField';
import type {
  IntroImageItem,
  RegistrationErrorTarget,
  RegistrationValidationResult,
  SeatDiscountDraft,
  SeatGradeKey,
  TicketSchedulePreview,
  TicketScheduleRule,
  VenueOption,
} from '@/src/features/agency/model/registrationTypes';
import {
  basicInfoErrorTargets,
  buildDateKeysBetween,
  buildSeatTemplateState,
  buildSessionEndAt,
  buildTicketScheduleDate,
  createDefaultPerformanceEndAt,
  createDefaultPerformanceStartAt,
  createDisabledSeatPolicy,
  createImagePreviewItem,
  createIntroImageKey,
  createSeatDiscountDraft,
  discountPresetNameMap,
  fallbackVenueOption,
  formatDateKey,
  formatDateTimeLabel,
  formatFileSize,
  formatScheduleDateShortLabel,
  formatScheduleDateTimePreviewLabel,
  getScheduleTimePeriod,
  isValidScheduleTime,
  maxPerformanceHashtagCount,
  normalizeHashtag,
  parseDateKey,
  parseDateTimeLabel,
  registrationStepItems,
  scheduleWeekdayOptions,
  seatGradeFields,
  seatPolicyGradeToApiGrade,
  seatPriceGradeToApiGrade,
  withSelectedTime,
} from '@/src/features/agency/model/registrationHelpers';

export default function AgencyRegistrationPage() {
  const { data: venueList = [], isLoading: isVenueListLoading } = useVenues();
  const [activeRegistrationStep, setActiveRegistrationStep] = useState(0);
  const [performanceTitle, setPerformanceTitle] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [isCategoryListLoading, setIsCategoryListLoading] = useState(true);
  const [categoryListErrorMessage, setCategoryListErrorMessage] = useState<string | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<number | null>(null);
  const [isVenueOpen, setIsVenueOpen] = useState(false);
  const [ticketOpenRule, setTicketOpenRule] = useState<TicketScheduleRule>({
    days: '',
  });
  const [ticketCloseRule, setTicketCloseRule] = useState<TicketScheduleRule>({
    days: '',
  });
  const [performanceOpenAt, setPerformanceOpenAt] = useState<Date | null>(null);
  const [performanceCloseAt, setPerformanceCloseAt] = useState<Date | null>(null);
  const [performanceOpenInputValue, setPerformanceOpenInputValue] = useState('');
  const [performanceCloseInputValue, setPerformanceCloseInputValue] = useState('');
  const [performanceOpenPlaceholder] = useState(() => formatDateTimeLabel(new Date()));
  const [performanceClosePlaceholder] = useState(() => formatDateTimeLabel(new Date()));
  const [posterImage, setPosterImage] = useState<IntroImageItem | null>(null);
  const [isPosterImageDragActive, setIsPosterImageDragActive] = useState(false);
  const [introImages, setIntroImages] = useState<IntroImageItem[]>([]);
  const [isIntroImageDragActive, setIsIntroImageDragActive] = useState(false);
  const [noticeText, setNoticeText] = useState('');
  const [performanceHashtags, setPerformanceHashtags] = useState<string[]>([]);
  const [hashtagInputValue, setHashtagInputValue] = useState('');
  const [seatPrices, setSeatPrices] = useState<Record<SeatGradeKey, string>>({
    vip: '',
    r: '',
    s: '',
    a: '',
  });
  const [seatDiscounts, setSeatDiscounts] = useState<SeatDiscountDraft[]>([]);
  const [isSeatPolicyModalOpen, setIsSeatPolicyModalOpen] = useState(false);
  const [isPerformanceDateModalOpen, setIsPerformanceDateModalOpen] = useState(false);
  const [isPerformancePreviewOpen, setIsPerformancePreviewOpen] = useState(false);
  const [seatPolicy, setSeatPolicy] = useState(() => createDefaultAgencySeatPolicy());
  const [seatPolicyVenueId, setSeatPolicyVenueId] = useState<number | null>(null);
  const [isSeatPolicyDirty, setIsSeatPolicyDirty] = useState(false);
  const [seatTemplate, setSeatTemplate] = useState<AgencyVenueTemplate | null>(null);
  const [isSeatTemplateLoading, setIsSeatTemplateLoading] = useState(false);
  const [seatTemplateErrorMessage, setSeatTemplateErrorMessage] = useState<string | null>(null);
  const [isSubmittingRegistration, setIsSubmittingRegistration] = useState(false);
  const [registrationErrorMessage, setRegistrationErrorMessage] = useState<string | null>(null);
  const [registrationSuccessMessage, setRegistrationSuccessMessage] = useState<string | null>(null);
  const [highlightedRegistrationBlock, setHighlightedRegistrationBlock] = useState<RegistrationErrorTarget | null>(null);
  const [registrationFieldErrorTarget, setRegistrationFieldErrorTarget] = useState<RegistrationErrorTarget | null>(null);

  const clearRegistrationFieldError = (target: RegistrationErrorTarget) => {
    setRegistrationFieldErrorTarget((current) => (current === target ? null : current));
  };

  const {
    selectedScheduleDate,
    setSelectedScheduleDate,
    selectedScheduleDateKeys,
    setSelectedScheduleDateKeys,
    performanceSchedules,
    setPerformanceSchedules,
    scheduleTimeInputValue,
    setScheduleTimeInputValue,
    scheduleTimePeriod,
    setScheduleTimePeriod,
    performanceScheduleDateKeys,
    selectedScheduleDateKey,
    selectedScheduleDateLabels,
    selectedScheduleTimes,
    visibleScheduleTimeQuickOptions,
    handleScheduleDateToggle,
    handleScheduleWeekdayToggle,
    handleScheduleTimeAdd,
    handleScheduleQuickTimeSelect,
    handleAllPerformanceSchedulesClear,
    handleScheduleTimeRemove,
    handleSelectedScheduleClear,
  } = useScheduleDraft({
    performanceOpenAt,
    performanceCloseAt,
    clearFieldError: clearRegistrationFieldError,
  });
  const venueDropdownRef = useRef<HTMLDivElement | null>(null);
  const posterImageInputRef = useRef<HTMLInputElement | null>(null);
  const posterImageRegistryRef = useRef<IntroImageItem | null>(null);
  const posterImageDragDepthRef = useRef(0);
  const introImageInputRef = useRef<HTMLInputElement | null>(null);
  const introImageRegistryRef = useRef<IntroImageItem[]>([]);
  const introImageDragDepthRef = useRef(0);
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
  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        label: category.categoryName,
        value: String(category.categoryId),
      })),
    [categories],
  );

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      setIsCategoryListLoading(true);
      setCategoryListErrorMessage(null);

      try {
        const response = await fetchCategories();
        if (cancelled) {
          return;
        }

        const nextCategories = Array.from(response.data.categories);
        setCategories(nextCategories);
        setSelectedCategoryId((current) => {
          if (current && nextCategories.some((category) => String(category.categoryId) === current)) {
            return current;
          }

          return '';
        });

        if (nextCategories.length === 0) {
          setCategoryListErrorMessage('카테고리 목록이 비어 있습니다.');
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        setCategoryListErrorMessage(
          error instanceof ApiError ? error.message : '카테고리 목록을 불러오지 못했습니다.',
        );
      } finally {
        if (!cancelled) {
          setIsCategoryListLoading(false);
        }
      }
    };

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

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
  const selectedCategoryInfo = useMemo(
    () => categories.find((category) => String(category.categoryId) === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );
  const performanceDateModalInitialStartAt = useMemo(
    () => performanceOpenAt ?? createDefaultPerformanceStartAt(),
    [performanceOpenAt],
  );
  const performanceDateModalInitialEndAt = useMemo(
    () => performanceCloseAt ?? createDefaultPerformanceEndAt(performanceDateModalInitialStartAt),
    [performanceCloseAt, performanceDateModalInitialStartAt],
  );
  const loadSeatTemplate = async (venueId: number) => {
    setIsSeatTemplateLoading(true);
    setSeatTemplateErrorMessage(null);

    try {
      const template = await fetchAgencyVenueTemplate(venueId);
      const templateState = buildSeatTemplateState(template);

      setSeatTemplate(template);

      if (seatPolicyVenueId !== venueId || !isSeatPolicyDirty) {
        setSeatPolicy(templateState.seatPolicy ?? createDisabledSeatPolicy());
        setSeatPolicyVenueId(venueId);
        setIsSeatPolicyDirty(false);
      }

      return template;
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : '공연장 좌석 골격을 불러오지 못했습니다.';

      setSeatTemplateErrorMessage(message);
      throw error;
    } finally {
      setIsSeatTemplateLoading(false);
    }
  };

  const registeredTicketSchedulePreviews = useMemo<TicketSchedulePreview[]>(
    () => {
      if (!performanceCloseAt) {
        return [];
      }

      return Object.entries(performanceSchedules)
        .flatMap(([dateKey, times]) => {
          const scheduleDate = parseDateKey(dateKey);

          if (!scheduleDate) {
            return [];
          }

          return times
            .filter((timeValue) => isValidScheduleTime(timeValue))
            .map((timeValue) => {
              const scheduleAt = withSelectedTime(scheduleDate, timeValue);
              const sessionEndAt = buildSessionEndAt(scheduleAt, performanceCloseAt);

              return {
                id: `${dateKey}-${timeValue}`,
                dateKey,
                timeValue,
                scheduleAt,
                sessionEndAt,
                ticketOpenAt: buildTicketScheduleDate(scheduleAt, ticketOpenRule),
                ticketCloseAt: buildTicketScheduleDate(scheduleAt, ticketCloseRule),
              };
            });
        })
        .sort((left, right) => left.scheduleAt.getTime() - right.scheduleAt.getTime());
    },
    [performanceCloseAt, performanceSchedules, ticketCloseRule, ticketOpenRule],
  );
  const activeTicketSchedulePreviews = useMemo(
    () =>
      selectedScheduleDateKeys.length > 0
        ? registeredTicketSchedulePreviews.filter((preview) =>
            selectedScheduleDateKeys.includes(preview.dateKey),
          )
        : registeredTicketSchedulePreviews,
    [registeredTicketSchedulePreviews, selectedScheduleDateKeys],
  );
  const ticketSchedulePreviewItems = activeTicketSchedulePreviews.slice(0, 1);
  const hasInvalidTicketWindow = registeredTicketSchedulePreviews.some(
    (preview) => preview.ticketOpenAt.getTime() >= preview.ticketCloseAt.getTime(),
  );
  const areTicketScheduleRulesComplete =
    ticketOpenRule.days.trim().length > 0 && ticketCloseRule.days.trim().length > 0;
  const hasTicketWindowAfterScheduleStart = registeredTicketSchedulePreviews.some(
    (preview) =>
      preview.ticketOpenAt.getTime() >= preview.scheduleAt.getTime() ||
      preview.ticketCloseAt.getTime() > preview.scheduleAt.getTime(),
  );

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

  useEffect(() => {
    const previousImages = introImageRegistryRef.current;

    previousImages
      .filter((image) => !introImages.some((currentImage) => currentImage.id === image.id))
      .forEach((image) => {
        URL.revokeObjectURL(image.previewUrl);
      });

    introImageRegistryRef.current = introImages;
  }, [introImages]);

  useEffect(() => {
    const previousImage = posterImageRegistryRef.current;

    if (previousImage && previousImage.id !== posterImage?.id) {
      URL.revokeObjectURL(previousImage.previewUrl);
    }

    posterImageRegistryRef.current = posterImage;
  }, [posterImage]);

  useEffect(
    () => () => {
      if (posterImageRegistryRef.current) {
        URL.revokeObjectURL(posterImageRegistryRef.current.previewUrl);
      }

      introImageRegistryRef.current.forEach((image) => {
        URL.revokeObjectURL(image.previewUrl);
      });
    },
    [],
  );

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

  const seatPolicySummary = useMemo(() => getAgencySeatPolicySummary(seatPolicy), [seatPolicy]);
  const seatPolicyModalKey = useMemo(
    () =>
      `${resolvedSelectedVenue ?? 'none'}:${STAGE_4001_SEAT_IDS.map((seatId) => seatPolicy[seatId] ?? 'disabled').join('|')}`,
    [resolvedSelectedVenue, seatPolicy],
  );
  const introImageCountLabel = `${introImages.length}장`;
  const normalizedHashtagInput = normalizeHashtag(hashtagInputValue);
  const formattedHashtagInput = normalizedHashtagInput ? `#${normalizedHashtagInput}` : '';
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
  const canAddHashtag =
    formattedHashtagInput.length > 1 &&
    performanceHashtags.length < maxPerformanceHashtagCount &&
    !performanceHashtags.includes(formattedHashtagInput);

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

  const replacePosterImage = (files: File[]) => {
    const nextPosterFile = files.find((file) => file.type.startsWith('image/'));

    if (!nextPosterFile) {
      return;
    }

    clearRegistrationFieldError('poster');
    setPosterImage(createImagePreviewItem(nextPosterFile));
  };

  const appendIntroImages = (files: File[]) => {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      return;
    }

    setIntroImages((current) => {
      const existingKeys = new Set(current.map((image) => image.id));
      const nextImages = imageFiles
        .filter((file) => !existingKeys.has(createIntroImageKey(file)))
        .map((file) => createImagePreviewItem(file));

      return [...current, ...nextImages];
    });
  };

  const handlePosterImageInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    replacePosterImage(Array.from(event.target.files ?? []));
    event.target.value = '';
  };

  const handlePosterImageRemove = () => {
    setPosterImage(null);
  };

  const handlePosterImageDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('Files')) {
      return;
    }

    event.preventDefault();
    posterImageDragDepthRef.current += 1;
    setIsPosterImageDragActive(true);
  };

  const handlePosterImageDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('Files')) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';

    if (!isPosterImageDragActive) {
      setIsPosterImageDragActive(true);
    }
  };

  const handlePosterImageDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('Files')) {
      return;
    }

    event.preventDefault();
    posterImageDragDepthRef.current = Math.max(0, posterImageDragDepthRef.current - 1);

    if (posterImageDragDepthRef.current === 0) {
      setIsPosterImageDragActive(false);
    }
  };

  const handlePosterImageDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    posterImageDragDepthRef.current = 0;
    setIsPosterImageDragActive(false);
    replacePosterImage(Array.from(event.dataTransfer.files));
  };

  const handleIntroImageInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    appendIntroImages(Array.from(event.target.files ?? []));
    event.target.value = '';
  };

  const handleIntroImageRemove = (imageId: string) => {
    setIntroImages((current) => current.filter((image) => image.id !== imageId));
  };

  const handleIntroImageDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('Files')) {
      return;
    }

    event.preventDefault();
    introImageDragDepthRef.current += 1;
    setIsIntroImageDragActive(true);
  };

  const handleIntroImageDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('Files')) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';

    if (!isIntroImageDragActive) {
      setIsIntroImageDragActive(true);
    }
  };

  const handleIntroImageDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('Files')) {
      return;
    }

    event.preventDefault();
    introImageDragDepthRef.current = Math.max(0, introImageDragDepthRef.current - 1);

    if (introImageDragDepthRef.current === 0) {
      setIsIntroImageDragActive(false);
    }
  };

  const handleIntroImageDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    introImageDragDepthRef.current = 0;
    setIsIntroImageDragActive(false);
    appendIntroImages(Array.from(event.dataTransfer.files));
  };

  const handleSeatPriceChange =
    (priceGrade: SeatGradeKey) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const digitsOnly = event.target.value.replace(/\D/g, '');

      setSeatPrices((current) => ({
        ...current,
        [priceGrade]: digitsOnly,
      }));
      clearRegistrationFieldError('seatPrice');
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

  const syncSchedulesToPerformanceRange = (nextOpenAt: Date, nextCloseAt: Date) => {
    const nextDateKeys = buildDateKeysBetween(nextOpenAt, nextCloseAt);
    const nextSelectedDateKeys = selectedScheduleDateKeys.filter((dateKey) => nextDateKeys.includes(dateKey));
    const nextActiveDateKey =
      selectedScheduleDateKey && nextSelectedDateKeys.includes(selectedScheduleDateKey)
        ? selectedScheduleDateKey
        : nextSelectedDateKeys[0] ?? null;

    setSelectedScheduleDateKeys(nextSelectedDateKeys);
    setSelectedScheduleDate(nextActiveDateKey ? parseDateKey(nextActiveDateKey) : null);

    setPerformanceSchedules((current) => {
      const availableDateKeys = new Set(nextDateKeys);
      return Object.fromEntries(
        Object.entries(current)
          .filter(([dateKey]) => availableDateKeys.has(dateKey))
          .map(([dateKey, times]) => [dateKey, [...new Set(times)].sort()]),
      );
    });
  };

  const handlePerformanceOpenInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    const parsed = parseDateTimeLabel(nextValue);

    setPerformanceOpenInputValue(nextValue);
    clearRegistrationFieldError('performanceDate');

    if (nextValue.trim().length === 0) {
      setPerformanceOpenAt(null);
      setSelectedScheduleDate(null);
      setSelectedScheduleDateKeys([]);
      setPerformanceSchedules({});
      return;
    }

    if (!parsed) {
      return;
    }

    setPerformanceOpenAt(parsed);
    const nextPerformanceCloseAt =
      performanceCloseAt && performanceCloseAt.getTime() >= parsed.getTime()
        ? performanceCloseAt
        : null;

    if (performanceCloseAt && performanceCloseAt.getTime() < parsed.getTime()) {
      setPerformanceCloseAt(null);
      setPerformanceCloseInputValue('');
    }

    if (nextPerformanceCloseAt) {
      syncSchedulesToPerformanceRange(parsed, nextPerformanceCloseAt);
    }
  };

  const handlePerformanceCloseInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    const parsed = parseDateTimeLabel(nextValue);

    setPerformanceCloseInputValue(nextValue);
    clearRegistrationFieldError('performanceDate');

    if (nextValue.trim().length === 0) {
      setPerformanceCloseAt(null);
      setSelectedScheduleDate(null);
      setSelectedScheduleDateKeys([]);
      setPerformanceSchedules({});
      return;
    }

    if (!parsed || (performanceOpenAt && parsed.getTime() < performanceOpenAt.getTime())) {
      return;
    }

    setPerformanceCloseAt(parsed);
    if (performanceOpenAt) {
      syncSchedulesToPerformanceRange(performanceOpenAt, parsed);
    }
  };

  const handleHashtagAdd = (rawValue = hashtagInputValue) => {
    const normalizedValue = normalizeHashtag(rawValue);

    if (!normalizedValue || performanceHashtags.length >= maxPerformanceHashtagCount) {
      return;
    }

    const nextHashtag = `#${normalizedValue}`;

    if (performanceHashtags.includes(nextHashtag)) {
      setHashtagInputValue('');
      return;
    }

    setPerformanceHashtags((current) => [...current, nextHashtag]);
    setHashtagInputValue('');
  };

  const handleHashtagRemove = (targetHashtag: string) => {
    setPerformanceHashtags((current) => current.filter((hashtag) => hashtag !== targetHashtag));
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

  const getRegistrationStepValidationResult = (
    stepIndex: number,
  ): RegistrationValidationResult | null => {
    if (stepIndex === 0) {
      if (isCategoryListLoading || isVenueListLoading) {
        return {
          message: '데이터를 아직 불러오는 중입니다. 잠시 후 다시 진행해 주세요.',
          target: isCategoryListLoading ? 'category' : 'venue',
          stepIndex,
        };
      }

      if (performanceTitle.trim().length === 0) {
        return {
          message: '공연명을 입력해 주세요.',
          target: 'performanceTitle',
          stepIndex,
        };
      }

      if (!performanceOpenAt || !performanceCloseAt) {
        return {
          message: '공연 오픈일과 공연 종료일을 입력해 주세요.',
          target: 'performanceDate',
          stepIndex,
        };
      }

      if (selectedCategoryId.length === 0) {
        return {
          message: '카테고리를 선택해 주세요.',
          target: 'category',
          stepIndex,
        };
      }

      if (resolvedSelectedVenue === null) {
        return {
          message: '공연장을 선택해 주세요.',
          target: 'venue',
          stepIndex,
        };
      }

      if (posterImage === null) {
        return {
          message: '포스터 이미지를 등록해 주세요.',
          target: 'poster',
          stepIndex,
        };
      }

      return null;
    }

    if (stepIndex === 1) {
      if (registeredTicketSchedulePreviews.length === 0) {
        return {
          message: '공연 일정 등록 전에 최소 1개 이상의 회차를 먼저 추가해 주세요.',
          target: 'schedule',
          stepIndex,
        };
      }

      if (!areTicketScheduleRulesComplete) {
        return {
          message: '티켓 오픈 기준과 종료 기준을 입력해 주세요.',
          target: 'ticketRule',
          stepIndex,
        };
      }

      if (hasInvalidTicketWindow) {
        return {
          message: '티켓 오픈일과 종료일 기준이 올바르지 않습니다. 먼저 일정 기준을 다시 조정해 주세요.',
          target: 'ticketRule',
          stepIndex,
        };
      }
    }

    return null;
  };

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
    const normalizedPerformanceTitle = performanceTitle.trim();
    const resolvedSelectedCategoryId = Number(selectedCategoryId);

    setRegistrationErrorMessage(null);
    setRegistrationSuccessMessage(null);
    setRegistrationFieldErrorTarget(null);

    if (!normalizedPerformanceTitle) {
      showRegistrationError({
        message: '공연명을 입력해 주세요.',
        target: 'performanceTitle',
        stepIndex: 0,
      });
      return;
    }

    if (!performanceOpenAt || !performanceCloseAt) {
      showRegistrationError({
        message: '공연 오픈일과 공연 종료일을 입력해 주세요.',
        target: 'performanceDate',
        stepIndex: 0,
      });
      return;
    }

    if (registeredTicketSchedulePreviews.length === 0) {
      showRegistrationError({
        message: '등록할 회차를 먼저 추가해 주세요.',
        target: 'schedule',
        stepIndex: 1,
      });
      return;
    }

    if (!areTicketScheduleRulesComplete) {
      showRegistrationError({
        message: '티켓 오픈 기준과 종료 기준을 입력해 주세요.',
        target: 'ticketRule',
        stepIndex: 1,
      });
      return;
    }

    if (hasInvalidTicketWindow) {
      showRegistrationError({
        message: '티켓 오픈일과 종료일 기준을 먼저 조정해 주세요.',
        target: 'ticketRule',
        stepIndex: 1,
      });
      return;
    }

    if (!Number.isInteger(resolvedSelectedCategoryId) || resolvedSelectedCategoryId <= 0) {
      showRegistrationError({
        message: '카테고리를 선택해 주세요.',
        target: 'category',
        stepIndex: 0,
      });
      return;
    }

    if (resolvedSelectedVenue === null) {
      showRegistrationError({
        message: '공연장을 선택해 주세요.',
        target: 'venue',
        stepIndex: 0,
      });
      return;
    }

    if (!posterImage) {
      showRegistrationError({
        message: '포스터 이미지를 등록해 주세요.',
        target: 'poster',
        stepIndex: 0,
      });
      return;
    }

    const venueTemplate =
      seatTemplate?.venueId === resolvedSelectedVenue
        ? seatTemplate
        : await loadSeatTemplate(resolvedSelectedVenue);
    const templateSeatState = buildSeatTemplateState(venueTemplate);
    const { seatIdByLabel } = templateSeatState;
    const effectiveSeatPolicy =
      seatPolicyVenueId === resolvedSelectedVenue
        ? seatPolicy
        : templateSeatState.seatPolicy ?? createDisabledSeatPolicy();
    const missingSeatLabels = STAGE_4001_SEAT_IDS.filter((seatLabel) => {
      const assignment = effectiveSeatPolicy[seatLabel];

      return Boolean(assignment && assignment !== 'disabled' && !seatIdByLabel.has(seatLabel));
    });

    if (missingSeatLabels.length > 0) {
      const previewLabels = missingSeatLabels.slice(0, 5).join(', ');
      const suffix = missingSeatLabels.length > 5 ? ' ...' : '';

      showRegistrationError({
        message: `좌석 등급이 지정된 좌석 중 공연장 좌석 정보와 연결되지 않은 항목이 있습니다. ${previewLabels}${suffix}`,
        target: 'seatPolicy',
        stepIndex: 2,
      });
      return;
    }

    const seatGroups = (['VIP', 'R', 'S', 'A'] as const)
      .map((priceGrade) => {
        const seatIds = STAGE_4001_SEAT_IDS.flatMap((seatLabel) => {
          const assignment = effectiveSeatPolicy[seatLabel];

          if (!assignment || assignment === 'disabled') {
            return [];
          }

          return seatPolicyGradeToApiGrade[assignment] === priceGrade
            ? [seatIdByLabel.get(seatLabel) ?? -1]
            : [];
        }).filter((seatId) => seatId > 0);

        return {
          priceGrade,
          seatIds,
        };
      })
      .filter((seatGroup) => seatGroup.seatIds.length > 0);

    if (seatGroups.length === 0) {
      showRegistrationError({
        message: '좌석 등급이 지정된 좌석이 없습니다. 먼저 좌석 등급을 설정해 주세요.',
        target: 'seatPolicy',
        stepIndex: 2,
      });
      return;
    }

    const usedPriceGrades = new Set(seatGroups.map((seatGroup) => seatGroup.priceGrade));
    const missingPriceField = seatGradeFields.find(
      ({ key }) =>
        usedPriceGrades.has(seatPriceGradeToApiGrade[key]) &&
        seatPrices[key].trim().length === 0,
    );

    if (missingPriceField) {
      showRegistrationError({
        message: `${missingPriceField.label} 금액을 입력해 주세요.`,
        target: 'seatPrice',
        stepIndex: 2,
      });
      return;
    }

    const priceInfos: Array<{ discountName: string; discountRate: number }> = [];
    const seenDiscountNames = new Set<string>();

    for (let index = 0; index < seatDiscounts.length; index += 1) {
      const discount = seatDiscounts[index];
      const discountName =
        discount.preset === 'custom'
          ? discount.customDiscountName.trim()
          : discountPresetNameMap[discount.preset];
      const discountRateText = discount.discountRate.trim();

      if (discountName.length === 0 && discountRateText.length === 0) {
        continue;
      }

      if (discountName.length === 0) {
        showRegistrationError({
          message: `할인 ${index + 1}의 이름을 입력해 주세요.`,
          target: 'discount',
          stepIndex: 2,
        });
        return;
      }

      if (discountRateText.length === 0) {
        showRegistrationError({
          message: `할인 ${index + 1}의 할인율을 입력해 주세요.`,
          target: 'discount',
          stepIndex: 2,
        });
        return;
      }

      const discountRate = Number(discountRateText);
      if (!Number.isFinite(discountRate) || discountRate < 1 || discountRate > 100) {
        showRegistrationError({
          message: `할인 ${index + 1}의 할인율은 1부터 100 사이여야 합니다.`,
          target: 'discount',
          stepIndex: 2,
        });
        return;
      }

      const normalizedDiscountName = discountName.toLowerCase();

      if (seenDiscountNames.has(normalizedDiscountName)) {
        showRegistrationError({
          message: `할인 ${index + 1}의 이름이 중복되었습니다.`,
          target: 'discount',
          stepIndex: 2,
        });
        return;
      }

      seenDiscountNames.add(normalizedDiscountName);
      priceInfos.push({
        discountName,
        discountRate,
      });
    }

    const pricePolicies = seatGradeFields
      .filter(({ key }) => usedPriceGrades.has(seatPriceGradeToApiGrade[key]))
      .map(({ key }, index) => ({
        priceGrade: seatPriceGradeToApiGrade[key],
        defaultPriceAmount: Number(seatPrices[key]),
        priceInfos: [...priceInfos],
        currencyCode: 'KRW',
        displayOrder: index,
      }));

    setIsSubmittingRegistration(true);

    try {
      const request: AgencyRegistrationFlowRequest = {
        basicEvent: {
          venueId: resolvedSelectedVenue,
          categoryId: resolvedSelectedCategoryId,
          title: normalizedPerformanceTitle,
          eventStartAt: performanceOpenAt.toISOString(),
          eventEndAt: performanceCloseAt.toISOString(),
          tags: performanceHashtags,
          notice: noticeText.trim(),
        },
        posterImage: posterImage.file,
        detailImages: introImages.map((image) => image.file),
        pricePolicies: {
          pricePolicies,
        },
        sessions: {
          sessions: registeredTicketSchedulePreviews.map((preview) => ({
            startAt: preview.scheduleAt.toISOString(),
            endAt: preview.sessionEndAt.toISOString(),
            salesOpenAt: preview.ticketOpenAt.toISOString(),
            salesCloseAt: preview.ticketCloseAt.toISOString(),
          })),
        },
        seats: {
          seats: seatGroups,
        },
      };

      const result = await submitAgencyEventRegistration(request);
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
    <div className="flex min-h-[268px] flex-col rounded-3xl border border-line bg-surface p-5 shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-content-tertiary">해시태그</span>
        <Badge color="blue" variant="outline">
          {performanceHashtags.length}/{maxPerformanceHashtagCount}
        </Badge>
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="text-xs font-bold tracking-[0.08em] text-content-muted">키워드 입력</span>
          <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface-subtle px-4 py-3 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary-light">
            <span className="text-sm font-black text-primary">#</span>
            <input
              type="text"
              value={hashtagInputValue}
              onChange={(event) => setHashtagInputValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleHashtagAdd();
                }
              }}
              placeholder="초연, OST, 한정공연"
              disabled={performanceHashtags.length >= maxPerformanceHashtagCount}
              className="w-full bg-transparent text-sm font-semibold text-content outline-none placeholder:text-content-muted disabled:cursor-not-allowed"
            />
          </div>
        </label>

        <Button
          color="primary"
          size="medium"
          disabled={!canAddHashtag}
          onClick={() => handleHashtagAdd()}
        >
          추가
        </Button>
          </div>

          {performanceHashtags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
          {performanceHashtags.map((hashtag) => (
            <button
              key={hashtag}
              type="button"
              onClick={() => handleHashtagRemove(hashtag)}
              className="inline-flex items-center gap-2 rounded-full border border-primary-light bg-primary-subtle px-3 py-2 text-sm font-black text-primary-hover transition hover:border-primary-light hover:bg-primary-light"
            >
              <span>{hashtag}</span>
              <span className="text-xs text-primary">삭제</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
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
          <div
            ref={exposureContentBlockRef}
            className={`rounded-[20px] ${getRegistrationSectionHighlightClass('poster')}`}
            style={{
              display: activeRegistrationStep === 0 ? undefined : 'none',
              order: activeRegistrationStep === 0 ? 2 : undefined,
            }}
          >
            <Box
              variant="shadow"
              className="space-y-5"
            >
            <div>
              <h2 className="text-[18px] font-black text-slate-950">노출 콘텐츠</h2>
            </div>

            <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
              <div
                ref={posterBlockRef}
                className="flex flex-col gap-2 rounded-3xl"
              >
                <span className="text-sm font-bold text-content-tertiary">공연 포스터</span>
                <input
                  ref={posterImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePosterImageInputChange}
                />
                <div
                  role="button"
                  tabIndex={0}
                  onClick={openPosterImagePicker}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openPosterImagePicker();
                    }
                  }}
                  onDragEnter={handlePosterImageDragEnter}
                  onDragOver={handlePosterImageDragOver}
                  onDragLeave={handlePosterImageDragLeave}
                  onDrop={handlePosterImageDrop}
                  className={`rounded-3xl border border-dashed p-4 transition ${
                    registrationFieldErrorTarget === 'poster'
                      ? 'border-danger bg-danger-subtle'
                      : isPosterImageDragActive
                      ? 'border-primary bg-primary-subtle'
                      : 'border-line-strong bg-surface-subtle hover:border-line-strong hover:bg-surface'
                  }`}
                >
                  {posterImage ? (
                    <div className="space-y-4">
                      <p className="text-xs font-bold text-content-muted">드래그 하거나 파일 선택</p>
                      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-surface-muted">
                        <Image
                          src={posterImage.previewUrl}
                          alt="공연 포스터 미리보기"
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-content-secondary">{posterImage.file.name}</p>
                          <p className="mt-1 text-xs font-medium text-content-muted">
                            {formatFileSize(posterImage.file.size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handlePosterImageRemove();
                          }}
                          className="rounded-full border border-line px-3 py-1.5 text-xs font-bold text-content-tertiary transition hover:border-line-strong hover:bg-surface-subtle hover:text-content-secondary"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-[420px] flex-col justify-between gap-4">
                      <div>
                        <p className="text-base font-black text-slate-950">포스터 이미지 업로드</p>
                        <p className="mt-2 text-sm font-bold text-content-muted">드래그 하거나 파일 선택</p>
                      </div>
                      <div className="inline-flex w-fit items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white">
                        포스터 선택
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-content-tertiary">공연 소개</span>
                  <input
                    ref={introImageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleIntroImageInputChange}
                  />
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={openIntroImagePicker}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openIntroImagePicker();
                      }
                    }}
                  onDragEnter={handleIntroImageDragEnter}
                  onDragOver={handleIntroImageDragOver}
                  onDragLeave={handleIntroImageDragLeave}
                  onDrop={handleIntroImageDrop}
                    className={`min-h-[220px] max-h-[460px] overflow-hidden rounded-3xl border border-dashed p-4 transition sm:p-5 ${
                      isIntroImageDragActive
                        ? 'border-primary bg-primary-subtle'
                        : 'border-line-strong bg-surface-subtle hover:border-line-strong hover:bg-surface'
                    }`}
                  >
                    <div className="flex h-full flex-col gap-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-base font-black text-slate-950">소개 이미지 업로드</p>
                          <p className="mt-2 text-sm font-bold text-content-muted">드래그 하거나 파일 선택</p>
                        </div>
                        <div className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-950 px-3 py-1.5 text-xs font-bold text-white sm:px-4 sm:py-2 sm:text-sm">
                          이미지 선택
                        </div>
                      </div>

                      {introImages.length > 0 ? (
                        <div className="max-h-[330px] overflow-y-auto pr-1">
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {introImages.map((image, index) => (
                              <div
                                key={image.id}
                                className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_12px_28px_rgba(15,23,42,0.05)]"
                              >
                                <div className="relative aspect-[4/3] bg-surface-muted">
                                  <Image
                                    src={image.previewUrl}
                                    alt={`공연 소개 이미지 ${index + 1}`}
                                    fill
                                    unoptimized
                                    className="object-cover"
                                  />
                                </div>
                                <div className="flex items-center justify-between gap-2 px-3 py-2">
                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-bold text-content-secondary">{image.file.name}</p>
                                    <p className="mt-0.5 text-[11px] font-medium text-content-muted">{formatFileSize(image.file.size)}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleIntroImageRemove(image.id);
                                    }}
                                    className="shrink-0 rounded-full border border-line px-2.5 py-1 text-[11px] font-bold text-content-tertiary transition hover:border-line-strong hover:bg-surface-subtle hover:text-content-secondary"
                                  >
                                    삭제
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-auto flex flex-wrap items-center gap-3 text-xs font-bold text-content-muted">
                          <span>{introImageCountLabel}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-content-tertiary">공지사항</span>
                  <textarea
                    value={noticeText}
                    onChange={(event) => setNoticeText(event.target.value)}
                    placeholder="공지사항 입력"
                    className="min-h-[180px] rounded-3xl border border-line bg-white px-4 py-4 text-sm font-medium leading-6 text-content-secondary outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-light"
                  />
                </label>

              </div>
            </div>
            </Box>
          </div>

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
                    <span className="truncate text-left">{selectedVenueInfo.label}</span>
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
                        value={formatSeatPriceInput(seatPrices[field.key])}
                        onChange={handleSeatPriceChange(field.key)}
                        placeholder="금액 입력"
                        className={`[&_input]:text-[20px] [&_input]:tracking-[0.08em] sm:[&_input]:text-[22px] ${
                          registrationFieldErrorTarget === 'seatPrice' && seatPrices[field.key].trim().length === 0
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
                  {seatPriceSummary.map((field) => (
                    <div
                      key={field.key}
                      className="rounded-2xl bg-surface px-4 py-3 ring-1 ring-black/5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <Badge color={field.badgeColor} size="small">
                          {field.label}
                        </Badge>
                        <span className="text-sm font-black text-slate-950">
                          {seatPrices[field.key].trim().length > 0 ? `₩${field.formattedValue}` : '미입력'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            </Box>
          </div>

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
                onClick={handleSeatDiscountAdd}
              >
                {'할인 추가'}
              </Button>
            </div>

            {seatDiscounts.length > 0 ? (
              <div className="space-y-4">
                {seatDiscounts.map((discount, index) => (
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
                            handleSeatDiscountPresetChange(discount.id, preset)
                          }
                        />

                        <div className={`grid gap-4 ${discount.preset === 'custom' ? 'md:grid-cols-2' : ''}`}>
                          {discount.preset === 'custom' ? (
                            <Input
                              label={'할인명'}
                              fullWidth
                              value={discount.customDiscountName}
                              onChange={handleSeatDiscountChange(
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
                            onChange={handleSeatDiscountChange(discount.id, 'discountRate')}
                            maxLength={3}
                            placeholder={'1-100'}
                          />
                        </div>
                      </div>

                      <Button
                        color="dark"
                        variant="weak"
                        size="medium"
                        onClick={() => handleSeatDiscountRemove(discount.id)}
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

          <div
            ref={scheduleSectionRef}
            className={`rounded-[20px] ${getRegistrationSectionHighlightClass('schedule')}`}
            style={{
              display: activeRegistrationStep === 1 ? undefined : 'none',
              order: activeRegistrationStep === 1 ? 1 : undefined,
            }}
          >
            <Box
              variant="shadow"
              className="space-y-5"
            >
            <div
              ref={scheduleBlockRef}
              className="flex flex-wrap items-center justify-between gap-3 rounded-3xl"
            >
              <div>
                <h2 className="text-[18px] font-black text-slate-950">공연 일정 등록</h2>
              </div>
              <Badge color="blue" variant="outline">
                총 {registeredPerformanceCount}회차 등록
              </Badge>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
                <div className={`rounded-3xl border bg-surface-subtle p-4 ${
                  registrationFieldErrorTarget === 'schedule' && selectedScheduleDateKeys.length === 0
                    ? 'border-danger'
                    : 'border-line'
                }`}>
                  <div>
                    <p className="text-sm font-bold text-content-tertiary">운영 날짜</p>
                    <p className="mt-2 text-sm font-medium text-content-secondary">
                      {performanceOpenAt && performanceCloseAt
                        ? `${formatDateKey(performanceOpenAt)} ~ ${formatDateKey(performanceCloseAt)}`
                        : '공연 오픈일과 종료일을 먼저 입력해 주세요.'}
                    </p>
                  </div>

                  <div className="mt-4 rounded-2xl border border-line bg-surface p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-black text-content-tertiary">요일 선택</p>
                    </div>
                    <div className="mt-3 grid grid-cols-7 gap-1.5">
                      {scheduleWeekdayOptions.map((option) => {
                        const weekdayDateKeys = performanceScheduleDateKeys.filter((dateKey) => {
                          const scheduleDate = parseDateKey(dateKey);
                          return scheduleDate?.getDay() === option.weekday;
                        });
                        const selectedCount = weekdayDateKeys.filter((dateKey) =>
                          selectedScheduleDateKeys.includes(dateKey),
                        ).length;
                        const isEverySelected = weekdayDateKeys.length > 0 && selectedCount === weekdayDateKeys.length;
                        const isPartiallySelected = selectedCount > 0 && !isEverySelected;

                        return (
                          <button
                            key={option.weekday}
                            type="button"
                            onClick={() => handleScheduleWeekdayToggle(option.weekday)}
                            disabled={weekdayDateKeys.length === 0}
                            aria-pressed={isEverySelected}
                            className={`rounded-xl px-2 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${
                              isEverySelected
                                ? 'bg-primary text-white'
                                : isPartiallySelected
                                  ? 'bg-primary-subtle text-primary-hover ring-1 ring-primary-light'
                                  : 'bg-surface-subtle text-content-secondary hover:bg-surface-muted'
                            }`}
                            title={`${option.label}요일 ${selectedCount}/${weekdayDateKeys.length}일 선택`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                    {performanceScheduleDateKeys.map((dateKey) => {
                      const scheduleDate = parseDateKey(dateKey);

                      if (!scheduleDate) {
                        return null;
                      }

                      const isSelected = selectedScheduleDateKeys.includes(dateKey);
                      const scheduleCount = performanceSchedules[dateKey]?.length ?? 0;

                      return (
                        <button
                          key={dateKey}
                          type="button"
                          onClick={() => handleScheduleDateToggle(dateKey)}
                          className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                            isSelected
                              ? 'border-primary bg-primary-subtle'
                              : 'border-line bg-surface hover:border-line-strong hover:bg-surface-subtle'
                          }`}
                        >
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${
                                  isSelected ? 'bg-primary' : 'bg-surface-active'
                                }`}
                              />
                              <p className="text-sm font-black text-slate-950">
                                {formatScheduleDateShortLabel(scheduleDate)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-surface-muted px-2 py-1 text-xs font-bold text-content-tertiary">
                                {scheduleCount}회
                              </span>
                            </div>
                          </div>
                          <p className="mt-2 text-xs font-medium text-content-muted">{dateKey}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-3xl border border-line bg-surface-subtle p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-content-tertiary">선택 날짜</p>
                      <p className="mt-2 text-2xl font-black text-slate-950">
                        {selectedScheduleDateCount > 1
                          ? `${selectedScheduleDateCount}일 선택`
                          : selectedDateLabel}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAllPerformanceSchedulesClear}
                      disabled={registeredPerformanceCount === 0}
                      className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-bold text-content-tertiary transition hover:border-line-strong hover:bg-surface-subtle hover:text-content-secondary disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      전체 초기화
                    </button>
                  </div>

                  {selectedScheduleDateLabels.length > 0 ? (
                    <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                      {selectedScheduleDateLabels.map((label) => (
                        <span
                          key={label}
                          className="inline-flex h-8 items-center justify-center rounded-full bg-surface px-3 text-center text-xs font-bold text-content-tertiary ring-1 ring-black/5"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-line bg-surface px-4 py-3 text-sm font-medium text-content-muted">
                      날짜 미선택
                    </div>
                  )}

                  <div className="mt-5 rounded-3xl border border-line bg-surface p-4">
                    <div>
                      <div>
                        <p className="text-sm font-black text-content-secondary">30분 단위 선택</p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 rounded-2xl bg-surface-muted p-1">
                      {(['am', 'pm'] as const).map((period) => {
                        const isActive = scheduleTimePeriod === period;

                        return (
                          <button
                            key={period}
                            type="button"
                            onClick={() => setScheduleTimePeriod(period)}
                            className={`rounded-xl px-3 py-2 text-sm font-black transition ${
                              isActive
                                ? 'bg-surface text-slate-950 shadow-sm'
                                : 'text-content-tertiary hover:bg-surface/60 hover:text-content-secondary'
                            }`}
                          >
                            {period === 'am' ? '오전' : '오후'}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-3 grid max-h-[180px] grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-6 lg:grid-cols-6">
                      {visibleScheduleTimeQuickOptions.map((timeValue) => {
                        const isRegisteredOnSelectedDate =
                          selectedScheduleDateKeys.length > 0
                            ? selectedScheduleDateKeys.every((dateKey) =>
                                (performanceSchedules[dateKey] ?? []).includes(timeValue),
                              )
                            : selectedScheduleTimes.includes(timeValue);

                        return (
                          <button
                            key={timeValue}
                            type="button"
                            onClick={() => handleScheduleQuickTimeSelect(timeValue)}
                            aria-pressed={isRegisteredOnSelectedDate}
                            className={`rounded-2xl border px-3 py-2 text-sm font-black transition ${
                              isRegisteredOnSelectedDate
                                ? 'border-2 border-primary bg-surface text-content-secondary'
                                : 'border-line bg-surface text-content-secondary hover:border-line-strong hover:bg-surface-subtle'
                            }`}
                          >
                            {timeValue}
                          </button>
                        );
                      })}
                    </div>

                    {selectedScheduleDateCount === 0 ? (
                      <p className="mt-3 text-xs font-semibold text-warning">
                        날짜 선택 필요
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-col gap-3 rounded-3xl border border-line bg-surface p-4 sm:flex-row sm:items-end">
                    <label className="flex min-w-0 flex-1 flex-col gap-2">
                      <span className="text-sm font-bold text-content-tertiary">직접 입력</span>
                      <input
                        type="time"
                        step={60}
                        value={scheduleTimeInputValue}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          setScheduleTimeInputValue(nextValue);
                          clearRegistrationFieldError('schedule');

                          if (isValidScheduleTime(nextValue)) {
                            setScheduleTimePeriod(getScheduleTimePeriod(nextValue));
                          }
                        }}
                        className={`rounded-2xl border bg-surface px-4 py-3 text-sm font-semibold text-content outline-none transition focus:ring-4 ${
                          registrationFieldErrorTarget === 'schedule'
                            ? 'border-danger focus:border-danger focus:ring-danger-light'
                            : 'border-line focus:border-primary focus:ring-primary-light'
                        }`}
                      />
                    </label>
                    <Button
                      color="primary"
                      size="medium"
                      disabled={selectedScheduleDateCount === 0 || !isValidScheduleTime(scheduleTimeInputValue)}
                      onClick={() => handleScheduleTimeAdd()}
                    >
                      선택 날짜에 회차 추가
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-line bg-surface p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-content-tertiary">등록된 공연 시간</p>
                  </div>
                  {selectedScheduleTimes.length > 0 ? (
                    <button
                      type="button"
                      onClick={handleSelectedScheduleClear}
                      className="rounded-full border border-line px-3 py-1.5 text-xs font-bold text-content-tertiary transition hover:border-line-strong hover:bg-surface-subtle hover:text-content-secondary"
                    >
                      선택 날짜 초기화
                    </button>
                  ) : null}
                </div>

                {selectedScheduleTimes.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {selectedScheduleTimes.map((timeValue) => (
                      <div
                        key={timeValue}
                        className="flex items-center gap-3 rounded-2xl border border-line bg-surface-subtle px-4 py-3"
                      >
                        <span className="text-base font-black text-slate-950">{timeValue}</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedScheduleDateKey) {
                              handleScheduleTimeRemove(selectedScheduleDateKey, timeValue);
                            }
                          }}
                          className="rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-content-tertiary ring-1 ring-black/5 transition hover:bg-surface-muted hover:text-content-secondary"
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-line bg-surface-subtle px-4 py-6 text-sm font-medium text-content-tertiary">
                    회차 없음
                  </div>
                )}
              </div>
            </div>
            </Box>
          </div>
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
