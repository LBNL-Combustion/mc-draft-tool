import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// Backend risk levels: "low" | "medium" | "high"
// Colors picked from the Okabe-Ito palette (deuteranopia/protanopia/tritanopia safe).
const RISK_STYLES = {
    high:   { background: '#D55E00', color: '#fff' }, // vermillion
    medium: { background: '#E69F00', color: '#000' }, // orange
    low:    { background: '#009E73', color: '#fff' }, // bluish green
};

function RiskBadge({ level }) {
    const style = RISK_STYLES[level] || { background: '#666', color: '#fff' };
    const label = level ? level.charAt(0).toUpperCase() + level.slice(1) : 'N/A';
    return (
        <span
            style={{
                display: 'inline-block',
                padding: '4px 22px',
                borderRadius: '4px',
                fontWeight: 700,
                fontSize: '14px',
                ...style,
            }}
        >
            {label}
        </span>
    );
}

// Okabe-Ito colorblind-safe qualitative palette
// (https://jfly.uni-koeln.de/color/). Skips black so lines stay visible on dark grid.
const SERIES_COLORS = [
    '#0072B2', // blue
    '#D55E00', // vermillion
    '#009E73', // bluish green
    '#CC79A7', // reddish purple
    '#F0E442', // yellow
    '#56B4E9', // sky blue
    '#E69F00', // orange
];

const PA_TO_INWC = 0.00401463;
const cToF = (c) => c * 9 / 5 + 32;

const TempTooltip = ({ active, payload, label, isMetric }) => {
    if (!active || !payload || !payload.length) return null;
    const unit = isMetric ? '°C' : '°F';
    return (
        <div
            style={{
                background: '#1e2229',
                border: '1px solid #444',
                padding: '8px 10px',
                fontSize: 13,
                color: '#e2e8f0',
            }}
        >
            {payload.map((p) => (
                <div key={p.dataKey} style={{ color: p.color }}>
                    {p.name}: {p.value} {unit}
                </div>
            ))}
            <div style={{ color: '#aaa', marginTop: 4, borderTop: '1px solid #333', paddingTop: 4 }}>
                {label} minute(s)
            </div>
        </div>
    );
};

const PressureTooltip = ({ active, payload, label, isMetric }) => {
    if (!active || !payload || !payload.length) return null;
    const unit = isMetric ? 'Pa' : 'inWC';
    const value = payload[0]?.value;
    return (
        <div
            style={{
                background: '#1e2229',
                border: '1px solid #444',
                padding: '8px 10px',
                fontSize: 13,
                color: '#e2e8f0',
            }}
        >
            <div style={{ color: payload[0]?.color }}>
                {value} {unit}
            </div>
            <div style={{ color: '#aaa', marginTop: 4, borderTop: '1px solid #333', paddingTop: 4 }}>
                {label} minute(s)
            </div>
        </div>
    );
};

// Zip {time_min: [...], static_pressure_Pa: [...]} into recharts rows.
function buildPressureRows(plot, isMetric) {
    const t = plot?.time_min ?? [];
    const p = plot?.static_pressure_Pa ?? [];
    const n = Math.min(t.length, p.length);
    const step = Math.max(1, Math.floor(n / 200));
    const rows = [];
    for (let i = 0; i < n; i += step) {
        let value = null;
        if (p[i] != null) {
            value = isMetric ? p[i] : p[i] * PA_TO_INWC;
            value = parseFloat(value.toFixed(isMetric ? 2 : 4));
        }
        rows.push({
            time: parseFloat(t[i].toFixed(2)),
            pressure: value,
        });
    }
    return rows;
}

// Zip {time_min, series:[{label, temperature_C:[...]}]} into recharts rows.
function buildTemperatureRows(plot, isMetric) {
    const t = plot?.time_min ?? [];
    const series = plot?.series ?? [];
    const n = t.length;
    const step = Math.max(1, Math.floor(n / 200));
    const rows = [];
    for (let i = 0; i < n; i += step) {
        const row = { time: parseFloat(t[i].toFixed(2)) };
        for (const s of series) {
            const v = s.temperature_C?.[i];
            if (v == null) {
                row[s.label] = null;
            } else {
                const converted = isMetric ? v : cToF(v);
                row[s.label] = parseFloat(converted.toFixed(1));
            }
        }
        rows.push(row);
    }
    return rows;
}

