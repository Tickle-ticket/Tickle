import { useQuery } from '@tanstack/react-query';
import { http } from '@/src/shared/api/http';
import { ApiResponse } from '@/src/shared/api/types';

export interface DetailData {
  imageUrl: string;
  mainTitle: string;
  subTitle: string;
  date: string;
  venue: string;
  features: string[];
  quote: string;
  sections: {
    info: { 
      title: string; 
      content: { title: string; descriptions: string[] }[] 
    };
    price: { 
      columns: { key: string; header: string; align?: 'left' | 'center' | 'right' }[]; 
      data: any[] 
    };
    schedule: { 
      title: string; 
      columns: { key: string; header: string; align?: 'left' | 'center' | 'right' }[]; 
      data: any[] 
    };
    details: { title: string; content?: string[]; imageUrl?: string };
  };
}

export const useDetailData = () => {
  return useQuery({
    queryKey: ['detailData'],
    queryFn: async () => {
      const response = await http.get<ApiResponse<DetailData>>('/api/detail');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5분 동안 캐시 유지
  });
};
