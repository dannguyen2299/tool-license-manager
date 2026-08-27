const LICENSE_HEADERS = [
  'license_id', 'license_key', 'tool_id', 'customer_name', 'customer_email', 'machine_id',
  'plan', 'issued_at', 'duration_days', 'expires_at', 'max_devices', 'status',
  'activated_at', 'last_check_at', 'notes', 'created_by', 'customer_phone',
];

const TOOL_HEADERS = [
  'tool_id', 'slug', 'name', 'short_description', 'description',
  'latest_version', 'image_url', 'status', 'sort_order',
];

const DOWNLOAD_HEADERS = [
  'download_id', 'tool_id', 'version', 'os', 'architecture', 'file_name',
  'file_url', 'file_size', 'checksum', 'release_notes', 'status', 'release_date',
];

let tokenClient;
let accessToken = null;
let currentUser = null;
let tools = [];
let downloads = [];
let licenses = [];
let editingLicense = null;
let activeToolId = null;
let licensePage = 1;
let pendingPage = 1;
let toolPage = 1;
const LICENSE_PAGE_SIZE = 10;

const OS_LIST = [
  { os: 'windows', label: 'Windows', architecture: 'x64' },
  { os: 'macos', label: 'macOS', architecture: 'universal' },
  { os: 'linux', label: 'Linux', architecture: 'x64' },
];

const $ = (id) => document.getElementById(id);

function showStatus(message, type = 'success') {
  $('statusMessage').textContent = message;
  $('statusMessage').className = `notice ${type}`;
}

function saveToken(token, expiresIn) {
  sessionStorage.setItem('license_admin_token', JSON.stringify({ token, expiresAt: Date.now() + expiresIn * 1000 }));
}

function loadToken() {
  try {
    const value = JSON.parse(sessionStorage.getItem('license_admin_token') || 'null');
    return value && Date.now() < value.expiresAt ? value.token : null;
  } catch { return null; }
}

function isSuperAdmin() {
  return currentUser?.role === 'super_admin';
}

function canManageTool(toolId) {
  if (!currentUser) return false;
  if (isSuperAdmin()) return true;
  const allowed = currentUser.allowed_tools.split(',').map((value) => value.trim()).filter(Boolean);
  return currentUser.role === 'admin' && (allowed.includes('*') || allowed.includes(toolId));
}

function renderToolOptions() {
  $('licenseTool').innerHTML = tools.filter((tool) => tool.status === 'active' && canManageTool(tool.tool_id))
    .map((tool) => `<option value="${escapeHtml(tool.tool_id)}">${escapeHtml(tool.name)}</option>`).join('');
}

function renderToolsAdmin() {
  if (!isSuperAdmin()) return;
  const sorted = [...tools].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  const totalPages = Math.max(1, Math.ceil(sorted.length / LICENSE_PAGE_SIZE));
  toolPage = Math.min(Math.max(toolPage, 1), totalPages);
  const pageRows = sorted.slice((toolPage - 1) * LICENSE_PAGE_SIZE, toolPage * LICENSE_PAGE_SIZE);
  $('toolAdminRows').innerHTML = pageRows.length ? pageRows.map((tool) => `<tr>
    <td><strong>${escapeHtml(tool.name)}</strong><small>${escapeHtml(tool.tool_id)}</small></td>
    <td>${escapeHtml(tool.latest_version)}</td>
    <td>${escapeHtml(tool.sort_order)}</td>
    <td><span class="status-pill ${escapeHtml(tool.status)}">${escapeHtml(tool.status)}</span></td>
    <td class="row-actions"><button class="button secondary" data-action="manage-tool" data-row="${tool.rowNumber}">Quản lý</button></td>
  </tr>`).join('') : '<tr><td colspan="5" class="empty">Chưa có tool.</td></tr>';
  $('toolCount').textContent = `${sorted.length} tool`;
  $('toolPageInfo').textContent = `Trang ${toolPage}/${totalPages}`;
  $('toolPrev').disabled = toolPage <= 1;
  $('toolNext').disabled = toolPage >= totalPages;
}

