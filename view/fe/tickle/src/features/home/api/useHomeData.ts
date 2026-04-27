import { useQuery } from '@tanstack/react-query';
import { http } from '@/src/shared/api/http';
import { ApiResponse } from '@/src/shared/api/types';

export interface BannerData {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  venue: string;
  date: string;
}

export interface PerformanceData {
  id: string;
  title: string;
  imageUrl: string;
  venue: string;
  date: string;
  badges: string[];
  openDate?: string;
}

export const useHomeBanners = () => {
  return useQuery({
    queryKey: ['homeBanners'],
    queryFn: async () => {
      const response = await http.get<ApiResponse<BannerData[]>>('/api/v1/home/banners');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useHomeRanking = () => {
  return useQuery({
    queryKey: ['homeRanking'],
    queryFn: async () => {
      const response = await http.get<ApiResponse<PerformanceData[]>>('/api/v1/home/ranking');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useHomeUpcoming = () => {
  return useQuery({
    queryKey: ['homeUpcoming'],
    queryFn: async () => {
      const response = await http.get<ApiResponse<PerformanceData[]>>('/api/v1/home/upcoming');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};
