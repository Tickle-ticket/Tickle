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
  AgencyVenueTemplate,
  AgencyVenueTemplateResponseData,
  AgencyVenueTemplateSectionResponse,
  AgencyVenueTemplateSeatResponse,
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

function normalizeAgencyVenueTemplate(
  data: AgencyVenueTemplateResponseData,
): AgencyVenueTemplate {
  const source =
    'template' in data && data.template
      ? data.template
      : 'seatTemplate' in data && data.seatTemplate
        ? data.seatTemplate
        : data;
  const sections =
    'sections' in source && Array.isArray(source.sections)
      ? source.sections
      : [];

  return {
    venueId: 'venueId' in source ? Number(source.venueId ?? 0) : 0,
    venueName: 'venueName' in source ? source.venueName ?? '' : '',
    sections: sections.map((section: AgencyVenueTemplateSectionResponse, index: number) => ({
      venueSectionId: Number(section.venueSectionId ?? index + 1),
      sectionName: section.sectionName ?? '',
      displayOrder: Number(section.displayOrder ?? index + 1),
      seats: Array.isArray(section.seats)
        ? section.seats
            .map((seat: AgencyVenueTemplateSeatResponse) => {
              const venueSeatId = Number(seat.venueSeatId);
              const rowLabel = seat.rowLabel?.trim() ?? '';
              const seatNumber = String(seat.seatNumber ?? '').trim();
              const seatLabel =
                seat.seatLabel?.trim() ||
                [rowLabel, seatNumber].filter((value) => value.length > 0).join('-');

              if (!Number.isInteger(venueSeatId) || venueSeatId <= 0 || seatLabel.length === 0) {
                return null;
              }

              return {
                venueSeatId,
                rowLabel,
                seatNumber,
                seatLabel,
                seatGrade: seat.seatGrade ?? 'RESTRICTED_VIEW',
              };
            })
            .filter((seat): seat is AgencyVenueTemplate['sections'][number]['seats'][number] => seat !== null)
        : [],
    })),
  };
}

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

export const fetchAgencyVenueTemplate = async (
  venueId: number | string,
): Promise<AgencyVenueTemplate> => {
  const response = await apiClient<ApiResponse<AgencyVenueTemplateResponseData>>(
    `/api/v1/agency/venues/${venueId}/template`,
    {
      method: 'GET',
    },
  );

  return normalizeAgencyVenueTemplate(response.data);
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
