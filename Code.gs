/**
 * Nayang Website V10 Admin Full Control CMS API
 * รองรับ: เพิ่ม/แก้ไข/ลบ/ซ่อน/เผยแพร่ ข่าว ประกาศ กิจกรรม บุคลากร เอกสาร
 * รองรับ JSONP สำหรับ GitHub Pages/Netlify
 */
const SPREADSHEET_ID = 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE';
const DRIVE_FOLDER_ID = 'PASTE_YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE';
const ADMIN_PASSWORD = 'CHANGE_THIS_PASSWORD';
const TOKEN_TTL_SECONDS = 60 * 60 * 8;

const SHEETS = ['setting','news','notice','service_schedule','services','staff','download','gallery'];

function doGet(e) {
  try {
    const data = {};
    SHEETS.forEach(name => data[name] = readSheet_(name));

    const settingObj = {};
    (data.setting || []).forEach(row => {
      if (row.key) settingObj[row.key] = row.value || '';
    });
    data.setting = settingObj;

    // หน้าเว็บประชาชนให้เห็นเฉพาะรายการที่ไม่ถูกซ่อน
    ['news','notice','gallery','download','services','staff','service_schedule'].forEach(name => {
      data[name] = (data[name] || []).filter(r => String(r.status || '').toLowerCase() !== 'hidden');
    });

    return json_(data, e);
  } catch (err) {
    return json_({ok:false, message:String(err && err.message ? err.message : err)}, e);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const action = body.action;

    if (action === 'login') return login_(body.password);

    if (!isValidToken_(body.token)) return json_({ok:false, message:'กรุณาเข้าสู่ระบบใหม่'});

    if (action === 'getAdminData') return adminData_();
    if (action === 'upload') return upload_(body.file);
    if (action === 'append') return append_(body.sheet, body.row);
    if (action === 'update') return update_(body.sheet, body.id, body.row);
    if (action === 'delete') return delete_(body.sheet, body.id);
    if (action === 'setStatus') return setStatus_(body.sheet, body.id, body.status);
    if (action === 'upsertSetting') return upsertSetting_(body.key, body.value);

    return json_({ok:false, message:'ไม่พบคำสั่ง action'});
  } catch (err) {
    return json_({ok:false, message:String(err && err.message ? err.message : err)});
  }
}

function login_(password) {
  if (String(password) !== String(ADMIN_PASSWORD)) return json_({ok:false, message:'รหัสผ่านไม่ถูกต้อง'});
  const token = Utilities.getUuid();
  CacheService.getScriptCache().put('token_' + token, '1', TOKEN_TTL_SECONDS);
  return json_({ok:true, token:token});
}

function isValidToken_(token) {
  return token && CacheService.getScriptCache().get('token_' + token) === '1';
}

function adminData_() {
  const data = {};
  SHEETS.forEach(name => data[name] = readSheet_(name, true));
  return json_({ok:true, data:data});
}

function upload_(fileObj) {
  if (!fileObj || !fileObj.data || !fileObj.name) return json_({ok:false, message:'ไม่พบไฟล์อัปโหลด'});
  const bytes = Utilities.base64Decode(fileObj.data);
  const blob = Utilities.newBlob(bytes, fileObj.type || 'application/octet-stream', fileObj.name);
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const id = file.getId();
  const viewUrl = 'https://drive.google.com/file/d/' + id + '/view?usp=sharing';
  const imageUrl = 'https://drive.google.com/thumbnail?id=' + id + '&sz=w1200';
  const downloadUrl = 'https://drive.google.com/uc?export=download&id=' + id;
  const isImage = String(fileObj.type || '').indexOf('image/') === 0;

  return json_({
    ok:true,
    id:id,
    name:file.getName(),
    url:isImage ? imageUrl : viewUrl,
    image_url:imageUrl,
    view_url:viewUrl,
    download_url:downloadUrl
  });
}

function append_(sheetName, rowObj) {
  if (!allowedSheet_(sheetName)) return json_({ok:false, message:'ไม่อนุญาตให้เขียนชีตนี้'});
  rowObj = rowObj || {};
  if (!rowObj.id) rowObj.id = makeId_();
  if (!rowObj.status) rowObj.status = 'published';
  if (!rowObj.created_at) rowObj.created_at = new Date();
  rowObj.updated_at = new Date();

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreateSheet_(ss, sheetName);
  const headers = getHeaders_(sheet, rowObj);
  const row = headers.map(h => rowObj[h] !== undefined ? rowObj[h] : '');
  sheet.appendRow(row);
  return json_({ok:true, id:rowObj.id, sheet:sheetName});
}

