'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface ServerMonitoringPoint {
  time: string;
  activeUsers: number;
  mtps: number;
  mttrMinutes: number;
  p95LatencyMs: number;
  errorRatePercent: number;
}

export interface ServerMonitoringChartProps {
  data: ServerMonitoringPoint[];
  title?: string;
  subtitle?: string;
  height?: number;
}

function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits,
  }).format(value);
}

export function ServerMonitoringChart({
  data,
  title = '실시간 접속자 수',
  subtitle = '최근 1시간 활성 접속자 추이',
  height = 360,
}: ServerMonitoringChartProps) {
  const latest = data[data.length - 1];
  const previous = data[data.length - 2] ?? latest;
  const currentActiveUsers = latest?.activeUsers ?? 0;
  const activeUserDiff = latest && previous ? latest.activeUsers - previous.activeUsers : 0;
  const peakActiveUsers = Math.max(0, ...data.map((point) => point.activeUsers));
  const averageActiveUsers =
    data.length > 0
      ? Math.round(data.reduce((sum, point) => sum + point.activeUsers, 0) / data.length)
      : 0;

  return (
    <section className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
      <header className="border-b border-slate-200 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-blue-600">Server monitoring</p>
            <h2 className="mt-1 truncate text-[20px] font-black leading-7 tracking-normal text-slate-950">
              {title}
            </h2>
            <p className="mt-1 text-[12px] font-semibold leading-5 text-slate-500">{subtitle}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[560px]">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-bold text-slate-500">현재 접속</p>
              <p className="mt-1 text-[24px] font-black leading-8 text-slate-950">
                {formatNumber(currentActiveUsers)}
                <span className="ml-1 text-[12px] font-bold text-slate-500">명</span>
              </p>
              <p className={`mt-1 text-[11px] font-black ${activeUserDiff >= 0 ? 'text-blue-600' : 'text-slate-500'}`}>
                {activeUserDiff >= 0 ? '+' : ''}
                {formatNumber(activeUserDiff)}명
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-bold text-slate-500">피크 접속</p>
              <p className="mt-1 text-[24px] font-black leading-8 text-blue-600">
                {formatNumber(peakActiveUsers)}
                <span className="ml-1 text-[12px] font-bold text-slate-500">명</span>
              </p>
              <p className="mt-1 text-[11px] font-black text-slate-500">
                최근 1시간
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-bold text-slate-500">평균 접속</p>
              <p className="mt-1 text-[24px] font-black leading-8 text-emerald-600">
                {formatNumber(averageActiveUsers)}
                <span className="ml-1 text-[12px] font-bold text-slate-500">명</span>
              </p>
              <p className="mt-1 text-[11px] font-black text-slate-500">
                샘플 평균
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-5">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4" style={{ height }}>
          <ResponsiveContainer>
            <AreaChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="serverActiveUsersFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 8" vertical={false} />
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                minTickGap={22}
              />
              <YAxis
                yAxisId="traffic"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                tickFormatter={(value) => formatNumber(Number(value))}
                width={56}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  boxShadow: '0 16px 40px rgba(15,23,42,0.12)',
                }}
                formatter={(value, name) => {
                  const numericValue = Number(value);

                  return [`${formatNumber(numericValue)}명`, name];
                }}
                labelStyle={{ color: '#475569', fontWeight: 800 }}
              />
              <Area
                dataKey="activeUsers"
                fill="url(#serverActiveUsersFill)"
                name="활성 접속자"
                stroke="#2563eb"
                strokeWidth={2.5}
                type="monotone"
                yAxisId="traffic"
                dot={false}
                activeDot={{ r: 4, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

export default ServerMonitoringChart;
