"use client";

import { ErrorView } from "@/src/shared/components/ErrorView";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function BlockedContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");

  const title = "비정상적인 접근 차단";
  const description = reason === "blacklist"
    ? "차단된 사용자입니다."
    : "자동화된 도구(Bot, Macro)를 통한 비정상적인 클릭이나 접근이 감지되었습니다. 보안 정책에 따라 해당 기기의 접근이 일시적으로 차단되었습니다.";

  return (
    <ErrorView
      type="401"
      title={title}
      description={description}
      actionText="메인으로 돌아가기"
      onAction={() => window.location.href = '/'}
    />
  );
}

export default function BlockedPage() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 p-6">
      <div className="w-full max-w-[480px] bg-white dark:bg-zinc-900 rounded-[32px] shadow-[0_18px_46px_rgba(15,23,42,0.04)] border border-slate-100 dark:border-zinc-800 overflow-hidden transform transition-all">
        <Suspense fallback={<div></div>}>
          <BlockedContent />
        </Suspense>
      </div>
    </div>
  );
}