function renderDownloadOsRows() {
  $('downloadOsRows').innerHTML = OS_LIST.map(({ os, label, architecture }) => {
    const file = downloads.find((item) => item.tool_id === activeToolId && item.os === os) || {};
    const isInactive = file.status === 'inactive';
    return `<tr data-os="${os}" data-architecture="${architecture}" data-label="${label}" data-row="${file.rowNumber || ''}" data-download-id="${escapeHtml(file.download_id || '')}">
      <td><strong>${label}</strong></td>
      <td><input class="dl-version" value="${escapeHtml(file.version || '')}" placeholder="1.0.0" /></td>
      <td><input class="dl-url" value="${escapeHtml(file.file_url || '')}" placeholder="Link Google Drive" /></td>
      <td><input class="dl-size" value="${escapeHtml(file.file_size || '')}" placeholder="45 MB" /></td>
      <td><input type="date" class="dl-date" value="${escapeHtml(file.release_date || '')}" /></td>
      <td><select class="dl-status"><option value="active"${isInactive ? '' : ' selected'}>active</option><option value="inactive"${isInactive ? ' selected' : ''}>inactive</option></select></td>
      <td class="row-actions"><button class="button secondary" data-action="save-download" type="button">Lưu</button></td>
    </tr>`;
  }).join('');
}

function showTab(tab) {
  $('licensePanel').classList.toggle('hidden', tab !== 'license');
  $('toolsPanel').classList.toggle('hidden', tab !== 'tools');
  $('tabLicenses').classList.toggle('active', tab === 'license');
  $('tabTools').classList.toggle('active', tab === 'tools');
  if (tab === 'tools') showToolsList();
}

function showToolsList() {
  activeToolId = null;
  $('toolListView').classList.remove('hidden');
  $('toolDetailView').classList.add('hidden');
}

function showToolDetail(tool) {
  activeToolId = tool.tool_id;
  $('toolListView').classList.add('hidden');
  $('toolDetailView').classList.remove('hidden');
  $('toolDetailTitle').textContent = `Sửa thông tin: ${tool.name}`;
  $('toolDetailId').value = tool.tool_id;
  const form = $('toolDetailForm');
  [...form.elements].forEach((element) => {
    if (element.name && tool[element.name] !== undefined) element.value = tool[element.name];
  });
  form.dataset.rowNumber = tool.rowNumber;
  renderDownloadOsRows();
}

$('tabLicenses').onclick = () => showTab('license');
$('tabTools').onclick = () => { if (isSuperAdmin()) showTab('tools'); };
$('toolBackBtn').onclick = showToolsList;

function renderLicenses() {
  const statusFilter = $('licenseStatusFilter').value;
  const issuedFrom = $('licenseIssuedFrom').value;
  const issuedTo = $('licenseIssuedTo').value;
  const expiresFrom = $('licenseExpiresFrom').value;
  const expiresTo = $('licenseExpiresTo').value;
  const rows = licenses.filter((license) => {
    if (!isSuperAdmin() && !(canManageTool(license.tool_id) && license.created_by?.toLowerCase() === currentUser.email.toLowerCase())) return false;
    if (statusFilter && license.status !== statusFilter) return false;
    if (issuedFrom && license.issued_at < issuedFrom) return false;
    if (issuedTo && license.issued_at > issuedTo) return false;
    if (expiresFrom && license.expires_at < expiresFrom) return false;
    if (expiresTo && license.expires_at > expiresTo) return false;
    return true;
  });
  const sorted = [...rows].sort((a, b) => b.rowNumber - a.rowNumber);
  const totalPages = Math.max(1, Math.ceil(sorted.length / LICENSE_PAGE_SIZE));
  licensePage = Math.min(Math.max(licensePage, 1), totalPages);
  const pageRows = sorted.slice((licensePage - 1) * LICENSE_PAGE_SIZE, licensePage * LICENSE_PAGE_SIZE);
  const actions = (license) => {
    if (isSuperAdmin()) {
      return `<button class="button secondary" data-action="edit" data-row="${license.rowNumber}">Sửa</button><button class="button secondary" data-action="revoke" data-row="${license.rowNumber}">Khóa</button>`;
    }
    if (license.status === 'pending_review' && license.created_by?.toLowerCase() === currentUser.email.toLowerCase()) {
      return `<button class="button secondary" data-action="cancel" data-row="${license.rowNumber}">Hủy</button>`;
    }
    return '';
  };
  $('licenseRows').innerHTML = pageRows.length ? pageRows.map((license) => `<tr>
    <td><strong>${escapeHtml(license.license_key || '(chưa cấp)')}</strong><small>${escapeHtml(license.license_id)}</small></td>
    <td>${escapeHtml(license.tool_id)}</td>
    <td>${escapeHtml(license.customer_name)}<small>${escapeHtml([license.customer_email, license.customer_phone].filter(Boolean).join(' · '))}</small></td>
    <td>${escapeHtml(license.machine_id)}</td>
    <td>${escapeHtml(license.expires_at)}</td>
    <td><span class="status-pill ${escapeHtml(license.status)}">${escapeHtml(license.status)}</span></td>
    <td class="row-actions">${actions(license)}</td>
  </tr>`).join('') : '<tr><td colspan="6" class="empty">Chưa có license.</td></tr>';
  $('licenseCount').textContent = `${sorted.length} license`;
  $('licensePageInfo').textContent = `Trang ${licensePage}/${totalPages}`;
  $('licensePrev').disabled = licensePage <= 1;
  $('licenseNext').disabled = licensePage >= totalPages;
}

