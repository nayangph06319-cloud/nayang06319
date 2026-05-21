วิธีใช้ V8 Dynamic CMS

ชุดนี้แก้ปัญหา “เพิ่มข่าวในหลังบ้านแล้วไม่ขึ้นหน้าเว็บ” แล้ว
โดย index.html จะดึงข้อมูลจาก Google Sheet ผ่าน Apps Script จริง

ต้องทำ 3 อย่าง:
1) เปิด Apps Script แล้วแทน Code.gs ด้วยไฟล์ Code.gs ในชุดนี้
2) Deploy > Manage deployments > Edit > New version > Deploy
3) อัปโหลดไฟล์เว็บทั้งชุดนี้ขึ้น Netlify ใหม่ แล้วกด Ctrl+F5

ไฟล์ cms-config.js ใส่ Web App URL ของท่านไว้แล้ว
ถ้าเปลี่ยน Deployment ใหม่ ให้คัดลอก URL ใหม่มาใส่ที่ WEB_APP_URL

ชีตข่าวต้องชื่อ news และหัวตารางต้องมี:
date | title | description | image_url

หลังเพิ่มข่าวใน admin.html ให้รอ 5-20 วินาที แล้ว Refresh หน้าเว็บ
