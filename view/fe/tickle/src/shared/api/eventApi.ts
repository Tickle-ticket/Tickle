import { apiClient } from './client';
import { ApiResponse } from './types';
import { Schema } from 'effect';
import { createApiResponseSchema } from '../utils/schema';

export interface EventItem {
  eventId: number;
  title: string;
  venueLocation: string;
  eventStartAt: string;
  eventEndAt: string;
  categoryName: string;
  thumbnailUrl: string;
  salesStartAt?: string;
  metadata: {
    tags: string[];
  };
  isFavorite: boolean;
}

export interface EventListResponseData {
  items: EventItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

export interface EventListRequestParams {
  keyword?: string;
  categoryId?: number;
  userId?: number;
  page?: number;
  size?: number;
}

export const EventItemSchema = Schema.Struct({
  eventId: Schema.Number,
  title: Schema.String,
  venueLocation: Schema.String,
  eventStartAt: Schema.String,
  eventEndAt: Schema.String,
  categoryName: Schema.String,
  thumbnailUrl: Schema.String,
  salesStartAt: Schema.optional(Schema.String),
  metadata: Schema.Struct({
    tags: Schema.Array(Schema.String),
  }),
  isFavorite: Schema.Boolean,
});

export const EventListResponseDataSchema = Schema.Struct({
  items: Schema.Array(EventItemSchema),
  page: Schema.Number,
  size: Schema.Number,
  totalElements: Schema.Number,
  totalPages: Schema.Number,
  hasNext: Schema.Boolean,
});

export const fetchEventList = async (params: EventListRequestParams = {}): Promise<ApiResponse<EventListResponseData>> => {
  const cleanParams: Record<string, string | number | boolean> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) cleanParams[key] = value;
  });
  return apiClient<ApiResponse<EventListResponseData>>(
    '/api/v1/events', 
    { params: cleanParams },
    false,
    createApiResponseSchema(EventListResponseDataSchema)
  );
};

export interface EventImage {
  eventImageId: number;
  imageType: string;
  imageUrl: string;
  displayOrder: number;
}

export interface EventSession {
  sessionId: number;
  sessionNo: number;
  startAt: string;
  endAt: string;
  salesOpenAt: string;
  salesCloseAt: string;
  status: string;
}

export interface DiscountInfo {
  discountName: string;
  discountRate: number;
  actualPriceAmount: number;
}

export interface EventPricePolicy {
  eventPricePolicyId: number;
  priceGrade: string;
  audienceType?: string;
  priceAmount?: number | null;
  salePriceAmount?: number | null;
  currencyCode: string;
  displayOrder: number;
  discountInfo?: DiscountInfo[];
}

export const getEventPriceAmount = (pricePolicy: EventPricePolicy) => {
  if (typeof pricePolicy.priceAmount === 'number') {
    return pricePolicy.priceAmount;
  }

  if (typeof pricePolicy.salePriceAmount === 'number') {
    return pricePolicy.salePriceAmount;
  }

  return 0;
};

export interface EventDetailResponseData {
  eventId: number;
  title: string;
  categoryName: string;
  organizerName: string;
  venueName: string;
  venueAddress: string;
  cityName: string;
  timezoneCode: string;
  salesStartAt: string;
  salesEndAt: string;
  eventStartAt: string;
  eventEndAt: string;
  metadata: {
    tags: string[];
  };
  notice: string;
  status: string;
  isFavorite: boolean;
  images: EventImage[];
  sessions: EventSession[];
  pricePolicies: EventPricePolicy[];
}

export const EventImageSchema = Schema.Struct({
  eventImageId: Schema.Number,
  imageType: Schema.String,
  imageUrl: Schema.String,
  displayOrder: Schema.Number,
});

export const EventSessionSchema = Schema.Struct({
  sessionId: Schema.Number,
  sessionNo: Schema.Number,
  startAt: Schema.String,
  endAt: Schema.String,
  salesOpenAt: Schema.String,
  salesCloseAt: Schema.String,
  status: Schema.String,
});

export const DiscountInfoSchema = Schema.Struct({
  discountName: Schema.String,
  discountRate: Schema.Number,
  actualPriceAmount: Schema.Number,
});

export const EventPricePolicySchema = Schema.Struct({
  eventPricePolicyId: Schema.Number,
  priceGrade: Schema.String,
  audienceType: Schema.optional(Schema.String),
  priceAmount: Schema.optional(Schema.Union(Schema.Number, Schema.Null)),
  salePriceAmount: Schema.optional(Schema.Union(Schema.Number, Schema.Null)),
  currencyCode: Schema.String,
  displayOrder: Schema.Number,
  discountInfo: Schema.optional(Schema.Array(DiscountInfoSchema)),
});

