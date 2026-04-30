import { apiClient } from './client';
import { ApiResponse } from './types';
import type { TrialJSON } from '@/src/shared/utils/schema';
import { Schema } from 'effect';
import { createApiResponseSchema } from '@/src/shared/utils/schema';

export interface TrialSubmitResponseData {
  trialId: number;
  receivedAt: string;
}

export const TrialSubmitResponseDataSchema = Schema.Struct({
  trialId: Schema.Number,
  receivedAt: Schema.String,
});

export const submitTrial = async (trial: TrialJSON): Promise<ApiResponse<TrialSubmitResponseData>> => {
  return apiClient<ApiResponse<TrialSubmitResponseData>>(
    '/api/v1/trials', 
    {
      method: 'POST',
      body: trial,
    },
    false,
    createApiResponseSchema(TrialSubmitResponseDataSchema)
  );
};
