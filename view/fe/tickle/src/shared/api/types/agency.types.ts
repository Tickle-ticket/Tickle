export type AgencySeatGrade = 'VIP' | 'R' | 'S' | 'A' | 'B' | 'RESTRICTED_VIEW';

export interface AgencySummary {
  agencyId: number;
  agencyName: string;
}

export type AgencyLookupItem = {
  id?: string | number;
  agencyId?: string | number;
  organizationId?: string | number;
  organizerId?: string | number;
  name?: string;
  agencyName?: string;
  organizationName?: string;
  organizerName?: string;
};

export type AgencyLookupResponseData =
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
  grade: AgencySeatGrade;
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
  grade: AgencySeatGrade;
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
