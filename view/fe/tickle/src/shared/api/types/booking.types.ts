import { Schema } from 'effect';

export interface PaymentOptionSelectionRequest {
  sessionSeatId: number;
  discountName: string;
}

export interface BookingPreorderRequest {
  eventId: number;
  sessionId: number;
  sessionSeatIds: number[];
  optionSelections: PaymentOptionSelectionRequest[];
}

export const BookingPreorderSeatResponseSchema = Schema.Struct({
  sessionSeatId: Schema.Number,
  seatLabel: Schema.String,
  discountName: Schema.NullOr(Schema.String),
  ticketPriceAmount: Schema.Number,
  serviceFeeAmount: Schema.Number,
  finalPriceAmount: Schema.Number,
});

export const BookingPreorderResponseSchema = Schema.Struct({
  bookingId: Schema.Number,
  bookingNo: Schema.String,
  bookingStatus: Schema.String,
  currencyCode: Schema.String,
  totalPaymentAmount: Schema.Number,
  holdExpiresAt: Schema.String,
  seats: Schema.Array(BookingPreorderSeatResponseSchema),
});

export type BookingPreorderResponse = Schema.Schema.Type<typeof BookingPreorderResponseSchema>;

export interface BookingOptionsRequest {
  eventId: number;
  sessionId: number;
  seatIds: number[];
}

export const PriceInfoResponseSchema = Schema.Struct({
  discountName: Schema.String,
  discountRate: Schema.Number,
  ticketPriceAmount: Schema.Number,
});

export const BookingSeatOptionResponseSchema = Schema.Struct({
  sessionSeatId: Schema.Number,
  seatLabel: Schema.String,
  rowLabel: Schema.optional(Schema.String),
  seatNumber: Schema.optional(Schema.String),
  eventPricePolicyId: Schema.optional(Schema.Number),
  priceGrade: Schema.String,
  priceInfos: Schema.Array(PriceInfoResponseSchema),
});

export const BookingOptionsResponseSchema = Schema.Struct({
  eventId: Schema.Union(Schema.Number, Schema.NumberFromString),
  sessionId: Schema.Union(Schema.Number, Schema.NumberFromString),
  currencyCode: Schema.String,
  totalTicketPriceAmount: Schema.Number,
  seats: Schema.Array(BookingSeatOptionResponseSchema),
});

export type BookingOptionsResponse = Schema.Schema.Type<typeof BookingOptionsResponseSchema>;
export type BookingSeatOptionResponse = Schema.Schema.Type<typeof BookingSeatOptionResponseSchema>;
