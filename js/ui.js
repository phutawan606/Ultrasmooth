// --- URL สำหรับยิงไปยัง Backend บน Render.com ---
const API_BASE_URL = 'https://ultrasmooth.onrender.com';

// --- ฟังก์ชันดึงข้อมูลผู้ใช้ปัจจุบันและจัดการ Storage Key แยกตาม Email บัญชี ---
function getCurrentUser() {
  const user = JSON.parse(localStorage.getItem('warranty_user') || 'null');
  if (!user) return { email: 'guest@example.com', isVerified: false };
  return user;
}

// สร้าง Storage Key โดยใช้ Email ของผู้ใช้ (แปลงเป็นตัวพิมพ์เล็กเสมอ)
function getUserStorageKey() {
  const user = getCurrentUser();
  const email = (user.email || user.username || 'guest').toLowerCase().trim();
  return `warranty_equipments_${email}`;
}

function getUserLogStorageKey() {
  const user = getCurrentUser();
  const email = (user.email || user.username || 'guest').toLowerCase().trim();
  return `warranty_notification_logs_${email}`;
}

// ฟังก์ชันดึงและบันทึกข้อมูลเฉพาะบัญชีที่เข้าสู่ระบบ
function getEquipments() {
  const key = getUserStorageKey();
  return JSON.parse(localStorage.getItem(key) || '[]');
}

function saveEquipments(data) {
  const key = getUserStorageKey();
  localStorage.setItem(key, JSON.stringify(data));
}

function getNotificationLogs() {
  const key = getUserLogStorageKey();
  return JSON.parse(localStorage.getItem(key) || '[]');
}

function saveNotificationLogs(data) {
  const key = getUserLogStorageKey();
  localStorage.setItem(key, JSON.stringify(data));
}

// --- ฟังก์ชันคำนวณสถานะและวันคงเหลือ ---
function calculateStatus(purchaseDate, expiryDate) {
  if (!expiryDate) return { days: 0, percent: 0, status: 'EXPIRED' };

  const start = new Date(purchaseDate).getTime();
  const end = new Date(expiryDate).getTime();
  const today = new Date().getTime();

  const totalDuration = end - start;
  const remainingDuration = end - today;

  const days = Math.ceil(remainingDuration / (1000 * 60 * 60 * 24));
  let percent = totalDuration > 0 ? Math.max(0, Math.min(100, Math.round((remainingDuration / totalDuration) * 100))) : 0;

  let status = 'ACTIVE';
  if (days <= 0) {
    status = 'EXPIRED';
    percent = 0;
  } else if (days <= 7) {
    status = 'EXPIRING';
  }

  return { days: days > 0 ? days : 0, percent, status };
}

// --- ฟังก์ชันเปิด-ปิด Dropdown Admin ---
function toggleDropdown() {
  const menu = document.getElementById('logout-menu');
  if (menu) menu.classList.toggle('hidden');
}

// --- ระบบตั้งค่าบัญชีผู้ใช้ และ ขอ/ยืนยัน OTP ---
function openUserSettingsModal() {
  const user = getCurrentUser();
  const emailInput = document.getElementById('settings-user-email');
  const statusBadge = document.getElementById('email-verify-status');

  if (emailInput) emailInput.value = user.email || '';

  if (user.isVerified) {
    if (statusBadge) {
      statusBadge.textContent = '✅ ยืนยันแล้ว';
      statusBadge.className = 'text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full';
    }
    const btnOtp = document.getElementById('btn-send-otp');
    if (btnOtp) btnOtp.classList.add('hidden');
  } else {
    if (statusBadge) {
      statusBadge.textContent = '⚠️ ยังไม่ยืนยัน';
      statusBadge.className = 'text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200/60 px-2.5 py-0.5 rounded-full';
    }
    const btnOtp = document.getElementById('btn-send-otp');
    if (btnOtp) btnOtp.classList.remove('hidden');
  }

  const modal = document.getElementById('user-settings-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
  const logoutMenu = document.getElementById('logout-menu');
  if (logoutMenu) logoutMenu.classList.add('hidden');

  if (window.lucide) lucide.createIcons();
}

function closeUserSettingsModal() {
  const modal = document.getElementById('user-settings-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  const otpGroup = document.getElementById('otp-input-group');
  if (otpGroup) otpGroup.classList.add('hidden');
}

// 1. กดขอ OTP
async function requestOTP() {
  const user = getCurrentUser();
  const btn = document.getElementById('btn-send-otp');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span>⏳ กำลังส่ง OTP...</span>`;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email })
    });
    const data = await res.json();

    if (data.success) {
      alert('ส่งรหัส OTP ไปยังอีเมล ' + user.email + ' เรียบร้อยแล้ว!');
      const otpGroup = document.getElementById('otp-input-group');
      if (otpGroup) otpGroup.classList.remove('hidden');
    } else {
      alert('เกิดข้อผิดพลาด: ' + data.message);
    }
  } catch (err) {
    alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="mail-check" class="w-4 h-4"></i><span>ส่งรหัส OTP ยืนยันอีเมล</span>`;
      if (window.lucide) lucide.createIcons();
    }
  }
}

