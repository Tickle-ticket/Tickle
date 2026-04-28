import { LoadMetricGaugePanel } from '@/src/shared/components/LoadMetricGaugePanel';
import { ServerMonitoringChart } from '@/src/shared/components/ServerMonitoringChart';
import type { LoadMetricGauge } from '@/src/shared/components/LoadMetricGaugePanel';
import type { ServerMonitoringPoint } from '@/src/shared/components/ServerMonitoringChart';

const serverMonitoringData: ServerMonitoringPoint[] = [
  { time: '13:00', activeUsers: 1260, mtps: 28920, mttrMinutes: 18, p95LatencyMs: 212, errorRatePercent: 0.4 },
  { time: '13:05', activeUsers: 1384, mtps: 31560, mttrMinutes: 17, p95LatencyMs: 238, errorRatePercent: 0.5 },
  { time: '13:10', activeUsers: 1512, mtps: 34440, mttrMinutes: 16, p95LatencyMs: 265, errorRatePercent: 0.7 },
  { time: '13:15', activeUsers: 1698, mtps: 38280, mttrMinutes: 15, p95LatencyMs: 304, errorRatePercent: 1.1 },
  { time: '13:20', activeUsers: 1886, mtps: 42360, mttrMinutes: 14, p95LatencyMs: 342, errorRatePercent: 1.4 },
  { time: '13:25', activeUsers: 2054, mtps: 44520, mttrMinutes: 13, p95LatencyMs: 318, errorRatePercent: 1.2 },
  { time: '13:30', activeUsers: 2188, mtps: 48720, mttrMinutes: 11, p95LatencyMs: 286, errorRatePercent: 0.9 },
  { time: '13:35', activeUsers: 2240, mtps: 50160, mttrMinutes: 10, p95LatencyMs: 292, errorRatePercent: 0.8 },
  { time: '13:40', activeUsers: 2164, mtps: 48240, mttrMinutes: 9, p95LatencyMs: 276, errorRatePercent: 0.6 },
  { time: '13:45', activeUsers: 2036, mtps: 45960, mttrMinutes: 9, p95LatencyMs: 248, errorRatePercent: 0.5 },
  { time: '13:50', activeUsers: 1912, mtps: 43440, mttrMinutes: 8, p95LatencyMs: 232, errorRatePercent: 0.4 },
  { time: '13:55', activeUsers: 1798, mtps: 41400, mttrMinutes: 8, p95LatencyMs: 226, errorRatePercent: 0.4 },
  { time: '14:00', activeUsers: 1726, mtps: 39840, mttrMinutes: 7, p95LatencyMs: 218, errorRatePercent: 0.3 },
];

const serverMetricGauges: LoadMetricGauge[] = [
  {
    id: 'transactions-per-second',
    label: '초당 트랜잭션',
    value: 664,
    unit: '건/s',
    max: 1000,
    tone: 'green',
    thresholds: [
      { value: 0, color: '#22c55e' },
      { value: 760, color: '#f97316' },
      { value: 920, color: '#dc2626' },
    ],
  },
  {
    id: 'p95-latency',
    label: 'p95 응답시간',
    value: 218,
    unit: 'ms',
    max: 600,
    tone: 'green',
    thresholds: [
      { value: 0, color: '#22c55e' },
      { value: 300, color: '#f97316' },
      { value: 450, color: '#dc2626' },
    ],
  },
  {
    id: 'http-error-rate',
    label: 'HTTP 에러율',
    value: 0.3,
    unit: '%',
    max: 5,
    tone: 'green',
    decimals: 1,
    thresholds: [
      { value: 0, color: '#22c55e' },
      { value: 1.5, color: '#f97316' },
      { value: 3, color: '#dc2626' },
    ],
  },
  {
    id: 'mtps',
    label: 'MTPS',
    value: 50160,
    unit: '건/분',
    max: 60000,
    tone: 'orange',
    thresholds: [
      { value: 0, color: '#22c55e' },
      { value: 45000, color: '#f97316' },
      { value: 56000, color: '#dc2626' },
    ],
  },
  {
    id: 'mttr',
    label: 'MTTR',
    value: 7,
    unit: '분',
    max: 30,
    tone: 'green',
    thresholds: [
      { value: 0, color: '#22c55e' },
      { value: 15, color: '#f97316' },
      { value: 24, color: '#dc2626' },
    ],
  },
];

