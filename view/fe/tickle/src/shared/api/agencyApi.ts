import { apiClient } from './client';
import { ApiResponse } from './types';
import {
  AgencySeatGrade,
  AgencySummary,
  AgencyLookupItem,
  AgencyLookupResponseData,
  AgencyCreateEventBasicRequest,
  AgencyCreateEventResponseData,
  AgencyDiscountInfoRequest,
  AgencyCreateEventPricePolicyRequest,
  AgencyCreateEventPricePoliciesRequest,
  AgencyCreateEventSessionRequest,
  AgencyCreateEventSessionsRequest,
  AgencyCreateEventSeatGroupRequest,
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

export const fetchAgencies = async (): Promise<AgencySummary[]> => {
  const response = await apiClient<ApiResponse<AgencyLookupResponseData>>('/api/v1/organizers', {
    method: 'GET',
  });

  return normalizeAgencyList(response.data);
};

export const createAgencyEvent = async (
  request: AgencyCreateEventBasicRequest,
): Promise<ApiResponse<AgencyCreateEventResponseData>> => {
  return apiClient<ApiResponse<AgencyCreateEventResponseData>>('/api/v1/agency/events', {
    method: 'POST',
    body: request,
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
  const eventResponse = await createAgencyEvent(request.basicEvent);
  const eventId = eventResponse.data.eventId;

  await createAgencyEventPricePolicies(eventId, request.pricePolicies);
  await createAgencyEventSessions(eventId, request.sessions);
  await createAgencyEventSeats(eventId, request.seats);

  return {
    eventId,
    title: eventResponse.data.title,
  };
};