function renderPendingReview() {
  if (!isSuperAdmin()) return;
  const rows = licenses.filter((license) => license.status === 'pending_review');
  const sorted = [...rows].sort((a, b) => b.rowNumber - a.rowNumber);
  const totalPages = Math.max(1, Math.ceil(sorted.length / LICENSE_PAGE_SIZE));
  pendingPage = Math.min(Math.max(pendingPage, 1), totalPages);
  const pageRows = sorted.slice((pendingPage - 1) * LICENSE_PAGE_SIZE, pendingPage * LICENSE_PAGE_SIZE);
  $('pendingRows').innerHTML = pageRows.length ? pageRows.map((license) => `<tr>
    <td><strong>${escapeHtml(license.license_id)}</strong></td>
    <td>${escapeHtml(license.tool_id)}</td>
    <td>${escapeHtml(license.customer_name)}<small>${escapeHtml([license.customer_email, license.customer_phone].filter(Boolean).join(' · '))}</small></td>
    <td>${escapeHtml(license.issued_at)}</td>
    <td>${escapeHtml(license.created_by)}</td>
    <td class="row-actions"><button class="button" data-action="issue-key" data-row="${license.rowNumber}">Cấp key</button></td>
  </tr>`).join('') : '<tr><td colspan="6" class="empty">Không có license nào chờ cấp key.</td></tr>';
  $('pendingCount').textContent = `${sorted.length} chờ duyệt`;
  $('pendingPageInfo').textContent = `Trang ${pendingPage}/${totalPages}`;
  $('pendingPrev').disabled = pendingPage <= 1;
  $('pendingNext').disabled = pendingPage >= totalPages;
}

function applyRoleUI() {
  $('pendingReviewCard').classList.toggle('hidden', !isSuperAdmin());
  $('licenseKeyField').classList.toggle('hidden', !isSuperAdmin());
  $('tabTools').classList.toggle('hidden', !isSuperAdmin());
  if (!isSuperAdmin()) showTab('license');
}

async function logLicenseChange(license) {
  try {
    await appendPrivateRow(accessToken, CONFIG.ADMIN_SHEET_ID, CONFIG.ADMIN_SHEET_NAMES.LICENSES, license, LICENSE_HEADERS);
  } catch (error) {
    console.error('Không ghi được log license:', error);
  }
}

