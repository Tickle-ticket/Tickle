import { test, expect } from '@playwright/test';

test('Tickle 전체 플로우 테스트 (홈 -> 마이페이지 -> 상세페이지 -> 결제)', async ({ page }) => {
  // 1. 홈 페이지 접속
  await page.goto('http://localhost:3000/');

  // 1-1. 마이페이지 슬라이드-인 동작 테스트
  // 아바타 아이콘(프로필) 클릭
  const avatar = page.getByTestId('profile-avatar');
  await expect(avatar).toBeVisible();
  await avatar.click();

  // '마이페이지' 버튼 클릭
  const mypageBtn = page.getByRole('button', { name: '마이페이지' });
  await expect(mypageBtn).toBeVisible();
  await mypageBtn.click();

  // 마이페이지 컨텐츠가 렌더링되었는지 확인 (예: '회원 관리' 탭)
  await expect(page.getByText('회원 관리')).toBeVisible();

  // 로고를 클릭하여 다시 홈 화면으로 복귀 (마이페이지 닫힘)
  const logoBtn = page.locator('header svg').first();
  await logoBtn.click();

  // 1-2. 공연 디테일 페이지 진입
  // 인기 랭킹 등의 첫 번째 공연 카드 클릭
  const firstConcertCard = page.locator('article, .shrink-0').filter({ hasText: /./ }).locator('img').first();
  // 약간 대기 후 클릭 (애니메이션 등 안정화)
  await page.waitForTimeout(500);
  await firstConcertCard.click();

  // 디테일 페이지 URL로 넘어갔는지 대략 확인 (예매하기 버튼이 뜰 때까지 대기)
  await expect(page.getByRole('button', { name: '예매하기' }).first()).toBeVisible({ timeout: 10000 });

  // 2. 예매하기 버튼 클릭 (모달 오픈 및 대기열/캡챠 진입)
  const bookButton = page.getByRole('button', { name: '예매하기' }).first();
  await bookButton.click();

  // 3. 보안 인증(CAPTCHA) 모달 대기 및 통과 처리
  // "다음 숫자를 순서대로 누르세요" 텍스트가 나타날 때까지 대기
  await expect(page.getByText('다음 숫자를 순서대로 누르세요')).toBeVisible({ timeout: 15000 });
  
  // 제시된 정답 시퀀스 숫자 읽기
  const targetSpans = page.locator('div.bg-gray-50 > div.flex > span.w-10');
  const count = await targetSpans.count();
  
  for (let i = 0; i < count; i++) {
    const text = await targetSpans.nth(i).textContent();
    if (text && text.trim().length > 0) {
      const num = text.trim();
      // 해당 번호의 키패드 버튼 클릭
      await page.locator(`button[data-track-id="captcha-key-${num}"]`).click();
    }
  }

  // 4. CAPTCHA 통과 후 좌석 선택 단계 진입 확인
  await expect(page.getByText('좌석 선택')).toBeVisible({ timeout: 10000 });

  // 4-1. 관람 일시(날짜/회차) 선택
  // 캘린더에서 클릭 가능한(disabled가 아닌) 첫 번째 날짜 버튼 클릭
  const availableDateBtn = page.locator('button:not([disabled])', { hasText: /^[0-9]{1,2}$/ }).first();
  await availableDateBtn.click();
  
  // 회차 버튼 클릭 (예: "1회차 - 19:00" 등)
  const timeBtn = page.locator('button', { hasText: /회차 -/ }).first();
  await expect(timeBtn).toBeVisible();
  await timeBtn.click();

  // 5. 좌석 클릭 (canvas 요소 중 활성화된 것 첫 번째 클릭)
  // 일시를 선택하면 좌석을 가리던 오버레이가 사라지고 canvas 클릭이 가능해집니다.
  const seatCanvas = page.locator('canvas.cursor-pointer').first();
  await expect(seatCanvas).toBeVisible();
  await seatCanvas.click();

  // 6. 하단 "인원 선택" 버튼 클릭 (우측 패널)
  const peopleSelectButton = page.getByRole('button', { name: '인원 선택' });
  await expect(peopleSelectButton).toBeVisible();
  await peopleSelectButton.click();

  // 7. 인원 선택 단계 진입 확인 및 인원 추가 (+)
  await expect(page.getByText('인원 선택')).toBeVisible();
  
  // 아코디언이 닫혀있다면 클릭해서 열기 (좌석 등급 타이틀 클릭)
  // 보통 자동으로 열려있을 수 있지만 확실히 하기 위해 버튼들 탐색
  const plusButton = page.getByRole('button', { name: '+' }).first();
  
  // 만약 + 버튼이 안 보이면 아코디언 타이틀을 눌러서 엽니다.
  if (!(await plusButton.isVisible())) {
    const accordionTitle = page.locator('button:has-text("석")').first();
    await accordionTitle.click();
  }
  
  await expect(plusButton).toBeVisible();
  await plusButton.click(); // 인원 1명 추가

  // 8. "결제 수단 선택" 버튼 클릭
  const paymentSelectButton = page.getByRole('button', { name: '결제 수단 선택' });
  await expect(paymentSelectButton).toBeVisible();
  await paymentSelectButton.click();

  // 9. 결제 단계 진입 확인 및 결제 수단(토스페이) 선택
  await expect(page.getByText('결제 하기')).toBeVisible();
  const tossPayButton = page.getByText('토스페이').first();
  await tossPayButton.click();

  // 10. 최종 "결제하기" 버튼 클릭
  const finalPayButton = page.getByRole('button', { name: /결제하기/ });
  await expect(finalPayButton).toBeVisible();
  
  // 실제 결제가 발생하지 않도록 클릭만 테스트하거나 대화상자 처리할 수 있음
  await finalPayButton.click();

  // 모든 플로우가 에러 없이 작동했음을 검증
  // (임시 콘솔 동작 등을 확인하거나 추가적인 페이지 전환을 expect할 수 있습니다.)
});