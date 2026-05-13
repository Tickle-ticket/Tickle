'use client';

import React from 'react';
import { Header } from '@/src/shared/components/Header';
import { Footer } from '@/src/shared/components/Footer';
import { MobileBottomNav } from '@/src/shared/components/MobileBottomNav';
import { Title } from '@/src/shared/components/Title';
import { Box } from '@/src/shared/components/Box';

export default function TermsPage() {
  return (
    <div className="flex w-full min-h-screen bg-[#f8f8f8] font-sans flex-col items-center">
      <main className="flex-1 w-full flex flex-col px-6 pt-0 pb-12 md:px-10 md:pb-16 relative">
        <Header />
        
        <div className="max-w-5xl mx-auto w-full mt-8 flex flex-col mb-12">
          <Title 
            title="이용약관" 
            bottomBorder={true}
            className="!px-0 !pb-4 mb-8 w-full [&>div]:!px-0 [&_h1]:!text-3xl"
          />
          
          <Box variant="flat" padding="large" className="bg-surface border border-line-subtle rounded-xl w-full text-content-secondary leading-relaxed text-[15px] shadow-sm">
            <h2 className="text-xl font-bold text-content mb-4">제1조 (목적)</h2>
            <p className="mb-8">
              본 약관은 (주)다들어와사람만(이하 "회사")가 운영하는 TICKLE 서비스(이하 "서비스")를 이용함에 있어 회사와 회원 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
            </p>

            <h2 className="text-xl font-bold text-content mb-4">제2조 (용어의 정의)</h2>
            <p className="mb-8">
              ① "서비스"란 회사가 제공하는 공연 티켓 예매, 콘텐츠 제공 및 기타 관련된 모든 온라인 서비스를 의미합니다.<br />
              ② "회원"이란 본 약관에 동의하고 회사와 서비스 이용계약을 체결한 자를 의미합니다.<br />
              ③ "아이디(ID)"란 회원의 식별과 서비스 이용을 위하여 회원이 정하고 회사가 승인하는 문자와 숫자의 조합을 의미합니다.
            </p>

            <h2 className="text-xl font-bold text-content mb-4">제3조 (약관의 효력 및 변경)</h2>
            <p className="mb-8">
              ① 본 약관은 서비스를 이용하고자 하는 모든 회원에 대하여 그 효력을 발생합니다.<br />
              ② 회사는 관련 법령을 위배하지 않는 범위 내에서 본 약관을 개정할 수 있으며, 개정된 약관은 적용일자 7일 전부터 서비스 화면에 공지합니다.
            </p>

            <h2 className="text-xl font-bold text-content mb-4">제4조 (회원가입 및 계정 관리)</h2>
            <p className="mb-8">
              ① 회원가입은 서비스 이용을 희망하는 자가 약관에 동의하고 회원가입 양식을 작성하여 제출함으로써 이루어집니다.<br />
              ② 회원은 자신의 아이디와 비밀번호를 안전하게 관리할 책임이 있으며, 이를 제3자에게 양도하거나 대여할 수 없습니다.
            </p>

            <h2 className="text-xl font-bold text-content mb-4">제5조 (서비스의 제공 및 변경)</h2>
            <p className="mb-8">
              ① 회사는 연중무휴 1일 24시간 서비스 제공을 원칙으로 합니다. 단, 시스템 정기점검 등의 사유로 서비스가 일시 중단될 수 있습니다.<br />
              ② 회사는 운영상, 기술상의 필요에 따라 제공하고 있는 서비스의 전부 또는 일부를 변경할 수 있습니다.
            </p>
            
            <h2 className="text-xl font-bold text-content mb-4">제6조 (결제 및 환불)</h2>
            <p className="mb-8">
              ① 회원은 회사가 제공하는 결제수단을 통하여 티켓을 예매할 수 있습니다.<br />
              ② 예매 취소 및 환불은 회사가 별도로 정한 취소 규정에 따르며, 취소 시점에 따라 수수료가 발생할 수 있습니다.
            </p>
          </Box>
        </div>

        <Footer />
      </main>
      <MobileBottomNav />
    </div>
  );
}
