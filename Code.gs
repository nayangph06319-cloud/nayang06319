
const DEFAULT_SPREADSHEET_ID = '';
const DEFAULT_DRIVE_FOLDER_ID = '';
const DEFAULT_ADMIN_PASSWORD = '1234';
const SHEETS = ['setting','users','audit_log','backup_log','menus','hero_buttons','quick_links','banners','popups','news','notice','service_schedule','services','staff','vhv_directory','appscript_apps','videos','download','gallery','appointments','complaints','eservices','kpi_dashboard','organization_profile','org_general','org_health_history','org_subdistrict_history','org_vision','org_mission','org_values','org_structure','org_map','org_contact','menu_groups','file_manager','site_footer','visitor_stats'];
const TOKEN_TTL_SECONDS = 28800;

function cfg_(k){
  const p=PropertiesService.getScriptProperties();
  return p.getProperty(k) || (k==='SPREADSHEET_ID'?DEFAULT_SPREADSHEET_ID:k==='DRIVE_FOLDER_ID'?DEFAULT_DRIVE_FOLDER_ID:k==='ADMIN_PASSWORD'?DEFAULT_ADMIN_PASSWORD:'');
}
function doGet(e){
  try{
    if(!cfg_('SPREADSHEET_ID')) return json_({ok:false,needSetup:true,message:'ยังไม่ได้ตั้งค่า Google Sheet'},e);
    const data={}; SHEETS.forEach(s=>data[s]=readSheet_(s));
    const setting={}; (data.setting||[]).forEach(r=>{if(r.key)setting[r.key]=r.value||''}); data.setting=setting;
    ['menus','hero_buttons','quick_links','banners','popups','news','notice','gallery','download','services','staff','vhv_directory','appscript_apps','videos','service_schedule','appointments','complaints','eservices','kpi_dashboard','organization_profile'].forEach(s=>data[s]=(data[s]||[]).filter(r=>String(r.status||'').toLowerCase()!=='hidden'));
    return json_(data,e);
  }catch(err){return json_({ok:false,message:String(err.message||err)},e)}
}
function doPost(e){
  try{
    const b=JSON.parse((e.postData&&e.postData.contents)||'{}'), a=b.action;
    if(a==='setup') return setup_(b);
    if(a==='login') return login_(b.password);
    if(!valid_(b.token)) return json_({ok:false,message:'กรุณาเข้าสู่ระบบใหม่'});
    if(a==='getAdminData') return adminData_();
    if(a==='trackDownload') return trackDownload_(b);
    if(a==='backupNow') return backupNow_();
    if(a==='dashboardStats') return dashboardStats_();
    if(a==='upload') return upload_(b.file);
    if(a==='append') return append_(b.sheet,b.row);
    if(a==='update') return update_(b.sheet,b.id,b.row,b.rowNumber);
    if(a==='delete') return del_(b.sheet,b.id,b.rowNumber);
    if(a==='setStatus') return setStatus_(b.sheet,b.id,b.status,b.rowNumber);
    if(a==='repairIds') return repairIds_(b.sheet);
    if(a==='initSheets') return initSheets_();
    if(a==='upsertSetting') return upsertSetting_(b.key,b.value);
    return json_({ok:false,message:'ไม่พบคำสั่ง'});
  }catch(err){return json_({ok:false,message:String(err.message||err)})}
}
function setup_(b){
  const props=PropertiesService.getScriptProperties(), already=cfg_('SPREADSHEET_ID'), old=cfg_('ADMIN_PASSWORD');
  if(already && String(b.password||b.setupKey||'')!==String(old)) return json_({ok:false,message:'เคยติดตั้งแล้ว กรุณาใส่รหัสผ่าน Admin เดิม'});
  const sid=extractSheet_(b.spreadsheetUrl||b.spreadsheetId||''), fid=extractFolder_(b.folderUrl||b.folderId||'');
  if(!sid) return json_({ok:false,message:'ไม่พบ Spreadsheet ID'});
  if(!fid) return json_({ok:false,message:'ไม่พบ Folder ID'});
  if(!b.adminPassword) return json_({ok:false,message:'กรุณาตั้งรหัสผ่าน Admin'});
  props.setProperty('SPREADSHEET_ID',sid); props.setProperty('DRIVE_FOLDER_ID',fid); props.setProperty('ADMIN_PASSWORD',String(b.adminPassword));
  initSheets_(); seedDefaults_(); seedOrganizationProfile_(); seedOrgMenus_(); seedV18_(); return json_({ok:true,message:'ติดตั้งสำเร็จ'});
}
function login_(password){
  if(String(password)!==String(cfg_('ADMIN_PASSWORD'))) return json_({ok:false,message:'รหัสผ่านไม่ถูกต้อง'});
  const t=Utilities.getUuid(); CacheService.getScriptCache().put('token_'+t,'1',TOKEN_TTL_SECONDS); return json_({ok:true,token:t});
}
function valid_(t){return t && CacheService.getScriptCache().get('token_'+t)==='1'}