async function loadAdminData() {
  const account = CONFIG.ADMINS.find((admin) => admin.email.toLowerCase() === currentUser.email.toLowerCase() && admin.status === 'active');
  if (!account) throw new Error('Tài khoản Google này chưa được cấp quyền quản trị.');
  currentUser = account;
  [tools, downloads, licenses] = await Promise.all([
    readPublicSheet(CONFIG.PUBLIC_SHEET_NAMES.TOOLS),
    readPublicSheet(CONFIG.PUBLIC_SHEET_NAMES.DOWNLOADS),
    readPrivateSheet(accessToken, CONFIG.LICENSES_SHEET_ID, CONFIG.ADMIN_SHEET_NAMES.LICENSES),
  ]);
  $('userInfo').textContent = `${account.display_name || account.email} · ${account.role}`;
  $('loginBox').classList.add('hidden');
  $('adminPanel').classList.remove('hidden');
  $('logoutBtn').classList.remove('hidden');
  applyRoleUI();
  renderToolOptions();
  licensePage = 1;
  pendingPage = 1;
  toolPage = 1;
  renderLicenses();
  renderPendingReview();
  renderToolsAdmin();
  showToolsList();
  updateExpiresAt();
}

$('licensePrev').onclick = () => { licensePage -= 1; renderLicenses(); };
$('licenseNext').onclick = () => { licensePage += 1; renderLicenses(); };
$('pendingPrev').onclick = () => { pendingPage -= 1; renderPendingReview(); };
$('pendingNext').onclick = () => { pendingPage += 1; renderPendingReview(); };
$('toolPrev').onclick = () => { toolPage -= 1; renderToolsAdmin(); };
$('toolNext').onclick = () => { toolPage += 1; renderToolsAdmin(); };

function applyLicenseFilter() { licensePage = 1; renderLicenses(); }
['licenseStatusFilter', 'licenseIssuedFrom', 'licenseIssuedTo', 'licenseExpiresFrom', 'licenseExpiresTo'].forEach((id) => {
  $(id).addEventListener('input', applyLicenseFilter);
  $(id).addEventListener('change', applyLicenseFilter);
});
$('licenseFilterReset').onclick = () => {
  ['licenseStatusFilter', 'licenseIssuedFrom', 'licenseIssuedTo', 'licenseExpiresFrom', 'licenseExpiresTo'].forEach((id) => { $(id).value = ''; });
  applyLicenseFilter();
};

function initAuth() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email',
    callback: async (response) => {
      if (response.error) return showStatus(`Đăng nhập thất bại: ${response.error}`, 'error');
      accessToken = response.access_token;
      saveToken(accessToken, response.expires_in);
      try {
        currentUser = await getGoogleUser(accessToken);
        await loadAdminData();
      } catch (error) { showStatus(error.message, 'error'); }
    },
  });
  const stored = loadToken();
  if (stored) {
    accessToken = stored;
    getGoogleUser(accessToken).then((user) => { currentUser = user; return loadAdminData(); }).catch((error) => {
      console.error('Khôi phục phiên đăng nhập thất bại:', error);
      showStatus(`Phiên đăng nhập hết hạn hoặc lỗi: ${error.message}`, 'error');
      sessionStorage.removeItem('license_admin_token');
    });
  }
}

