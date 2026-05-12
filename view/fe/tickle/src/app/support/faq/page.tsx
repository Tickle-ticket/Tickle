'use client';

import React from 'react';
import { Header } from '@/src/shared/components/Header';
import { Footer } from '@/src/shared/components/Footer';
import { MobileBottomNav } from '@/src/shared/components/MobileBottomNav';
import { Title } from '@/src/shared/components/Title';
import { Box } from '@/src/shared/components/Box';

const faqData = [
  {
    question: "예매는 어떻게 하나요?",
    answer: "원하시는 공연을 선택한 후, '예매하기' 버튼을 눌러 날짜, 시간, 좌석을 차례로 선택하시면 됩니다. 결제를 완료하면 예매가 확정됩니다."
  },
  {
    question: "결제 수단은 어떤 것들이 있나요?",
    answer: "TICKLE은 카카오페이, 네이버페이, 토스페이 등 간편결제와 신용카드, 무통장입금 등 다양한 결제 수단을 지원합니다."
  },
  {
    question: "예매를 취소하고 싶어요.",
    answer: "마이페이지의 '내 예매' 메뉴에서 해당 공연의 예매 내역을 클릭한 뒤, '예매 취소' 버튼을 통해 취소할 수 있습니다. 취소 시점에 따라 취소 수수료가 부과될 수 있습니다."
  },
  {
    question: "취소표 대기는 어떻게 하나요?",
    answer: "매진된 공연의 경우, '취소표 대기하기' 기능을 통해 빈 좌석이 발생했을 때 알림을 받거나 자동으로 대기열에 진입하여 우선적으로 예매할 수 있습니다."
  },
  {
    question: "예매 내역은 어디서 확인하나요?",
    answer: "로그인 후, 마이페이지의 '내 예매' 탭에서 현재 유효한 예매 내역을 확인할 수 있으며, '과거 예매 조회' 탭에서 지난 예매를 확인할 수 있습니다."
  },
  {
    question: "티켓은 배송받을 수 있나요?",
    answer: "현재 모든 예매 티켓은 모바일 스마트 티켓으로 발급됩니다. 별도의 배송 절차 없이 공연 당일 앱 또는 웹의 '내 예매' 페이지에서 바코드를 제시하여 바로 입장하실 수 있습니다."
  },
  {
    question: "고객센터 운영 시간은 어떻게 되나요?",
    answer: "고객센터(1588-0000)는 평일 오전 9시부터 오후 6시까지 운영됩니다. 주말 및 공휴일은 휴무이므로 1:1 문의 게시판을 이용해 주시기 바랍니다."
  }
];

export default function FaqPage() {
  return (
    <div className="flex w-full min-h-screen bg-[#f8f8f8] font-sans flex-col items-center">
      <main className="flex-1 w-full flex flex-col px-6 pt-0 pb-12 md:px-10 md:pb-16 relative">
        <Header />
        
        <div className="max-w-5xl mx-auto w-full mt-8 flex flex-col items-center mb-12">
          <Title 
            title="고객지원 FAQ" 
            bottomBorder={true}
            className="!px-0 !pb-4 mb-4 w-full [&>div]:!px-0 [&_h1]:!text-3xl"
          />
          <p className="text-gray-500 w-full mb-8 text-[15px]">
            자주 묻는 질문들을 모아두었습니다. 원하시는 답변을 찾지 못하셨다면 고객센터로 문의해 주세요.
          </p>

          <div className="w-full flex flex-col gap-4">
            {faqData.map((faq, index) => (
              <Box key={index} variant="flat" padding="medium" className="bg-white border border-gray-100 rounded-xl w-full shadow-sm hover:shadow-md transition-shadow">
                <details className="group">
                  <summary className="flex items-center justify-between font-bold cursor-pointer list-none text-gray-800 hover:text-blue-600 transition-colors">
                    <span className="text-[16px] flex items-center gap-2">
                      <span className="text-blue-500">Q.</span>
                      {faq.question}
                    </span>
                    <span className="transition group-open:rotate-180 text-gray-400">
                      <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                    </span>
                  </summary>
                  <p className="text-gray-600 mt-4 pt-4 border-t border-gray-50 group-open:animate-fadeIn leading-relaxed flex gap-2 text-[15px]">
                    <span className="font-bold text-blue-500/50">A.</span>
                    {faq.answer}
                  </p>
                </details>
              </Box>
            ))}
          </div>
        </div>

        <Footer />
      </main>
      <MobileBottomNav />
    </div>
  );
}
