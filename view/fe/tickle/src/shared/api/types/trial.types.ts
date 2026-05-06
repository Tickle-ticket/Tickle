import { Schema } from 'effect';

export const TrialSubmitResponseDataSchema = Schema.Struct({
  trialId: Schema.Number,
  receivedAt: Schema.String,
});

export type TrialSubmitResponseData = Schema.Schema.Type<typeof TrialSubmitResponseDataSchema>;
