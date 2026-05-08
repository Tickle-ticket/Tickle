import { Schema } from 'effect';

export const SeatItemResponseSchema = Schema.Struct({
  sessionSeatId: Schema.Number,
  eventSeatId: Schema.Number,
  rowLabel: Schema.String,
  seatNumber: Schema.String,
  seatLabel: Schema.String,
  saleStatus: Schema.Literal('AVAILABLE', 'HELD', 'PENDING', 'CONFIRMED', 'REALLOCATING', 'BLOCKED', 'UNAVAILABLE'),
  price: Schema.Number,
  priceGrade: Schema.String,
  waitingCount: Schema.optional(Schema.Number),
  waitable: Schema.optional(Schema.Boolean),
});

export type SeatItemResponse = Schema.Schema.Type<typeof SeatItemResponseSchema>;

export const SeatSectionResponseSchema = Schema.Struct({
  sectionId: Schema.Number,
  sectionName: Schema.String,
  displayOrder: Schema.Number,
  seats: Schema.Array(SeatItemResponseSchema),
});

export type SeatSectionResponse = Schema.Schema.Type<typeof SeatSectionResponseSchema>;

export const SeatMapResponseSchema = Schema.Struct({
  venueId: Schema.Number,
  sections: Schema.Array(SeatSectionResponseSchema),
});

export type SeatMapResponse = Schema.Schema.Type<typeof SeatMapResponseSchema>;

export const SeatHoldRequestSchema = Schema.Struct({
  sessionSeatIds: Schema.Array(Schema.Number),
});

export type SeatHoldRequest = Schema.Schema.Type<typeof SeatHoldRequestSchema>;

export const SeatHoldResponseSchema = Schema.Struct({
  heldSessionSeatIds: Schema.Array(Schema.Number),
  expiresAt: Schema.String,
});

export type SeatHoldResponse = Schema.Schema.Type<typeof SeatHoldResponseSchema>;
