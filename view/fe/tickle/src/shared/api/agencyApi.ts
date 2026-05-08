import { apiClient } from './client';
import { getUserId } from './tokenManager';
import { ApiResponse } from './types';
import {
  AgencySummary,
  AgencyLookupResponseData,
  AgencyCreateEventBasicRequest,
  AgencyCreateEventResponseData,
  AgencyCreateEventPricePoliciesRequest,
  AgencyCreateEventSessionsRequest,
  AgencyCreateEventSeatsRequest,
  AgencyRegistrationFlowRequest,
  AgencyRegistrationFlowResult,
} from './types/agency.types';

function normalizeAgencyList(data: AgencyLookupResponseData): AgencySummary[] {
  const list = Array.isArray(data) ? data : data.agencies ?? data.organizations ?? data.organizers ?? data.content ?? [];

  return list
    .map((agency) => {
      const agencyId = agency.agencyId ?? agency.organizationId ?? agency.organizerId ?? agency.id;
      const agencyName = agency.agencyName ?? agency.organizationName ?? agency.organizerName ?? agency.name;

      if (agencyId === undefined || !agencyName) {
        return null;
      }

      return {
        agencyId: Number(agencyId),
        agencyName,
      };
    })
    .filter((agency): agency is AgencySummary => agency !== null);
}

const getRequiredAgencyHeaders = () => {
  const userId = getUserId();

  if (userId === null) {
    throw new Error('Current userId is missing.');
  }

  return {
    'X-User-Id': String(userId),
  };
};

export const fetchAgencies = async (): Promise<AgencySummary[]> => {
  const response = await apiClient<ApiResponse<AgencyLookupResponseData>>('/api/v1/organizers', {
    method: 'GET',
  });

  return normalizeAgencyList(response.data);
};

export const createAgencyEvent = async (
  request: AgencyCreateEventBasicRequest,
  posterImage: File,
  detailImages: File[],
): Promise<ApiResponse<AgencyCreateEventResponseData>> => {
  const formData = new FormData();

  formData.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }));
  formData.append('posterImage', posterImage);

  detailImages.forEach((detailImage) => {
    formData.append('detailImages', detailImage);
  });

  return apiClient<ApiResponse<AgencyCreateEventResponseData>>('/api/v1/agency/events', {
    method: 'POST',
    body: formData,
    headers: getRequiredAgencyHeaders(),
  });
};

export const createAgencyEventPricePolicies = async (
  eventId: number | string,
  request: AgencyCreateEventPricePoliciesRequest,
): Promise<ApiResponse<void>> => {
  return apiClient<ApiResponse<void>>(`/api/v1/agency/events/${eventId}/price-policies`, {
    method: 'POST',
    body: request,
  });
};

export const createAgencyEventSessions = async (
  eventId: number | string,
  request: AgencyCreateEventSessionsRequest,
): Promise<ApiResponse<void>> => {
  return apiClient<ApiResponse<void>>(`/api/v1/agency/events/${eventId}/sessions`, {
    method: 'POST',
    body: request,
  });
};

export const createAgencyEventSeats = async (
  eventId: number | string,
  request: AgencyCreateEventSeatsRequest,
): Promise<ApiResponse<void>> => {
  return apiClient<ApiResponse<void>>(`/api/v1/agency/events/${eventId}/seats`, {
    method: 'POST',
    body: request,
  });
};

export const submitAgencyEventRegistration = async (
  request: AgencyRegistrationFlowRequest,
): Promise<AgencyRegistrationFlowResult> => {
  const eventResponse = await createAgencyEvent(request.basicEvent, request.posterImage, request.detailImages);
  const eventId = eventResponse.data.eventId;

  await createAgencyEventPricePolicies(eventId, request.pricePolicies);
  await createAgencyEventSessions(eventId, request.sessions);
  await createAgencyEventSeats(eventId, request.seats);

  return {
    eventId,
    title: eventResponse.data.title,
  };
};
