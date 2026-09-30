// ตรวจสอบว่ากำลังเปิดผ่าน GitHub Pages หรือเปิดเป็นไฟล์ตรงๆ หรือไม่
const isStaticHost = window.location.hostname.includes('github.io') || window.location.protocol === 'file:';

// ระบบสมัครสมาชิก (Register)
async function apiRegister(userData) {
    if (isStaticHost) {
        // ดึงข้อมูลผู้ใช้เดิมจาก localStorage
        const users = JSON.parse(localStorage.getItem('registered_users') || '[]');
        
        // เช็คว่ามีรหัสนิสิตหรืออีเมลนี้แล้วหรือไม่
        const exists = users.some(u => u.studentId === userData.studentId);
        if (exists) {
            return { success: false, message: 'รหัสนิสิตนี้เคยลงทะเบียนไว้แล้ว' };
        }

        users.push(userData);
        localStorage.setItem('registered_users', JSON.stringify(users));
        localStorage.setItem('current_user', JSON.stringify(userData)); // ล็อกอินให้อัตโนมัติ
        return { success: true, message: 'สมัครสมาชิกสำเร็จ' };
    }

    // กรณีรันบนเซิร์ฟเวอร์จริง
    try {
        const res = await fetch(`${CONFIG.API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        return await res.json();
    } catch (err) {
        console.error('Fetch error:', err);
        return { success: false, message: 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้ (Failed to fetch)' };
    }
}

// ระบบเข้าสู่ระบบ (Login)
async function apiLogin(studentId, password) {
    if (isStaticHost) {
        const users = JSON.parse(localStorage.getItem('registered_users') || '[]');
        const user = users.find(u => u.studentId === studentId && u.password === password);

        // บัญชีทดสอบเริ่มต้น (Mock Account)
        if (studentId === '68023469' || (user)) {
            const loggedInUser = user || { studentId: '68023469', name: 'วศิน ยาทิพย์' };
            localStorage.setItem('current_user', JSON.stringify(loggedInUser));
            return { success: true, message: 'เข้าสู่ระบบสำเร็จ' };
        }

        return { success: false, message: 'รหัสนิสิตหรือรหัสผ่านไม่ถูกต้อง' };
    }

    // กรณีรันบนเซิร์ฟเวอร์จริง
    try {
        const res = await fetch(`${CONFIG.API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, password })
        });
        return await res.json();
    } catch (err) {
        console.error('Fetch error:', err);
        return { success: false, message: 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้ (Failed to fetch)' };
    }
}