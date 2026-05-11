import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  parseCSV,
  computeStats,
  buildTechActivity,
  getRowDate,
  pct
} from '../utils/excelUtils';

const SHEET_ID = "15qc1y7e3eTXq5AcQwm9htoGXNT2nl3YH";

const C = {
  bg: '#f3f6fb',
  surface: '#ffffff',
  navy: '#0f172a',
  text: '#0f172a',
  muted: '#64748b',
  line: '#e2e8f0',
  blue: '#2563eb',
  cyan: '#0891b2',
  green: '#16a34a',
  red: '#dc2626',
  amber: '#d97706',
  violet: '#7c3aed',
  slate: '#475569',
};

function Donut({ good, damaged, empty, size = 90 }) {
  const r = 32;
  const cx = 41;
  const cy = 41;
  const circ = 2 * Math.PI * r;

  const total = good + damaged + empty || 1;
  const gD = (good / total) * circ;
  const dD = (damaged / total) * circ;
  const eD = (empty / total) * circ;

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={size} height={size} viewBox="0 0 82 82">
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="8"
        />

        {eD > 0 && (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="8"
            strokeDasharray={`${eD} ${circ - eD}`}
            strokeDashoffset={-(gD + dD)}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="round"
          />
        )}

        {dD > 0 && (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={C.red}
            strokeWidth="8"
            strokeDasharray={`${dD} ${circ - dD}`}
            strokeDashoffset={-gD}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="round"
          />
        )}

        {gD > 0 && (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={C.green}
            strokeWidth="8"
            strokeDasharray={`${gD} ${circ - gD}`}
            strokeDashoffset={0}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="round"
          />
        )}

        <text
          x={cx}
          y={cy + 5}
          textAnchor="middle"
          fill={C.text}
          fontSize="17"
          fontWeight="800"
        >
          {pct(good, total)}%
        </text>
      </svg>

      <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>
        Good Condition
      </div>
    </div>
  );
}

function MiniPieChart({ value, total, label, color }) {
  const p = total > 0 ? (value / total) * 100 : 0;

  const r = 28;
  const cx = 35;
  const cy = 35;
  const circ = 2 * Math.PI * r;
  const dash = (p / 100) * circ;

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.line}`,
        borderRadius: 16,
        padding: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              color: C.muted,
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            {label}
          </div>

          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              color,
              marginTop: 4,
            }}
          >
            {value}
          </div>
        </div>

        <svg width={70} height={70} viewBox="0 0 70 70">
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="7"
          />

          {p > 0 && (
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={color}
              strokeWidth="7"
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={0}
              transform={`rotate(-90 ${cx} ${cy})`}
              strokeLinecap="round"
            />
          )}

          <text
            x={cx}
            y={cy + 4}
            textAnchor="middle"
            fill={C.text}
            fontSize="13"
            fontWeight="800"
          >
            {Math.round(p)}%
          </text>
        </svg>
      </div>
    </div>
  );
}

function StackBar({ good, damaged, empty, total }) {
  return (
    <div
      style={{
        display: 'flex',
        height: 10,
        borderRadius: 999,
        overflow: 'hidden',
        background: '#e2e8f0',
      }}
    >
      <div style={{ width: `${pct(good, total)}%`, background: C.green }} />
      <div style={{ width: `${pct(damaged, total)}%`, background: C.red }} />
      <div style={{ width: `${pct(empty, total)}%`, background: '#cbd5e1' }} />
    </div>
  );
}

function ProgressBar({ value, max, label, color }) {
  const p = max > 0 ? (value / max) * 100 : 0;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>
          {label}
        </span>

        <span style={{ fontSize: 14, fontWeight: 700, color }}>
          {Math.round(p)}%
        </span>
      </div>

      <div
        style={{
          height: 8,
          background: '#e2e8f0',
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${p}%`,
            background: color,
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
}

