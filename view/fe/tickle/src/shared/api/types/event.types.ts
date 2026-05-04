import { Schema } from 'effect';

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

export type EventItem = Schema.Schema.Type<typeof EventItemSchema>;

export const EventListResponseDataSchema = Schema.Struct({
  items: Schema.Array(EventItemSchema),
  page: Schema.Number,
  size: Schema.Number,
  totalElements: Schema.Number,
  totalPages: Schema.Number,
  hasNext: Schema.Boolean,
});

export type EventListResponseData = Schema.Schema.Type<typeof EventListResponseDataSchema>;

export const EventImageSchema = Schema.Struct({
  eventImageId: Schema.Number,
  imageType: Schema.String,
  imageUrl: Schema.String,
  displayOrder: Schema.Number,
});

export type EventImage = Schema.Schema.Type<typeof EventImageSchema>;

export const EventSessionSchema = Schema.Struct({
  sessionId: Schema.Number,
  sessionNo: Schema.Number,
  startAt: Schema.String,
  endAt: Schema.String,
  salesOpenAt: Schema.String,
  salesCloseAt: Schema.String,
  status: Schema.String,
});

export type EventSession = Schema.Schema.Type<typeof EventSessionSchema>;

export const DiscountInfoSchema = Schema.Struct({
  discountName: Schema.String,
  discountRate: Schema.Number,
  actualPriceAmount: Schema.Number,
});

export type DiscountInfo = Schema.Schema.Type<typeof DiscountInfoSchema>;

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

export type EventPricePolicy = Schema.Schema.Type<typeof EventPricePolicySchema>;

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

export type EventDetailResponseData = Schema.Schema.Type<typeof EventDetailResponseDataSchema>;

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

export type EventRankingItem = Schema.Schema.Type<typeof EventRankingItemSchema>;

export const CategoryRankingResponseDataSchema = Schema.Struct({
  categoryId: Schema.Union(Schema.Number, Schema.Null),
  categoryName: Schema.String,
  rankings: Schema.Array(EventRankingItemSchema),
});

export type CategoryRankingResponseData = Schema.Schema.Type<typeof CategoryRankingResponseDataSchema>;

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

export type OpeningSoonEventItem = Schema.Schema.Type<typeof OpeningSoonEventItemSchema>;

export const OpeningSoonEventsResponseDataSchema = Schema.Struct({
  events: Schema.Array(OpeningSoonEventItemSchema),
});

export type OpeningSoonEventsResponseData = Schema.Schema.Type<typeof OpeningSoonEventsResponseDataSchema>;

export const CategorySchema = Schema.Struct({
  categoryId: Schema.Number,
  categoryName: Schema.String,
});

export type Category = Schema.Schema.Type<typeof CategorySchema>;

export const CategoriesResponseDataSchema = Schema.Struct({
  categories: Schema.Array(CategorySchema),
});

export type CategoriesResponseData = Schema.Schema.Type<typeof CategoriesResponseDataSchema>;