$('loginBtn').onclick = () => tokenClient.requestAccessToken();
$('logoutBtn').onclick = () => {
  if (accessToken && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(accessToken, () => {});
  sessionStorage.removeItem('license_admin_token');
  window.location.href = 'index.html';
};

function fillLicenseForm(license) {
  editingLicense = license;
  const form = $('licenseForm');
  [...form.elements].forEach((element) => {
    if (element.name && license[element.name] !== undefined) element.value = license[element.name];
  });
  $('licenseSubmit').textContent = 'Lưu thay đổi';
  $('licenseCancel').classList.remove('hidden');
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetLicenseForm() {
  editingLicense = null;
  $('licenseForm').reset();
  $('licenseStatus').value = 'active';
  $('licenseSubmit').textContent = 'Thêm license';
  $('licenseCancel').classList.add('hidden');
  updateExpiresAt();
}

function updateExpiresAt() {
  if (editingLicense) return;
  const days = Number($('licenseDuration').value);
  if (!days) return;
  const date = new Date();
  date.setDate(date.getDate() + days);
  $('licenseExpiresAt').value = date.toISOString().slice(0, 10);
}

$('licenseDuration').addEventListener('input', updateExpiresAt);
$('licenseCancel').onclick = resetLicenseForm;
$('licenseRows').addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const license = licenses.find((item) => item.rowNumber === Number(button.dataset.row));
  if (!license) return;
  const action = button.dataset.action;
  if (action === 'edit') return fillLicenseForm(license);
  if (action === 'cancel' && !(license.status === 'pending_review' && license.created_by?.toLowerCase() === currentUser.email.toLowerCase())) return;
  const message = action === 'cancel' ? `Hủy yêu cầu license cho ${license.customer_name}?` : `Khóa license ${license.license_key}?`;
  if (!confirm(message)) return;
  try {
    const revoked = { ...license, status: 'revoked' };
    await updatePrivateRow(accessToken, CONFIG.LICENSES_SHEET_ID, CONFIG.ADMIN_SHEET_NAMES.LICENSES, license.rowNumber, revoked, LICENSE_HEADERS);
    await logLicenseChange(revoked);
    showStatus(action === 'cancel' ? 'Đã hủy yêu cầu license.' : 'Đã khóa license.');
    licenses = await readPrivateSheet(accessToken, CONFIG.LICENSES_SHEET_ID, CONFIG.ADMIN_SHEET_NAMES.LICENSES);
    renderLicenses();
    renderPendingReview();
  } catch (error) { showStatus(error.message, 'error'); }
});

$('pendingRows').addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action="issue-key"]');
  if (!button) return;
  const license = licenses.find((item) => item.rowNumber === Number(button.dataset.row));
  if (!license) return;
  const key = prompt(`Nhập license key cấp cho ${license.customer_name}:`, '');
  if (!key || !key.trim()) return;
  const issued = { ...license, license_key: key.trim(), status: 'active', activated_at: new Date().toISOString().slice(0, 10) };
  try {
    await updatePrivateRow(accessToken, CONFIG.LICENSES_SHEET_ID, CONFIG.ADMIN_SHEET_NAMES.LICENSES, license.rowNumber, issued, LICENSE_HEADERS);
    await logLicenseChange(issued);
    showStatus('Đã cấp key.');
    licenses = await readPrivateSheet(accessToken, CONFIG.LICENSES_SHEET_ID, CONFIG.ADMIN_SHEET_NAMES.LICENSES);
    renderLicenses();
    renderPendingReview();
  } catch (error) { showStatus(error.message, 'error'); }
});

$('licenseForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const toolId = form.get('tool_id');
  if (!canManageTool(toolId)) return showStatus('Bạn không có quyền quản lý tool này.', 'error');
  if (editingLicense && !isSuperAdmin()) return showStatus('Bạn không có quyền sửa license.', 'error');
  const license = { ...(editingLicense || {}), ...Object.fromEntries(form.entries()) };
  license.license_id = editingLicense?.license_id || `LIC-${Date.now()}`;
  license.issued_at = editingLicense?.issued_at || new Date().toISOString().slice(0, 10);
  license.created_by = editingLicense?.created_by || currentUser.email;
  if (!isSuperAdmin()) {
    license.license_key = '';
    license.status = 'pending_review';
  } else if (license.status !== 'pending_review' && !license.license_key) {
    return showStatus('Vui lòng nhập license key.', 'error');
  }
  $('licenseSubmit').disabled = true;
  try {
    if (editingLicense) {
      await updatePrivateRow(accessToken, CONFIG.LICENSES_SHEET_ID, CONFIG.ADMIN_SHEET_NAMES.LICENSES, editingLicense.rowNumber, license, LICENSE_HEADERS);
      showStatus('Đã cập nhật license.');
    } else {
      await appendPrivateRow(accessToken, CONFIG.LICENSES_SHEET_ID, CONFIG.ADMIN_SHEET_NAMES.LICENSES, license, LICENSE_HEADERS);
      showStatus('Đã thêm license.');
    }
    await logLicenseChange(license);
    resetLicenseForm();
    licenses = await readPrivateSheet(accessToken, CONFIG.LICENSES_SHEET_ID, CONFIG.ADMIN_SHEET_NAMES.LICENSES);
    renderLicenses();
    renderPendingReview();
  } catch (error) { showStatus(error.message, 'error'); }
  $('licenseSubmit').disabled = false;
});

