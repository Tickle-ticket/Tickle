import React, { useState } from 'react';
import Image from 'next/image';

interface PayMethodStepProps {
  selectedPayMethod: string | null;
  setSelectedPayMethod: (method: string | null) => void;
}

/**
 * 결제 수단 선택 단계 콘텐츠.
 * PaymentStep 내부에서 bookingStep === 'PAY_METHOD' 일 때 렌더링됩니다.
 */
export const PayMethodStep: React.FC<PayMethodStepProps> = ({
  selectedPayMethod,
  setSelectedPayMethod,
}) => {
  const [payCategory, setPayCategory] = useState<'pay' | 'other'>('pay');

  const payMethods = [
    {
      id: 'kakaopay', label: '카카오페이',
      selectedColor: 'border-[#FEE500] bg-[#FEE500] text-[#381E1F]',
      icon: <Image src="/images/payment_icon_yellow_small.png" alt="카카오페이" width={60} height={20} className="h-5 object-contain mr-2" style={{ width: 'auto' }} />,
      disabled: false
    },
    {
      id: 'naverpay', label: '네이버페이',
      selectedColor: 'border-[#03C75A] bg-[#03C75A] text-white',
      icon: <Image src="/images/logo_npaybk_large.svg" alt="네이버페이" width={60} height={20} className="h-5 object-contain mr-2" style={{ width: 'auto' }} />,
      disabled: true
    },
    {
      id: 'tosspay', label: '토스페이',
      selectedColor: 'border-[#3182F6] bg-[#3182F6] text-white',
      icon: <Image src="/images/Toss_Symbol_Primary.png" alt="토스페이" width={60} height={20} className="h-5 object-contain mr-2" style={{ width: 'auto' }} />,
      disabled: true
    },
    {
      id: 'payco', label: 'PAYCO',
      selectedColor: 'border-[#E31C18] bg-[#E31C18] text-white',
      icon: <span className="w-5 h-5 flex items-center justify-center bg-surface text-[#E31C18] border border-[#E31C18] rounded-[4px] text-[13px] font-black mr-2 leading-none italic">P</span>,
      disabled: true
    },
  ];

  const otherMethods = [
    { id: 'credit', label: '신용카드', selectedColor: 'border-primary bg-primary text-white shadow-md', icon: null, disabled: true },
    { id: 'bank', label: '계좌이체', selectedColor: 'border-primary bg-primary text-white shadow-md', icon: null, disabled: true },
    { id: 'phone', label: '휴대폰 결제', selectedColor: 'border-primary bg-primary text-white shadow-md', icon: null, disabled: true },
    { id: 'vbank', label: '무통장입금', selectedColor: 'border-primary bg-primary text-white shadow-md', icon: null, disabled: false },
  ];

  const renderMethodGrid = (methods: { id: string, label: string, selectedColor: string, icon: React.ReactNode | null, disabled: boolean }[]) => (
    <div className="px-4 pb-4 pt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
      {methods.map(m => (
        <button
          key={m.id}
          disabled={m.disabled}
          onClick={(e) => { e.stopPropagation(); setSelectedPayMethod(m.id); }}
          className={`relative py-4 rounded-xl font-bold text-sm transition-all border-2 flex items-center justify-center ${m.disabled
            ? 'bg-surface-subtle border-line-subtle text-content-muted opacity-60 cursor-not-allowed'
            : `hover:z-10 ${selectedPayMethod === m.id
              ? `${m.selectedColor} shadow-sm scale-[1.02] z-10`
              : 'bg-surface text-content-secondary border-line hover:border-line-strong z-0'
            }`
            }`}
        >
          {m.icon}
          {m.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="bg-surface rounded-2xl border border-line shadow-sm mb-4 lg:mb-0">
      <div className="px-5 py-4 bg-surface-subtle border-b border-line rounded-t-2xl flex items-center justify-between">
        <h3 className="font-extrabold text-[16px] text-content">결제 수단</h3>
      </div>
      <div className="p-5 flex flex-col gap-3">
        {/* 페이 결제 */}
        <div
          className={`rounded-xl border-2 transition-all cursor-pointer ${payCategory === 'pay' ? 'border-primary bg-primary-subtle' : 'border-line hover:border-line-strong'}`}
          onClick={() => { setPayCategory('pay'); setSelectedPayMethod(null); }}
        >
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${payCategory === 'pay' ? 'border-primary' : 'border-line-strong'}`}>
              {payCategory === 'pay' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
            </div>
            <span className={`font-bold text-sm ${payCategory === 'pay' ? 'text-primary-hover' : 'text-content-secondary'}`}>페이 결제</span>
          </div>
          <div className={`grid transition-all duration-300 ease-in-out ${payCategory === 'pay' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden min-h-0">
              {renderMethodGrid(payMethods)}
            </div>
          </div>
        </div>

        {/* 다른 결제 방법 */}
        <div
          className={`rounded-xl border-2 transition-all cursor-pointer ${payCategory === 'other' ? 'border-primary bg-primary-subtle' : 'border-line hover:border-line-strong'}`}
          onClick={() => { setPayCategory('other'); setSelectedPayMethod(null); }}
        >
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${payCategory === 'other' ? 'border-primary' : 'border-line-strong'}`}>
              {payCategory === 'other' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
            </div>
            <span className={`font-bold text-sm ${payCategory === 'other' ? 'text-primary-hover' : 'text-content-secondary'}`}>다른 결제 방법</span>
          </div>
          <div className={`grid transition-all duration-300 ease-in-out ${payCategory === 'other' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden min-h-0">
              {renderMethodGrid(otherMethods)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
