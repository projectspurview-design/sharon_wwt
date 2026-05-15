// src/pages/Dashboard.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  parseCSV,
  computeStats,
  buildTechActivity,
  getRowDate,
  pct,
} from '../utils/excelUtils';
import { LoadingSpinner } from '../App';

const SHEET_ID = '1WvfO6YtmzIwf4XVEjLI-3Xu38WM_xWgapCWGtAtIxbo';

// Unified Light Theme Colors
const C = {
  bg: '#f8fafc',
  surface: '#ffffff',
  navy: '#0f172a',
  text: '#1e293b',
  muted: '#64748b',
  line: '#e2e8f0',
  blue: '#2563eb',
  cyan: '#0891b2',
  green: '#10b981',
  red: '#ef4444',
  amber: '#f59e0b',
  violet: '#8b5cf6',
  slate: '#94a3b8',
  orange: '#f97316',
};

// --- COMMON HELPERS ---

function getStatusColor(value) {
  const v = String(value || '').toLowerCase();

  if (
    v.includes('good') ||
    v.includes('ok') ||
    v.includes('yes') ||
    v.includes('scanned') ||
    v.includes('completed')
  ) {
    return C.green;
  }

  if (
    v.includes('damage') ||
    v.includes('bad') ||
    v.includes('no') ||
    v.includes('missing') ||
    v.includes('pending') ||
    v.includes('fail')
  ) {
    return C.red;
  }

  return C.slate;
}

function cleanValue(value) {
  return String(value || '').trim();
}

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasMeaningfulValue(value) {
  const v = normalizeKey(value);

  return (
    v !== '' &&
    v !== '-' &&
    v !== 'na' &&
    v !== 'n/a' &&
    v !== 'null' &&
    v !== 'undefined' &&
    v !== 'unknown'
  );
}

function isPassValue(value) {
  const v = normalizeKey(value);

  return (
    v.includes('no damage') ||
    v.includes('good') ||
    v.includes('ok') ||
    v.includes('pass') ||
    v.includes('passed') ||
    v.includes('yes') ||
    v.includes('scanned') ||
    v.includes('completed') ||
    v.includes('available') ||
    v.includes('working')
  );
}

function isFailValue(value) {
  const v = normalizeKey(value);

  if (v.includes('no damage')) {
    return false;
  }

  return (
    v.includes('damage') ||
    v.includes('damaged') ||
    v.includes('bad') ||
    v.includes('fail') ||
    v.includes('failed') ||
    v.includes('missing') ||
    v.includes('pending') ||
    v === 'no' ||
    v === 'not ok' ||
    v === 'not scanned'
  );
}

function classifyParameterValue(value, header) {
  const h = normalizeKey(header);
  const v = cleanValue(value);

  if (!hasMeaningfulValue(v)) {
    return null;
  }

  if (isPassValue(v)) {
    return 'pass';
  }

  if (isFailValue(v)) {
    return 'fail';
  }

  // For barcode / scan fields, any non-empty value means it was scanned.
  if (
    h.includes('scan') ||
    h.includes('barcode') ||
    h.includes('asset no') ||
    h.includes('serial no')
  ) {
    return 'pass';
  }

  return null;
}

function isParameterHeader(header) {
  const h = normalizeKey(header);

  if (!h) return false;

  const blocked =
    h.includes('image') ||
    h.includes('preview') ||
    h.includes('path') ||
    h.includes('audit') ||
    h.includes('last updated') ||
    h.includes('description') ||
    h.includes('product id') ||
    h === 'name';

  if (blocked) return false;

  return (
    h.includes('condition') ||
    h.includes('cond') ||
    h.includes('status') ||
    h.includes('scan') ||
    h.includes('barcode') ||
    h.includes('power cord') ||
    h.includes('rails') ||
    h.includes('psu') ||
    h.includes('fan') ||
    h.includes('air') ||
    h.includes('led')
  );
}

function findGroupHeader(headers) {
  const preferredPatterns = [
    /equipment\s*group/i,
    /equipment\s*type/i,
    /asset\s*type/i,
    /device\s*type/i,
    /category/i,
    /type/i,
    /name/i,
  ];

  for (const pattern of preferredPatterns) {
    const found = headers.find((header) => pattern.test(header));
    if (found) return found;
  }

  return null;
}

function getGroupName(row, groupHeader) {
  if (groupHeader && hasMeaningfulValue(row[groupHeader])) {
    return cleanValue(row[groupHeader]);
  }

  return 'Uncategorized';
}

