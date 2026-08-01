'use client';

import { useState } from 'react';
import {
  createDefaultAgencySeatPolicy,
  type AgencySeatPolicy,
} from '@/src/shared/components/AgencySeatPolicyModal';
import { fetchAgencyVenueTemplate } from '@/src/shared/api/agencyApi';
import { ApiError } from '@/src/shared/api/types';
import type { AgencyVenueTemplate } from '@/src/shared/api/types/agency.types';
import {
  buildSeatTemplateState,
  createDisabledSeatPolicy,
} from '@/src/features/agency/model/registrationHelpers';

/**
 * 공연장 좌석 골격을 불러오고 좌석 등급 배치를 관리합니다.
 *
 * <p>공연장을 바꾸면 좌석 배치도 새로 받아야 합니다. 다만 사용자가 이미 손으로
 * 등급을 고쳤다면(isSeatPolicyDirty) 덮어쓰지 않습니다. 애써 지정한 배치가
 * 사라지면 안 되기 때문입니다.</p>
 */
export const useSeatTemplate = () => {
  const [seatPolicy, setSeatPolicy] = useState<AgencySeatPolicy>(() => createDefaultAgencySeatPolicy());
  const [seatPolicyVenueId, setSeatPolicyVenueId] = useState<number | null>(null);
  const [isSeatPolicyDirty, setIsSeatPolicyDirty] = useState(false);
  const [seatTemplate, setSeatTemplate] = useState<AgencyVenueTemplate | null>(null);
  const [isSeatTemplateLoading, setIsSeatTemplateLoading] = useState(false);
  const [seatTemplateErrorMessage, setSeatTemplateErrorMessage] = useState<string | null>(null);

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

  return {
    seatPolicy,
    setSeatPolicy,
    seatPolicyVenueId,
    setSeatPolicyVenueId,
    isSeatPolicyDirty,
    setIsSeatPolicyDirty,
    seatTemplate,
    setSeatTemplate,
    isSeatTemplateLoading,
    seatTemplateErrorMessage,
    setSeatTemplateErrorMessage,
    loadSeatTemplate,
  };
};
