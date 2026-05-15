import React, { useMemo, useState } from 'react';

const C = {
  bg: '#f3f6fb',
  surface: '#ffffff',
  navy: '#0f172a',
  text: '#0f172a',
  muted: '#64748b',
  line: '#e2e8f0',
  green: '#16a34a',
  red: '#dc2626',
  amber: '#d97706',
  blue: '#2563eb',
};

const dummyCablingData = [
  {
    rackId: 'RACK-01',
    deviceName: 'Cisco UCS Server',
    cableType: 'CAT6',
    sourcePort: 'SW-01/Gi0/1',
    destinationPort: 'UCS-01/ETH0',
    cableStatus: 'Connected',
    labelStatus: 'Labeled',
    technician: 'Technician A',
    lastUpdated: '2026-05-14 10:30 AM',
  },
  {
    rackId: 'RACK-02',
    deviceName: 'Storage Controller',
    cableType: 'Fiber',
    sourcePort: 'SAN-01/FC1',
    destinationPort: 'STOR-01/FC0',
    cableStatus: 'Connected',
    labelStatus: 'Labeled',
    technician: 'Technician B',
    lastUpdated: '2026-05-14 11:15 AM',
  },
  {
    rackId: 'RACK-03',
    deviceName: 'Management Switch',
    cableType: 'CAT6',
    sourcePort: 'MGMT-SW/Port-12',
    destinationPort: 'Server-03/iDRAC',
    cableStatus: 'Pending',
    labelStatus: 'Not Labeled',
    technician: 'Technician C',
    lastUpdated: '2026-05-14 12:05 PM',
  },
  {
    rackId: 'RACK-04',
    deviceName: 'GPU Server',
    cableType: 'CAT6A',
    sourcePort: 'TOR-02/Port-22',
    destinationPort: 'GPU-01/ETH1',
    cableStatus: 'Connected',
    labelStatus: 'Labeled',
    technician: 'Technician A',
    lastUpdated: '2026-05-14 01:20 PM',
  },
  {
    rackId: 'RACK-05',
    deviceName: 'Firewall',
    cableType: 'Fiber',
    sourcePort: 'ISP-HANDOFF',
    destinationPort: 'FW-01/WAN',
    cableStatus: 'Issue Found',
    labelStatus: 'Labeled',
    technician: 'Technician D',
    lastUpdated: '2026-05-14 02:45 PM',
  },
];

function getStatusColor(value) {
  const v = String(value || '').toLowerCase();

  if (v.includes('connected') || v.includes('labeled')) {
    return C.green;
  }

  if (v.includes('issue') || v.includes('not')) {
    return C.red;
  }

  if (v.includes('pending')) {
    return C.amber;
  }

  return C.text;
}

export default function Cabling() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) {
      return dummyCablingData;
    }

    const term = searchTerm.toLowerCase();

    return dummyCablingData.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(term)
      )
    );
  }, [searchTerm]);

  const headers = [
    'Rack ID',
    'Device Name',
    'Cable Type',
    'Source Port',
    'Destination Port',
    'Cable Status',
    'Label Status',
    'Technician',
    'Last Updated',
  ];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: C.bg,
        overflow: 'hidden',
        paddingTop: '80px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          height: '100%',
          maxWidth: '1600px',
          margin: '0 auto',
          padding: '0 24px 24px 24px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 800,
                color: C.navy,
              }}
            >
              Cabling
            </h1>

            <p style={{ margin: '4px 0 0', fontSize: 13, color: C.muted }}>
              Dummy cabling inspection table
            </p>
          </div>

          <input
            type="text"
            placeholder="Search cabling..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 12px',
              width: 280,
              fontSize: 13,
              border: `1px solid ${C.line}`,
              borderRadius: 8,
              outline: 'none',
            }}
          />
        </div>

        <div
          style={{
            flex: 1,
            background: C.surface,
            border: `1px solid ${C.line}`,
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: 0,
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: `1px solid ${C.line}`,
              color: C.muted,
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            Showing {filteredRows.length} cabling records
          </div>

          <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 13,
                minWidth: 1100,
              }}
            >
              <thead
                style={{
                  position: 'sticky',
                  top: 0,
                  background: '#f8fafc',
                  zIndex: 5,
                }}
              >
                <tr>
                  {headers.map((header) => (
                    <th
                      key={header}
                      style={{
                        padding: '12px 14px',
                        textAlign: 'left',
                        color: C.navy,
                        borderBottom: `1px solid ${C.line}`,
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: 0.4,
                        whiteSpace: 'nowrap',
                        background: '#f8fafc',
                      }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={headers.length}
                      style={{
                        padding: 40,
                        textAlign: 'center',
                        color: C.muted,
                      }}
                    >
                      No cabling records found.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, index) => (
                    <tr
                      key={`${row.rackId}-${index}`}
                      style={{
                        borderBottom:
                          index !== filteredRows.length - 1
                            ? `1px solid ${C.line}`
                            : 'none',
                        background: index % 2 === 0 ? '#fff' : '#f8fafc',
                      }}
                    >
                      <td style={tdStyle}>{row.rackId}</td>
                      <td style={tdStyle}>{row.deviceName}</td>
                      <td style={tdStyle}>{row.cableType}</td>
                      <td style={tdStyle}>{row.sourcePort}</td>
                      <td style={tdStyle}>{row.destinationPort}</td>

                      <td
                        style={{
                          ...tdStyle,
                          color: getStatusColor(row.cableStatus),
                          fontWeight: 800,
                        }}
                      >
                        {row.cableStatus}
                      </td>

                      <td
                        style={{
                          ...tdStyle,
                          color: getStatusColor(row.labelStatus),
                          fontWeight: 800,
                        }}
                      >
                        {row.labelStatus}
                      </td>

                      <td style={tdStyle}>{row.technician}</td>
                      <td style={tdStyle}>{row.lastUpdated}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const tdStyle = {
  padding: '11px 14px',
  color: C.text,
  fontWeight: 500,
  whiteSpace: 'nowrap',
  verticalAlign: 'middle',
};