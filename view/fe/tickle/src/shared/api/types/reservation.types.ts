import { Schema } from 'effect';

export const ReservationSeatInfoSchema = Schema.Struct({
  sessionSeatId: Schema.Number,
  seatLabel: Schema.String,
  sectionName: Schema.optional(Schema.String),
  rowLabel: Schema.optional(Schema.String),
  seatNumber: Schema.optional(Schema.String),
  seatGrade: Schema.optional(Schema.String),
});

export type ReservationSeatInfo = Schema.Schema.Type<typeof ReservationSeatInfoSchema>;

export const ReservationItemSchema = Schema.Struct({
  bookingId: Schema.Number,
  bookingNo: Schema.String,
  bookingStatus: Schema.String,
  eventTitle: Schema.String,
  sessionNo: Schema.Number,
  sessionStartAt: Schema.String,
  venueName: Schema.String,
  ticketCount: Schema.Number,
  totalPaymentAmount: Schema.Number,
  createdAt: Schema.String,
});

export type ReservationItem = Schema.Schema.Type<typeof ReservationItemSchema>;

export const TicketDetailSchema = Schema.Struct({
  ticketId: Schema.Number,
  ticketNo: Schema.String,
  ticketStatus: Schema.String,
  sectionName: Schema.String,
  rowLabel: Schema.String,
  seatNumber: Schema.String,
  seatLabel: Schema.String,
  ticketPriceAmount: Schema.Number,
  serviceFeeAmount: Schema.Number,
  finalPriceAmount: Schema.Number,
});

export type TicketDetail = Schema.Schema.Type<typeof TicketDetailSchema>;

export const ReservationDetailSchema = Schema.Struct({
  bookingId: Schema.Number,
  bookingNo: Schema.String,
  bookingStatus: Schema.String,
  eventTitle: Schema.String,
  sessionNo: Schema.Number,
  sessionStartAt: Schema.String,
  venueName: Schema.String,
  ticketCount: Schema.Number,
  totalPaymentAmount: Schema.Number,
  createdAt: Schema.String,
  tickets: Schema.Array(TicketDetailSchema),
});

export type ReservationDetail = Schema.Schema.Type<typeof ReservationDetailSchema>;

export const ReservationListResponseSchema = Schema.Struct({
  items: Schema.Array(ReservationItemSchema),
});

export type ReservationListResponse = Schema.Schema.Type<typeof ReservationListResponseSchema>;