function update_(sheetName, id, rowObj) {
  if (!allowedSheet_(sheetName)) return json_({ok:false, message:'ไม่อนุญาตให้แก้ชีตนี้'});
  if (!id) return json_({ok:false, message:'ไม่พบ ID รายการที่ต้องการแก้ไข'});
  rowObj = rowObj || {};
  rowObj.id = id;
  rowObj.updated_at = new Date();

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreateSheet_(ss, sheetName);
  let headers = getHeaders_(sheet, rowObj);
  const idCol = headers.indexOf('id') + 1;
  if (idCol <= 0) return json_({ok:false, message:'ชีตนี้ยังไม่มีคอลัมน์ id'});

  const values = sheet.getDataRange().getValues();
  for (let r = 2; r <= values.length; r++) {
    if (String(sheet.getRange(r, idCol).getDisplayValue()) === String(id)) {
      headers = getHeaders_(sheet, rowObj);
      headers.forEach((h, i) => {
        if (rowObj[h] !== undefined) sheet.getRange(r, i + 1).setValue(rowObj[h]);
      });
      return json_({ok:true, updated:true, id:id});
    }
  }
  return json_({ok:false, message:'ไม่พบรายการ ID: ' + id});
}

function delete_(sheetName, id) {
  if (!allowedSheet_(sheetName)) return json_({ok:false, message:'ไม่อนุญาตให้ลบชีตนี้'});
  if (!id) return json_({ok:false, message:'ไม่พบ ID รายการที่ต้องการลบ'});

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return json_({ok:false, message:'ไม่พบชีต'});
  const headers = getHeaders_(sheet, {});
  const idCol = headers.indexOf('id') + 1;
  if (idCol <= 0) return json_({ok:false, message:'ชีตนี้ยังไม่มีคอลัมน์ id'});

  const lastRow = sheet.getLastRow();
  for (let r = 2; r <= lastRow; r++) {
    if (String(sheet.getRange(r, idCol).getDisplayValue()) === String(id)) {
      sheet.deleteRow(r);
      return json_({ok:true, deleted:true, id:id});
    }
  }
  return json_({ok:false, message:'ไม่พบรายการ ID: ' + id});
}

function setStatus_(sheetName, id, status) {
  if (!allowedSheet_(sheetName)) return json_({ok:false, message:'ไม่อนุญาตให้แก้ชีตนี้'});
  status = status === 'hidden' ? 'hidden' : 'published';
  return update_(sheetName, id, {status:status});
}

function upsertSetting_(key, value) {
  if (!key) return json_({ok:false, message:'กรุณาระบุ key'});
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreateSheet_(ss, 'setting');
  const values = sheet.getDataRange().getValues();

  if (values.length === 0 || values[0].length === 0) {
    sheet.appendRow(['key','value']);
  }

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(key)) {
      sheet.getRange(i + 1, 2).setValue(value);
      return json_({ok:true, updated:true});
    }
  }
  sheet.appendRow([key, value]);
  return json_({ok:true, inserted:true});
}

function readSheet_(sheetName, includeHidden) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return [];

  const headers = values[0].map(h => String(h).trim());
  const rows = values.slice(1)
    .filter(r => r.some(c => String(c).trim() !== ''))
    .map(r => {
      const obj = {};
      headers.forEach((h,i) => obj[h] = r[i] || '');
      return obj;
    });

  return rows;
}

function allowedSheet_(name) {
  return SHEETS.indexOf(name) !== -1 && name !== 'setting';
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function getHeaders_(sheet, rowObj) {
  const required = ['id','status'];
  const lastCol = sheet.getLastColumn();
  let headers = lastCol ? sheet.getRange(1,1,1,lastCol).getValues()[0].map(h => String(h).trim()) : [];

  if (!headers.length || headers.every(h => !h)) {
    headers = required.concat(Object.keys(rowObj || {}).filter(k => required.indexOf(k) === -1));
    sheet.getRange(1,1,1,headers.length).setValues([headers]);
    formatHeader_(sheet, headers.length);
  }

  required.concat(Object.keys(rowObj || {})).forEach(k => {
    if (headers.indexOf(k) === -1) {
      headers.push(k);
      sheet.getRange(1, headers.length).setValue(k);
      formatHeader_(sheet, headers.length);
    }
  });

  return headers;
}

function formatHeader_(sheet, count) {
  sheet.getRange(1,1,1,count).setFontWeight('bold').setBackground('#0b74d1').setFontColor('#ffffff');
}

function makeId_() {
  return Utilities.getUuid().split('-')[0] + '-' + new Date().getTime();
}

function json_(obj, e) {
  const callback = e && e.parameter && e.parameter.callback;
  const text = JSON.stringify(obj);
  if (callback) {
    return ContentService
      .createTextOutput(String(callback) + '(' + text + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}
