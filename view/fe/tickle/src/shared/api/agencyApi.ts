import { apiClient } from './client';
import { ApiResponse } from './types';

export type AgencySeatGrade = 'VIP' | 'R' | 'S' | 'A' | 'B' | 'RESTRICTED_VIEW';

export interface AgencyCreateEventBasicRequest {
  organizerId: number;
  venueId: number;
  categoryId: number;
  title: string;
  eventStartAt: string;
  eventEndAt: string;
  tags: string[];
  notice: string;
  posterImageUrl: string;
  detailImageUrls: string[];
}

export interface AgencyCreateEventResponseData {
  eventId: number;
  title: string;
}

export interface AgencyDiscountInfoRequest {
  discountName: string;
  discountRate: number;
  actualPriceAmount: number;
}

export interface AgencyCreateEventPricePolicyRequest {
  priceGrade: AgencySeatGrade;
  priceAmount: number;
  discountInfo: AgencyDiscountInfoRequest[];
  currencyCode: string;
  displayOrder: number;
}

export interface AgencyCreateEventPricePoliciesRequest {
  pricePolicies: AgencyCreateEventPricePolicyRequest[];
}

export interface AgencyCreateEventSessionRequest {
  startAt: string;
  endAt: string;
  salesOpenAt: string;
  salesCloseAt: string;
}

export interface AgencyCreateEventSessionsRequest {
  sessions: AgencyCreateEventSessionRequest[];
}

export interface AgencyCreateEventSeatGroupRequest {
  priceGrade: AgencySeatGrade;
  seatIds: number[];
}

export interface AgencyCreateEventSeatsRequest {
  seats: AgencyCreateEventSeatGroupRequest[];
}

export interface AgencyRegistrationFlowRequest {
  basicEvent: AgencyCreateEventBasicRequest;
  pricePolicies: AgencyCreateEventPricePoliciesRequest;
  sessions: AgencyCreateEventSessionsRequest;
  seats: AgencyCreateEventSeatsRequest;
}

export interface AgencyRegistrationFlowResult {
  eventId: number;
  title: string;
}

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
