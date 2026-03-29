import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function PriceChart({ data }) {
  return (
    <section className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5">
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          Price Trend
        </p>
        <h3 className="mt-2 text-xl font-semibold text-slate-200">
          Five-day crop pricing
        </h3>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
          >
            <CartesianGrid stroke="#334155" vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              stroke="#94a3b8"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              stroke="#94a3b8"
            />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="Corn"
              stroke="#8b5cf6"
              strokeWidth={3}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="Soybeans"
              stroke="#34d399"
              strokeWidth={3}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="Wheat"
              stroke="#f59e0b"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default PriceChart;
