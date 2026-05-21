ชุด V7: หน้าเว็บเหมือน V3 + หลังบ้านเหมือน V5

ไฟล์สำคัญ
1) index.html = หน้าเว็บหลักแบบ V3 เดิม
2) admin.html = ระบบหลังบ้านแบบ V5
3) Code.gs = โค้ด Google Apps Script
4) cms-config.js = ใส่ Web App URL ของ Apps Script
5) Nayang_Website_CMS_Template.xlsx = แม่แบบ Google Sheet

วิธีอัปโหลดขึ้น Netlify
- ให้แตก ZIP ก่อน
- ลากไฟล์ทั้งหมดด้านในโฟลเดอร์นี้ขึ้น Netlify
- หรือเลือกโฟลเดอร์นี้ทั้งโฟลเดอร์ ไม่ใช่ลาก ZIP ที่มีโฟลเดอร์ซ้อนหลายชั้น

วิธีเปิดหลังบ้าน
- หน้าเว็บหลัก: เปิด URL ปกติ
- หลังบ้าน: เติม /admin.html ต่อท้าย URL
  ตัวอย่าง: https://your-site.netlify.app/admin.html

หมายเหตุ
- หน้าเว็บหลักในชุดนี้ยังคงหน้าตา V3 เดิม
- หลังบ้านใช้ admin.html แยก ไม่ทำให้หน้าแรกเปลี่ยน
- ถ้าหน้าเว็บยังไม่ดึงข้อมูลจริง ให้ใส่ Web App URL ใน cms-config.js ก่อน
