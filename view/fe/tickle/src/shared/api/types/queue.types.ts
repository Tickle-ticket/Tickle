import { Schema } from 'effect';

export const QueueEnterResponseDataSchema = Schema.Struct({
  requestId: Schema.String,
  status: Schema.Literal('PENDING', 'WAITING', 'ADMITTED', 'LEFT', 'EXPIRED'),
});

export type QueueEnterResponseData = Schema.Schema.Type<typeof QueueEnterResponseDataSchema>;

export const QueueTokenResponseDataSchema = Schema.Struct({
  queueToken: Schema.String,
  status: Schema.Literal('PENDING', 'WAITING', 'ADMITTED'),
});

export type QueueTokenResponseData = Schema.Schema.Type<typeof QueueTokenResponseDataSchema>;

export const QueueStatusResponseDataSchema = Schema.Struct({
  queueToken: Schema.String,
  status: Schema.Literal('PENDING', 'WAITING', 'ADMITTED', 'LEFT', 'EXPIRED'),
  rank: Schema.Union(Schema.Number, Schema.Null),
  waitingCount: Schema.Union(Schema.Number, Schema.Null),
  estimatedWaitSeconds: Schema.Union(Schema.Number, Schema.Null),
  estimatedEntryAt: Schema.Union(Schema.String, Schema.Null),
  admitToken: Schema.Union(Schema.String, Schema.Null),
});

export type QueueStatusResponseData = Schema.Schema.Type<typeof QueueStatusResponseDataSchema>;
