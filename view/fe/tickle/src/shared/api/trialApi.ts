import { apiClient } from './client';
import { ApiResponse } from './types';
import type { TrialJSON } from '@/src/shared/utils/schema';
import { createApiResponseSchema } from '@/src/shared/utils/schema';
import { TrialSubmitResponseData, TrialSubmitResponseDataSchema } from './types/trial.types';

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
