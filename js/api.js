const isStaticHost = window.location.hostname.includes('github.io') || window.location.protocol === 'file:';

// ดึงรายการอุปกรณ์
async function apiGetEquipments() {
  if (isStaticHost) {
    const raw = localStorage.getItem(CONFIG.EQUIPMENT_KEY || 'warranty_equipments');
    if (!raw) {
      const initialItems = [
        {
          id: 1,
          name: "MacBook Pro M3 Pro",
          brand: "Apple",
          serial_number: "C02G80XZMD6R",
          purchase_date: "2024-01-15",
          expiry_date: "2027-01-15",
          receipt_image: null
        },
        {
          id: 2,
          name: "iPad Air 5",
          brand: "Apple",
          serial_number: "DMPX809YQ16R",
          purchase_date: "2023-10-01",
          expiry_date: "2026-10-15",
          receipt_image: null
        }
      ];
      localStorage.setItem(CONFIG.EQUIPMENT_KEY || 'warranty_equipments', JSON.stringify(initialItems));
      return initialItems;
    }
    return JSON.parse(raw);
  }

  try {
    const res = await fetch(`${CONFIG.API_URL}/equipments`);
    if (!res.ok) throw new Error('เกิดข้อผิดพลาดในการดึงข้อมูล');
    return await res.json();
  } catch (err) {
    console.warn('API error, falling back to local storage:', err);
    return JSON.parse(localStorage.getItem(CONFIG.EQUIPMENT_KEY || 'warranty_equipments') || '[]');
  }
}

// เพิ่มอุปกรณ์ใหม่
async function apiAddEquipment(formData) {
  if (isStaticHost) {
    const items = await apiGetEquipments();
    if (items.length >= CONFIG.MAX_QUOTA) {
      return { error: `โควตาเต็ม: สมาชิก 1 คนมีอุปกรณ์ได้สูงสุด ${CONFIG.MAX_QUOTA} รายการ` };
    }

    const newItem = {
      id: Date.now(),
      name: formData.get('name'),
      brand: formData.get('brand'),
      serial_number: formData.get('serialNumber'),
      purchase_date: formData.get('purchaseDate'),
      expiry_date: formData.get('expiryDate'),
      receipt_image: null
    };

    items.unshift(newItem);
    localStorage.setItem(CONFIG.EQUIPMENT_KEY || 'warranty_equipments', JSON.stringify(items));
    return { success: true, message: 'บันทึกอุปกรณ์สำเร็จ' };
  }

  try {
    const res = await fetch(`${CONFIG.API_URL}/equipments`, {
      method: 'POST',
      body: formData
    });
    return await res.json();
  } catch (err) {
    return { error: 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้' };
  }
}

// ลบอุปกรณ์
async function apiDeleteEquipment(id) {
  if (isStaticHost) {
    let items = await apiGetEquipments();
    items = items.filter(item => item.id !== id);
    localStorage.setItem(CONFIG.EQUIPMENT_KEY || 'warranty_equipments', JSON.stringify(items));
    return { success: true, message: 'ลบข้อมูลสำเร็จ' };
  }

  try {
    const res = await fetch(`${CONFIG.API_URL}/equipments/${id}`, { method: 'DELETE' });
    return await res.json();
  } catch (err) {
    return { error: 'ไม่สามารถลบข้อมูลได้' };
  }
}

// ส่งข้อความแจ้งเตือนจำลอง LINE Notify
async function apiSendLineAlert(message) {
  if (isStaticHost) {
    return { success: true, message: `[จำลอง] ส่งข้อความแจ้งเตือน: ${message}` };
  }

  try {
    const res = await fetch(`${CONFIG.API_URL}/notify/line`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    return await res.json();
  } catch (err) {
    return { success: true, message: `[จำลอง] ส่งข้อความแจ้งเตือน: ${message}` };
  }
}