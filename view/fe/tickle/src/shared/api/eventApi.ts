import { apiClient } from './client';
import { ApiResponse } from './types';

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

export const fetchEventList = async (params: EventListRequestParams = {}): Promise<ApiResponse<EventListResponseData>> => {
  const cleanParams: Record<string, string | number | boolean> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) cleanParams[key] = value;
  });
  return apiClient<ApiResponse<EventListResponseData>>('/api/v1/events', { params: cleanParams });
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
  audienceType: string;
  salePriceAmount: number;
  currencyCode: string;
  displayOrder: number;
  discountInfo?: DiscountInfo[];
}

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

export const fetchEventDetail = async (eventId: number | string): Promise<ApiResponse<EventDetailResponseData>> => {
  return apiClient<ApiResponse<EventDetailResponseData>>(`/api/v1/events/${eventId}`);
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

export const fetchRanking = async (categoryId?: number, userId?: number): Promise<ApiResponse<CategoryRankingResponseData>> => {
  return apiClient<ApiResponse<CategoryRankingResponseData>>('/api/v1/events/ranking', {
    params: { ...(categoryId !== undefined && { categoryId }), ...(userId !== undefined && { userId }) },
  });
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

export const fetchOpeningSoonEvents = async (userId?: number): Promise<ApiResponse<OpeningSoonEventsResponseData>> => {
  return apiClient<ApiResponse<OpeningSoonEventsResponseData>>('/api/v1/events/opening-soon', {
    params: { ...(userId !== undefined && { userId }) },
  });
};
