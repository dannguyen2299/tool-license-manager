const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[char]);
}

function assertConfigured(...keys) {
  const missing = keys.filter((key) => !CONFIG[key]);
  if (missing.length) throw new Error(`Chưa cấu hình: ${missing.join(', ')}`);
}

async function parseResponse(response, fallback) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `${fallback} (${response.status})`);
  return data;
}

function valuesUrl(spreadsheetId, range, query = '') {
  return `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}${query}`;
}

function rowsToObjects(values = []) {
  if (!values.length) return [];
  const headers = values[0].map((header) => String(header).trim());
  return values.slice(1).map((row, index) => {
    const object = { rowNumber: index + 2 };
    headers.forEach((header, columnIndex) => {
      object[header] = row[columnIndex] ?? '';
    });
    return object;
  });
}

function hasDataFields(row) {
  return Object.entries(row).some(([key, value]) => key !== 'rowNumber' && Boolean(String(value ?? '').trim()));
}

async function readPublicSheet(sheetName, range = 'A:Z') {
  assertConfigured('PUBLIC_SHEET_ID', 'API_KEY');
  const fullRange = `${sheetName}!${range}`;
  const response = await fetch(valuesUrl(CONFIG.PUBLIC_SHEET_ID, fullRange, `?key=${encodeURIComponent(CONFIG.API_KEY)}`));
  const data = await parseResponse(response, 'Không đọc được dữ liệu công khai');
  return rowsToObjects(data.values || []).filter(hasDataFields);
}

function assertSpreadsheetId(spreadsheetId, label) {
  if (!spreadsheetId) throw new Error(`Chưa cấu hình: ${label}`);
}

async function readPrivateSheet(accessToken, spreadsheetId, sheetName, range = 'A:Z') {
  assertSpreadsheetId(spreadsheetId, sheetName);
  const response = await fetch(valuesUrl(spreadsheetId, `${sheetName}!${range}`), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await parseResponse(response, `Không đọc được sheet ${sheetName}`);
  return rowsToObjects(data.values || []).filter(hasDataFields);
}

function objectToRow(object, headers) {
  return headers.map((header) => object[header] ?? '');
}

async function appendPrivateRow(accessToken, spreadsheetId, sheetName, object, headers) {
  assertSpreadsheetId(spreadsheetId, sheetName);
  const range = `${sheetName}!A:Z`;
  const response = await fetch(`${valuesUrl(spreadsheetId, range)}:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [objectToRow(object, headers)] }),
  });
  return parseResponse(response, `Không thêm được dữ liệu vào ${sheetName}`);
}

async function updatePrivateRow(accessToken, spreadsheetId, sheetName, rowNumber, object, headers) {
  assertSpreadsheetId(spreadsheetId, sheetName);
  const endColumn = String.fromCharCode(64 + headers.length);
  const range = `${sheetName}!A${rowNumber}:${endColumn}${rowNumber}`;
  const response = await fetch(valuesUrl(spreadsheetId, range, '?valueInputOption=USER_ENTERED'), {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [objectToRow(object, headers)] }),
  });
  return parseResponse(response, `Không cập nhật được dữ liệu trong ${sheetName}`);
}

async function getGoogleUser(accessToken) {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return parseResponse(response, 'Không xác định được tài khoản Google');
}
