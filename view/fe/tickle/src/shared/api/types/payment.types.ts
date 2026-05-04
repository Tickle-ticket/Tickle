import { Schema } from 'effect';

export const PaymentSeatSummarySchema = Schema.Struct({
  sessionSeatId: Schema.Number,
  seatLabel: Schema.String,
  rowLabel: Schema.String,
  seatNumber: Schema.String,
  ticketPriceAmount: Schema.Number,
  serviceFeeAmount: Schema.Number,
  finalPriceAmount: Schema.Number,
});

export type PaymentSeatSummary = Schema.Schema.Type<typeof PaymentSeatSummarySchema>;

export interface PaymentMethodSelectionRequest {
  bookingId: number;
  paymentMethod: 'BANK_TRANSFER' | 'KAKAOPAY';
}

export const PaymentMethodSelectionResponseSchema = Schema.Struct({
  bookingId: Schema.Number,
  paymentMethod: Schema.Literal('BANK_TRANSFER', 'KAKAOPAY'),
  nextAction: Schema.Literal('PREPARE_BANK_TRANSFER', 'PREPARE_KAKAOPAY'),
});

export type PaymentMethodSelectionResponse = Schema.Schema.Type<typeof PaymentMethodSelectionResponseSchema>;

export interface KakaoPayReadyRequest {
  bookingId: number;
}

export const KakaoPayReadyResponseSchema = Schema.Struct({
  tid: Schema.String,
  nextRedirectPcUrl: Schema.String,
  createdAt: Schema.String,
});

export type KakaoPayReadyResponse = Schema.Schema.Type<typeof KakaoPayReadyResponseSchema>;

export interface BankTransferPrepareRequest {
  bookingId: number;
}

export const BankTransferPrepareResponseSchema = Schema.Struct({
  paymentId: Schema.Number,
  bookingId: Schema.Number,
  bookingNo: Schema.String,
  paymentStatus: Schema.String,
  bookingStatus: Schema.String,
  orderAmount: Schema.Number,
  currencyCode: Schema.String,
  bankAccount: Schema.String,
  accountHolder: Schema.String,
  depositDeadline: Schema.String,
  seats: Schema.Array(PaymentSeatSummarySchema),
});

export type BankTransferPrepareResponse = Schema.Schema.Type<typeof BankTransferPrepareResponseSchema>;

export const PaymentStatusResponseSchema = Schema.Struct({
  paymentId: Schema.Number,
  bookingId: Schema.Number,
  bookingNo: Schema.String,
  paymentMethodType: Schema.String,
  paymentStatus: Schema.String,
  bookingStatus: Schema.String,
  orderAmount: Schema.Number,
  currencyCode: Schema.String,
  // @ts-ignore effect의 버전에 따라 NullOr가 없거나 동작이 다를 수 있지만 기존 코드 보존
  depositDeadline: Schema.NullOr ? Schema.NullOr(Schema.String) : Schema.Union(Schema.String, Schema.Null),
  // @ts-ignore
  bankAccount: Schema.NullOr ? Schema.NullOr(Schema.String) : Schema.Union(Schema.String, Schema.Null),
  // @ts-ignore
  accountHolder: Schema.NullOr ? Schema.NullOr(Schema.String) : Schema.Union(Schema.String, Schema.Null),
  seats: Schema.Array(PaymentSeatSummarySchema),
});

export type PaymentStatusResponse = Schema.Schema.Type<typeof PaymentStatusResponseSchema>;
