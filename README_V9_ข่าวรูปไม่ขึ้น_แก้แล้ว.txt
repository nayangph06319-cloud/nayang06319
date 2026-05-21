คู่มือแก้ปัญหา V9: ข่าว/ประกาศ/รูปไม่ขึ้นหน้าเว็บ

สาเหตุที่แก้ใน V9:
1) หน้าเว็บบน GitHub Pages/Netlify ต้องดึงข้อมูลจาก Apps Script แบบ JSONP
2) Code.gs เดิมส่ง JSON ปกติ ทำให้ index.html ไม่สามารถนำข้อมูลมาแสดงได้
3) รูปจาก Google Drive เปลี่ยนเป็น URL แบบ thumbnail เพื่อให้แสดงบนหน้าเว็บง่ายขึ้น

วิธีใช้:
1. เปิด Google Apps Script
2. ลบ Code.gs เดิมทั้งหมด
3. คัดลอก Code.gs จากชุด V9 ไปวางแทน
4. แก้ 3 ค่า:
   SPREADSHEET_ID
   DRIVE_FOLDER_ID
   ADMIN_PASSWORD
5. กด Deploy > Manage deployments > Edit รูปดินสอ
6. เลือก Version: New version
7. กด Deploy
8. คัดลอก Web App URL เดิม/ใหม่ไปใส่ใน cms-config.js ถ้ายังไม่ตรง
9. อัปโหลดไฟล์ชุด V9 ขึ้น GitHub อีกครั้ง
10. เปิดเว็บแล้วกด Ctrl + F5

ทดสอบ:
เปิด Web App URL โดยเติม ?callback=test
ถ้าถูกต้องควรเห็นข้อความขึ้นต้นประมาณ:
test({"setting":...