// 2. กดยืนยัน OTP
async function submitVerifyOTP() {
  const user = getCurrentUser();
  const otpInput = document.getElementById('otp-code-input');
  const otp = otpInput ? otpInput.value.trim() : '';

  if (!otp || otp.length !== 6) {
    alert('กรุณากรอกรหัส OTP ให้ครบ 6 หลัก');
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, otp })
    });
    const data = await res.json();

    if (data.success) {
      alert('🎉 ยืนยันอีเมลสำเร็จ! บัญชีของคุณพร้อมรับการแจ้งเตือนแล้ว');
      user.isVerified = true;
      localStorage.setItem('warranty_user', JSON.stringify(user));
      openUserSettingsModal();
      autoCheckAndNotify();
    } else {
      alert('❌ ' + data.message);
    }
  } catch (err) {
    alert('เกิดข้อผิดพลาดในการตรวจสอบรหัส OTP');
  }
}

// --- ระบบบันทึกประวัติการแจ้งเตือน (Logs) ---
function addNotificationLog(deviceName, serial, type, message, channel = 'Gmail SMTP') {
  const logs = getNotificationLogs();
  const newLog = {
    id: Date.now() + Math.random(),
    timestamp: new Date().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }),
    deviceName,
    serial: serial || '-',
    type,
    message,
    channel
  };
  logs.unshift(newLog);
  saveNotificationLogs(logs);
  updateLogBadge();
}