function backupNow_(){
  const sid=cfg_('SPREADSHEET_ID');
  const fid=cfg_('DRIVE_FOLDER_ID');
  const file=DriveApp.getFileById(sid);
  const folder=DriveApp.getFolderById(fid);
  const name='BACKUP_NAYANG_CMS_'+Utilities.formatDate(new Date(),'Asia/Bangkok','yyyyMMdd_HHmmss');
  const copy=file.makeCopy(name,folder);
  append_('backup_log',{timestamp:new Date(),backup_name:name,spreadsheet_url:copy.getUrl(),folder_url:folder.getUrl(),note:'Backup by V15'});
  return json_({ok:true,backup_name:name,backup_url:copy.getUrl()});
}
function dashboardStats_(){
  const stats={};
  ['news','notice','download','gallery','staff','vhv_directory','appointments','complaints','eservices','appscript_apps','videos'].forEach(s=>stats[s]=readSheet_(s).length);
  return json_({ok:true,stats:stats});
}

function adminData_(){const d={}; SHEETS.forEach(s=>d[s]=readSheet_(s)); return json_({ok:true,data:d})}
function upload_(f){
  if(!f||!f.data||!f.name) return json_({ok:false,message:'ไม่พบไฟล์'});
  const folder=DriveApp.getFolderById(cfg_('DRIVE_FOLDER_ID')), blob=Utilities.newBlob(Utilities.base64Decode(f.data),f.type||'application/octet-stream',f.name);
  const file=folder.createFile(blob); file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);
  const id=file.getId(), view='https://drive.google.com/file/d/'+id+'/view?usp=sharing', img='https://drive.google.com/thumbnail?id='+id+'&sz=w1200';
  return json_({ok:true,id:id,name:file.getName(),url:(String(f.type||'').indexOf('image/')===0?img:view),image_url:img,view_url:view,download_url:'https://drive.google.com/uc?export=download&id='+id});
}
function append_(s,row){
  if(!allowed_(s)) return json_({ok:false,message:'ไม่อนุญาต'});
  row=row||{}; row.id=row.id||makeId_(); row.status=row.status||'published'; row.created_at=row.created_at||new Date(); row.updated_at=new Date();
  const sh=sheet_(s,row), h=headers_(sh,row); sh.appendRow(h.map(k=>row[k]!==undefined?row[k]:'')); return json_({ok:true,id:row.id});
}
function update_(s,id,row,rowNumber){
  if(!allowed_(s)) return json_({ok:false,message:'ไม่อนุญาต'}); row=row||{}; row.updated_at=new Date();
  const sh=sheet_(s,row), h=headers_(sh,row), r=findRow_(sh,h,id,rowNumber); if(!r) return json_({ok:false,message:'ไม่พบรายการที่ต้องการแก้ไข'});
  row.id=row.id||id||value_(sh,h,r,'id')||makeId_(); row.status=row.status||value_(sh,h,r,'status')||'published';
  const h2=headers_(sh,row); h2.forEach((k,i)=>{if(row[k]!==undefined) sh.getRange(r,i+1).setValue(row[k])}); return json_({ok:true});
}
function del_(s,id,rowNumber){
  if(!allowed_(s)) return json_({ok:false,message:'ไม่อนุญาต'});
  const sh=sheet_(s,{}), h=headers_(sh,{}), r=findRow_(sh,h,id,rowNumber); if(!r) return json_({ok:false,message:'ไม่พบรายการที่ต้องการลบ'});
  sh.deleteRow(r); return json_({ok:true});
}
function setStatus_(s,id,status,rowNumber){
  status=(status==='hidden'||status==='ซ่อน')?'hidden':'published';
  const sh=sheet_(s,{id:'',status:'',updated_at:''}), h=headers_(sh,{id:'',status:'',updated_at:''}), r=findRow_(sh,h,id,rowNumber);
  if(!r) return json_({ok:false,message:'ไม่พบรายการ'});
  const ic=h.indexOf('id')+1, sc=h.indexOf('status')+1, uc=h.indexOf('updated_at')+1;
  if(ic>0&&!sh.getRange(r,ic).getDisplayValue()) sh.getRange(r,ic).setValue(id||makeId_());
  sh.getRange(r,sc).setValue(status); if(uc>0) sh.getRange(r,uc).setValue(new Date()); return json_({ok:true,status:status});
}
function repairIds_(s){
  const sh=sheet_(s,{id:'',status:''}), h=headers_(sh,{id:'',status:''}), ic=h.indexOf('id')+1, sc=h.indexOf('status')+1; let c=0;
  for(let r=2;r<=sh.getLastRow();r++){if(!sh.getRange(r,ic).getDisplayValue()){sh.getRange(r,ic).setValue(makeId_());c++} if(!sh.getRange(r,sc).getDisplayValue()) sh.getRange(r,sc).setValue('published')}
  return json_({ok:true,repaired:c});
}
function initSheets_(){
  const schema={setting:['key','value'],menu_groups:['id','status','group_name','label','url','icon','order','created_at','updated_at'],file_manager:['id','status','title','description','file_url','file_type','category','download_count','order','created_at','updated_at'],site_footer:['id','status','title','content','phone','email','facebook_url','line_url','map_url','order','created_at','updated_at'],visitor_stats:['id','status','date','page','count','created_at','updated_at'],org_general:['id','status','title','content','image_url','file_url','order','created_at','updated_at'],org_health_history:['id','status','title','content','image_url','file_url','order','created_at','updated_at'],org_subdistrict_history:['id','status','title','content','image_url','file_url','order','created_at','updated_at'],org_vision:['id','status','title','content','image_url','file_url','order','created_at','updated_at'],org_mission:['id','status','title','content','image_url','file_url','order','created_at','updated_at'],org_values:['id','status','title','content','image_url','file_url','order','created_at','updated_at'],org_structure:['id','status','title','content','image_url','file_url','order','created_at','updated_at'],org_map:['id','status','title','content','map_url','image_url','order','created_at','updated_at'],org_contact:['id','status','title','content','phone','email','line_url','facebook_url','map_url','order','created_at','updated_at'],organization_profile:['id','status','category','title','content','image_url','file_url','map_url','order','created_at','updated_at'],users:['id','status','username','password','role','name','email','created_at','updated_at'],audit_log:['id','status','timestamp','user','action','sheet','detail','created_at','updated_at'],backup_log:['id','status','timestamp','backup_name','spreadsheet_url','folder_url','note','created_at','updated_at'],menus:['id','status','label','url','order','created_at','updated_at'],hero_buttons:['id','status','label','url','style','order','created_at','updated_at'],quick_links:['id','status','icon','title','subtitle','url','order','created_at','updated_at'],banners:['id','status','title','subtitle','image_url','mobile_image_url','button_text','button_url','start_date','end_date','order','created_at','updated_at'],popups:['id','status','title','description','image_url','button_text','button_url','start_date','end_date','auto_close_seconds','created_at','updated_at'],news:['id','status','date','title','description','image_url','created_at','updated_at'],notice:['id','status','date','title','description','created_at','updated_at'],service_schedule:['id','status','day','service','created_at','updated_at'],services:['id','status','icon','title','description','link','created_at','updated_at'],staff:['id','status','name','position','phone','image_url','created_at','updated_at'],vhv_directory:['id','status','village_no','village_name','name','role','phone','image_url','note','created_at','updated_at'],appscript_apps:['id','status','icon','title','description','app_url','manual_url','target_group','order','created_at','updated_at'],videos:['id','status','title','description','youtube_url','category','order','created_at','updated_at'],appointments:['id','status','date','name','phone','service','preferred_date','message','created_at','updated_at'],complaints:['id','status','date','name','phone','topic','detail','tracking_no','reply','created_at','updated_at'],eservices:['id','status','title','description','form_url','file_url','category','order','created_at','updated_at'],kpi_dashboard:['id','status','title','value','unit','icon','category','order','created_at','updated_at'],download:['id','status','title','description','file_url','created_at','updated_at'],gallery:['id','status','date','title','description','image_url','created_at','updated_at']};
  const ss=SpreadsheetApp.openById(cfg_('SPREADSHEET_ID'));
  Object.keys(schema).forEach(n=>{let sh=ss.getSheetByName(n)||ss.insertSheet(n); if(sh.getLastRow()===0){sh.getRange(1,1,1,schema[n].length).setValues([schema[n]]); fmt_(sh,schema[n].length)} else headers_(sh,Object.fromEntries(schema[n].map(k=>[k,''])));});
  return json_({ok:true});
}

