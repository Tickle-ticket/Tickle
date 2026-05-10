import React from 'react';
import { BookingDetailView } from '@/src/features/mypage/ui/BookingDetailView';

interface PageProps {
  params: {
    id: string;
  };
}

export default function BookingDetailPage({ params }: PageProps) {
  return <BookingDetailView bookingId={params.id} />;
}
