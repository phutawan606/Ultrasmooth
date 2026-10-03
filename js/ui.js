const STORAGE_KEY = 'warranty_equipments';
const LOG_STORAGE_KEY = 'warranty_notification_logs';

let equipments = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let notificationLogs = JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]');

// --- ระบบบันทึกประวัติการแจ้งเตือน (Logs) ---
function addNotificationLog(deviceName, serial, type, message, channel = 'LINE / System') {
  const newLog = {
    id: Date.now() + Math.random(),
    timestamp: new Date().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }),
    deviceName,
    serial,
    type,
    message,
    channel
  };
  notificationLogs.unshift(newLog);
  localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(notificationLogs));
  updateLogBadge();
}

function updateLogBadge() {
  const badge = document.getElementById('log-badge');
  if (!badge) return;
  if (notificationLogs.length > 0) {
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

  if (notificationLogs.length === 0) {
    container.innerHTML = `<div class="text-center py-10 text-slate-400 text-xs">ยังไม่มีประวัติการส่งแจ้งเตือนในระบบ</div>`;
    return;
  }

  container.innerHTML = notificationLogs.map(log => {
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
    notificationLogs = [];
    localStorage.removeItem(LOG_STORAGE_KEY);
    renderLogList();
    updateLogBadge();
  }
}

// --- ฟังก์ชันดักจับความถูกต้องของฟอร์ม (Validation) ---
function sanitizeSerialNumber(input) {
  input.value = input.value.replace(/[^a-zA-Z0-9\-_]/g, '').toUpperCase();
}

function showFormError(msg) {
  const errBox = document.getElementById('form-error-box');
  const errMsg = document.getElementById('form-error-msg');
  errMsg.textContent = msg;
  errBox.classList.remove('hidden');
}

function clearFormError() {
  const errBox = document.getElementById('form-error-box');
  if (errBox) errBox.classList.add('hidden');
}

// --- การแสดงผลตารางและการ์ดสรุป ---
function renderTable() {
  const tbody = document.getElementById('table-body');
  if (!tbody) return;

  const q = document.getElementById('search-box').value.toLowerCase().trim();
  const filter = document.getElementById('filter-dropdown').value;

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

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-active').textContent = active;
  document.getElementById('stat-expired').textContent = expired;
  document.getElementById('stat-expiring').textContent = `${expiring} รายการใกล้หมดอายุ`;

  const pct = total > 0 ? Math.round((active / total) * 100) : 0;
  document.getElementById('stat-percentage').textContent = `${pct}%`;
  document.getElementById('stat-progress-bar').style.width = `${pct}%`;
  document.getElementById('row-count').textContent = `แสดง ${filtered.length} รายการ`;

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
            <button onclick="triggerManualAlert(${item.id})" title="ส่งแจ้งเตือนทันที" class="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition">
              <i data-lucide="bell-ring" class="w-4 h-4"></i>
            </button>
            <button onclick="deleteEquipment(${item.id})" class="text-rose-500 hover:text-rose-700 font-medium">ลบ</button>
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
    equipments = equipments.filter(e => e.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(equipments));
    renderTable();
  }
}

function triggerManualAlert(id) {
  const item = equipments.find(e => String(e.id) === String(id));
  if (!item) return;

  const { days, status } = calculateStatus(item.purchase_date, item.expiry_date);
  let alertMsg = `แจ้งเตือนสถานะ: อุปกรณ์ ${item.name} (S/N: ${item.serial_number}) เหลือประกัน ${days} วัน`;
  if (status === 'EXPIRED') {
    alertMsg = `แจ้งเตือน: อุปกรณ์ ${item.name} หมดประกันแล้ว`;
  }

  addNotificationLog(item.name, item.serial_number, status, alertMsg, 'ส่งทันที (Manual/LINE)');
  alert(`[ส่งแจ้งเตือนสำเร็จ]\n${alertMsg}`);
  renderTable();
}

// --- ฟังก์ชัน Modal และ Form ---
function toggleModal(open) {
  clearFormError();
  document.getElementById('add-modal').classList.toggle('hidden', !open);
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

  if (equipments.some(item => item.serial_number === serial)) {
    return showFormError(`Serial Number "${serial}" นี้มีอยู่ในระบบแล้ว`);
  }

  if (new Date(expiryDate) <= new Date(purchaseDate)) {
    return showFormError('วันหมดอายุต้องอยู่หลังวันที่ซื้อ');
  }

  if (file && file.size > 5 * 1024 * 1024) {
    return showFormError('ไฟล์รูปภาพมีขนาดใหญ่เกิน 5MB');
  }

  const saveItem = (receiptBase64 = null) => {
    equipments.unshift({
      id: Date.now(),
      name,
      brand,
      serial_number: serial,
      purchase_date: purchaseDate,
      expiry_date: expiryDate,
      receipt_image: receiptBase64
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(equipments));
    addNotificationLog(name, serial, 'ACTIVE', `เพิ่มอุปกรณ์ใหม่ ติดตามประกันถึง ${expiryDate}`);
    document.getElementById('add-form').reset();
    toggleModal(false);
    renderTable();
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
  document.getElementById('preview-modal').classList.add('hidden');
}

// เริ่มต้นระบบเมื่อโหลดหน้าเว็บ
document.addEventListener('DOMContentLoaded', () => {
  autoCheckAndLog(equipments);
  renderTable();
  setInterval(() => {
    autoCheckAndLog(equipments);
    renderTable();
  }, 60000);
});