function seedDefaults_(){
  const ss=SpreadsheetApp.openById(cfg_('SPREADSHEET_ID'));
  const groups={
    menus:[['หน้าแรก','#home','1'],['เกี่ยวกับเรา','#about','2'],['บริการ','#services','3'],['บุคลากร','#staff','4'],['ทำเนียบ อสม.','#vhv','5'],['AppScript','#apps','6'],['วิดีโอ','#videos','7'],['ข่าวสาร','#news','8'],['ดาวน์โหลด','#download','9'],['ติดต่อเรา','#contact','10']],
    hero_buttons:[['นัดหมายออนไลน์','#appointment','primary','1'],['LINE OA','#lineoa','line','2'],['ระบบออนไลน์','#online','white','3']],
    quick_links:[['📅','นัดหมายออนไลน์','จองคิวรับบริการ','#appointment','1'],['❤️','Home BP','ติดตามความดัน','#online','2'],['📊','ระบบ NCD','คัดกรอง DM/HT','#online','3'],['👥','บุคลากร','ทีม รพ.สต.','#staff','4'],['📄','ดาวน์โหลด','เอกสาร/แบบฟอร์ม','#download','5']]
  };
  Object.keys(groups).forEach(s=>{
    const sh=ss.getSheetByName(s); if(!sh || sh.getLastRow()>1) return;
    groups[s].forEach(a=>{
      if(s==='menus') append_(s,{label:a[0],url:a[1],order:a[2]});
      if(s==='hero_buttons') append_(s,{label:a[0],url:a[1],style:a[2],order:a[3]});
      if(s==='quick_links') append_(s,{icon:a[0],title:a[1],subtitle:a[2],url:a[3],order:a[4]});
    });
  });
}


