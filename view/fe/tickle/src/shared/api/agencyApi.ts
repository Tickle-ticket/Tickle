import { apiClient } from './client';
import { ApiResponse } from './types';

export type AgencySeatGrade = 'VIP' | 'R' | 'S' | 'A' | 'B' | 'RESTRICTED_VIEW';

export interface AgencySummary {
  agencyId: number;
  agencyName: string;
}

type AgencyLookupItem = {
  id?: string | number;
  agencyId?: string | number;
  organizationId?: string | number;
  organizerId?: string | number;
  name?: string;
  agencyName?: string;
  organizationName?: string;
  organizerName?: string;
};

type AgencyLookupResponseData =
  | AgencyLookupItem[]
  | {
      agencies?: AgencyLookupItem[];
      organizations?: AgencyLookupItem[];
      organizers?: AgencyLookupItem[];
      content?: AgencyLookupItem[];
    };

export interface AgencyCreateEventBasicRequest {
  organizerId: number;
  venueId: number;
  categoryId: number;
  title: string;
  eventStartAt: string;
  eventEndAt: string;
  tags: string[];
  notice: string;
}

export interface AgencyCreateEventMultipartRequest {
  request: AgencyCreateEventBasicRequest;
  posterImage: File;
  detailImages?: File[];
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
  posterImage: File;
  detailImages: File[];
  pricePolicies: AgencyCreateEventPricePoliciesRequest;
  sessions: AgencyCreateEventSessionsRequest;
  seats: AgencyCreateEventSeatsRequest;
}

export interface AgencyRegistrationFlowResult {
  eventId: number;
  title: string;
}

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
  request: AgencyCreateEventMultipartRequest,
): Promise<ApiResponse<AgencyCreateEventResponseData>> => {
  const formData = new FormData();

  formData.append(
    'request',
    new Blob([JSON.stringify(request.request)], {
      type: 'application/json',
    }),
  );
  formData.append('posterImage', request.posterImage);

  request.detailImages?.forEach((image) => {
    formData.append('detailImages', image);
  });

  return apiClient<ApiResponse<AgencyCreateEventResponseData>>('/api/v1/agency/events', {
    method: 'POST',
    body: formData,
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
  const eventResponse = await createAgencyEvent({
    request: request.basicEvent,
    posterImage: request.posterImage,
    detailImages: request.detailImages,
  });
  const eventId = eventResponse.data.eventId;

  await createAgencyEventPricePolicies(eventId, request.pricePolicies);
  await createAgencyEventSessions(eventId, request.sessions);
  await createAgencyEventSeats(eventId, request.seats);

  return {
    eventId,
    title: eventResponse.data.title,
  };
};
