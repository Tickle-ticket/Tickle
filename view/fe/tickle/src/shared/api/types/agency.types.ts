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
  venueId: number;
  categoryId: number;
  title: string;
  eventStartAt: string;
  eventEndAt: string;
  tags: string[];
  notice: string;
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

export type AgencyVenueTemplateSeatResponse = {
  venueSeatId?: string | number;
  rowLabel?: string;
  seatNumber?: string | number;
  seatLabel?: string;
  seatGrade?: AgencySeatGrade;
};

export type AgencyVenueTemplateSectionResponse = {
  venueSectionId?: string | number;
  sectionName?: string;
  displayOrder?: string | number;
  seats?: AgencyVenueTemplateSeatResponse[];
};

export interface AgencyVenueTemplateSeat {
  venueSeatId: number;
  rowLabel: string;
  seatNumber: string;
  seatLabel: string;
  seatGrade: AgencySeatGrade;
}

export interface AgencyVenueTemplateSection {
  venueSectionId: number;
  sectionName: string;
  displayOrder: number;
  seats: AgencyVenueTemplateSeat[];
}

export interface AgencyVenueTemplate {
  venueId: number;
  venueName: string;
  sections: AgencyVenueTemplateSection[];
}

export type AgencyVenueTemplateResponseData =
  | {
      venueId?: string | number;
      venueName?: string;
      sections?: AgencyVenueTemplateSectionResponse[];
    }
  | {
      template?: AgencyVenueTemplateResponseData;
      seatTemplate?: AgencyVenueTemplateResponseData;
    };

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
