import React from 'react';
import Link from 'next/link';

export const Footer = () => {
  return (
    <footer className="shrink-0 mt-8 bg-surface border-t border-line-subtle py-4 px-6 md:px-12 text-content-tertiary text-xs -mx-6 -mb-12 md:-mx-10 md:-mb-16">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between gap-4">
        
        {/* Left Side: Brand and Info */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-lg font-black text-content tracking-tighter">
            TICKLE
          </div>
          <div className="flex flex-col gap-0.5 text-content-muted">
            <p>(주)다들어와사람만 | 대표: SSAFY</p>
            <p>사업자등록번호: 123-45-67890 | 통신판매업신고: 2026-서울강남-1234</p>
            <p>주소: 서울 강남구 테헤란로 212 멀티캠퍼스 8층 203 | 고객센터: 1588-0000</p>
          </div>
        </div>

        {/* Right Side: Links */}
        <div className="flex gap-8">
          <div className="flex flex-col gap-1.5">
            <h3 className="text-content font-bold text-xs">서비스</h3>
            <Link href="/support/notice" className="hover:text-primary transition-colors">공지사항</Link>
            <Link href="/support/terms" className="hover:text-primary transition-colors">이용약관</Link>
            <Link href="/support/privacy" className="font-bold text-content-secondary hover:text-primary transition-colors">개인정보처리방침</Link>
            <Link href="/support/faq" className="hover:text-primary transition-colors">FAQ</Link>
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 className="text-content font-bold text-xs">소셜</h3>
            <a href="#" className="hover:text-primary transition-colors">Instagram</a>
            <a href="#" className="hover:text-primary transition-colors">YouTube</a>
            <a href="#" className="hover:text-primary transition-colors">Twitter</a>
          </div>
        </div>

      </div>

      <div className="max-w-6xl mx-auto mt-4 pt-3 border-t border-line-subtle flex flex-col md:flex-row justify-between items-center gap-2 text-content-muted">
        <p>© 2026 TICKLE. All rights reserved.</p>
        <div className="flex gap-4">
          <span className="cursor-pointer hover:text-content transition-colors">한국어</span>
          <span className="cursor-pointer hover:text-content transition-colors">English</span>
        </div>
      </div>
    </footer>
  );
};