function StatusCard({ title, good, damaged, empty, total, accent }) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.line}`,
        borderRadius: 16,
        padding: 20,
        borderTop: `4px solid ${accent}`,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
        {title}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 16,
        }}
      >
        {[
          { label: 'Total', val: total, color: accent },
          { label: 'Good', val: good, color: C.green },
          { label: 'Damaged', val: damaged, color: C.red },
          { label: 'Empty', val: empty, color: C.slate },
        ].map((item) => (
          <div key={item.label} style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: item.color,
              }}
            >
              {item.val}
            </div>
            <div style={{ fontSize: 11, color: C.muted }}>
              {item.label}
            </div>
          </div>
        ))}
      </div>

      <StackBar good={good} damaged={damaged} empty={empty} total={total} />
    </div>
  );
}

function TechActivityTable({ data }) {
  const activities = useMemo(() => buildTechActivity(data), [data]);

  if (activities.length === 0) {
    return (
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.line}`,
          borderRadius: 16,
          padding: 40,
          textAlign: 'center',
          color: C.muted,
        }}
      >
        No technician scan entries found yet.
      </div>
    );
  }

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.line}`,
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: 20,
          fontWeight: 700,
          borderBottom: `1px solid ${C.line}`,
        }}
      >
        Recent Technician Activity
      </div>

      <div style={{ maxHeight: 360, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead style={{ position: 'sticky', top: 0, background: '#f8fafc' }}>
            <tr>
              <th style={{ padding: '14px 20px', textAlign: 'left' }}>
                Technician
              </th>
              <th style={{ padding: '14px 20px', textAlign: 'left' }}>
                Date
              </th>
              <th style={{ padding: '14px 20px', textAlign: 'left' }}>
                Time
              </th>
            </tr>
          </thead>

          <tbody>
            {activities.map((row, i) => (
              <tr key={i} style={{ borderTop: `1px solid ${C.line}` }}>
                <td
                  style={{
                    padding: '14px 20px',
                    fontWeight: 700,
                    color: C.blue,
                  }}
                >
                  {row.userName}
                </td>
                <td style={{ padding: '14px 20px', color: C.muted }}>
                  {row.date || '—'}
                </td>
                <td style={{ padding: '14px 20px', color: C.muted }}>
                  {row.time || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`
      );

      if (!res.ok) {
        throw new Error('Sheet fetch failed');
      }

      const txt = await res.text();
      const rows = parseCSV(txt);

      if (!rows || rows.length === 0) {
        setData([]);
        return;
      }

      const headers = rows[0];

      const dataRows = rows.slice(1).map((row) => {
        const obj = {};
        headers.forEach((h, i) => {
          obj[h] = row[i] || '';
        });
        return obj;
      });

      setData(dataRows);
    } catch (err) {
      console.error(err);
      setError('Failed to load data. Make sure the Google Sheet is public.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredData = useMemo(() => {
    let rows = [...data];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();

      rows = rows.filter((r) =>
        Object.values(r).some((v) =>
          String(v).toLowerCase().includes(term)
        )
      );
    }

    if (dateFrom || dateTo) {
      rows = rows.filter((row) => {
        const d = getRowDate(row);

        if (!d) return false;
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo) return false;

        return true;
      });
    }

    return rows;
  }, [data, searchTerm, dateFrom, dateTo]);

  const st = useMemo(() => {
    return filteredData.length > 0 ? computeStats(filteredData) : null;
  }, [filteredData]);

  const allDates = useMemo(() => {
    const s = new Set();

    data.forEach((row) => {
      const d = getRowDate(row);
      if (d) s.add(d);
    });

    return Array.from(s).sort();
  }, [data]);

  if (loading) {
    return (
      <div
        style={{
          background: C.bg,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: C.navy,
          fontWeight: 700,
        }}
      >
        Loading Dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', padding: 40 }}>
        <div
          style={{
            background: '#fff',
            border: `1px solid ${C.line}`,
            borderRadius: 16,
            padding: 24,
            color: C.red,
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '24px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 800,
                color: C.navy,
              }}
            >
              Data Center Asset Management
            </h1>

            <p style={{ margin: '6px 0 0', color: C.muted }}>
              Analytics dashboard based on live Google Sheet data
            </p>
          </div>

          <button
            onClick={fetchData}
            style={{
              padding: '10px 20px',
              background: C.navy,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            Refresh
          </button>
        </div>

        <div
          style={{
            background: C.surface,
            padding: 20,
            borderRadius: 16,
            border: `1px solid ${C.line}`,
            marginBottom: 28,
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            placeholder="Search assets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '10px 16px',
              width: 320,
              border: `1px solid ${C.line}`,
              borderRadius: 10,
              outline: 'none',
            }}
          />

          <span style={{ color: C.muted, fontWeight: 600 }}>
            Scan Date:
          </span>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            min={allDates[0]}
            style={{
              padding: '9px 12px',
              borderRadius: 8,
              border: `1px solid ${C.line}`,
            }}
          />

          <span style={{ color: C.muted }}>to</span>

          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            max={allDates[allDates.length - 1]}
            style={{
              padding: '9px 12px',
              borderRadius: 8,
              border: `1px solid ${C.line}`,
            }}
          />

          {(searchTerm || dateFrom || dateTo) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setDateFrom('');
                setDateTo('');
              }}
              style={{
                color: C.red,
                background: '#fff',
                border: `1px solid ${C.line}`,
                padding: '9px 14px',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Clear
            </button>
          )}
        </div>

        {!st && (
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.line}`,
              borderRadius: 16,
              padding: 40,
              textAlign: 'center',
              color: C.muted,
            }}
          >
            No records found for the selected filters.
          </div>
        )}

        {st && (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 20,
                marginBottom: 32,
              }}
            >
              <div
                style={{
                  background: `linear-gradient(135deg, ${C.navy}, #1e293b)`,
                  borderRadius: 20,
                  padding: 24,
                  color: '#fff',
                }}
              >
                <div style={{ fontSize: 14, opacity: 0.9 }}>
                  Total Assets
                </div>

                <div
                  style={{
                    fontSize: 48,
                    fontWeight: 800,
                    marginTop: 8,
                  }}
                >
                  {st.total}
                </div>
              </div>

              <MiniPieChart
                value={st.scanned}
                total={st.total}
                label="Scanned"
                color={C.blue}
              />

              <MiniPieChart
                value={st.notScanned}
                total={st.total}
                label="Pending"
                color={C.amber}
              />

              <MiniPieChart
                value={st.powerCord}
                total={st.total}
                label="Power Cord"
                color={C.violet}
              />

              <MiniPieChart
                value={st.rails}
                total={st.total}
                label="Rails"
                color={C.cyan}
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: 24,
                marginBottom: 32,
              }}
            >
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.line}`,
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <ProgressBar
                  value={st.scanned}
                  max={st.total}
                  label="Scan Completion"
                  color={C.blue}
                />
              </div>

              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.line}`,
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
                  <Donut
                    good={st.condGood}
                    damaged={st.condDmg}
                    empty={st.condEmpty}
                    size={110}
                  />

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        gap: 24,
                        marginBottom: 16,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 32,
                            fontWeight: 800,
                            color: C.green,
                          }}
                        >
                          {st.condGood}
                        </div>
                        <div style={{ fontSize: 12, color: C.muted }}>
                          Good
                        </div>
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize: 32,
                            fontWeight: 800,
                            color: C.red,
                          }}
                        >
                          {st.condDmg}
                        </div>
                        <div style={{ fontSize: 12, color: C.muted }}>
                          Damaged
                        </div>
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize: 32,
                            fontWeight: 800,
                            color: C.slate,
                          }}
                        >
                          {st.condEmpty}
                        </div>
                        <div style={{ fontSize: 12, color: C.muted }}>
                          Empty
                        </div>
                      </div>
                    </div>

                    <StackBar
                      good={st.condGood}
                      damaged={st.condDmg}
                      empty={st.condEmpty}
                      total={st.total}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                gap: 24,
              }}
            >
              <div>
                <div style={{ marginBottom: 24 }}>
                  <StatusCard
                    title="⚡ PSU-1 Status"
                    good={st.psu1Good}
                    damaged={st.psu1Dmg}
                    empty={st.psu1Empty}
                    total={st.total}
                    accent={C.violet}
                  />
                </div>

                <StatusCard
                  title="⚡ PSU-2 Status"
                  good={st.psu2Good}
                  damaged={st.psu2Dmg}
                  empty={st.psu2Empty}
                  total={st.total}
                  accent={C.cyan}
                />
              </div>

              <TechActivityTable data={filteredData} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}