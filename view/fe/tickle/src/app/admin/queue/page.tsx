import { QueueStatusChart } from '@/src/features/admin/ui/QueueStatusChart';
import type { QueueStatusPoint } from '@/src/features/admin/ui/QueueStatusChart';

const queueStatusData: QueueStatusPoint[] = [
  { time: '13:00', waitingUsers: 860, incomingUsers: 132, admittedUsers: 96, estimatedWaitMinutes: 8 },
  { time: '13:05', waitingUsers: 1040, incomingUsers: 168, admittedUsers: 112, estimatedWaitMinutes: 10 },
  { time: '13:10', waitingUsers: 1380, incomingUsers: 214, admittedUsers: 126, estimatedWaitMinutes: 14 },
  { time: '13:15', waitingUsers: 1720, incomingUsers: 238, admittedUsers: 142, estimatedWaitMinutes: 17 },
  { time: '13:20', waitingUsers: 2110, incomingUsers: 286, admittedUsers: 158, estimatedWaitMinutes: 21 },
  { time: '13:25', waitingUsers: 2480, incomingUsers: 304, admittedUsers: 176, estimatedWaitMinutes: 25 },
  { time: '13:30', waitingUsers: 2760, incomingUsers: 296, admittedUsers: 204, estimatedWaitMinutes: 26 },
  { time: '13:35', waitingUsers: 2680, incomingUsers: 218, admittedUsers: 236, estimatedWaitMinutes: 24 },
  { time: '13:40', waitingUsers: 2410, incomingUsers: 192, admittedUsers: 252, estimatedWaitMinutes: 21 },
  { time: '13:45', waitingUsers: 2140, incomingUsers: 174, admittedUsers: 246, estimatedWaitMinutes: 18 },
  { time: '13:50', waitingUsers: 1870, incomingUsers: 156, admittedUsers: 228, estimatedWaitMinutes: 15 },
  { time: '13:55', waitingUsers: 1620, incomingUsers: 142, admittedUsers: 214, estimatedWaitMinutes: 13 },
  { time: '14:00', waitingUsers: 1390, incomingUsers: 128, admittedUsers: 198, estimatedWaitMinutes: 11 },
];

const queueSummary = [
  { label: '총 대기 진입', value: '18,420', caption: '최근 1시간' },
  { label: '현재 대기', value: '1,390', caption: '전 구간 대비 -230' },
  { label: '평균 대기', value: '11분', caption: '목표 15분 이하' },
];

const highQueuePerformances = [
  { rank: 1, title: '뮤지컬 Tickle 19:30', date: '2026.04.23', waitingUsers: 1390, estimatedWait: '11분' },
  { rank: 2, title: 'SSAFY Concert 20:00', date: '2026.04.23', waitingUsers: 1184, estimatedWait: '14분' },
  { rank: 3, title: 'Developer Meetup Live', date: '2026.04.24', waitingUsers: 842, estimatedWait: '8분' },
  { rank: 4, title: 'Spring Festival Stage', date: '2026.04.24', waitingUsers: 636, estimatedWait: '6분' },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value);
}

export default function QueueMonitoringPage() {
  return (
    <div className="space-y-6 p-5 sm:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-blue-600">대기열 상태 모니터링</p>
          <h1 className="mt-1 text-2xl font-black tracking-normal text-slate-950">
            공연 대기열 상태 대시보드
          </h1>
        </div>

        <label className="flex w-full flex-col gap-2 sm:w-[300px]">
          <span className="text-[12px] font-bold text-slate-500">공연 선택</span>
          <select className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
            <option>뮤지컬 Tickle 19:30</option>
            <option>SSAFY Concert 20:00</option>
            <option>Developer Meetup Live</option>
          </select>
        </label>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {queueSummary.map((item) => (
          <article key={item.label} className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-sm font-bold text-slate-500">{item.label}</p>
            <p className="mt-3 text-3xl font-black text-slate-950">{item.value}</p>
            <p className="mt-2 text-xs font-bold text-slate-500">{item.caption}</p>
          </article>
        ))}
      </section>

      <QueueStatusChart
        data={queueStatusData}
        performanceTitle="뮤지컬 Tickle 19:30"
        performanceMeta="2026.04.23 19:30 / VIP 선예매 대기열"
        capacityPerMinute={210}
        targetWaitingUsers={2400}
      />

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
        <header className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-[16px] font-black leading-6 tracking-normal text-slate-950">
            실시간 대기열 많은 공연 리스트
          </h2>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-3 font-black">순위</th>
                <th className="px-5 py-3 font-black">공연</th>
                <th className="px-5 py-3 font-black">일자</th>
                <th className="px-5 py-3 font-black">대기열 수</th>
                <th className="px-5 py-3 font-black">예상 대기</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {highQueuePerformances.map((performance) => (
                <tr key={performance.title}>
                  <td className="px-5 py-4 font-black text-blue-600">{performance.rank}</td>
                  <td className="px-5 py-4 font-bold text-slate-900">{performance.title}</td>
                  <td className="px-5 py-4 font-semibold text-slate-500">{performance.date}</td>
                  <td className="px-5 py-4 font-black text-slate-900">
                    {formatNumber(performance.waitingUsers)}명
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-black text-orange-600">
                      {performance.estimatedWait}
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
