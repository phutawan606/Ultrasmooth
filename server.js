const express = require('express');
const cors = require('cors');
const path = require('path');
<<<<<<< HEAD
=======
const nodemailer = require('nodemailer');
>>>>>>> 26f71f5 (Update automatic email notifications and Nodemailer setup)
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const equipmentRoutes = require('./routes/equipments.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
<<<<<<< HEAD
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes API
=======

// อ่านไฟล์ static (HTML, JS, CSS) จาก Root Directory
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// หน้าแรกเปิด login.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// ตั้งค่า Nodemailer Transporter ด้วย Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// พื้นที่เก็บ OTP ชั่วคราว
const otpStore = new Map();

// --- 1. Endpoint ขอรหัส OTP ---
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุอีเมล' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 นาที

    otpStore.set(email.toLowerCase(), { otp, expiresAt });

    const mailOptions = {
      from: `"Warranty Guard" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'รหัส OTP ยืนยันอีเมลสำหรับระบบ Warranty Guard',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
          <h2 style="color: #0088cc; margin-top: 0;">Warranty Guard</h2>
          <p style="color: #334155; font-size: 14px;">รหัสยืนยันการเปิดรับการแจ้งเตือนสำหรับ <b>${email}</b> คือ:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0f172a; background: #f8fafc; padding: 16px; text-align: center; border-radius: 12px; border: 1px dashed #cbd5e1;">
            ${otp}
          </div>
          <p style="color: #64748b; font-size: 12px; margin-top: 16px;">รหัสนี้มีอายุการใช้งาน 5 นาที</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'ส่งรหัส OTP เรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Nodemailer Error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการส่งอีเมล' });
  }
});

// --- 2. Endpoint ยืนยันรหัส OTP ---
app.post('/api/auth/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
  }

  const record = otpStore.get(email.toLowerCase());
  if (!record) {
    return res.status(400).json({ success: false, message: 'ไม่พบคำขอ OTP หรือรหัสหมดอายุแล้ว' });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return res.status(400).json({ success: false, message: 'รหัส OTP หมดอายุแล้ว' });
  }

  if (record.otp !== otp.trim()) {
    return res.status(400).json({ success: false, message: 'รหัส OTP ไม่ถูกต้อง' });
  }

  otpStore.delete(email.toLowerCase());
  res.json({ success: true, message: 'ยืนยันอีเมลสำเร็จ' });
});

// --- 3. Endpoint ส่งอีเมลแจ้งเตือนประกันหมดอายุ ---
app.post('/api/notify/email', async (req, res) => {
  try {
    const { email, deviceName, serial, expiryDate, daysLeft, status } = req.body;

    let statusText = `เหลือระยะเวลาประกันอีก ${daysLeft} วัน`;
    if (status === 'EXPIRED') {
      statusText = 'หมดอายุการรับประกันแล้ว';
    } else if (daysLeft <= 7) {
      statusText = `[ด่วนมาก] เหลือเวลาเคลมประกันเพียง ${daysLeft} วันเท่านั้น!`;
    }

    const mailOptions = {
      from: `"Warranty Guard" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `[Warranty Guard] แจ้งเตือนสถานะประกัน: ${deviceName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
          <h3 style="color: #0088cc; margin-top: 0;">แจ้งเตือนสถานะการรับประกันอุปกรณ์</h3>
          <p style="color: #334155; font-size: 14px;">รายการอุปกรณ์สำหรับบัญชี <b>${email}</b> ใกล้ครบกำหนดระยะเวลาคุ้มครอง</p>
          <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin: 16px 0; font-size: 13px; line-height: 1.8;">
            <div><b>🏷️ อุปกรณ์:</b> ${deviceName}</div>
            <div><b>🔢 S/N:</b> <code>${serial}</code></div>
            <div><b>📅 วันหมดอายุ:</b> ${expiryDate}</div>
            <div><b>⚠️ สถานะ:</b> <span style="color: #e11d48; font-weight: bold;">${statusText}</span></div>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'ส่งอีเมลแจ้งเตือนสำเร็จ' });
  } catch (error) {
    console.error('Nodemailer Error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการส่งอีเมล' });
  }
});

// Routes API หลัก
>>>>>>> 26f71f5 (Update automatic email notifications and Nodemailer setup)
app.use('/api/auth', authRoutes);
app.use('/api/equipments', equipmentRoutes);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
