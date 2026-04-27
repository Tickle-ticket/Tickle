import { test, expect } from '@playwright/test';

test('메인 페이지 접속 및 타이틀 확인', async ({ page }) => {
  // 1. 서비스 주소로 이동
  await page.goto('https://k14a203.p.ssafy.io');

  // 2. 페이지 타이틀에 'tickle'이 포함되어 있는지 확인
  await expect(page).toHaveTitle(/tickle/i);

  // 3. (예시) 특정 버튼이 보이는지 확인
  const loginButton = page.getByRole('button', { name: '로그인' });
  await expect(loginButton).toBeVisible();
});