import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function DecisionWindowChart({ data }) {
  const bestPoint = data.reduce((best, point) =>
    point.score > best.score ? point : best,
  );

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400">
            Decision Window
          </p>
          <h3 className="mt-2 text-xl font-semibold text-gray-900">
            Best operating window over the next 7 days
          </h3>
        </div>
        <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-right text-violet-700">
          <p className="text-xs font-semibold uppercase tracking-[0.18em]">
            Best day
          </p>
          <p className="mt-1 text-lg font-semibold">
            {bestPoint.label} for {bestPoint.crop}
          </p>
        </div>
      </div>

      <div className="mt-5 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 12, right: 8, left: -18, bottom: 0 }}
          >
            <defs>
              <linearGradient
                id="decisionWindowFill"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#E5E7EB" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              stroke="#9CA3AF"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={40}
              stroke="#9CA3AF"
            />
            <Tooltip
              formatter={(value) => [`${value}`, "Score"]}
              labelFormatter={(label, payload) =>
                `${label}: ${payload?.[0]?.payload?.crop} (${payload?.[0]?.payload?.risk} risk)`
              }
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="#8b5cf6"
              strokeWidth={3}
              fill="url(#decisionWindowFill)"
            />
            <ReferenceDot
              x={bestPoint.label}
              y={bestPoint.score}
              r={6}
              fill="#8b5cf6"
              stroke="#ffffff"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default DecisionWindowChart;