function makeTitleFromHeader(header) {
  return String(header || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// --- COMPONENTS ---

function Donut({ good, damaged, empty, size = 60 }) {
  const r = 26;
  const cx = 32;
  const cy = 32;
  const circ = 2 * Math.PI * r;
  const total = good + damaged + empty || 1;

  const gD = (good / total) * circ;
  const dD = (damaged / total) * circ;
  const eD = (empty / total) * circ;

  const pctGood = Math.round((good / total) * 100) || 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '90px',
        flexShrink: 0,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 64 64">
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth="6"
        />

        {eD > 0 && (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={C.slate}
            strokeWidth="6"
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
            strokeWidth="6"
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
            strokeWidth="6"
            strokeDasharray={`${gD} ${circ - gD}`}
            strokeDashoffset={0}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="round"
          />
        )}

        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fill={C.orange}
          fontSize="13"
          fontWeight="800"
        >
          {pctGood}%
        </text>
      </svg>

      <div
        style={{
          fontSize: 10,
          color: C.muted,
          marginTop: 6,
          fontWeight: 700,
          textTransform: 'uppercase',
        }}
      >
        Condition
      </div>
    </div>
  );
}

function MiniPieChart({ value, total, label }) {
  const p = total > 0 ? (value / total) * 100 : 0;
  const r = 20;
  const cx = 24;
  const cy = 24;
  const circ = 2 * Math.PI * r;
  const dash = (p / 100) * circ;
  const valColor = value > 0 ? C.blue : C.slate;

  return (
    <div
      style={{
        flex: 1,
        background: C.surface,
        border: `1px solid ${C.line}`,
        borderRadius: '8px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
      }}
    >
      <div>
        <div
          style={{
            fontSize: 11,
            color: C.navy,
            textTransform: 'uppercase',
            fontWeight: 800,
            letterSpacing: '0.5px',
          }}
        >
          {label}
        </div>

        <div
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: valColor,
            marginTop: 4,
            lineHeight: 1,
          }}
        >
          {value}
        </div>
      </div>

      <svg width={48} height={48} viewBox="0 0 48 48">
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth="5"
        />

        {p > 0 && (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={C.orange}
            strokeWidth="5"
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
          fill={C.orange}
          fontSize="11"
          fontWeight="800"
        >
          {Math.round(p)}%
        </text>
      </svg>
    </div>
  );
}

function StackBar({ good, damaged, empty, total }) {
  return (
    <div
      style={{
        display: 'flex',
        height: 6,
        borderRadius: 999,
        overflow: 'hidden',
        background: '#f1f5f9',
        width: '100%',
      }}
    >
      <div style={{ width: `${pct(good, total)}%`, background: C.green }} />
      <div style={{ width: `${pct(damaged, total)}%`, background: C.red }} />
      <div style={{ width: `${pct(empty, total)}%`, background: C.slate }} />
    </div>
  );
}

function ProgressBar({ value, max, label }) {
  const p = max > 0 ? (value / max) * 100 : 0;

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: C.navy,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {label}
        </span>

        <span
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: C.orange,
          }}
        >
          {Math.round(p)}%
        </span>
      </div>

      <div
        style={{
          height: 6,
          background: '#f1f5f9',
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${p}%`,
            background: C.orange,
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
}

function ConditionBarCard({ good, damaged, empty, total }) {
  return (
    <div
      style={{
        flex: 1,
        background: C.surface,
        border: `1px solid ${C.line}`,
        borderRadius: '8px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
      }}
    >
      <Donut good={good} damaged={damaged} empty={empty} />

      <div style={{ flex: 1, paddingRight: '8px' }}>
        <div
          style={{
            display: 'flex',
            gap: '18px',
            marginBottom: '8px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: C.green,
                lineHeight: 1,
              }}
            >
              {good}
            </div>
            <div
              style={{
                fontSize: 10,
                color: C.muted,
                marginTop: 4,
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              Good
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: C.red,
                lineHeight: 1,
              }}
            >
              {damaged}
            </div>
            <div
              style={{
                fontSize: 10,
                color: C.muted,
                marginTop: 4,
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              Damaged
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: C.slate,
                lineHeight: 1,
              }}
            >
              {empty}
            </div>
            <div
              style={{
                fontSize: 10,
                color: C.muted,
                marginTop: 4,
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              Empty
            </div>
          </div>
        </div>

        <StackBar good={good} damaged={damaged} empty={empty} total={total} />
      </div>
    </div>
  );
}

function StatusCard({ title, good, damaged, empty, total }) {
  const rows = [
    { label: 'Total', val: total, color: total > 0 ? C.blue : C.slate },
    { label: 'Good', val: good, color: C.green },
    { label: 'Damaged', val: damaged, color: C.red },
    { label: 'Empty', val: empty, color: C.slate },
  ];

  return (
    <div
      style={{
        flex: 1,
        background: C.surface,
        border: `1px solid ${C.line}`,
        borderRadius: '8px',
        padding: '16px 20px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: C.navy,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: 12,
        }}
      >
        {title}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 6,
          marginBottom: 10,
        }}
      >
        {rows.map((item) => (
          <div key={item.label} style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: item.color,
                lineHeight: 1,
              }}
            >
              {item.val}
            </div>

            <div
              style={{
                fontSize: 9,
                color: C.muted,
                textTransform: 'uppercase',
                fontWeight: 700,
                marginTop: 4,
              }}
            >
              {item.label}
            </div>
          </div>
        ))}
      </div>

      <StackBar good={good} damaged={damaged} empty={empty} total={total} />
    </div>
  );
}

function StabilityCard({ title, passed, total }) {
  const percent = total > 0 ? Math.round((passed / total) * 100) : 0;

  return (
    <div
      style={{
        background: C.surface,
        borderRadius: '8px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        border: `1px solid ${C.line}`,
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <div
          style={{
            color: C.navy,
            fontSize: '10px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            paddingRight: '6px',
          }}
          title={title}
        >
          {title}
        </div>

        <div
          style={{
            color: C.slate,
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
          }}
        >
          {passed}/{total}
        </div>
      </div>

      <div
        style={{
          height: '4px',
          background: '#f1f5f9',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            background: C.orange,
            borderRadius: '2px',
            transition: 'width 0.5s ease-out',
          }}
        />
      </div>
    </div>
  );
}

function DOAAnalytics({ data }) {
  const headers = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]).filter((h) => String(h).trim() !== '');
  }, [data]);

  const groupHeader = useMemo(() => {
    return findGroupHeader(headers);
  }, [headers]);

  const parameterHeaders = useMemo(() => {
    return headers.filter(isParameterHeader);
  }, [headers]);

  const analytics = useMemo(() => {
    const paramMap = new Map();

    parameterHeaders.forEach((header) => {
      paramMap.set(header, {
        key: header,
        title: makeTitleFromHeader(header),
        totalPassed: 0,
        totalChecked: 0,
        devices: new Map(),
      });
    });

    data.forEach((row) => {
      const groupName = getGroupName(row, groupHeader);

      parameterHeaders.forEach((header) => {
        const state = classifyParameterValue(row[header], header);

        if (!state) return;

        const param = paramMap.get(header);

        if (!param.devices.has(groupName)) {
          param.devices.set(groupName, {
            name: groupName,
            passed: 0,
            total: 0,
          });
        }

        const deviceStats = param.devices.get(groupName);

        deviceStats.total += 1;
        param.totalChecked += 1;

        if (state === 'pass') {
          deviceStats.passed += 1;
          param.totalPassed += 1;
        }
      });
    });

    return Array.from(paramMap.values())
      .map((param) => ({
        ...param,
        devices: Array.from(param.devices.values())
          .filter((device) => device.total > 0)
          .sort((a, b) => b.total - a.total),
      }))
      .filter((param) => param.totalChecked > 0);
  }, [data, groupHeader, parameterHeaders]);

  if (!data || data.length === 0) {
    return null;
  }

  if (analytics.length === 0) {
    return (
      <div
        style={{
          background: C.surface,
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          border: `1px solid ${C.line}`,
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${C.line}`,
            background: '#f8fafc',
            color: C.navy,
            fontSize: '12px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Dynamic Parameter Stability
        </div>

        <div
          style={{
            padding: 24,
            color: C.muted,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          No valid parameter columns found. Add columns like Condition, PSU-1
          Cond, PSU-2 Cond, Power Cord, Rails, Fan Status, Airflow Status, or
          LED Status.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: C.surface,
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflowY: 'auto',
        border: `1px solid ${C.line}`,
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
      }}
    >
      <div
        style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${C.line}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
          background: '#f8fafc',
          gap: 12,
        }}
      >
        <span
          style={{
            color: C.navy,
            fontSize: '12px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Parameter Stability Across Devices        </span>

        <span
          style={{
            color: C.muted,
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
          }}
        >
          Grouped by: {groupHeader || 'Uncategorized'}
        </span>
      </div>

      <div
        style={{
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {analytics.map((param) => {
          const overallPct =
            param.totalChecked > 0
              ? Math.round((param.totalPassed / param.totalChecked) * 100)
              : 0;

          const r = 18;
          const cx = 22;
          const cy = 22;
          const circ = 2 * Math.PI * r;
          const dash = (overallPct / 100) * circ;

          return (
            <div
              key={param.key}
              style={{
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ flexShrink: 0, width: 44, height: 44 }}>
                  <svg width={44} height={44} viewBox="0 0 44 44">
                    <circle
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill="none"
                      stroke="#f1f5f9"
                      strokeWidth="4"
                    />

                    {overallPct > 0 && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill="none"
                        stroke={C.orange}
                        strokeWidth="4"
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
                      fill={C.orange}
                      fontSize="12"
                      fontWeight="800"
                    >
                      {overallPct}%
                    </text>
                  </svg>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      color: C.navy,
                      fontSize: '14px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {param.title}
                  </h3>

                  <span
                    style={{
                      color: C.slate,
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  >
                    {param.totalPassed} / {param.totalChecked} Units Passed
                  </span>
                </div>

                <div
                  style={{
                    height: '1px',
                    flex: 1,
                    background: C.line,
                    marginLeft: '8px',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '12px',
                }}
              >
                {param.devices.map((device) => (
                  <StabilityCard
                    key={`${param.key}-${device.name}`}
                    title={device.name}
                    passed={device.passed}
                    total={device.total}
                  />
                ))}
              </div>
            </div>
          );
        })}
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
    try {
      const res = await fetch(
        `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`
      );

      const txt = await res.text();
      const rows = parseCSV(txt);

      const hdrs = rows[0] || [];

      const dataRows = rows.slice(1).map((row) => {
        const o = {};
        hdrs.forEach((h, i) => {
          o[h] = row[i] || '';
        });
        return o;
      });

      setData(dataRows);
    } catch {
      setError('Failed to load data.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filteredData = useMemo(() => {
    let rows = [...data];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();

      rows = rows.filter((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(term)
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

  const st = useMemo(
    () => (filteredData.length > 0 ? computeStats(filteredData) : null),
    [filteredData]
  );

  const activities = useMemo(
    () => buildTechActivity(filteredData),
    [filteredData]
  );

  const allDates = useMemo(() => {
    const s = new Set();

    data.forEach((row) => {
      const d = getRowDate(row);
      if (d) s.add(d);
    });

    return Array.from(s).sort();
  }, [data]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div
        style={{
          color: C.red,
          padding: 50,
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: C.bg,
        overflowY: 'auto',
        paddingTop: '80px',
        boxSizing: 'border-box',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1600px',
          margin: '0 auto',
          height: '100%',
          padding: '0 24px 24px 24px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Top Nav Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: C.surface,
            padding: '12px 20px',
            borderRadius: '8px',
            border: `1px solid ${C.line}`,
            flexShrink: 0,
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 800,
              color: C.navy,
              letterSpacing: '-0.5px',
              textTransform: 'uppercase',
            }}
          >
            Data Center Assets
          </h1>

          <div
            style={{
              display: 'flex',
              gap: 14,
              alignItems: 'center',
            }}
          >
            <input
              type="text"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '8px 14px',
                fontSize: '12px',
                width: 220,
                border: `1px solid ${C.line}`,
                borderRadius: '6px',
                outline: 'none',
                fontWeight: 600,
                color: C.text,
              }}
            />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    color: C.navy,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                  }}
                >
                  From
                </span>

                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  min={allDates[0]}
                  style={{
                    padding: '7px 10px',
                    border: `1px solid ${C.line}`,
                    borderRadius: '6px',
                    background: C.surface,
                    fontSize: '12px',
                    outline: 'none',
                    color: C.text,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    color: C.navy,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                  }}
                >
                  To
                </span>

                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  max={allDates[allDates.length - 1]}
                  style={{
                    padding: '7px 10px',
                    border: `1px solid ${C.line}`,
                    borderRadius: '6px',
                    background: C.surface,
                    fontSize: '12px',
                    outline: 'none',
                    color: C.text,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                />
              </div>
            </div>

            {(searchTerm || dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setDateFrom('');
                  setDateTo('');
                }}
                style={{
                  padding: '8px 14px',
                  fontSize: '11px',
                  color: C.red,
                  background: '#fef2f2',
                  border: `1px solid #fecaca`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                }}
              >
                Clear
              </button>
            )}

            <button
              onClick={fetchData}
              style={{
                padding: '8px 18px',
                fontSize: '11px',
                background: C.navy,
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 800,
                textTransform: 'uppercase',
              }}
            >
              Refresh
            </button>
          </div>
        </div>

        {/* TOP GRID */}
        {st && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1.3fr 1fr',
              gap: '16px',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div
                style={{
                  flex: 1,
                  background: C.surface,
                  border: `1px solid ${C.line}`,
                  borderRadius: '8px',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: C.navy,
                    textTransform: 'uppercase',
                    fontWeight: 800,
                    letterSpacing: '0.5px',
                  }}
                >
                  Total Assets
                </div>

                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 800,
                    color: st.total > 0 ? C.blue : C.slate,
                    marginTop: 4,
                    lineHeight: 1,
                  }}
                >
                  {st.total}
                </div>
              </div>

              <MiniPieChart value={st.scanned} total={st.total} label="Scanned" />
              <MiniPieChart value={st.notScanned} total={st.total} label="Pending" />
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div
                style={{
                  flex: 1,
                  background: C.surface,
                  border: `1px solid ${C.line}`,
                  borderRadius: '8px',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}
              >
                <ProgressBar
                  value={st.scanned}
                  max={st.total}
                  label="Overall Scan Completion"
                />
              </div>

              <StatusCard
                title="PSU-1 Status"
                good={st.psu1Good}
                damaged={st.psu1Dmg}
                empty={st.psu1Empty}
                total={st.total}
              />

              <StatusCard
                title="PSU-2 Status"
                good={st.psu2Good}
                damaged={st.psu2Dmg}
                empty={st.psu2Empty}
                total={st.total}
              />
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <ConditionBarCard
                good={st.condGood}
                damaged={st.condDmg}
                empty={st.condEmpty}
                total={st.total}
              />

              <MiniPieChart
                value={st.powerCord}
                total={st.total}
                label="Power Cord"
              />

              <MiniPieChart value={st.rails} total={st.total} label="Rails" />
            </div>
          </div>
        )}

        {/* BOTTOM GRID */}
        {st && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1.7fr',
              gap: '16px',
              flex: 1,
              minHeight: 0,
            }}
          >
            {/* Recent Technician Activity */}
            <div
              style={{
                background: C.surface,
                border: `1px solid ${C.line}`,
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                overflow: 'hidden',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <div
                style={{
                  padding: '16px 20px',
                  fontSize: '12px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderBottom: `1px solid ${C.line}`,
                  background: '#f8fafc',
                  flexShrink: 0,
                  color: C.navy,
                }}
              >
                Recent Technician Activity
              </div>

              <div style={{ flex: 1, overflowY: 'auto' }}>
                {activities.length === 0 ? (
                  <div
                    style={{
                      padding: 40,
                      textAlign: 'center',
                      color: C.muted,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    No recent scans found.
                  </div>
                ) : (
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: 13,
                    }}
                  >
                    <thead
                      style={{
                        position: 'sticky',
                        top: 0,
                        background: '#fff',
                        borderBottom: `1px solid ${C.line}`,
                        zIndex: 1,
                      }}
                    >
                      <tr>
                        <th
                          style={{
                            padding: '12px 20px',
                            textAlign: 'left',
                            fontWeight: 800,
                            color: C.navy,
                            fontSize: '11px',
                            textTransform: 'uppercase',
                          }}
                        >
                          Technician
                        </th>

                        <th
                          style={{
                            padding: '12px 20px',
                            textAlign: 'left',
                            fontWeight: 800,
                            color: C.navy,
                            fontSize: '11px',
                            textTransform: 'uppercase',
                          }}
                        >
                          Date
                        </th>

                        <th
                          style={{
                            padding: '12px 20px',
                            textAlign: 'left',
                            fontWeight: 800,
                            color: C.navy,
                            fontSize: '11px',
                            textTransform: 'uppercase',
                          }}
                        >
                          Time
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {activities.map((row, i) => (
                        <tr
                          key={i}
                          style={{
                            borderBottom:
                              i !== activities.length - 1
                                ? `1px solid ${C.line}`
                                : 'none',
                          }}
                        >
                          <td
                            style={{
                              padding: '12px 20px',
                              fontWeight: 700,
                              color: C.navy,
                            }}
                          >
                            {row.userName}
                          </td>

                          <td
                            style={{
                              padding: '12px 20px',
                              color: C.slate,
                              fontWeight: 600,
                            }}
                          >
                            {row.date || '—'}
                          </td>

                          <td
                            style={{
                              padding: '12px 20px',
                              color: C.slate,
                              fontWeight: 600,
                            }}
                          >
                            {row.time || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <DOAAnalytics data={filteredData} />
          </div>
        )}
      </div>
    </div>
  );
}