function seedOrgMenus_(){
  try{
    const data={
      org_general:[['ข้อมูลหน่วยงาน','โรงพยาบาลส่งเสริมสุขภาพตำบลนายาง อำเภอพิชัย จังหวัดอุตรดิตถ์ ให้บริการสุขภาพปฐมภูมิแก่ประชาชนในพื้นที่รับผิดชอบ','1']],
      org_health_history:[['ประวัติ รพ.สต.นายาง','รพ.สต.นายาง เป็นหน่วยบริการปฐมภูมิที่มุ่งเน้นการส่งเสริมสุขภาพ ป้องกันโรค รักษาพยาบาลเบื้องต้น ฟื้นฟูสุขภาพ และคุ้มครองผู้บริโภคด้านสุขภาพ','1']],
      org_subdistrict_history:[['ประวัติตำบลนายาง','ตำบลนายางเป็นชุมชนที่มีภาคีเครือข่ายร่วมพัฒนาสุขภาพประชาชน ครอบคลุม 7 หมู่บ้าน','1']],
      org_vision:[['วิสัยทัศน์','เป็นศูนย์สุขภาพชุมชนดิจิทัล ประชาชนเข้าถึงบริการอย่างทั่วถึง ทันสมัย โปร่งใส และยั่งยืน','1']],
      org_mission:[['พันธกิจ','1) ส่งเสริมสุขภาพและป้องกันโรค\n2) พัฒนาระบบบริการปฐมภูมิ\n3) ใช้เทคโนโลยีดิจิทัลสนับสนุนงานสุขภาพ\n4) ทำงานร่วมกับชุมชนและภาคีเครือข่าย','1']],
      org_values:[['ค่านิยม','บริการด้วยหัวใจ ใส่ใจประชาชน ทำงานเป็นทีม ใช้ข้อมูลและเทคโนโลยีเพื่อพัฒนาคุณภาพบริการ','1']],
      org_structure:[['โครงสร้างองค์กร','โครงสร้างประกอบด้วยผู้บริหาร กลุ่มงานบริการสุขภาพ กลุ่มงานส่งเสริมป้องกันโรค งาน อสม. งานแผนไทย ทันตกรรม และงานสนับสนุนบริการ','1']],
      org_map:[['แผนที่','รพ.สต.นายาง ตำบลนายาง อำเภอพิชัย จังหวัดอุตรดิตถ์','1']],
      org_contact:[['ช่องทางติดต่อ','โทรศัพท์ 055-822-385\nEmail: nayangph06319@gmail.com\nLINE OA: รพ.สต.นายาง','1']]
    };
    Object.keys(data).forEach(s=>{
      const sh=sheet_(s,{title:'',content:'',order:''});
      if(sh.getLastRow()>1) return;
      data[s].forEach(x=>append_(s,{title:x[0],content:x[1],order:x[2]}));
    });
  }catch(e){}
}


