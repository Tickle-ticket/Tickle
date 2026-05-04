import { apiClient } from './client';
import { ApiResponse } from './types';
import { createApiResponseSchema } from '../utils/schema';
import {
  EventItem,
  EventListResponseData,
  EventListRequestParams,
  EventItemSchema,
  EventListResponseDataSchema,
  EventImage,
  EventSession,
  DiscountInfo,
  EventPricePolicy,
  EventDetailResponseData,
  EventImageSchema,
  EventSessionSchema,
  DiscountInfoSchema,
  EventPricePolicySchema,
  EventDetailResponseDataSchema,
  EventRankingItem,
  CategoryRankingResponseData,
  EventRankingItemSchema,
  CategoryRankingResponseDataSchema,
  OpeningSoonEventsResponseData,
  OpeningSoonEventItemSchema,
  OpeningSoonEventsResponseDataSchema,
  Category,
  CategoriesResponseData,
  CategorySchema,
  CategoriesResponseDataSchema,
} from './types/event.types';

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

export const getEventPriceAmount = (pricePolicy: EventPricePolicy) => {
  if (typeof pricePolicy.priceAmount === 'number') {
    return pricePolicy.priceAmount;
  }

  if (typeof pricePolicy.salePriceAmount === 'number') {
    return pricePolicy.salePriceAmount;
  }

  return 0;
};

export const fetchEventDetail = async (eventId: number | string): Promise<ApiResponse<EventDetailResponseData>> => {
  return apiClient<ApiResponse<EventDetailResponseData>>(
    `/api/v1/events/${eventId}`,
    {},
    false,
    createApiResponseSchema(EventDetailResponseDataSchema)
  );
};

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

export const fetchCategories = async (): Promise<ApiResponse<CategoriesResponseData>> => {
  return apiClient<ApiResponse<CategoriesResponseData>>(
    '/api/v1/categories',
    {},
    false,
    createApiResponseSchema(CategoriesResponseDataSchema)
  );
};
