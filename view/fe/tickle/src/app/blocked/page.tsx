"use client";

import { ErrorView } from "@/src/shared/components/ErrorView";

export default function BlockedPage() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950">
      <ErrorView 
        type="401"
        title="비정상적인 접근 차단" 
        description="자동화된 도구(Bot, Macro)를 통한 비정상적인 클릭이나 접근이 감지되어 서비스 이용이 차단되었습니다." 
        actionText="홈으로 돌아가기"
        onAction={() => window.location.href = '/'}
      />
    </div>
  );
}