export const EventDetailResponseDataSchema = Schema.Struct({
  eventId: Schema.Number,
  title: Schema.String,
  categoryName: Schema.String,
  organizerName: Schema.String,
  venueName: Schema.String,
  venueAddress: Schema.String,
  cityName: Schema.String,
  timezoneCode: Schema.String,
  salesStartAt: Schema.String,
  salesEndAt: Schema.String,
  eventStartAt: Schema.String,
  eventEndAt: Schema.String,
  metadata: Schema.Struct({
    tags: Schema.Array(Schema.String),
  }),
  notice: Schema.String,
  status: Schema.String,
  isFavorite: Schema.Boolean,
  images: Schema.Array(EventImageSchema),
  sessions: Schema.Array(EventSessionSchema),
  pricePolicies: Schema.Array(EventPricePolicySchema),
});

export const fetchEventDetail = async (eventId: number | string): Promise<ApiResponse<EventDetailResponseData>> => {
  return apiClient<ApiResponse<EventDetailResponseData>>(
    `/api/v1/events/${eventId}`,
    {},
    false,
    createApiResponseSchema(EventDetailResponseDataSchema)
  );
};

// --- 랭킹 API ---

export interface EventRankingItem {
  rank: number;
  eventId: number;
  eventName: string;
  venueName: string;
  eventStartAt: string;
  eventEndAt: string;
  salesStartAt: string;
  salesEndAt: string;
  thumbnailUrl: string;
  tags: string[];
  isFavorite: boolean;
}

export interface CategoryRankingResponseData {
  categoryId: number | null;
  categoryName: string;
  rankings: EventRankingItem[];
}

export const EventRankingItemSchema = Schema.Struct({
  rank: Schema.Number,
  eventId: Schema.Number,
  eventName: Schema.String,
  venueName: Schema.String,
  eventStartAt: Schema.String,
  eventEndAt: Schema.String,
  salesStartAt: Schema.String,
  salesEndAt: Schema.String,
  thumbnailUrl: Schema.String,
  tags: Schema.Array(Schema.String),
  isFavorite: Schema.Boolean,
});

export const CategoryRankingResponseDataSchema = Schema.Struct({
  categoryId: Schema.Union(Schema.Number, Schema.Null),
  categoryName: Schema.String,
  rankings: Schema.Array(EventRankingItemSchema),
});

export const fetchRanking = async (categoryId?: number, userId?: number): Promise<ApiResponse<CategoryRankingResponseData>> => {
  return apiClient<ApiResponse<CategoryRankingResponseData>>(
    '/api/v1/events/ranking', 
    {
      params: { ...(categoryId !== undefined && { categoryId }), ...(userId !== undefined && { userId }) },
    },
    false,
    createApiResponseSchema(CategoryRankingResponseDataSchema)
  );
};

// --- 오픈 예정 API ---

export interface OpeningSoonEventItem {
  eventId: number;
  eventName: string;
  venueName: string;
  eventStartAt: string;
  eventEndAt: string;
  salesStartAt: string;
  salesEndAt: string;
  thumbnailUrl: string;
  tags: string[];
  isFavorite: boolean;
}

export interface OpeningSoonEventsResponseData {
  events: OpeningSoonEventItem[];
}

export const OpeningSoonEventItemSchema = Schema.Struct({
  eventId: Schema.Number,
  eventName: Schema.String,
  venueName: Schema.String,
  eventStartAt: Schema.String,
  eventEndAt: Schema.String,
  salesStartAt: Schema.String,
  salesEndAt: Schema.String,
  thumbnailUrl: Schema.String,
  tags: Schema.Array(Schema.String),
  isFavorite: Schema.Boolean,
});

export const OpeningSoonEventsResponseDataSchema = Schema.Struct({
  events: Schema.Array(OpeningSoonEventItemSchema),
});

export const fetchOpeningSoonEvents = async (userId?: number): Promise<ApiResponse<OpeningSoonEventsResponseData>> => {
  return apiClient<ApiResponse<OpeningSoonEventsResponseData>>(
    '/api/v1/events/opening-soon', 
    {
      params: { ...(userId !== undefined && { userId }) },
    },
    false,
    createApiResponseSchema(OpeningSoonEventsResponseDataSchema)
  );
};
