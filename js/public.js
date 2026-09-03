let tools = [];

const toolGrid = document.getElementById('toolGrid');
const searchInput = document.getElementById('searchInput');
const statusMessage = document.getElementById('statusMessage');
document.getElementById('year').textContent = new Date().getFullYear();

function showError(message) {
  statusMessage.textContent = message;
  statusMessage.className = 'notice error';
  statusMessage.setAttribute('role', 'alert');
  toolGrid.innerHTML = '<p class="empty">Không thể tải danh sách tool lúc này.</p>';
}

function renderTools() {
  const term = searchInput.value.trim().toLowerCase();
  const visible = tools.filter((tool) => {
    const content = `${tool.name} ${tool.short_description} ${tool.description}`.toLowerCase();
    return tool.status === 'active' && content.includes(term);
  });
  toolGrid.innerHTML = visible.length ? visible.map((tool) => `
    <article class="tool-card">
      ${tool.image_url ? `<img class="tool-image" src="${escapeHtml(tool.image_url)}" alt="${escapeHtml(tool.name)}" loading="lazy" />` : ''}
      <div class="tool-badge">TOOL</div>
      <h3>${escapeHtml(tool.name)}</h3>
      <p>${escapeHtml(tool.short_description || tool.description)}</p>
      <div class="tool-meta">Phiên bản ${escapeHtml(tool.latest_version || 'đang cập nhật')}</div>
      <a class="button secondary" href="tool.html?id=${encodeURIComponent(tool.tool_id)}">Xem chi tiết</a>
    </article>
  `).join('') : '<div class="empty">Không tìm thấy tool phù hợp.</div>';
}

async function init() {
  try {
    tools = await readPublicSheet(CONFIG.PUBLIC_SHEET_NAMES.TOOLS);
    renderTools();
  } catch (error) {
    showError(error.message);
  }
}

searchInput.addEventListener('input', renderTools);
init();
