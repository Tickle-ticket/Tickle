'use client';

import React from 'react';
import { Header } from '@/src/shared/components/Header';
import { Footer } from '@/src/shared/components/Footer';
import { MobileBottomNav } from '@/src/shared/components/MobileBottomNav';
import { Title } from '@/src/shared/components/Title';
import { Box } from '@/src/shared/components/Box';

export default function PrivacyPage() {
  return (
    <div className="flex w-full min-h-screen bg-[#f8f8f8] font-sans flex-col items-center">
      <main className="flex-1 w-full flex flex-col px-6 pt-0 pb-12 md:px-10 md:pb-16 relative">
        <Header />
        
        <div className="max-w-5xl mx-auto w-full mt-8 flex flex-col mb-12">
          <Title 
            title="개인정보처리방침" 
            bottomBorder={true}
            className="!px-0 !pb-4 mb-8 w-full [&>div]:!px-0 [&_h1]:!text-3xl"
          />
          
          <Box variant="flat" padding="large" className="bg-surface border border-line-subtle rounded-xl w-full text-content-secondary leading-relaxed text-[15px] shadow-sm">
            <h2 className="text-xl font-bold text-content mb-4">1. 개인정보의 처리 목적</h2>
            <p className="mb-8">
              (주)다들어와사람만 (이하 '회사')은(는) 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며 이용 목적이 변경되는 경우에는 「개인정보 보호법」 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
              <br /><br />
              <strong className="text-content-secondary">① 홈페이지 회원가입 및 관리</strong><br />
              회원 가입의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증, 회원자격 유지·관리, 서비스 부정이용 방지, 만14세 미만 아동 개인정보 수집 시 법정대리인 동의 여부 확인, 각종 고지·통지, 고충처리 등을 목적으로 개인정보를 처리합니다.
              <br /><br />
              <strong className="text-content-secondary">② 재화 또는 서비스 제공</strong><br />
              티켓 예매, 콘텐츠 제공, 맞춤 서비스 제공, 요금결제·정산 등을 목적으로 개인정보를 처리합니다.
            </p>

            <h2 className="text-xl font-bold text-content mb-4">2. 수집하는 개인정보 항목</h2>
            <p className="mb-8">
              회사는 회원가입, 상담, 서비스 신청 등을 위해 아래와 같은 개인정보를 수집하고 있습니다.
              <br /><br />
              - <strong className="text-content-secondary">필수 항목</strong> : 이메일, 비밀번호, 이름, 휴대전화번호<br />
              - <strong className="text-content-secondary">선택 항목</strong> : 관심 장르, 프로필 이미지<br />
              - <strong className="text-content-secondary">자동 수집 항목</strong> : 서비스 이용기록, 접속 로그, 쿠키, 접속 IP 정보, 결제기록
            </p>

            <h2 className="text-xl font-bold text-content mb-4">3. 개인정보의 처리 및 보유 기간</h2>
            <p className="mb-8">
              ① 회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
              <br /><br />
              ② 각각의 개인정보 처리 및 보유 기간은 다음과 같습니다.
              <br />
              - 회원 가입 및 관리 : 홈페이지 탈퇴 시까지<br />
              (단, 관계 법령 위반에 따른 수사·조사 등이 진행중인 경우에는 해당 수사·조사 종료 시까지, 채권·채무관계 잔존 시에는 정산 시까지)<br />
              - 재화 또는 서비스 제공 : 재화·서비스 공급완료 및 요금결제·정산 완료시까지
            </p>

            <h2 className="text-xl font-bold text-content mb-4">4. 개인정보의 파기절차 및 파기방법</h2>
            <p className="mb-8">
              회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 파기절차 및 방법은 다음과 같습니다.
              <br /><br />
              - <strong className="text-content-secondary">파기절차</strong>: 이용자가 입력한 정보는 목적 달성 후 별도의 DB에 옮겨져 내부 방침 및 기타 관련 법령에 따라 일정기간 저장된 후 즉시 파기됩니다. DB로 옮겨진 개인정보는 법률에 의한 경우가 아니고서는 다른 목적으로 이용되지 않습니다.
              <br />
              - <strong className="text-content-secondary">파기방법</strong>: 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용합니다. 종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각을 통하여 파기합니다.
            </p>

            <h2 className="text-xl font-bold text-content mb-4">5. 개인정보 보호책임자</h2>
            <p className="bg-surface-subtle p-4 rounded-lg border border-line-subtle">
              회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
              <br /><br />
              - 성명 : SSAFY<br />
              - 직책 : (주)다들어와사람만 대표이사<br />
              - 연락처 : 1588-0000<br />
              - 이메일 : privacy@tickle-ticket.co.kr<br />
            </p>
          </Box>
        </div>

        <Footer />
      </main>
      <MobileBottomNav />
    </div>
  );
}
