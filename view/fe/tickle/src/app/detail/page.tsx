'use client';

import { HomeView } from '@/src/features/home/ui/HomeView';
import { useDetailStore } from '@/src/shared/store/useDetailStore';
import { useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';

function DetailPageContent() {
  const searchParams = useSearchParams();
  const id = searchParams?.get('id');

  useEffect(() => {
    if (id) {
      useDetailStore.setState({ selectedDetailId: id, isDetailBannerOpen: true });
    }
  }, [id]);

  return <HomeView />;
}

export default function DetailPage() {
  return (
    <Suspense fallback={<div className="w-full h-screen bg-[#f8f8f8]" />}>
      <DetailPageContent />
    </Suspense>
  );
}
