import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type TelemetryChartMode = 'all' | 'temp' | 'pressure' | 'vibration' | 'history';

type SensorPoint = {
  ts: string;
  tempC?: number | null;
  pressureBar?: number;
  vibrationMm_sRms?: number;
  speedKmh?: number;
};

type HistoryPoint = {
  ts: string;
  t?: string;
  speedKmh?: number;
  tempC?: number | null;
};

interface TelemetryTrendChartProps {
  data: Array<SensorPoint | HistoryPoint>;
  mode?: TelemetryChartMode;
}

function formatTick(ts: unknown) {
  if (typeof ts !== 'string') return String(ts ?? '');
  return new Date(ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

export function TelemetryTrendChart({
  data,
  mode = 'all',
}: TelemetryTrendChartProps) {
  const inferredHistory =
    mode === 'history' ||
    (mode === 'all' &&
      data.some((point) => typeof point === 'object' && point !== null && 't' in point && 'speedKmh' in point));
  const xKey = inferredHistory ? 't' : 'ts';

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 4" stroke="#2b3340" />
        <XAxis dataKey={xKey} tickFormatter={inferredHistory ? undefined : formatTick} stroke="#9fb2c8" minTickGap={24} />
        <YAxis stroke="#9fb2c8" />
        <Tooltip
          contentStyle={{ background: '#11161f', border: '1px solid #3a4558', borderRadius: 10 }}
          labelFormatter={(value) =>
            typeof value === 'string' && value.includes('T')
              ? new Date(value).toLocaleString('es-CO')
              : String(value ?? '')
          }
        />
        <Legend />

        {inferredHistory ? (
          <>
            <Line
              type="monotone"
              dataKey="speedKmh"
              name="Velocidad (km/h)"
              stroke="#6cc4ff"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="tempC"
              name="Temp (°C)"
              stroke="#ff9f43"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
          </>
        ) : (
          <>
            {(mode === 'all' || mode === 'temp') && (
              <Line
                type="monotone"
                dataKey="tempC"
                name="Temp (°C)"
                stroke="#ff9f43"
                strokeWidth={2}
                dot={false}
              />
            )}
            {(mode === 'all' || mode === 'pressure') && (
              <Line
                type="monotone"
                dataKey="pressureBar"
                name="Presion (bar)"
                stroke="#ffd166"
                strokeWidth={2}
                dot={false}
              />
            )}
            {(mode === 'all' || mode === 'vibration') && (
              <Line
                type="monotone"
                dataKey="vibrationMm_sRms"
                name="Vibracion (mm/s RMS)"
                stroke="#ff5c5c"
                strokeWidth={2}
                dot={false}
              />
            )}
          </>
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