const serverEvents = [
  {
    metric: 'p95 response time',
    service: 'tickle-api',
    value: '318ms',
    status: '주의',
    date: '2026.04.23 13:25',
    message: '피크 유입 구간에서 응답 지연이 일시적으로 증가했습니다.',
  },
  {
    metric: 'HTTP error rate',
    service: 'payment-api',
    value: '1.2%',
    status: '정상화',
    date: '2026.04.23 13:31',
    message: '결제 재시도 정책 적용 후 오류율이 안정 범위로 복귀했습니다.',
  },
  {
    metric: 'MTPS',
    service: 'ticket-api',
    value: '50,160건/분',
    status: '정상',
    date: '2026.04.23 13:35',
    message: '분당 최대 처리량이 예상 범위 안에서 유지되고 있습니다.',
  },
  {
    metric: 'MTTR',
    service: 'incident-response',
    value: '7분',
    status: '정상',
    date: '2026.04.23 14:00',
    message: '최근 장애 복구 시간이 목표 기준 안으로 유지되고 있습니다.',
  },
  {
    metric: 'Active users',
    service: 'gateway',
    value: '2,240명',
    status: '정상',
    date: '2026.04.23 13:35',
    message: '동시 접속 피크 이후 안정적으로 감소 중입니다.',
  },
];

const statusStyle: Record<string, string> = {
  정상: 'bg-emerald-50 text-emerald-600',
  정상화: 'bg-blue-50 text-blue-600',
  주의: 'bg-orange-50 text-orange-600',
  위험: 'bg-red-50 text-red-600',
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value);
}

export default function ServerMonitoringPage() {
  const peakActiveUsers = Math.max(...serverMonitoringData.map((point) => point.activeUsers));
  const attentionCount = serverEvents.filter((event) => event.status === '주의').length;

  const operationalHighlights = [
    {
      label: '피크 접속',
      value: `${formatNumber(peakActiveUsers)}명`,
      caption: '최근 1시간 최고치',
    },
    {
      label: '주의 이벤트',
      value: `${attentionCount}건`,
      caption: '즉시 확인 필요',
    },
    {
      label: '최근 복구 시간',
      value: `${serverMetricGauges.find((metric) => metric.id === 'mttr')?.value ?? 0}분`,
      caption: '목표 기준 이내',
    },
  ];

  return (
    <div className="space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <header className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-bold text-blue-600">서버 모니터링</p>
          <h1 className="mt-1 text-2xl font-black tracking-normal text-slate-950">
            서버 모니터링 대시보드
          </h1>
        </div>
      </header>

      <section className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1.55fr)_320px]">
        <div>
          <ServerMonitoringChart
            data={serverMonitoringData}
            title="실시간 접속자 수"
            subtitle="최근 1시간 활성 접속자 수 변화"
          />
        </div>

        <div className="h-full">
          <aside className="flex h-full flex-col rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <label className="flex flex-col gap-2">
              <span className="text-[12px] font-black text-slate-500">서비스 선택</span>
              <select className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white">
                <option>전체 서비스</option>
                <option>tickle-api</option>
                <option>ticket-api</option>
                <option>payment-api</option>
              </select>
            </label>

            <div className="mt-5 flex flex-1 flex-col gap-3">
              {operationalHighlights.map((item) => (
                <div key={item.label} className="flex flex-1 flex-col justify-center rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                  <p className="mt-2 text-[24px] font-black tracking-tight text-slate-950">{item.value}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">{item.caption}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <header className="px-1">
          <h2 className="text-[16px] font-black leading-6 tracking-tight text-slate-950">
            서버 핵심 지표
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            한계치에 가까워지는 항목을 빠르게 읽을 수 있도록 게이지 카드로 정리했습니다.
          </p>
        </header>
        <div className="mt-4">
          <LoadMetricGaugePanel metrics={serverMetricGauges} />
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white/80 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <header className="border-b border-slate-200/80 px-5 py-4">
          <h2 className="text-[16px] font-black leading-6 tracking-tight text-slate-950">
            서버 이벤트 로그
          </h2>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] table-auto text-left text-sm">
            <thead className="bg-slate-50/90 text-slate-500">
              <tr>
                <th className="px-5 py-3 font-black whitespace-nowrap">메트릭</th>
                <th className="px-5 py-3 font-black whitespace-nowrap">서비스</th>
                <th className="px-5 py-3 font-black whitespace-nowrap">값</th>
                <th className="px-5 py-3 font-black whitespace-nowrap">일자</th>
                <th className="px-5 py-3 font-black whitespace-nowrap">처리상태</th>
                <th className="px-5 py-3 font-black">내용</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {serverEvents.map((event) => (
                <tr key={`${event.metric}-${event.date}`} className="align-top">
                  <td className="px-5 py-4 font-black text-slate-900 whitespace-nowrap">{event.metric}</td>
                  <td className="px-5 py-4 font-semibold text-slate-500 whitespace-nowrap">{event.service}</td>
                  <td className="px-5 py-4 font-black text-slate-900 whitespace-nowrap">{event.value}</td>
                  <td className="px-5 py-4 font-semibold text-slate-500 whitespace-nowrap">{event.date}</td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-black ${
                        statusStyle[event.status] ?? 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {event.status}
                    </span>
                  </td>
                  <td className="min-w-[420px] px-5 py-4 font-semibold leading-6 text-slate-600">
                    {event.message}
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
