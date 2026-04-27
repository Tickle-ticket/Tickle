'use client';

import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface QueueStatusPoint {
  time: string;
  waitingUsers: number;
  incomingUsers: number;
  admittedUsers: number;
  estimatedWaitMinutes: number;
}

export interface QueueStatusChartProps {
  data: QueueStatusPoint[];
  performanceTitle: string;
  performanceMeta?: string;
  capacityPerMinute?: number;
  targetWaitingUsers?: number;
  height?: number;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value);
}

function formatMinutes(value: number) {
  return `${formatNumber(value)}분`;
}

export function QueueStatusChart({
  data,
  performanceTitle,
  performanceMeta,
  capacityPerMinute,
  targetWaitingUsers,
  height = 360,
}: QueueStatusChartProps) {
  const latest = data[data.length - 1];
  const previous = data[data.length - 2] ?? latest;
  const peakWaitingUsers = Math.max(0, ...data.map((point) => point.waitingUsers));
  const currentWaitingUsers = latest?.waitingUsers ?? 0;
  const waitingDiff = latest && previous ? latest.waitingUsers - previous.waitingUsers : 0;
  const latestIncomingUsers = latest?.incomingUsers ?? 0;
  const latestAdmittedUsers = latest?.admittedUsers ?? 0;
  const latestEstimatedWaitMinutes = latest?.estimatedWaitMinutes ?? 0;
  const throughputGap = latestAdmittedUsers - latestIncomingUsers;

  return (
    <section className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
      <header className="border-b border-slate-200 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-blue-600">Queue status</p>
            <h2 className="mt-1 truncate text-[20px] font-black leading-7 tracking-normal text-slate-950">
              {performanceTitle}
            </h2>
            {performanceMeta ? (
              <p className="mt-1 text-[12px] font-semibold leading-5 text-slate-500">{performanceMeta}</p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[560px] xl:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-bold text-slate-500">현재 대기</p>
              <p className="mt-1 text-[24px] font-black leading-8 text-slate-950">
                {formatNumber(currentWaitingUsers)}
                <span className="ml-1 text-[12px] font-bold text-slate-500">명</span>
              </p>
              <p className={`mt-1 text-[11px] font-black ${waitingDiff >= 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                {waitingDiff >= 0 ? '+' : ''}
                {formatNumber(waitingDiff)}명
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-bold text-slate-500">피크 대기</p>
              <p className="mt-1 text-[24px] font-black leading-8 text-slate-950">
                {formatNumber(peakWaitingUsers)}
                <span className="ml-1 text-[12px] font-bold text-slate-500">명</span>
              </p>
              <p className="mt-1 text-[11px] font-black text-slate-500">
                목표 {formatNumber(targetWaitingUsers ?? peakWaitingUsers)}명
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-bold text-slate-500">분당 입장</p>
              <p className="mt-1 text-[24px] font-black leading-8 text-emerald-600">
                {formatNumber(latestAdmittedUsers)}
                <span className="ml-1 text-[12px] font-bold text-slate-500">명</span>
              </p>
              <p className={`mt-1 text-[11px] font-black ${throughputGap >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                유입 대비 {throughputGap >= 0 ? '+' : ''}
                {formatNumber(throughputGap)}명
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-bold text-slate-500">예상 대기</p>
              <p className="mt-1 text-[24px] font-black leading-8 text-orange-500">
                {formatNumber(latestEstimatedWaitMinutes)}
                <span className="ml-1 text-[12px] font-bold text-slate-500">분</span>
              </p>
              <p className="mt-1 text-[11px] font-black text-slate-500">
                처리량 {formatNumber(capacityPerMinute ?? latestAdmittedUsers)}명/분
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-5">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4" style={{ height }}>
          <ResponsiveContainer>
            <ComposedChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="queueWaitingFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 8" vertical={false} />
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                minTickGap={24}
              />
              <YAxis
                yAxisId="users"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                tickFormatter={(value) => formatNumber(Number(value))}
                width={56}
              />
              <YAxis
                yAxisId="minutes"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                tickFormatter={(value) => formatMinutes(Number(value))}
                width={54}
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

                  if (name === '예상 대기') {
                    return [formatMinutes(numericValue), name];
                  }

                  return [`${formatNumber(numericValue)}명`, name];
                }}
                labelStyle={{ color: '#475569', fontWeight: 800 }}
              />
              <Legend wrapperStyle={{ fontSize: 12, fontWeight: 800, paddingTop: 12 }} />
              {targetWaitingUsers ? (
                <ReferenceLine
                  y={targetWaitingUsers}
                  yAxisId="users"
                  stroke="#ef4444"
                  strokeDasharray="6 6"
                  strokeOpacity={0.75}
                />
              ) : null}
              <Bar
                dataKey="incomingUsers"
                fill="#60a5fa"
                name="분당 유입"
                radius={[4, 4, 0, 0]}
                yAxisId="users"
                isAnimationActive={false}
              />
              <Bar
                dataKey="admittedUsers"
                fill="#22c55e"
                name="분당 입장"
                radius={[4, 4, 0, 0]}
                yAxisId="users"
                isAnimationActive={false}
              />
              <Area
                dataKey="waitingUsers"
                fill="url(#queueWaitingFill)"
                name="대기 인원"
                stroke="#f97316"
                strokeWidth={2.5}
                type="monotone"
                yAxisId="users"
                dot={false}
                activeDot={{ r: 4, fill: '#f97316', stroke: '#ffffff', strokeWidth: 2 }}
                isAnimationActive={false}
              />
              <Line
                dataKey="estimatedWaitMinutes"
                name="예상 대기"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                type="monotone"
                yAxisId="minutes"
                dot={false}
                activeDot={{ r: 4, fill: '#8b5cf6', stroke: '#ffffff', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

export default QueueStatusChart;
