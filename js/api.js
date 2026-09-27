// ตรวจสอบว่าถ้าอยู่บน GitHub Pages ให้สลับมาใช้ LocalStorage จำลอง
const isGitHubPages = window.location.hostname.includes('github.io');

async function apiAddEquipment(formData) {
    if (isGitHubPages) {
        // จำลองการบันทึกผ่าน LocalStorage แทนการยิงหาเซิร์ฟเวอร์
        const items = JSON.parse(localStorage.getItem('equipments') || '[]');
        
        if (items.length >= 50) {
            return { error: 'โควตาเต็ม: สมาชิก 1 คนมีอุปกรณ์ได้สูงสุด 50 รายการ' };
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
        localStorage.setItem('equipments', JSON.stringify(items));
        return { message: 'บันทึกข้อมูลเรียบร้อย (จำลอง)' };
    }

    // กรณีรันบน Localhost หรือมี Server จริง
    const res = await fetch(`${CONFIG.API_URL}/equipments`, {
        method: 'POST',
        body: formData
    });
    
    // ดักจับกรณี Server ไม่ได้ส่ง JSON กลับมา
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        throw new Error("เซิร์ฟเวอร์ไม่ได้เปิดใช้งาน หรือ URL ไม่ถูกต้อง");
    }
    return await res.json();
}