function seedV18_(){
  try{
    const groups=[
      ['หน้าแรก','หน้าแรก','#home','🏠','1'],['ข้อมูลหน่วยงาน','ประวัติ/วิสัยทัศน์','#organization','🏥','2'],
      ['ข้อมูลหน่วยงาน','บุคลากร','#staff','👥','3'],['ข้อมูลหน่วยงาน','ทำเนียบ อสม.','#vhv','🤝','4'],
      ['บริการประชาชน','บริการทั้งหมด','#services','🩺','5'],['บริการประชาชน','นัดหมายออนไลน์','#appointment','📅','6'],
      ['บริการประชาชน','AppScript','#apps','📱','7'],['บริการประชาชน','E-Service','#eservice','📝','8'],
      ['ข่าวสาร','ข่าวประชาสัมพันธ์','#news','📰','9'],['ข่าวสาร','กิจกรรม/รูปภาพ','#gallery','🖼️','10'],
      ['ข่าวสาร','วิดีโอ','#videos','🎥','11'],['เอกสาร','ดาวน์โหลด','#download','📄','12'],
      ['ติดต่อเรา','แผนที่/ติดต่อ','#contact','☎️','13']
    ];
    const sh=sheet_('menu_groups',{group_name:'',label:'',url:'',icon:'',order:''});
    if(sh.getLastRow()<=1) groups.forEach(x=>append_('menu_groups',{group_name:x[0],label:x[1],url:x[2],icon:x[3],order:x[4]}));
    const ft=sheet_('site_footer',{title:'',content:'',phone:'',email:'',order:''});
    if(ft.getLastRow()<=1) append_('site_footer',{title:'โรงพยาบาลส่งเสริมสุขภาพตำบลนายาง',content:'ตำบลนายาง อำเภอพิชัย จังหวัดอุตรดิตถ์',phone:'055-822-385',email:'nayangph06319@gmail.com',order:'1'});
  }catch(e){}
}
function trackDownload_(body){
  try{
    const sh=sheet_(body.sheet||'file_manager',{download_count:''}), h=headers_(sh,{download_count:''});
    const r=findRow_(sh,h,body.id||'',body.rowNumber||'');
    if(r){ const c=h.indexOf('download_count')+1; sh.getRange(r,c).setValue(Number(sh.getRange(r,c).getDisplayValue()||0)+1); }
  }catch(e){}
  return json_({ok:true});
}

