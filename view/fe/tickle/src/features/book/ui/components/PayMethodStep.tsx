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
      icon: <span className="w-5 h-5 flex items-center justify-center bg-white text-[#E31C18] border border-[#E31C18] rounded-[4px] text-[13px] font-black mr-2 leading-none italic">P</span>,
      disabled: true
    },
  ];

  const otherMethods = [
    { id: 'credit', label: '신용카드', selectedColor: 'border-blue-500 bg-blue-500 text-white shadow-md', icon: null, disabled: true },
    { id: 'bank', label: '계좌이체', selectedColor: 'border-blue-500 bg-blue-500 text-white shadow-md', icon: null, disabled: true },
    { id: 'phone', label: '휴대폰 결제', selectedColor: 'border-blue-500 bg-blue-500 text-white shadow-md', icon: null, disabled: true },
    { id: 'vbank', label: '무통장입금', selectedColor: 'border-blue-500 bg-blue-500 text-white shadow-md', icon: null, disabled: false },
  ];

  const renderMethodGrid = (methods: { id: string, label: string, selectedColor: string, icon: React.ReactNode | null, disabled: boolean }[]) => (
    <div className="px-4 pb-4 pt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
      {methods.map(m => (
        <button
          key={m.id}
          disabled={m.disabled}
          onClick={(e) => { e.stopPropagation(); setSelectedPayMethod(m.id); }}
          className={`relative py-4 rounded-xl font-bold text-sm transition-all border-2 flex items-center justify-center ${m.disabled
            ? 'bg-gray-50 border-gray-100 text-gray-400 opacity-60 cursor-not-allowed'
            : `hover:z-10 ${selectedPayMethod === m.id
              ? `${m.selectedColor} shadow-sm scale-[1.02] z-10`
              : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400 z-0'
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
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-4 lg:mb-0">
      <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 rounded-t-2xl flex items-center justify-between">
        <h3 className="font-extrabold text-[16px] text-gray-900">결제 수단</h3>
      </div>
      <div className="p-5 flex flex-col gap-3">
        {/* 페이 결제 */}
        <div
          className={`rounded-xl border-2 transition-all cursor-pointer ${payCategory === 'pay' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
          onClick={() => { setPayCategory('pay'); setSelectedPayMethod(null); }}
        >
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${payCategory === 'pay' ? 'border-blue-500' : 'border-gray-300'}`}>
              {payCategory === 'pay' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
            </div>
            <span className={`font-bold text-sm ${payCategory === 'pay' ? 'text-blue-700' : 'text-gray-700'}`}>페이 결제</span>
          </div>
          <div className={`grid transition-all duration-300 ease-in-out ${payCategory === 'pay' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden min-h-0">
              {renderMethodGrid(payMethods)}
            </div>
          </div>
        </div>

        {/* 다른 결제 방법 */}
        <div
          className={`rounded-xl border-2 transition-all cursor-pointer ${payCategory === 'other' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
          onClick={() => { setPayCategory('other'); setSelectedPayMethod(null); }}
        >
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${payCategory === 'other' ? 'border-blue-500' : 'border-gray-300'}`}>
              {payCategory === 'other' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
            </div>
            <span className={`font-bold text-sm ${payCategory === 'other' ? 'text-blue-700' : 'text-gray-700'}`}>다른 결제 방법</span>
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
