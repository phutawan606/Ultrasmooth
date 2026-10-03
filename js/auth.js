// ดึงข้อมูลผู้ใช้ปัจจุบันที่ล็อกอินอยู่
function getCurrentUser() {
  const user = localStorage.getItem(CONFIG.USER_KEY || 'warranty_user');
  return user ? JSON.parse(user) : null;
}

// ตรวจสอบว่าเข้าสู่ระบบหรือยัง ถ้ายังให้เด้งไปหน้า login.html
function checkAuth() {
  const token = localStorage.getItem(CONFIG.TOKEN_KEY || 'warranty_token');
  if (!token) {
    window.location.href = 'login.html';
  }
}

// ฟังก์ชันออกจากระบบ
function logout() {
  if (confirm('คุณต้องการออกจากระบบหรือไม่?')) {
    localStorage.removeItem(CONFIG.TOKEN_KEY || 'warranty_token');
    localStorage.removeItem(CONFIG.USER_KEY || 'warranty_user');
    window.location.href = 'login.html';
  }
}

// อัปเดตแสดงชื่อผู้ใช้และปุ่ม Logout บน Header อัตโนมัติ (หากมี element ในหน้านั้น)
document.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();
  const userNameEl = document.getElementById('user-display-name');
  if (user && userNameEl) {
    userNameEl.textContent = user.name || user.email;
  }
});