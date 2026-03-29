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
} from "recharts";

function WeatherChart({ data }) {
  return (
    <section className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5">
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          Weather Forecast
        </p>
        <h3 className="mt-2 text-xl font-semibold text-slate-200">
          Seven-day field outlook
        </h3>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
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
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              width={42}
              stroke="#94a3b8"
              label={{ value: "Temp", angle: -90, position: "insideLeft" }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={false}
              width={36}
              stroke="#94a3b8"
              label={{ value: "Rain %", angle: -90, position: "insideRight" }}
            />
            <Tooltip />
            <Legend />
            <Bar
              yAxisId="right"
              dataKey="rain"
              fill="#8b5cf6"
              radius={[8, 8, 0, 0]}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="temp"
              stroke="#34d399"
              strokeWidth={3}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default WeatherChart;
