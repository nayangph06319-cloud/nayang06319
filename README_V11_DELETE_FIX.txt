V11 Delete Fix

ปัญหาที่แก้:
- ข้อมูลเก่าที่เพิ่มก่อน V10 ไม่มี id ทำให้ปุ่ม ลบ/แก้ไข/ซ่อน ไม่ทำงาน
- V11 เพิ่ม _rowNumber สำรองและปุ่ม "ซ่อม ID แถวเก่า"

วิธีอัปเดต:
1. เปิด Google Apps Script
2. วาง Code.gs จาก V11 แทนของเดิม
3. แก้ค่า SPREADSHEET_ID, DRIVE_FOLDER_ID, ADMIN_PASSWORD ให้เหมือนเดิม
4. Deploy > Manage deployments > Edit > Version: New version > Deploy
5. อัปโหลดไฟล์ V11 ทั้งหมดขึ้น GitHub Pages แทนของเดิม
6. เปิด /admin.html แล้วกด Ctrl + F5
7. ในหลังบ้าน กดปุ่ม "ซ่อม ID แถวเก่า" หนึ่งครั้งในแต่ละแท็บที่มีข้อมูลเก่า
8. ลองกด ลบ/แก้ไข/ซ่อน อีกครั้ง

หมายเหตุ:
ถ้าปุ่มลบยังไม่ทำงาน ให้เปิด DevTools หรือส่งภาพ error มา แต่โดยปกติ V11 จะแก้ได้จาก rowNumber สำรอง