$('toolAdminRows').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action="manage-tool"]');
  if (!button) return;
  const tool = tools.find((item) => item.rowNumber === Number(button.dataset.row));
  if (tool) showToolDetail(tool);
});

$('toolForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!isSuperAdmin()) return showStatus('Bạn không có quyền quản lý Tools.', 'error');
  const form = new FormData(event.currentTarget);
  const tool = Object.fromEntries(form.entries());
  try {
    await appendPrivateRow(accessToken, CONFIG.PUBLIC_SHEET_ID, CONFIG.PUBLIC_SHEET_NAMES.TOOLS, tool, TOOL_HEADERS);
    showStatus('Đã thêm tool.');
    event.currentTarget.reset();
    tools = await readPublicSheet(CONFIG.PUBLIC_SHEET_NAMES.TOOLS);
    renderToolOptions();
    renderToolsAdmin();
  } catch (error) { showStatus(error.message, 'error'); }
});

$('toolDetailForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!isSuperAdmin()) return showStatus('Bạn không có quyền quản lý Tools.', 'error');
  const form = new FormData(event.currentTarget);
  const tool = Object.fromEntries(form.entries());
  tool.tool_id = activeToolId;
  const rowNumber = Number(event.currentTarget.dataset.rowNumber);
  try {
    await updatePrivateRow(accessToken, CONFIG.PUBLIC_SHEET_ID, CONFIG.PUBLIC_SHEET_NAMES.TOOLS, rowNumber, tool, TOOL_HEADERS);
    showStatus('Đã cập nhật tool.');
    tools = await readPublicSheet(CONFIG.PUBLIC_SHEET_NAMES.TOOLS);
    renderToolOptions();
    renderToolsAdmin();
  } catch (error) { showStatus(error.message, 'error'); }
});

$('downloadOsRows').addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action="save-download"]');
  if (!button || !isSuperAdmin()) return;
  const row = button.closest('tr');
  const fileUrl = row.querySelector('.dl-url').value.trim();
  if (!fileUrl) return showStatus('Vui lòng nhập link file trước khi lưu.', 'error');
  if (button.disabled) return;
  button.disabled = true;
  const rowNumber = row.dataset.row ? Number(row.dataset.row) : null;
  const file = {
    download_id: row.dataset.downloadId || `DL-${Date.now()}`,
    tool_id: activeToolId,
    os: row.dataset.os,
    architecture: row.dataset.architecture,
    version: row.querySelector('.dl-version').value.trim(),
    file_name: `${row.dataset.label} Installer`,
    file_url: fileUrl,
    file_size: row.querySelector('.dl-size').value.trim(),
    checksum: '',
    release_notes: '',
    status: row.querySelector('.dl-status').value,
    release_date: row.querySelector('.dl-date').value,
  };
  try {
    if (rowNumber) {
      await updatePrivateRow(accessToken, CONFIG.PUBLIC_SHEET_ID, CONFIG.PUBLIC_SHEET_NAMES.DOWNLOADS, rowNumber, file, DOWNLOAD_HEADERS);
    } else {
      await appendPrivateRow(accessToken, CONFIG.PUBLIC_SHEET_ID, CONFIG.PUBLIC_SHEET_NAMES.DOWNLOADS, file, DOWNLOAD_HEADERS);
    }
    showStatus(`Đã lưu file ${row.dataset.label}.`);
    downloads = await readPublicSheet(CONFIG.PUBLIC_SHEET_NAMES.DOWNLOADS);
    renderDownloadOsRows();
  } catch (error) {
    showStatus(error.message, 'error');
    button.disabled = false;
  }
});

function start() {
  if (!CONFIG.CLIENT_ID) return showStatus('Chưa cấu hình CLIENT_ID trong js/config.js.', 'error');
  initAuth();
}

start();
