import { BotDetectionChart } from '@/src/shared/components/BotDetectionChart';
import type { BotDetectionPoint } from '@/src/shared/components/BotDetectionChart';

const botDetectionData: BotDetectionPoint[] = [
  { time: '00시', macroAttempts: 8, queueBypassAttempts: 3, abnormalRequests: 12, blockedBots: 21 },
  { time: '02시', macroAttempts: 6, queueBypassAttempts: 2, abnormalRequests: 9, blockedBots: 15 },
  { time: '04시', macroAttempts: 5, queueBypassAttempts: 1, abnormalRequests: 7, blockedBots: 12 },
  { time: '06시', macroAttempts: 11, queueBypassAttempts: 4, abnormalRequests: 16, blockedBots: 29 },
  { time: '08시', macroAttempts: 34, queueBypassAttempts: 12, abnormalRequests: 28, blockedBots: 70 },
  { time: '10시', macroAttempts: 58, queueBypassAttempts: 26, abnormalRequests: 43, blockedBots: 121 },
  { time: '12시', macroAttempts: 72, queueBypassAttempts: 34, abnormalRequests: 51, blockedBots: 149 },
  { time: '14시', macroAttempts: 94, queueBypassAttempts: 48, abnormalRequests: 67, blockedBots: 201 },
  { time: '16시', macroAttempts: 86, queueBypassAttempts: 41, abnormalRequests: 62, blockedBots: 180 },
  { time: '18시', macroAttempts: 132, queueBypassAttempts: 73, abnormalRequests: 96, blockedBots: 289 },
  { time: '20시', macroAttempts: 116, queueBypassAttempts: 64, abnormalRequests: 78, blockedBots: 248 },
  { time: '22시', macroAttempts: 48, queueBypassAttempts: 21, abnormalRequests: 39, blockedBots: 103 },
];

const totalVisitors = 18420;
const detectedBotCount = botDetectionData.reduce(
  (sum, point) => sum + point.macroAttempts + point.queueBypassAttempts + point.abnormalRequests,
  0,
);
const blockedBotCount = botDetectionData.reduce((sum, point) => sum + point.blockedBots, 0);
const blockRate = detectedBotCount > 0 ? (blockedBotCount / detectedBotCount) * 100 : 0;

const summaryItems = [
  { label: '총 접속자 수', value: totalVisitors.toLocaleString('ko-KR'), caption: '오늘 00:00부터 현재까지' },
  { label: '봇 탐지 수', value: detectedBotCount.toLocaleString('ko-KR'), caption: '매크로/우회/비정상 요청' },
  { label: '차단율', value: `${blockRate.toFixed(1)}%`, caption: `${blockedBotCount.toLocaleString('ko-KR')}건 차단` },
];

const detectionReports = [
  {
    category: '매크로 패턴',
    date: '2026.04.23 18:12',
    status: '자동 차단',
    target: '뮤지컬 Tickle 19:30',
    count: 46,
  },
  {
    category: '대기열 우회',
    date: '2026.04.23 18:04',
    status: '검토 필요',
    target: 'SSAFY Concert 20:00',
    count: 18,
  },
  {
    category: '비정상 요청',
    date: '2026.04.23 17:48',
    status: '자동 차단',
    target: 'Developer Meetup Live',
    count: 31,
  },
  {
    category: '매크로 패턴',
    date: '2026.04.23 16:21',
    status: '처리 완료',
    target: 'Spring Festival Stage',
    count: 24,
  },
];

export default function MockBotDetectionPage() {
  return (
    <div className="space-y-6 p-5 sm:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-content-tertiary">Example Mock</p>
          <h1 className="mt-1 text-2xl font-black tracking-normal text-slate-950">
            오늘 탐지된 봇/매크로 대시보드
          </h1>
        </div>

        <label className="flex w-full flex-col gap-2 sm:w-[320px]">
          <span className="text-[12px] font-bold text-content-tertiary">검색</span>
          <input
            className="h-11 rounded-lg border border-line-strong bg-surface px-3 text-sm font-bold text-content outline-none focus:border-primary focus:ring-2 focus:ring-primary-light"
            placeholder="공연명, IP, 계정 ID"
            type="search"
          />
        </label>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {summaryItems.map((item) => (
          <article key={item.label} className="rounded-lg border border-line bg-surface p-5">
            <p className="text-sm font-bold text-content-tertiary">{item.label}</p>
            <p className="mt-3 text-3xl font-black text-slate-950">{item.value}</p>
            <p className="mt-2 text-xs font-bold text-content-tertiary">{item.caption}</p>
          </article>
        ))}
      </section>

      <BotDetectionChart
        data={botDetectionData}
        title="탐지된 봇 그래프"
        subtitle="오늘 시간대별 봇/매크로 탐지 유형과 누적 탐지 건수"
        targetBlockRate={96}
      />

      <section className="overflow-hidden rounded-lg border border-line bg-surface shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
        <header className="border-b border-line px-5 py-4">
          <h2 className="text-[16px] font-black leading-6 tracking-normal text-slate-950">
            신고 및 탐지 내역
          </h2>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-surface-subtle text-content-tertiary">
              <tr>
                <th className="px-5 py-3 font-black">대분류</th>
                <th className="px-5 py-3 font-black">일자</th>
                <th className="px-5 py-3 font-black">공연</th>
                <th className="px-5 py-3 font-black">탐지 건수</th>
                <th className="px-5 py-3 font-black">처리상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {detectionReports.map((report) => (
                <tr key={`${report.category}-${report.date}`}>
                  <td className="px-5 py-4 font-black text-content">{report.category}</td>
                  <td className="px-5 py-4 font-semibold text-content-tertiary">{report.date}</td>
                  <td className="px-5 py-4 font-bold text-content">{report.target}</td>
                  <td className="px-5 py-4 font-black text-content">{report.count}건</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-danger-subtle px-2.5 py-1 text-xs font-black text-danger">
                      {report.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