function upsertSetting_(k,v){const sh=sheet_('setting',{key:'',value:''}); const vals=sh.getDataRange().getValues(); for(let i=1;i<vals.length;i++){if(String(vals[i][0])===String(k)){sh.getRange(i+1,2).setValue(v); return json_({ok:true})}} sh.appendRow([k,v]); return json_({ok:true})}
function readSheet_(s){const ss=SpreadsheetApp.openById(cfg_('SPREADSHEET_ID')), sh=ss.getSheetByName(s); if(!sh) return []; const vals=sh.getDataRange().getDisplayValues(); if(vals.length<2) return []; const h=vals[0].map(x=>String(x).trim()); return vals.slice(1).map((r,i)=>({r:r,n:i+2})).filter(x=>x.r.some(c=>String(c).trim()!=='')) .map(x=>{const o={};h.forEach((k,i)=>o[k]=x.r[i]||''); o._rowNumber=x.n; if(!o.status||o.status==='show')o.status='published'; return o}).sort((a,b)=>Number(a.order||999)-Number(b.order||999))}
function sheet_(s,row){const ss=SpreadsheetApp.openById(cfg_('SPREADSHEET_ID')), sh=ss.getSheetByName(s)||ss.insertSheet(s); headers_(sh,row||{}); return sh}
function headers_(sh,row){const req=sh.getName()==='setting'?['key','value']:['id','status']; let h=sh.getLastColumn()?sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(x=>String(x).trim()):[]; if(!h.length||h.every(x=>!x)){h=req.concat(Object.keys(row||{}).filter(k=>!req.includes(k))); sh.getRange(1,1,1,h.length).setValues([h]); fmt_(sh,h.length)} req.concat(Object.keys(row||{})).forEach(k=>{if(!h.includes(k)){h.push(k); sh.getRange(1,h.length).setValue(k); fmt_(sh,h.length)}}); return h}
function findRow_(sh,h,id,rowNumber){if(rowNumber&&Number(rowNumber)>=2&&Number(rowNumber)<=sh.getLastRow()) return Number(rowNumber); const ic=h.indexOf('id')+1; if(id&&ic>0){for(let r=2;r<=sh.getLastRow();r++) if(String(sh.getRange(r,ic).getDisplayValue())===String(id)) return r} return null}
function value_(sh,h,r,k){const c=h.indexOf(k)+1; return c>0?sh.getRange(r,c).getDisplayValue():''}
function extractSheet_(s){s=String(s||'').trim(); const m=s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/); return m?m[1]:s}
function extractFolder_(s){s=String(s||'').trim(); const m=s.match(/\/folders\/([a-zA-Z0-9-_]+)/); return m?m[1]:s}
function allowed_(s){return SHEETS.includes(s)&&s!=='setting'} function fmt_(sh,c){sh.getRange(1,1,1,c).setFontWeight('bold').setBackground('#0b74d1').setFontColor('#fff')} function makeId_(){return Utilities.getUuid().split('-')[0]+'-'+Date.now()}
function json_(o,e){const cb=e&&e.parameter&&e.parameter.callback, t=JSON.stringify(o); return ContentService.createTextOutput(cb?String(cb)+'('+t+');':t).setMimeType(cb?ContentService.MimeType.JAVASCRIPT:ContentService.MimeType.JSON)}


