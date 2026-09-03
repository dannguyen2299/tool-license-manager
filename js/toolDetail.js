const toolId = new URLSearchParams(window.location.search).get('id');

const statusMessage = document.getElementById('statusMessage');
const toolDetailSection = document.getElementById('toolDetailSection');
const downloadRows = document.getElementById('downloadRows');
document.getElementById('year').textContent = new Date().getFullYear();

function showError(message) {
  statusMessage.textContent = message;
  statusMessage.className = 'notice error';
  statusMessage.setAttribute('role', 'alert');
  toolDetailSection.innerHTML = '<p class="empty">Không thể tải thông tin tool lúc này.</p>';
  downloadRows.innerHTML = '<tr><td colspan="4" class="empty">Không thể tải danh sách file.</td></tr>';
}

function renderTool(tool) {
  document.title = `${tool.name} · Tool Center`;
  const description = escapeHtml(tool.description || tool.short_description).replace(/\n/g, '<br>');
  toolDetailSection.innerHTML = `
    <article class="tool-detail">
      ${tool.image_url ? `<img class="tool-image" src="${escapeHtml(tool.image_url)}" alt="${escapeHtml(tool.name)}" />` : ''}
      <p class="eyebrow">TOOL</p>
      <h1>${escapeHtml(tool.name)}</h1>
      <p class="tool-meta">Phiên bản ${escapeHtml(tool.latest_version || 'đang cập nhật')}</p>
      <p>${description}</p>
    </article>
  `;
}

function renderDownloads(rows) {
  downloadRows.innerHTML = rows.length ? rows.map((file) => `<tr>
    <td data-label="Hệ điều hành">${escapeHtml(file.os)} ${escapeHtml(file.architecture)}</td>
    <td data-label="Phiên bản">${escapeHtml(file.version)}</td>
    <td data-label="File">${escapeHtml(file.file_name)}<small>${escapeHtml(file.file_size)}</small></td>
    <td><a class="button" href="${escapeHtml(file.file_url)}" target="_blank" rel="noopener">Tải xuống</a></td>
  </tr>`).join('') : '<tr><td colspan="4" class="empty">Chưa có file tải cho tool này.</td></tr>';
}

async function init() {
  if (!toolId) return showError('Thiếu tool trên đường dẫn.');
  try {
    const [tools, downloads] = await Promise.all([
      readPublicSheet(CONFIG.PUBLIC_SHEET_NAMES.TOOLS),
      readPublicSheet(CONFIG.PUBLIC_SHEET_NAMES.DOWNLOADS),
    ]);
    const tool = tools.find((item) => item.tool_id === toolId && item.status === 'active');
    if (!tool) return showError('Không tìm thấy tool hoặc tool đã bị ẩn.');
    renderTool(tool);
    renderDownloads(downloads.filter((file) => file.tool_id === toolId && file.status === 'active'));
  } catch (error) {
    showError(error.message);
  }
}

init();
