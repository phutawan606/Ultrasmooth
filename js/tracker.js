// คำนวณวันคงเหลือ เปอร์เซ็นต์ และสถานะ
function calculateStatus(purchaseStr, expiryStr) {
  const now = new Date();
  const p = new Date(purchaseStr);
  const exp = new Date(expiryStr);
  const total = exp - p;
  const left = exp - now;
  const days = Math.ceil(left / (1000 * 60 * 60 * 24));

  let percent = Math.round((left / total) * 100);
  percent = Math.max(0, Math.min(100, percent));

  let status = 'ACTIVE';
  if (days <= 0) {
    status = 'EXPIRED';
    percent = 0;
  } else if (days <= 15) {
    status = 'EXPIRING';
  }
  return { days, percent, status };
}

// ตรวจสอบสถานะและลงประวัติอัตโนมัติ (วันละ 1 ครั้ง)
function autoCheckAndLog(equipments) {
  const today = new Date().toDateString();
  const lastCheck = localStorage.getItem('last_auto_check_date');

  if (lastCheck !== today) {
    equipments.forEach(item => {
      const { days, status } = calculateStatus(item.purchase_date, item.expiry_date);
      if (status === 'EXPIRING') {
        const urgency = days <= 7 ? 'เตือนด่วน (≤ 7 วัน)' : 'ใกล้หมดสัญญา (≤ 15 วัน)';
        addNotificationLog(item.name, item.serial_number, 'EXPIRING', `[อัตโนมัติ] ${urgency} - เหลือ ${days} วันก่อนหมดประกัน`, 'LINE Notify / Web');
      } else if (status === 'EXPIRED') {
        addNotificationLog(item.name, item.serial_number, 'EXPIRED', `[อัตโนมัติ] หมดอายุการรับประกันแล้ว`, 'System Auto Tracker');
      }
    });
    localStorage.setItem('last_auto_check_date', today);
  }
}