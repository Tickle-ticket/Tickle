'use client';

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface BotDetectionPoint {
  time: string;
  macroAttempts: number;
  queueBypassAttempts: number;
  abnormalRequests: number;
  blockedBots: number;
}

export interface BotDetectionChartProps {
  data: BotDetectionPoint[];
  title?: string;
  subtitle?: string;
  targetBlockRate?: number;
  height?: number;
}

interface BotDetectionChartPoint extends BotDetectionPoint {
  totalDetections: number;
  cumulativeDetections: number;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function getChartData(data: BotDetectionPoint[]): BotDetectionChartPoint[] {
  let cumulativeDetections = 0;

  return data.map((point) => {
    const totalDetections = point.macroAttempts + point.queueBypassAttempts + point.abnormalRequests;
    cumulativeDetections += totalDetections;

    return {
      ...point,
      totalDetections,
      cumulativeDetections,
    };
  });
}

export function BotDetectionChart({
  data,
  title = '오늘 탐지된 봇 추이',
  subtitle = '시간대별 매크로, 대기열 우회, 비정상 요청 탐지 건수',
  targetBlockRate = 96,
  height = 360,
}: BotDetectionChartProps) {
  const chartData = getChartData(data);
  const latestPoint = chartData[chartData.length - 1];
  const totalDetections = latestPoint?.cumulativeDetections ?? 0;
  const totalBlockedBots = data.reduce((sum, point) => sum + point.blockedBots, 0);
  const blockRate = totalDetections > 0 ? (totalBlockedBots / totalDetections) * 100 : 0;
  const peakPoint = chartData.reduce<BotDetectionChartPoint | undefined>(
    (peak, point) => (!peak || point.totalDetections > peak.totalDetections ? point : peak),
    undefined,
  );

  return (
    <section className="w-full overflow-hidden rounded-lg border border-line bg-surface shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
      <header className="border-b border-line p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-danger">Bot detection</p>
            <h2 className="mt-1 truncate text-[20px] font-black leading-7 tracking-normal text-slate-950">
              {title}
            </h2>
            <p className="mt-1 text-[12px] font-semibold leading-5 text-content-tertiary">{subtitle}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[560px] xl:grid-cols-4">
            <div className="rounded-lg border border-line bg-surface-subtle px-4 py-3">
              <p className="text-[11px] font-bold text-content-tertiary">오늘 탐지</p>
              <p className="mt-1 text-[24px] font-black leading-8 text-slate-950">
                {formatNumber(totalDetections)}
                <span className="ml-1 text-[12px] font-bold text-content-tertiary">건</span>
              </p>
              <p className="mt-1 text-[11px] font-black text-content-tertiary">
                최근 구간 {formatNumber(latestPoint?.totalDetections ?? 0)}건
              </p>
            </div>

            <div className="rounded-lg border border-line bg-surface-subtle px-4 py-3">
              <p className="text-[11px] font-bold text-content-tertiary">차단 완료</p>
              <p className="mt-1 text-[24px] font-black leading-8 text-success">
                {formatNumber(totalBlockedBots)}
                <span className="ml-1 text-[12px] font-bold text-content-tertiary">건</span>
              </p>
              <p className="mt-1 text-[11px] font-black text-content-tertiary">정책 차단 기준</p>
            </div>

            <div className="rounded-lg border border-line bg-surface-subtle px-4 py-3">
              <p className="text-[11px] font-bold text-content-tertiary">차단율</p>
              <p className="mt-1 text-[24px] font-black leading-8 text-primary">
                {formatPercent(blockRate)}
              </p>
              <p className={`mt-1 text-[11px] font-black ${blockRate >= targetBlockRate ? 'text-success' : 'text-danger'}`}>
                목표 {formatPercent(targetBlockRate)}
              </p>
            </div>

            <div className="rounded-lg border border-line bg-surface-subtle px-4 py-3">
              <p className="text-[11px] font-bold text-content-tertiary">피크 시간대</p>
              <p className="mt-1 text-[24px] font-black leading-8 text-warning">
                {peakPoint?.time ?? '-'}
              </p>
              <p className="mt-1 text-[11px] font-black text-content-tertiary">
                {formatNumber(peakPoint?.totalDetections ?? 0)}건 탐지
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-5">
        <div className="rounded-lg border border-line bg-surface-subtle p-4" style={{ height }}>
          <ResponsiveContainer>
            <ComposedChart data={chartData} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 8" vertical={false} />
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                minTickGap={18}
              />
              <YAxis
                yAxisId="detections"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                tickFormatter={(value) => formatNumber(Number(value))}
                width={52}
              />
              <YAxis
                yAxisId="cumulative"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                tickFormatter={(value) => formatNumber(Number(value))}
                width={62}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  boxShadow: '0 16px 40px rgba(15,23,42,0.12)',
                }}
                formatter={(value, name) => [`${formatNumber(Number(value))}건`, name]}
                labelStyle={{ color: '#475569', fontWeight: 800 }}
              />
              <Legend wrapperStyle={{ fontSize: 12, fontWeight: 800, paddingTop: 12 }} />
              <Bar
                dataKey="macroAttempts"
                fill="#ef4444"
                name="매크로 패턴"
                radius={[4, 4, 0, 0]}
                stackId="bot"
                yAxisId="detections"
                isAnimationActive={false}
              />
              <Bar
                dataKey="queueBypassAttempts"
                fill="#f97316"
                name="대기열 우회"
                radius={[4, 4, 0, 0]}
                stackId="bot"
                yAxisId="detections"
                isAnimationActive={false}
              />
              <Bar
                dataKey="abnormalRequests"
                fill="#8b5cf6"
                name="비정상 요청"
                radius={[4, 4, 0, 0]}
                stackId="bot"
                yAxisId="detections"
                isAnimationActive={false}
              />
              <Line
                dataKey="cumulativeDetections"
                name="누적 탐지"
                stroke="#2563eb"
                strokeWidth={2.5}
                type="monotone"
                yAxisId="cumulative"
                dot={false}
                activeDot={{ r: 4, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 2 }}
                isAnimationActive={false}
              />
              <Line
                dataKey="blockedBots"
                name="구간 차단"
                stroke="#16a34a"
                strokeWidth={2}
                type="monotone"
                yAxisId="detections"
                dot={false}
                activeDot={{ r: 4, fill: '#16a34a', stroke: '#ffffff', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

export default BotDetectionChart;
