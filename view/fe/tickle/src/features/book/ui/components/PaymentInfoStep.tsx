import React, { useState } from 'react';
import { Toggle } from '@/src/shared/components/Toggle';

interface PaymentInfoStepProps {
  userProfile: any;
  onCanPay: (canPay: boolean) => void;
}

/**
 * 예매자 정보 입력 + 약관 동의 단계 콘텐츠.
 * PaymentStep 내부에서 bookingStep === 'PAYMENT' 일 때 렌더링됩니다.
 */
export const PaymentInfoStep: React.FC<PaymentInfoStepProps> = ({
  userProfile,
  onCanPay,
}) => {
  const [buyerName, setBuyerName] = useState(userProfile?.name || '');
  const [buyerEmail, setBuyerEmail] = useState(userProfile?.email || '');
  const [buyerPhone, setBuyerPhone] = useState(userProfile?.phoneNumber || '');

  const [agreeAll, setAgreeAll] = useState(false);
  const [agreeTerm1, setAgreeTerm1] = useState(false);
  const [agreeTerm2, setAgreeTerm2] = useState(false);
  const [termExpand1, setTermExpand1] = useState(false);
  const [termExpand2, setTermExpand2] = useState(false);

  React.useEffect(() => {
    if (userProfile) {
      setBuyerName(userProfile.name || '');
      setBuyerEmail(userProfile.email || '');
      setBuyerPhone(userProfile.phoneNumber || '');
    }
  }, [userProfile]);

  const canPay = !!(buyerName.trim() && buyerEmail.trim() && buyerPhone.trim() && agreeTerm1 && agreeTerm2);

  React.useEffect(() => {
    onCanPay(canPay);
  }, [canPay, onCanPay]);

  const handleAgreeAll = (val: boolean) => {
    setAgreeAll(val);
    setAgreeTerm1(val);
    setAgreeTerm2(val);
  };

  return (
    <>
      {/* 예매자 정보 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 rounded-t-2xl">
          <h3 className="font-extrabold text-[16px] text-gray-900">예매자 정보</h3>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <label className="sm:w-24 text-sm font-bold text-gray-600 shrink-0">예매자 이름</label>
            <input type="text" value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="이름 입력"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all placeholder:text-gray-400" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <label className="sm:w-24 text-sm font-bold text-gray-600 shrink-0">이메일</label>
            <input type="email" value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} placeholder="이메일 입력"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all placeholder:text-gray-400" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <label className="sm:w-24 text-sm font-bold text-gray-600 shrink-0">전화번호</label>
            <input type="tel" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} placeholder="전화번호 입력"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all placeholder:text-gray-400" />
          </div>
        </div>
      </div>

      {/* 약관 동의 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-4 lg:mb-0">
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 rounded-t-2xl">
          <h3 className="font-extrabold text-[16px] text-gray-900">약관 동의</h3>
        </div>
        <div className="p-5 flex flex-col gap-3">
          {/* 전체 동의 */}
          <div className="flex items-center gap-3 px-4 py-4 bg-blue-50 rounded-xl border border-blue-200">
            <Toggle checked={agreeAll} onChange={handleAgreeAll} size="small" />
            <span className="font-bold text-blue-700 text-sm">전체 동의합니다.</span>
          </div>

          {/* 예매 이용 약관 */}
          <div className={`rounded-xl border transition-colors ${agreeTerm1 ? 'border-blue-200' : 'border-gray-200'}`}>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Toggle checked={agreeTerm1} onChange={(val) => { setAgreeTerm1(val); if (!val) setAgreeAll(false); else if (agreeTerm2) setAgreeAll(true); }} size="small" />
              <span className="flex-1 text-sm text-gray-700">예매 이용 약관 (필수)</span>
              <button onClick={() => setTermExpand1(!termExpand1)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className={`transition-transform duration-300 text-gray-400 ${termExpand1 ? 'rotate-180' : ''}`}>
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>
            <div className={`grid transition-all duration-300 ease-in-out ${termExpand1 ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="overflow-hidden min-h-0">
                <div className="px-4 pb-4">
                  <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-500 leading-relaxed max-h-32 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <p className="font-bold mb-2">제1조 (목적)</p>
                    <p className="mb-2">이 약관은 티클(이하 &quot;회사&quot;)이 제공하는 온라인 예매 서비스의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>
                    <p className="font-bold mb-2">제2조 (예매 서비스)</p>
                    <p className="mb-2">예매 완료 후 취소 시 취소 수수료가 부과될 수 있으며, 공연일 기준 7일 전까지 무료 취소가 가능합니다. 공연 당일 취소 및 환불은 불가합니다.</p>
                    <p className="font-bold mb-2">제3조 (티켓 양도)</p>
                    <p>예매된 티켓은 타인에게 양도할 수 없으며, 부정 양도 적발 시 입장이 제한될 수 있습니다.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 개인정보 수집 동의 */}
          <div className={`rounded-xl border transition-colors ${agreeTerm2 ? 'border-blue-200' : 'border-gray-200'}`}>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Toggle checked={agreeTerm2} onChange={(val) => { setAgreeTerm2(val); if (!val) setAgreeAll(false); else if (agreeTerm1) setAgreeAll(true); }} size="small" />
              <span className="flex-1 text-sm text-gray-700">개인정보 수집 동의 (필수)</span>
              <button onClick={() => setTermExpand2(!termExpand2)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className={`transition-transform duration-300 text-gray-400 ${termExpand2 ? 'rotate-180' : ''}`}>
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>
            <div className={`grid transition-all duration-300 ease-in-out ${termExpand2 ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="overflow-hidden min-h-0">
                <div className="px-4 pb-4">
                  <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-500 leading-relaxed max-h-32 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <p className="font-bold mb-2">수집 항목</p>
                    <p className="mb-2">예매자 이름, 이메일, 전화번호, 결제 정보</p>
                    <p className="font-bold mb-2">수집 목적</p>
                    <p className="mb-2">예매 확인 및 안내, 본인 확인, 고객 상담, 마케팅 정보 제공 (선택 동의 시)</p>
                    <p className="font-bold mb-2">보유 기간</p>
                    <p>공연 종료 후 3개월까지 보관하며, 관련 법령에 의한 보존이 필요한 경우 해당 기간 동안 보관합니다.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