function seedOrganizationProfile_(){
  try{
    const sh=sheet_('organization_profile',{category:'',title:'',content:'',order:''});
    if(sh.getLastRow()>1) return;
    const items=[
      ['ข้อมูลหน่วยงาน','ข้อมูลหน่วยงาน','โรงพยาบาลส่งเสริมสุขภาพตำบลนายาง อำเภอพิชัย จังหวัดอุตรดิตถ์ ให้บริการสุขภาพปฐมภูมิแก่ประชาชนในพื้นที่รับผิดชอบ','1'],
      ['ประวัติ รพ.สต.','ประวัติ รพ.สต.นายาง','รพ.สต.นายาง เป็นหน่วยบริการปฐมภูมิที่มุ่งเน้นการส่งเสริมสุขภาพ ป้องกันโรค รักษาพยาบาลเบื้องต้น ฟื้นฟูสุขภาพ และคุ้มครองผู้บริโภคด้านสุขภาพ','2'],
      ['ประวัติตำบลนายาง','ประวัติตำบลนายาง','ตำบลนายางเป็นชุมชนที่มีเครือข่ายชุมชน อสม. ผู้นำท้องถิ่น และภาคีเครือข่ายร่วมพัฒนาสุขภาพประชาชน','3'],
      ['วิสัยทัศน์','วิสัยทัศน์','เป็นศูนย์สุขภาพชุมชนดิจิทัล ประชาชนเข้าถึงบริการอย่างทั่วถึง ทันสมัย โปร่งใส และยั่งยืน','4'],
      ['พันธกิจ','พันธกิจ','1) ส่งเสริมสุขภาพและป้องกันโรค 2) พัฒนาระบบบริการปฐมภูมิ 3) ใช้เทคโนโลยีดิจิทัลสนับสนุนงานสุขภาพ 4) ทำงานร่วมกับชุมชนและภาคีเครือข่าย','5'],
      ['ค่านิยม','ค่านิยม','บริการด้วยหัวใจ ใส่ใจประชาชน ทำงานเป็นทีม ใช้ข้อมูลและเทคโนโลยีเพื่อพัฒนาคุณภาพบริการ','6'],
      ['โครงสร้างองค์กร','โครงสร้างองค์กร','โครงสร้างประกอบด้วยผู้บริหาร กลุ่มงานบริการสุขภาพ กลุ่มงานส่งเสริมป้องกันโรค งาน อสม. งานแผนไทย ทันตกรรม และงานสนับสนุนบริการ','7'],
      ['บุคลากร','บุคลากร','แสดงข้อมูลบุคลากรจากเมนูบุคลากรในระบบหลังบ้าน และสามารถเชื่อมโยงกับโครงสร้างองค์กรได้','8'],
      ['แผนที่','แผนที่','รพ.สต.นายาง ตำบลนายาง อำเภอพิชัย จังหวัดอุตรดิตถ์','9'],
      ['ช่องทางติดต่อ','ช่องทางติดต่อ','โทรศัพท์ 055-822-385, Email: nayangph06319@gmail.com, LINE OA: รพ.สต.นายาง','10']
    ];
    items.forEach(x=>append_('organization_profile',{category:x[0],title:x[1],content:x[2],order:x[3]}));
  }catch(e){}
}
