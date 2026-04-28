import React from 'react';

export const Footer = () => {
  return (
    <footer className="shrink-0 mt-16 bg-white border-t border-gray-100 py-12 px-8 md:px-12 text-gray-500 text-sm -mx-6 -mb-12 md:-mx-10 md:-mb-16">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between gap-8">
        
        {/* Left Side: Brand and Info */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-2xl font-black text-gray-900 tracking-tighter">
            TICKLE
          </div>
          <div className="flex flex-col gap-1 text-gray-400">
            <p>(주)다들어와사람만 | 대표: SSAFY</p>
            <p>사업자등록번호: 123-45-67890 | 통신판매업신고: 2026-서울강남-1234</p>
            <p>주소: 대한민국 서울특별시 강남구 테헤란로 212 멀티캠퍼스 8층 203</p>
            <p>고객센터: 1588-0000</p>
          </div>
        </div>

        {/* Right Side: Links */}
        <div className="flex gap-12">
          {/* Service Links */}
          <div className="flex flex-col gap-3">
            <h3 className="text-gray-900 font-bold mb-1">서비스</h3>
            <a href="#" className="hover:text-blue-600 transition-colors">공지사항</a>
            <a href="#" className="hover:text-blue-600 transition-colors">이용약관</a>
            <a href="#" className="font-bold text-gray-700 hover:text-blue-600 transition-colors">개인정보처리방침</a>
            <a href="#" className="hover:text-blue-600 transition-colors">FAQ</a>
          </div>

          {/* Social Links (Placeholders) */}
          <div className="flex flex-col gap-3">
            <h3 className="text-gray-900 font-bold mb-1">소셜</h3>
            <a href="#" className="hover:text-blue-600 transition-colors">Instagram</a>
            <a href="#" className="hover:text-blue-600 transition-colors">YouTube</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Twitter</a>
          </div>
        </div>

      </div>

      <div className="max-w-6xl mx-auto mt-12 pt-6 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-400">
        <p>© 2026 TICKLE. All rights reserved.</p>
        <div className="flex gap-4">
          <span className="cursor-pointer hover:text-gray-900 transition-colors">한국어</span>
          <span className="cursor-pointer hover:text-gray-900 transition-colors">English</span>
        </div>
      </div>
    </footer>
  );
};
