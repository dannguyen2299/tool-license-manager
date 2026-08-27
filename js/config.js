const CONFIG = {
  // Spreadsheet công khai: chỉ chứa Tools và Downloads.
  PUBLIC_SHEET_ID: '13_g35VoVLxxqjS40sDUsK41M9G3ReAy1NvpEHVxEHJA',

  // Spreadsheet riêng: chứa Admins, AuditLogs và log lịch sử Licenses.
  ADMIN_SHEET_ID: '1BuQwiH6L0YgIFat6USJcbMeRoL1QJ3yYvK8gkcYDWIA',

  // Spreadsheet Licenses: dữ liệu license đang hoạt động, cấp quyền chỉnh sửa riêng cho tool_admin.
  LICENSES_SHEET_ID: '1LjOz41EMAFOZXTb8Ys653MQ6cXyqkcMcrVqhhHJWY9k',

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
};