const ResultsPanel = ({ result, units, onUnitsChange }) => {
    const isMetric = units === 'metric';

    const ul103Risk = result?.ul103_risk;
    const backdraftRisk = result?.backdraft_risk;
    const maxPressurePa = result?.max_static_pressure_ss_Pa ?? 0;
    const maxTempC = result?.max_temperature_ss_C ?? 0;

    const maxPressureDisplay = isMetric
        ? `${maxPressurePa.toFixed(1)} Pa`
        : `${(maxPressurePa * 0.00401463).toFixed(3)} inWC`;

    const maxTempDisplay = isMetric
        ? `${maxTempC.toFixed(0)} °C`
        : `${(maxTempC * 9 / 5 + 32).toFixed(0)} °F`;

    const pressureRows = buildPressureRows(result?.static_pressure_plot, isMetric);
    const tempRows = buildTemperatureRows(result?.temperature_plot, isMetric);
    const tempSeries = result?.temperature_plot?.series ?? [];

    const tempYLabel = isMetric ? 'Temperature (°C)' : 'Temperature (°F)';
    const pressYLabel = isMetric ? 'Static Pressure (Pa)' : 'Static Pressure (inWC)';
    const pressureSeriesName = isMetric ? 'Pressure (Pa)' : 'Pressure (inWC)';

    return (
        <div className="results-panel">
            <div className="results-header">
                <h2 className="results-title">Results</h2>
                <select
                    className="units-select"
                    value={units}
                    onChange={(e) => onUnitsChange(e.target.value)}
                >
                    <option value="metric">Metric Units</option>
                    <option value="imperial">Imperial Units</option>
                </select>
            </div>

            {/* ── Risk + Steady-State (combined) ── */}
            <div className="results-card">
                <div className="results-risk-table">
                    <div className="results-risk-row">
                        <span className="results-risk-label">UL 103 draft</span>
                        <RiskBadge level={ul103Risk} />
                    </div>
                    <div className="results-risk-row">
                        <span className="results-risk-label">Backdraft</span>
                        <RiskBadge level={backdraftRisk} />
                    </div>
                </div>
                <div className="results-steady-row">
                    <span className="results-steady-label">Max Static Pressure</span>
                    <span className="results-steady-value">{maxPressureDisplay}</span>
                </div>
                <div className="results-steady-row">
                    <span className="results-steady-label">Max Temperature</span>
                    <span className="results-steady-value">{maxTempDisplay}</span>
                </div>
            </div>

            {/* ── Charts ── */}
            <div className="results-charts-row">
                <div className="results-chart-box">
                    <h4 className="results-chart-title">Chimney Exhaust Temperature</h4>
                    <ResponsiveContainer width="100%" height={295}>
                        <LineChart data={tempRows} margin={{ top: 5, right: 10, left: 10, bottom: 28 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis
                                dataKey="time"
                                type="number"
                                domain={[0, 10]}
                                ticks={[0, 2, 4, 6, 8, 10]}
                                label={{ value: 'Time (min)', position: 'insideBottom', offset: -2, fill: '#aaa', fontSize: 14 }}
                                tick={{ fill: '#aaa', fontSize: 13 }}
                            />
                            <YAxis
                                label={{ value: tempYLabel, angle: -90, position: 'insideLeft', offset: 10, dy: 70, fill: '#aaa', fontSize: 14 }}
                                tick={{ fill: '#aaa', fontSize: 13 }}
                            />
                            <Tooltip content={<TempTooltip isMetric={isMetric} />} />
                            <Legend
                                verticalAlign="bottom"
                                align="center"
                                height={20}
                                wrapperStyle={{
                                    fontSize: 13,
                                    bottom: -2,
                                    left: 0,
                                    width: '100%',
                                    textAlign: 'center',
                                }}
                            />
                            {tempSeries.map((s, i) => (
                                <Line
                                    key={s.label}
                                    type="monotone"
                                    dataKey={s.label}
                                    name={s.label}
                                    stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                                    dot={false}
                                    strokeWidth={1.5}
                                    isAnimationActive={false}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="results-chart-box">
                    <h4 className="results-chart-title">Static Pressure at chimney entrance</h4>
                    <ResponsiveContainer width="100%" height={290}>
                        <LineChart data={pressureRows} margin={{ top: 5, right: 10, left: 14, bottom: 18 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis
                                dataKey="time"
                                type="number"
                                domain={[0, 10]}
                                ticks={[0, 2, 4, 6, 8, 10]}
                                label={{ value: 'Time (min)', position: 'insideBottom', offset: -2, fill: '#aaa', fontSize: 14 }}
                                tick={{ fill: '#aaa', fontSize: 13 }}
                            />
                            <YAxis
                                label={{ value: pressYLabel, angle: -90, position: 'insideLeft', offset: -2, dy: 70, fill: '#aaa', fontSize: 14 }}
                                tick={{ fill: '#aaa', fontSize: 13 }}
                            />
                            <Tooltip content={<PressureTooltip isMetric={isMetric} />} />
                            <Line
                                type="monotone"
                                dataKey="pressure"
                                name={pressureSeriesName}
                                stroke="#0072B2"
                                dot={false}
                                strokeWidth={1.5}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default ResultsPanel;
