'use client';

import React from 'react';
import { Header } from '@/src/shared/components/Header';
import { Footer } from '@/src/shared/components/Footer';
import { Title } from '@/src/shared/components/Title';
import { Box } from '@/src/shared/components/Box';

const noticeData = [
  {
    id: 1,
    title: "[공지] TICKLE 서비스 정식 오픈 안내",
    date: "2026.05.01",
    isNew: true,
    content: `안녕하세요. TICKLE입니다.

기다려 주신 많은 분들께 감사드리며, 드디어 TICKLE 서비스가 정식으로 오픈되었습니다! 🎉

TICKLE은 기존 예매 서비스의 불편함을 개선하고, 누구나 쉽고 빠르게 원하는 공연의 티켓을 예매할 수 있도록 돕는 혁신적인 스마트 티켓팅 플랫폼입니다. 

[주요 기능 안내]
1. 직관적이고 빠른 예매 시스템
2. 실시간 매진 임박 및 취소표 대기 시스템
3. 종이 티켓이 필요 없는 모바일 스마트 티켓 발권

앞으로도 더 나은 서비스와 다양한 공연 콘텐츠로 찾아뵙겠습니다.
많은 관심과 이용 부탁드립니다.

감사합니다.
TICKLE 팀 드림`
  }
];

export default function NoticePage() {
  return (
    <div className="flex w-full min-h-screen bg-[#f8f8f8] font-sans flex-col items-center">
      <main className="flex-1 w-full flex flex-col px-6 pt-0 pb-12 md:px-10 md:pb-16 relative">
        <Header />
        
        <div className="max-w-5xl mx-auto w-full mt-8 flex flex-col mb-12">
          <Title 
            title="공지사항" 
            bottomBorder={true}
            className="!px-0 !pb-4 mb-8 w-full [&>div]:!px-0 [&_h1]:!text-3xl"
          />
          
          <Box variant="flat" padding="none" className="bg-white border border-gray-100 rounded-xl w-full shadow-sm overflow-hidden">
            <div className="flex flex-col w-full">
              {/* Table Header */}
              <div className="hidden md:flex border-b border-gray-200 bg-gray-50 text-gray-500 text-sm font-bold p-4">
                <div className="w-16 text-center">번호</div>
                <div className="flex-1 text-center">제목</div>
                <div className="w-32 text-center">등록일</div>
              </div>

              {/* Table Rows */}
              {noticeData.map((notice) => (
                <details key={notice.id} className="group flex flex-col border-b border-gray-100 last:border-none">
                  <summary className="flex flex-col md:flex-row items-start md:items-center p-4 hover:bg-blue-50/50 transition-colors cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    <div className="hidden md:block w-16 text-center text-gray-400 text-sm font-medium">
                      {notice.id}
                    </div>
                    <div className="flex-1 w-full md:w-auto md:px-4 flex items-center gap-2 mb-2 md:mb-0">
                      <span className="font-medium text-gray-800 group-hover:text-blue-600 truncate">
                        {notice.title}
                      </span>
                      {notice.isNew && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 shrink-0">
                          N
                        </span>
                      )}
                    </div>
                    <div className="w-full flex items-center justify-between md:w-32 md:justify-center">
                      <div className="text-gray-400 text-sm">{notice.date}</div>
                      {/* 모바일 화살표 아이콘 */}
                      <div className="md:hidden text-gray-400 transition-transform group-open:rotate-180">
                        <svg fill="none" height="20" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="M6 9l6 6 6-6"></path></svg>
                      </div>
                    </div>
                  </summary>
                  
                  {/* 상세 내용 영역 */}
                  <div className="p-6 md:p-8 bg-gray-50/50 border-t border-gray-100 text-gray-700 text-[15px] leading-relaxed whitespace-pre-wrap">
                    {notice.content}
                  </div>
                </details>
              ))}
            </div>
            
            {/* Pagination Placeholder */}
            <div className="flex justify-center items-center p-6 gap-2 border-t border-gray-100">
              <button className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 cursor-not-allowed">
                &lt;
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-md bg-blue-600 text-white font-bold">
                1
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 cursor-not-allowed">
                &gt;
              </button>
            </div>
          </Box>
        </div>

        <Footer />
      </main>
    </div>
  );
}
