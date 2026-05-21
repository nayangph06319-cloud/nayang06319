คู่มือใช้งาน Nayang Website V5 Admin CMS

สิ่งที่เพิ่มจาก V4
1. หน้า admin.html สำหรับเจ้าหน้าที่
2. เพิ่มข่าวแบบ Facebook พร้อม Editor
3. ลากวางรูปภาพได้
4. อัปโหลดรูปกิจกรรมหลายรูป
5. อัปโหลด PDF/Word/Excel ได้
6. เพิ่มบุคลากรพร้อมรูป
7. แก้ Setting หน่วยงานได้
8. ระบบ Login เจ้าหน้าที่แบบรหัสผ่าน

ไฟล์สำคัญ
- index.html = หน้าเว็บไซต์ประชาชน
- admin.html = หน้าแอดมินหลังบ้าน
- Code.gs = โค้ด Google Apps Script
- cms-config.js = ใส่ Web App URL
- Nayang_Website_CMS_Template.xlsx = แม่แบบข้อมูล
- assets/Logo.jpg และ assets/LINE_QR.jpg = รูปโลโก้/QR

ขั้นตอนติดตั้งแบบย่อ
1. สร้าง Google Sheet จากไฟล์ Nayang_Website_CMS_Template.xlsx
2. คัดลอก Spreadsheet ID จาก URL ของ Google Sheet
3. สร้างโฟลเดอร์ใน Google Drive สำหรับเก็บรูป/เอกสาร
4. คัดลอก Folder ID จาก URL โฟลเดอร์ Drive
5. เปิด Google Apps Script แล้ววาง Code.gs
6. แก้ค่าด้านบนของ Code.gs:
   - SPREADSHEET_ID
   - DRIVE_FOLDER_ID
   - ADMIN_PASSWORD
7. Deploy > New deployment > Web app
   - Execute as: Me
   - Who has access: Anyone
8. คัดลอก Web App URL ไปใส่ใน cms-config.js
9. อัปโหลดไฟล์เว็บทั้งหมดไป GitHub Pages หรือ Netlify
10. เปิด admin.html เพื่อเพิ่มข่าว/รูป/ไฟล์

ข้อควรระวัง
- ระบบนี้เหมาะกับข้อมูลประชาสัมพันธ์ ไม่ควรเก็บข้อมูลผู้ป่วย
- ตั้งรหัสผ่าน ADMIN_PASSWORD ให้เดายาก
- Google Drive Folder ที่ใช้อัปโหลดควรเป็นโฟลเดอร์ของหน่วยงาน
- หากแก้ Code.gs แล้ว ต้อง Deploy ใหม่ทุกครั้ง

การใช้งาน
- เพิ่มข่าว: admin.html > เพิ่มข่าวแบบ Facebook > ใส่หัวข้อ/รายละเอียด/รูป > บันทึก
- เพิ่มรูปกิจกรรม: admin.html > อัปโหลดรูปกิจกรรม > ลากรูปหลายรูป > บันทึก
- อัปโหลด PDF: admin.html > อัปโหลด PDF/เอกสาร > เลือกไฟล์ > บันทึก
- แก้เบอร์/อีเมล: admin.html > ตั้งค่าหน่วยงาน > key/value > บันทึก

ตัวอย่าง key สำหรับ Setting
phone, email, address, facebook_url, line_url, line_qr_url, logo_url, hospital_name
