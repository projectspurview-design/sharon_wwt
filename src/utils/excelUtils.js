// src/utils/excelUtils.js
export function cleanStr(s) {
  return s
    .replace(/^\uFEFF/, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

export function cleanCell(raw) {
  if (!raw) return '';
  return raw
    .split('\n')
    .map(l => l.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function parseCSV(csvText) {
  const text = cleanStr(csvText);
  const rows = [];
  let row = [], cell = '', inQ = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (c === '"') {
      if (inQ && n === '"') { cell += '"'; i++; }
      else inQ = !inQ;
    } else if (c === ',' && !inQ) {
      row.push(cleanCell(cell)); cell = '';
    } else if (c === '\n' && !inQ) {
      row.push(cleanCell(cell)); cell = '';
      if (row.length > 0) rows.push(row);
      row = [];
    } else if (c === '\n' && inQ) {
      cell += '\n';
    } else {
      cell += c;
    }
  }
  if (cell || row.length) {
    row.push(cleanCell(cell));
    if (row.length > 0) rows.push(row);
  }

  if (rows.length === 0) return rows;

  const headerLength = rows[0].length;
  const normalised = rows.map(r => {
    const out = [...r];
    while (out.length < headerLength) out.push('');
    if (out.length > headerLength) out.splice(headerLength);
    return out;
  });

  const header = normalised[0];
  const dataRows = normalised.slice(1).filter(r => r.some(cell => cell !== ''));

  return [header, ...dataRows];
}

export function parseStrictScanLines(raw) {
  if (!raw || !raw.trim()) return null;
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const results = [];

  for (const line of lines) {
    const userMatch = line.match(/^(User[A-Za-z0-9]+)_/i);
    if (!userMatch) continue;

    const userId = userMatch[1];
    results.push({ userName: userId, userId, date: null, time: null });

    const isoMatch = line.match(/@\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/);
    if (isoMatch) {
      results[results.length - 1].date = isoMatch[1];
      results[results.length - 1].time = isoMatch[2];
      continue;
    }

    const shortMatch = line.match(/(\d{2})\/(\d{2})\s+(\d{2}:\d{2})\s*$/);
    if (shortMatch) {
      const year = new Date().getFullYear();
      results[results.length - 1].date = `${year}-${shortMatch[1]}-${shortMatch[2]}`;
      results[results.length - 1].time = shortMatch[3];
    }
  }
  return results.length > 0 ? results : null;
}

export function extractDatesFromScanCell(raw) {
  if (!raw || !raw.trim()) return [];
  const dates = [];
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (!/^User[A-Za-z0-9]+_/i.test(line)) continue;
    const isoMatch = line.match(/@\s*(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) dates.push(isoMatch[1]);
    else {
      const shortMatch = line.match(/(\d{2})\/(\d{2})\s+\d{2}:\d{2}\s*$/);
      if (shortMatch) dates.push(`${new Date().getFullYear()}-${shortMatch[1]}-${shortMatch[2]}`);
    }
  }
  return dates.sort().reverse();
}

// FIX: removed 'Serial No' — it's a plain text field, not a scan column
export function getRowDate(row) {
  const scanCols = ['Condition', 'PSU-1 Cond', 'PSU-2 Cond'];
  const allDates = [];
  for (const col of scanCols) {
    allDates.push(...extractDatesFromScanCell(row[col] || ''));
  }
  return allDates.length ? allDates[0] : null;
}

export function buildTechActivity(data) {
  const scanCols = ['Condition', 'PSU-1 Cond', 'PSU-2 Cond'];
  const activities = [];

  data.forEach(row => {
    scanCols.forEach(col => {
      const entries = parseStrictScanLines(row[col] || '');
      if (entries) {
        entries.forEach(e => {
          activities.push({
            userName: e.userId,
            userId: e.userId,
            date: e.date,
            time: e.time
          });
        });
      }
    });
  });

  activities.sort((a, b) => {
    const fa = a.date && a.time ? `${a.date} ${a.time}` : '';
    const fb = b.date && b.time ? `${b.date} ${b.time}` : '';
    return fb.localeCompare(fa);
  });

  const seen = new Set();
  return activities.filter(a => {
    const key = `${a.userName}|${a.date}|${a.time}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 20);
}

export function extractStatus(raw) {
  if (!raw || !raw.trim()) return '';
  const lines = raw.replace(/[\uFEFF\u00A0\u200B]/g, '').split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (/^User[A-Za-z0-9]+_/i.test(line)) continue;
    if (/^\d{4}-\d{2}-\d{2}/.test(line)) continue;
    if (/^\d{2}\/\d{2}\s+\d{2}:\d{2}/.test(line)) continue;
    return line.toLowerCase();
  }
  return '';
}

export function computeStats(data) {
  const total = data.length;

  // FIX: scanned = rows that have an actual UserXxx_ scan entry in any condition column
  const scanned = data.filter(r =>
    ['Condition', 'PSU-1 Cond', 'PSU-2 Cond'].some(col =>
      /^User[A-Za-z0-9]+_/im.test(r[col] || '')
    )
  ).length;

  const condGood  = data.filter(r => extractStatus(r['Condition']) === 'good').length;
  const condDmg   = data.filter(r => extractStatus(r['Condition']) === 'damaged').length;
  const condEmpty = total - condGood - condDmg;

  const psu1Good  = data.filter(r => extractStatus(r['PSU-1 Cond']) === 'good').length;
  const psu1Dmg   = data.filter(r => extractStatus(r['PSU-1 Cond']) === 'damaged').length;
  const psu1Empty = total - psu1Good - psu1Dmg;

  const psu2Good  = data.filter(r => extractStatus(r['PSU-2 Cond']) === 'good').length;
  const psu2Dmg   = data.filter(r => extractStatus(r['PSU-2 Cond']) === 'damaged').length;
  const psu2Empty = total - psu2Good - psu2Dmg;

  // FIX: only count 'ok' as present — 'no' should not inflate the KPI
  const powerCord = data.filter(r => (r['Power Cord'] || '').trim().toLowerCase() === 'ok').length;
  const rails     = data.filter(r => (r['Rails'] || '').trim().toLowerCase() === 'ok').length;

  return {
    total, scanned, notScanned: total - scanned,
    condGood, condDmg, condEmpty,
    psu1Good, psu1Dmg, psu1Empty,
    psu2Good, psu2Dmg, psu2Empty,
    powerCord, rails,
  };
}

export function pct(n, d) {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}