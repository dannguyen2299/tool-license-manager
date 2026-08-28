const CONFIG = {
  // Spreadsheet công khai: chỉ chứa Tools và Downloads.
  PUBLIC_SHEET_ID: '13_g35VoVLxxqjS40sDUsK41M9G3ReAy1NvpEHVxEHJA',

  // Spreadsheet riêng: chứa Admins, AuditLogs và log lịch sử Licenses.
  ADMIN_SHEET_ID: '1BuQwiH6L0YgIFat6USJcbMeRoL1QJ3yYvK8gkcYDWIA',

  // Spreadsheet Licenses: dữ liệu license đang hoạt động, cấp quyền chỉnh sửa riêng cho tool_admin.
  LICENSES_SHEET_ID: '1LjOz41EMAFOZXTb8Ys653MQ6cXyqkcMcrVqhhHJWY9k',

  // HƯỚNG DẪN CẤU HÌNH EMPLOYEES:
  // 1. Tạo một Google Sheet mới từ templates/employees-template.fods.
  // 2. Giữ tên tab là "Employees" và giữ nguyên thứ tự các cột:
  //    employee_id, email, display_name, allowed_tools, status, created_at, updated_at, notes.
  // 3. Share quyền Editor cho các tài khoản admin/super_admin cần quản lý nhân viên.
  // 4. Dán ID của Google Sheet vào EMPLOYEES_SHEET_ID bên dưới.
  // 5. Sau khi admin thêm nhân viên, chủ tài khoản cập nhật email vào CONFIG.EMPLOYEES.
  // Nhân viên vẫn cần được share quyền phù hợp trên LICENSES_SHEET_ID để dùng màn hình license.
  EMPLOYEES_SHEET_ID: '',
  EMPLOYEE_SHEET_NAME: 'Employees',

  // API key chỉ dùng đọc spreadsheet công khai.
  API_KEY: 'AIzaSyD6cFjNGy7Tn6zDn7D7K6JlDVkvpZ-QPvA',

  // OAuth 2.0 Web Client ID.
  CLIENT_ID: '476885397280-sbpiscku76in4ld4k07tkrcbnpq7usul.apps.googleusercontent.com',

  PUBLIC_SHEET_NAMES: {
    TOOLS: 'Tools',
    DOWNLOADS: 'Downloads',
  },

  ADMIN_SHEET_NAMES: {
    ADMINS: 'Admins',
    LICENSES: 'Licenses',
    AUDIT_LOGS: 'AuditLogs',
  },

  // Danh sách admin đăng nhập được — thay cho tab Admins trên Sheets, để role `admin`
  // không cần quyền truy cập ADMIN_SHEET_ID (nơi chứa Admins/AuditLogs) chỉ để đăng nhập.
  ADMINS: [
    { email: 'dannguyen22993@gmail.com', display_name: 'dannv', role: 'super_admin', allowed_tools: '*', status: 'active' },
    { email: 'tranthiennhan.marketing@gmail.com', display_name: 'nhantt', role: 'admin', allowed_tools: '*', status: 'active' },
    { email: 'babydontcry991212@gmail.com', display_name: 'babydontcry', role: 'admin', allowed_tools: '*', status: 'active' },
  ],

  // DANH SÁCH NHÂN VIÊN ĐƯỢC PHÉP ĐĂNG NHẬP:
  // - Mỗi email phải trùng chính xác với email Google đăng nhập.
  // - role luôn là "employee".
  // - status: active cho phép đăng nhập, inactive chặn đăng nhập.
  // - allowed_tools: dùng "*" cho tất cả tool hoặc liệt kê tool_id cách nhau bằng dấu phẩy.
  // - employee dùng được luồng license giống admin; không quản lý Tools/Downloads và không cấp key.
  EMPLOYEES: [
    // { email: 'employee@example.com', display_name: 'Tên nhân viên', role: 'employee', allowed_tools: '*', status: 'active' },
  ],
};
