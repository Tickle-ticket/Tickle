import { apiClient } from './client';
import { ApiResponse } from './types';
import type { TrialJSON } from '@/src/shared/tracking/trialTypes';

export interface TrialSubmitResponseData {
  trialId: number;
  receivedAt: string;
}

export const submitTrial = async (trial: TrialJSON): Promise<ApiResponse<TrialSubmitResponseData>> => {
  return apiClient<ApiResponse<TrialSubmitResponseData>>('/api/v1/trials', {
    method: 'POST',
    body: trial,
  });
};