function updateLogBadge() {
  const badge = document.getElementById('log-badge');
  if (!badge) return;
  const logs = getNotificationLogs();
  if (logs.length > 0) {
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function toggleLogModal(open) {
  const modal = document.getElementById('log-modal');
  if (!modal) return;
  modal.classList.toggle('hidden', !open);
  if (open) renderLogList();
}

function renderLogList() {
  const container = document.getElementById('log-list-container');
  if (!container) return;

  const logs = getNotificationLogs();
  if (logs.length === 0) {
    container.innerHTML = `<div class="text-center py-10 text-slate-400 text-xs">ยังไม่มีประวัติการส่งแจ้งเตือนในระบบ</div>`;
    return;
  }

  container.innerHTML = logs.map(log => {
    let tagColor = 'bg-slate-100 text-slate-600';
    let iconName = 'info';

    if (log.type === 'EXPIRING') {
      tagColor = 'bg-amber-50 text-amber-600 border border-amber-200/60';
      iconName = 'alert-triangle';
    } else if (log.type === 'EXPIRED') {
      tagColor = 'bg-rose-50 text-rose-600 border border-rose-200/60';
      iconName = 'alert-octagon';
    } else if (log.type === 'ACTIVE') {
      tagColor = 'bg-emerald-50 text-emerald-600 border border-emerald-200/60';
      iconName = 'check-circle';
    }

    return `
      <div class="p-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition flex items-start gap-3">
        <div class="p-2 rounded-xl ${tagColor} flex-shrink-0 mt-0.5">
          <i data-lucide="${iconName}" class="w-4 h-4"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <h4 class="font-semibold text-slate-800 text-xs truncate">${log.deviceName}</h4>
            <span class="text-[10px] text-slate-400 flex-shrink-0">${log.timestamp}</span>
          </div>
          <p class="text-[11px] text-slate-600 mt-0.5">${log.message}</p>
          <div class="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
            <span class="font-mono">S/N: ${log.serial}</span>
            <span>•</span>
            <span class="text-[#0088cc]">ช่องทาง: ${log.channel}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function clearNotificationLogs() {
  if (confirm('คุณต้องการลบประวัติการแจ้งเตือนทั้งหมดหรือไม่?')) {
    saveNotificationLogs([]);
    renderLogList();
    updateLogBadge();
  }
}

function sanitizeSerialNumber(input) {
  input.value = input.value.replace(/[^a-zA-Z0-9\-_]/g, '').toUpperCase();
}

function showFormError(msg) {
  const errBox = document.getElementById('form-error-box');
  const errMsg = document.getElementById('form-error-msg');
  if (errBox && errMsg) {
    errMsg.textContent = msg;
    errBox.classList.remove('hidden');
  }
}

function clearFormError() {
  const errBox = document.getElementById('form-error-box');
  if (errBox) errBox.classList.add('hidden');
}

// --- ฟังก์ชันแสดงผลตารางอุปกรณ์ ---
function renderTable() {
  const tbody = document.getElementById('table-body');
  if (!tbody) return;

  const equipments = getEquipments();
  const searchBox = document.getElementById('search-box');
  const filterDropdown = document.getElementById('filter-dropdown');
  const q = searchBox ? searchBox.value.toLowerCase().trim() : '';
  const filter = filterDropdown ? filterDropdown.value : 'ALL';

  let total = equipments.length;
  let active = 0;
  let expiring = 0;
  let expired = 0;

  const filtered = equipments.filter(item => {
    const { status } = calculateStatus(item.purchase_date, item.expiry_date);
    if (status === 'ACTIVE') active++;
    else if (status === 'EXPIRING') { active++; expiring++; }
    else expired++;

    const matchText = (item.name || '').toLowerCase().includes(q) ||
                      (item.brand || '').toLowerCase().includes(q) ||
                      (item.serial_number || '').toLowerCase().includes(q);

    let matchStatus = true;
    if (filter === 'ACTIVE') matchStatus = (status === 'ACTIVE');
    else if (filter === 'EXPIRING') matchStatus = (status === 'EXPIRING');
    else if (filter === 'EXPIRED') matchStatus = (status === 'EXPIRED');

    return matchText && matchStatus;
  });

  const elTotal = document.getElementById('stat-total');
  const elActive = document.getElementById('stat-active');
  const elExpired = document.getElementById('stat-expired');
  const elExpiring = document.getElementById('stat-expiring');
  const elPct = document.getElementById('stat-percentage');
  const elProgress = document.getElementById('stat-progress-bar');
  const elRowCount = document.getElementById('row-count');

  if (elTotal) elTotal.textContent = total;
  if (elActive) elActive.textContent = active;
  if (elExpired) elExpired.textContent = expired;
  if (elExpiring) elExpiring.textContent = `${expiring} รายการใกล้หมดอายุ`;

  const pct = total > 0 ? Math.round((active / total) * 100) : 0;
  if (elPct) elPct.textContent = `${pct}%`;
  if (elProgress) elProgress.style.width = `${pct}%`;
  if (elRowCount) elRowCount.textContent = `แสดง ${filtered.length} รายการ`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-slate-400">ไม่พบรายการอุปกรณ์</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    const { days, percent, status } = calculateStatus(item.purchase_date, item.expiry_date);
    let badge = `<span class="px-2 py-0.5 rounded-full text-[11px] bg-emerald-50 text-emerald-600 font-medium">เหลือ ${days} วัน</span>`;
    if (status === 'EXPIRING') {
      badge = `<span class="px-2 py-0.5 rounded-full text-[11px] bg-amber-50 text-amber-600 font-medium">ใกล้หมด (${days} วัน)</span>`;
    } else if (status === 'EXPIRED') {
      badge = `<span class="px-2 py-0.5 rounded-full text-[11px] bg-rose-50 text-rose-500 font-medium">หมดสัญญาแล้ว</span>`;
    }

    const receiptBtn = item.receipt_image ? `
      <button onclick="openPreviewModal('${item.id}')" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#0088cc] font-medium transition text-[11px]">
        <i data-lucide="image" class="w-3.5 h-3.5"></i>
        <span>ดูใบเสร็จ</span>
      </button>
    ` : `<span class="text-slate-300">-</span>`;

    return `
      <tr class="hover:bg-slate-50/60 transition">
        <td class="py-3 px-3">
          <div class="font-semibold text-slate-800">${item.name}</div>
          <div class="text-[11px] text-slate-400">${item.brand || '-'}</div>
        </td>
        <td class="py-3 px-3 text-slate-600">
          <span class="font-mono font-medium">${item.serial_number || '-'}</span>
          <button onclick="navigator.clipboard.writeText('${item.serial_number}'); alert('คัดลอก S/N เรียบร้อย')" class="text-[#0088cc] hover:underline ml-1">คัดลอก</button>
        </td>
        <td class="py-3 px-3 text-slate-500 text-[11px]">
          ${item.purchase_date || '-'} ถึง ${item.expiry_date || '-'}
        </td>
        <td class="py-3 px-3">
          <div class="flex items-center gap-2">
            ${badge}
            <div class="w-14 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
              <div class="h-full ${status === 'EXPIRED' ? 'bg-rose-500' : status === 'EXPIRING' ? 'bg-amber-400' : 'bg-emerald-500'}" style="width: ${percent}%"></div>
            </div>
          </div>
        </td>
        <td class="py-3 px-3 text-center">${receiptBtn}</td>
        <td class="py-3 px-3 text-right">
          <div class="flex items-center justify-end gap-2">
            <button onclick="triggerManualAlert('${item.id}')" title="ส่งแจ้งเตือนเข้า Email ทันที" class="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition">
              <i data-lucide="bell-ring" class="w-4 h-4"></i>
            </button>
            <button onclick="deleteEquipment('${item.id}')" class="text-rose-500 hover:text-rose-700 font-medium text-xs">ลบ</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
  updateLogBadge();
}

function applyFilters() {
  renderTable();
}

function deleteEquipment(id) {
  if (confirm('ยืนยันที่จะลบอุปกรณ์นี้หรือไม่?')) {
    let equipments = getEquipments();
    equipments = equipments.filter(e => String(e.id) !== String(id));
    saveEquipments(equipments);
    renderTable();
  }
}

// --- ปุ่มส่งอีเมลแจ้งเตือนแบบกดมือ (Manual Alert) ---
async function triggerManualAlert(id) {
  const equipments = getEquipments();
  const item = equipments.find(e => String(e.id) === String(id));
  if (!item) return;

  const user = getCurrentUser();
  const { days, status } = calculateStatus(item.purchase_date, item.expiry_date);

  try {
    const res = await fetch(`${API_BASE_URL}/api/notify/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        deviceName: item.name,
        serial: item.serial_number,
        expiryDate: item.expiry_date,
        daysLeft: days,
        status: status
      })
    });
    const data = await res.json();

    if (data.success) {
      const alertMsg = `แจ้งเตือนสถานะประกันอุปกรณ์ ${item.name} ส่งเข้าอีเมล ${user.email} เรียบร้อยแล้ว`;
      addNotificationLog(item.name, item.serial_number, status, alertMsg, 'Gmail (Manual)');
      alert(`[ส่งแจ้งเตือนสำเร็จ]\n${alertMsg}`);
      renderTable();
    } else {
      alert('เกิดข้อผิดพลาดในการส่งอีเมล: ' + data.message);
    }
  } catch (err) {
    alert('ไม่สามารถส่งคำขอแจ้งเตือนไปยังเซิร์ฟเวอร์ได้');
  }
}

// --- ระบบตรวจเช็กวันหมดประกันและยิงแจ้งเตือนเข้าอีเมลอัตโนมัติ ---
async function autoCheckAndNotify() {
  const user = getCurrentUser();
  if (!user || !user.isVerified || !user.email) return;

  const equipments = getEquipments();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  for (const item of equipments) {
    if (!item.expiry_date) continue;

    const { days, status } = calculateStatus(item.purchase_date, item.expiry_date);
    const userKey = (user.email || 'user').toLowerCase().trim();
    const notifyKey = `notified_${userKey}_${item.serial_number}_${status}_${todayStr}`;

    if ((status === 'EXPIRING' || status === 'EXPIRED') && !localStorage.getItem(notifyKey)) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/notify/email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            deviceName: item.name,
            serial: item.serial_number,
            expiryDate: item.expiry_date,
            daysLeft: days,
            status: status
          })
        });

        const data = await res.json();
        if (data.success) {
          const logMsg = status === 'EXPIRED'
            ? `[ระบบอัตโนมัติ] แจ้งเตือน: อุปกรณ์ ${item.name} หมดอายุการรับประกันแล้ว`
            : `[ระบบอัตโนมัติ] แจ้งเตือน: อุปกรณ์ ${item.name} เหลือประกันอีก ${days} วัน`;

          addNotificationLog(item.name, item.serial_number, status, logMsg, 'Gmail (Auto)');
          localStorage.setItem(notifyKey, 'true');
        }
      } catch (err) {
        console.error('Auto notification failed for:', item.name, err);
      }
    }
  }
}

// --- ฟังก์ชัน Modal และ บันทึกอุปกรณ์ใหม่ ---
function toggleModal(open) {
  clearFormError();
  const modal = document.getElementById('add-modal');
  if (modal) modal.classList.toggle('hidden', !open);
}

function saveNewEquipment(e) {
  e.preventDefault();
  clearFormError();

  const name = document.getElementById('inp-name').value.trim();
  const brand = document.getElementById('inp-brand').value.trim();
  const serial = document.getElementById('inp-serial').value.trim().toUpperCase();
  const purchaseDate = document.getElementById('inp-purchase').value;
  const expiryDate = document.getElementById('inp-expiry').value;
  const file = document.getElementById('inp-receipt').files[0];

  if (name.length < 2) return showFormError('กรุณากรอกชื่ออุปกรณ์ให้ถูกต้อง');
  if (brand.length < 2) return showFormError('กรุณากรอกยี่ห้อให้ถูกต้อง');

  const serialRegex = /^[A-Z0-9\-_]{4,40}$/;
  if (!serialRegex.test(serial)) {
    return showFormError('Serial Number ไม่ถูกต้อง! (ใช้ A-Z, 0-9 และขีด - 4-40 ตัว)');
  }

  const equipments = getEquipments();
  if (equipments.some(item => item.serial_number === serial)) {
    return showFormError(`Serial Number "${serial}" นี้มีอยู่ในระบบของคุณแล้ว`);
  }

  if (new Date(expiryDate) <= new Date(purchaseDate)) {
    return showFormError('วันหมดอายุต้องอยู่หลังวันที่ซื้อ');
  }

  if (file && file.size > 5 * 1024 * 1024) {
    return showFormError('ไฟล์รูปภาพมีขนาดใหญ่เกิน 5MB');
  }

  const saveItem = (receiptBase64 = null) => {
    const list = getEquipments();
    list.unshift({
      id: Date.now(),
      name,
      brand,
      serial_number: serial,
      purchase_date: purchaseDate,
      expiry_date: expiryDate,
      receipt_image: receiptBase64
    });
    saveEquipments(list);
    addNotificationLog(name, serial, 'ACTIVE', `เพิ่มอุปกรณ์ใหม่ ติดตามประกันถึง ${expiryDate}`);
    
    const form = document.getElementById('add-form');
    if (form) form.reset();
    toggleModal(false);
    renderTable();
    autoCheckAndNotify();
  };

  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => saveItem(event.target.result);
    reader.readAsDataURL(file);
  } else {
    saveItem(null);
  }
}

function openPreviewModal(id) {
  const equipments = getEquipments();
  const item = equipments.find(e => String(e.id) === String(id));
  if (!item || !item.receipt_image) return;

  document.getElementById('preview-title').textContent = `หลักฐานใบเสร็จ: ${item.name}`;
  document.getElementById('preview-subtitle').textContent = `S/N: ${item.serial_number} | วันที่ซื้อ: ${item.purchase_date}`;
  
  const img = document.getElementById('preview-image');
  img.src = item.receipt_image;
  
  const dl = document.getElementById('preview-download');
  dl.href = item.receipt_image;
  dl.download = `receipt_${item.serial_number}.png`;

  document.getElementById('preview-modal').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closePreviewModal() {
  const modal = document.getElementById('preview-modal');
  if (modal) modal.classList.add('hidden');
}

// เริ่มต้นระบบเมื่อโหลดหน้าเว็บ
document.addEventListener('DOMContentLoaded', () => {
  renderTable();
  autoCheckAndNotify();

  setInterval(() => {
    renderTable();
  }, 60000);
});
