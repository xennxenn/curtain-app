import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Printer, Image as ImageIcon, Upload, Save, X, MousePointerClick, Settings, Database, Eye, EyeOff, Move, Users, LogOut, FileText, ArrowLeft, Share2, ChevronLeft, ChevronRight, ImagePlus } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc, onSnapshot } from 'firebase/firestore';

// --- Firebase Initialization ---
const firebaseConfig = {
  apiKey: "AIzaSyCRM9SXoU2IWM0olulbyfAF2oeeGyJsygY",
  authDomain: "curtain-app-3d38a.firebaseapp.com",
  projectId: "curtain-app-3d38a",
  storageBucket: "curtain-app-3d38a.firebasestorage.app",
  messagingSenderId: "58897117944",
  appId: "1:58897117944:web:3b7aa0417af8bc99a4010d"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "curtain-app-3d38a"; // ใช้ Project ID เป็น appId อ้างอิงโฟลเดอร์ใน Database

// --- SVGs for default fallback ---
const SVGS = {
  style_default: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" fill="%23eee" stroke="%23333" stroke-width="2"/><text x="50" y="55" font-size="12" text-anchor="middle" fill="%23999">ไม่มีรูป</text></svg>',
};

const PRESET_COLORS = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#A855F7', '#EC4899', '#000000', '#FFFFFF'];
const ACCEPTED_IMAGE_FORMATS = ".png,.jpeg,.jpg,.webp,.heic,.heif,image/*";

const DEFAULT_DB = {
  curtainTypes: {
    'ผ้าม่าน': { 'ผ้าม่านทึบ (Blackout)': {}, 'ผ้าม่านโปร่ง (Sheer)': {} },
    'ม่านอื่นๆ': { 'มู่ลี่ (Blinds)': {}, 'ม่านม้วน (Roller Blinds)': {} }
  },
  styles: ['ม่านลอน', 'ม่านจีบ', 'ม่านพับ', 'มู่ลี่', 'ม่านม้วน', 'ม่านปรับแสง'],
  styleImages: {}, actions: ['รวบซ้าย', 'รวบขวา', 'แยกกลาง', 'โซ่ดึงซ้าย', 'โซ่ดึงขวา', 'โซ่ดึงซ้าย-ขวา'],
  masks: {}, tracks: ['รางลอนเทป', 'รางจีบ', 'รางโชว์', 'ม่านพับ', 'กล่องมู่ลี่'],
  brackets: ['ติดเพดาน (ยึดฝ้า)', 'ติดผนัง'], accessories: ['-', 'ด้ามจูงอะคริลิค', 'ด้ามจูงไม้', 'สายรวบม่านแบบพู่', 'ตะขอเกี่ยวสายรวบม่าน'],
  hangStyles: ['หัวผ้าม่านแขวนปิดราง', 'หัวผ้าม่านแขวนใต้ราง (โชว์ราง)'],
  margins: {
    horizontal: ['-', 'พอดีเฟรม', 'บวกเพิ่ม 10 ซม.', 'บวกเพิ่ม 15 ซม.', 'ชนผนัง', 'ระบุเอง...'],
    top: ['ติดกล่องบังราง', 'ติดเพดาน', 'บวกจากขอบเฟรม 10 ซม.', 'ระบุเอง...'],
    bottom: ['ลอยจากพื้น 1 ซม.', 'ลอยจากพื้น 2 ซม.', 'พอดีพื้น', 'คลุมบัวพื้น', 'ระบุเอง...']
  },
  marginImages: {}
};

const DEFAULT_ACCOUNTS = [
  { id: '1', username: 'Admin', password: '1234', role: 'admin', name: 'ผู้ดูแลระบบ' },
  { id: '2', username: 'T65099', password: '65099', role: 'user', name: 'พนักงานทดสอบ' }
];

// --- Utility: HEIC/HEIF Image Support & Compression ---
const loadHeic2Any = async () => {
  if (window.heic2any) return window.heic2any;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js";
    script.onload = () => resolve(window.heic2any);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const processImageFile = async (file, maxWidth = 1200, quality = 0.8) => {
  let processFile = file;
  
  if (file.name.toLowerCase().match(/\.(heic|heif)$/i)) {
    try {
      const heic2any = await loadHeic2Any();
      const convertedBlob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.8 });
      const blobArray = Array.isArray(convertedBlob) ? convertedBlob : [convertedBlob];
      processFile = new File(blobArray, file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: "image/jpeg" });
    } catch (err) {
      console.error("HEIC conversion failed", err);
      alert("ไม่สามารถแปลงไฟล์ HEIC/HEIF ได้ กรุณาใช้ไฟล์ JPG/PNG");
      return null;
    }
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/webp', quality)); 
      };
      img.onerror = () => {
        alert("ไฟล์รูปภาพไม่รองรับ หรือมีปัญหา");
        resolve(null);
      };
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(processFile);
  });
};

// --- Component: Custom Project Fabric Modal ---
const CustomFabricModal = ({ show, onClose, onAdd }) => {
  if (!show) return null;
  const handleSubmit = async (e) => {
    e.preventDefault();
    const f = document.getElementById('customFabImg').files[0];
    const subType = document.getElementById('customFabSubType').value;
    const name = document.getElementById('customFabName').value;
    const color = document.getElementById('customFabColor').value;
    if(!subType || !name || !color || !f) return alert('กรุณากรอกข้อมูลและเลือกรูปภาพให้ครบถ้วน');
    
    const compressed = await processImageFile(f, 600, 0.8);
    if (!compressed) return; 
    onAdd({ id: Date.now().toString(), mainType: 'ผ้านอกระบบ (เฉพาะงานนี้)', subType, name, color, image: compressed });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[1000000] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b bg-indigo-50">
          <h2 className="text-lg font-bold flex items-center text-indigo-800"><ImagePlus className="mr-2"/> เพิ่มผ้านอกระบบ (เฉพาะงานนี้)</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500"><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3">
          <div><label className="text-xs font-bold block mb-1">ประเภทม่าน (เช่น ผ้าม่านทึบ, ม่านโปร่ง, มู่ลี่)</label><input id="customFabSubType" type="text" className="w-full border p-2 rounded text-sm focus:outline-indigo-500" placeholder="ผ้าม่านทึบ พิเศษ"/></div>
          <div><label className="text-xs font-bold block mb-1">รุ่น / ชื่อผ้า</label><input id="customFabName" type="text" className="w-full border p-2 rounded text-sm focus:outline-indigo-500" placeholder="เช่น รุ่น A"/></div>
          <div><label className="text-xs font-bold block mb-1">สี</label><input id="customFabColor" type="text" className="w-full border p-2 rounded text-sm focus:outline-indigo-500" placeholder="เช่น สีเทาเข้ม"/></div>
          <div>
            <label className="text-xs font-bold block mb-1">รูปตัวอย่างเนื้อผ้า</label>
            <label className="bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 px-3 py-2 rounded text-sm cursor-pointer w-full flex justify-center items-center font-bold">
              <Upload size={16} className="mr-2"/> เลือกรูปภาพ
              <input type="file" accept={ACCEPTED_IMAGE_FORMATS} className="hidden" id="customFabImg"/>
            </label>
          </div>
          <button type="submit" className="bg-indigo-600 text-white font-bold py-2 rounded mt-2 shadow hover:bg-indigo-700">บันทึกผ้าเข้าใบงาน</button>
        </form>
      </div>
    </div>
  );
};

// --- Component: Database Settings Modal ---
const DatabaseModal = ({ appDB, setAppDB, showDBSettings, setShowDBSettings, saveData }) => {
  if (!showDBSettings) return null;
  const [activeTab, setActiveTab] = useState('fabrics');
  const [cat, setCat] = useState('ผ้าม่าน');
  const [type, setType] = useState('');
  const [localText, setLocalText] = useState({});

  useEffect(() => {
    setLocalText({
      styles: (appDB.styles || []).join('\n'),
      actions: (appDB.actions || []).join('\n'),
      tracks: (appDB.tracks || []).join('\n'),
      brackets: (appDB.brackets || []).join('\n'),
      accessories: (appDB.accessories || []).join('\n'),
      hangStyles: (appDB.hangStyles || []).join('\n'),
      margins_bottom: (appDB.margins?.bottom || []).join('\n'),
      margins_top: (appDB.margins?.top || []).join('\n'),
      margins_horizontal: (appDB.margins?.horizontal || []).join('\n')
    });
  }, [appDB, showDBSettings]);

  const handleLocalText = (key, value) => {
    setLocalText(prev => ({...prev, [key]: value}));
    const arr = value.split('\n'); 
    if(key.startsWith('margins_')) {
      const subKey = key.split('_')[1];
      setAppDB(prev => ({...prev, margins: {...(prev.margins||{}), [subKey]: arr}}));
    } else {
      setAppDB(prev => ({...prev, [key]: arr}));
    }
  };

  const handleSaveAndClose = () => {
    const cleanedDB = JSON.parse(JSON.stringify(appDB));
    ['styles', 'actions', 'tracks', 'brackets', 'accessories', 'hangStyles'].forEach(k => {
       if(cleanedDB[k]) cleanedDB[k] = cleanedDB[k].map(s=>s.trim()).filter(Boolean);
    });
    if(cleanedDB.margins) {
       ['bottom', 'top', 'horizontal'].forEach(k => {
          if(cleanedDB.margins[k]) cleanedDB.margins[k] = cleanedDB.margins[k].map(s=>s.trim()).filter(Boolean);
       });
    }
    setAppDB(cleanedDB);
    localStorage.setItem('backupAppDB', JSON.stringify(cleanedDB)); // Backup locally
    saveData(cleanedDB);
    setShowDBSettings(false);
  };

  const handleImageUpload = (callback) => async (e) => {
    const file = e.target.files[0];
    if (file) {
      const compressedDataUrl = await processImageFile(file, 800, 0.8);
      if(compressedDataUrl) callback(compressedDataUrl);
    }
  };

  const addFabricType = (newType) => {
    if(!newType) return;
    const newDB = JSON.parse(JSON.stringify(appDB));
    if(!newDB.curtainTypes[cat]) newDB.curtainTypes[cat] = {};
    newDB.curtainTypes[cat][newType] = {};
    setAppDB(newDB);
  };

  const moveFabricType = (dir, t) => {
    const obj = appDB.curtainTypes[cat];
    const keys = Object.keys(obj);
    const idx = keys.indexOf(t);
    if (dir === -1 && idx > 0) [keys[idx-1], keys[idx]] = [keys[idx], keys[idx-1]];
    else if (dir === 1 && idx < keys.length - 1) [keys[idx], keys[idx+1]] = [keys[idx+1], keys[idx]];
    else return;
    const newObj = {};
    keys.forEach(k => newObj[k] = obj[k]);
    setAppDB(prev => ({...prev, curtainTypes: {...prev.curtainTypes, [cat]: newObj}}));
  };

  const deleteFabricType = (t) => {
    if(window.confirm(`ต้องการลบหมวดหมู่ "${t}" ใช่หรือไม่? ข้อมูลผ้าด้านในจะถูกลบทั้งหมด`)) {
      const newDB = JSON.parse(JSON.stringify(appDB));
      delete newDB.curtainTypes[cat][t];
      setAppDB(newDB);
      if(type === t) setType('');
    }
  };

  const addFabricItem = async () => {
    const n = document.getElementById('addFabName').value;
    const c = document.getElementById('addFabColor').value;
    const f = document.getElementById('addFabImg').files[0];
    if(n && c && f) {
      const compressedImg = await processImageFile(f, 600, 0.8);
      if(!compressedImg) return;
      
      const newDB = JSON.parse(JSON.stringify(appDB));
      if(!newDB.curtainTypes[cat][type]) newDB.curtainTypes[cat][type] = {};
      if(!newDB.curtainTypes[cat][type][n]) newDB.curtainTypes[cat][type][n] = {};
      newDB.curtainTypes[cat][type][n][c] = compressedImg;
      setAppDB(newDB);
      document.getElementById('addFabName').value=''; 
      document.getElementById('addFabColor').value=''; 
      document.getElementById('addFabImg').value='';
    } else { alert("กรุณาใส่ข้อมูลและเลือกรูปภาพให้ครบ"); }
  };

  const deleteFabricItem = (typeName, itemName, itemColor) => {
    const newDB = JSON.parse(JSON.stringify(appDB));
    delete newDB.curtainTypes[cat][typeName][itemName][itemColor];
    if(Object.keys(newDB.curtainTypes[cat][typeName][itemName]).length === 0) delete newDB.curtainTypes[cat][typeName][itemName];
    setAppDB(newDB);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100000] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <h2 className="text-xl font-bold flex items-center text-blue-800"><Database className="mr-2"/> ฐานข้อมูลออนไลน์ (Admin Only)</h2>
          <button onClick={() => setShowDBSettings(false)} className="text-gray-500 hover:text-red-500"><X size={24}/></button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/4 border-r bg-gray-100 p-2 flex flex-col gap-1 overflow-y-auto">
            {[{id: 'fabrics', label: 'เนื้อผ้าและม่าน'}, {id: 'styles', label: 'รูปแบบม่าน'}, {id: 'masks', label: 'มาสก์หน้างาน'}, {id: 'margins', label: 'ระยะชายม่าน'}, {id: 'tracks', label: 'รางม่าน & ขาจับ'}, {id: 'accessories', label: 'อุปกรณ์เสริม'}].map(t => (
              <button key={t.id} onClick={()=>setActiveTab(t.id)} className={`text-left px-3 py-2 rounded text-sm ${activeTab===t.id ? 'bg-blue-600 text-white font-bold shadow' : 'hover:bg-gray-200 text-gray-700'}`}>{t.label}</button>
            ))}
          </div>
          <div className="w-3/4 p-4 overflow-y-auto bg-white">
            {activeTab === 'fabrics' && (
              <div className="flex flex-col gap-4">
                <h3 className="font-bold text-lg text-blue-700 border-b pb-2">จัดการเนื้อผ้าและม่าน (ระบุ ชื่อ/สี พร้อมรูปตัวอย่าง)</h3>
                <div>
                  <label className="block text-sm font-bold mb-2">1. หมวดหมู่หลัก</label>
                  <div className="flex gap-2">
                    {Object.keys(appDB.curtainTypes || {}).map(c => (
                      <button key={c} onClick={()=>{setCat(c); setType('');}} className={`px-4 py-1.5 border rounded-full text-sm transition-colors ${cat===c ? 'bg-blue-600 text-white border-blue-600 shadow' : 'bg-white hover:bg-gray-50'}`}>{c}</button>
                    ))}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 border rounded-lg">
                  <label className="block text-sm font-bold mb-3">2. ประเภทม่าน ({cat})</label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {Object.keys((appDB.curtainTypes && appDB.curtainTypes[cat]) || {}).map((t, idx, arr) => (
                      <div key={t} className={`flex items-center border rounded transition-colors ${type===t ? 'bg-indigo-600 text-white border-indigo-600 shadow' : 'bg-white hover:bg-gray-100'}`}>
                        <button onClick={()=>setType(t)} className="px-4 py-1.5 text-sm font-bold">{t}</button>
                        <div className="flex flex-col border-l border-white/20">
                          <button onClick={()=>moveFabricType(-1, t)} disabled={idx===0} className="px-1 py-0.5 hover:bg-black/20 disabled:opacity-30"><ChevronLeft size={10} className="rotate-90"/></button>
                          <button onClick={()=>moveFabricType(1, t)} disabled={idx===arr.length-1} className="px-1 py-0.5 hover:bg-black/20 disabled:opacity-30"><ChevronRight size={10} className="rotate-90"/></button>
                        </div>
                        <button onClick={()=>deleteFabricType(t)} className="px-2 py-1.5 border-l border-white/20 hover:bg-red-500 hover:text-white text-red-500"><Trash2 size={12}/></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" id="newType" placeholder="เพิ่มประเภทม่านใหม่..." className="border px-3 py-1.5 rounded text-sm w-64 focus:outline-blue-500"/>
                    <button onClick={()=>{const v=document.getElementById('newType').value; addFabricType(v); document.getElementById('newType').value='';}} className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded text-sm font-bold">เพิ่ม</button>
                  </div>
                </div>

                {type && (
                  <div className="bg-indigo-50 p-4 border border-indigo-100 rounded-lg flex flex-col gap-4">
                    <label className="block text-sm font-bold">3. รายการผ้า ({type})</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries((appDB.curtainTypes[cat] && appDB.curtainTypes[cat][type]) || {}).flatMap(([itemName, colors]) => 
                        Object.entries(colors).map(([itemColor, imgBase64]) => (
                          <div key={`${itemName}-${itemColor}`} className="bg-white border p-2 rounded flex gap-2 relative group shadow-sm">
                            <button onClick={()=>deleteFabricItem(type, itemName, itemColor)} className="absolute top-1 right-1 bg-red-100 text-red-600 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                            <img src={imgBase64} alt="" className="w-12 h-12 object-cover rounded border"/>
                            <div className="flex flex-col justify-center flex-1 overflow-hidden">
                              <span className="text-xs font-bold truncate">{itemName}</span>
                              <span className="text-[10px] text-gray-500 truncate">{itemColor}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="bg-white p-3 border rounded shadow-sm flex flex-col gap-2 mt-2">
                       <span className="text-sm font-bold text-indigo-700">เพิ่มรายการผ้าใหม่</span>
                       <div className="flex gap-2 items-center">
                          <input type="text" id="addFabName" placeholder="ชื่อรุ่น (เช่น LONERO)" className="border px-2 py-1.5 rounded text-sm w-1/3 focus:outline-indigo-500"/>
                          <input type="text" id="addFabColor" placeholder="ชื่อสี (เช่น GREY)" className="border px-2 py-1.5 rounded text-sm w-1/3 focus:outline-indigo-500"/>
                          <label className="bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-sm cursor-pointer flex-1 flex justify-center items-center">
                            <Upload size={14} className="mr-1"/> เลือกรูปภาพ
                            <input type="file" accept={ACCEPTED_IMAGE_FORMATS} className="hidden" id="addFabImg"/>
                          </label>
                       </div>
                       <button onClick={addFabricItem} className="bg-indigo-600 text-white py-1.5 rounded text-sm font-bold hover:bg-indigo-700 mt-1">บันทึกรายการผ้า</button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'styles' && (
              <div className="flex flex-col gap-4">
                 <h3 className="font-bold text-lg text-blue-700 border-b pb-2">จัดการรูปแบบผ้าม่าน และรูปตัวอย่าง</h3>
                 <div className="grid grid-cols-2 gap-6">
                   <div className="flex flex-col"><label className="font-bold text-sm mb-2">1. รายชื่อรูปแบบม่าน (บรรทัดละ 1 รายการ)</label><textarea rows="15" className="w-full border p-3 text-sm rounded focus:outline-blue-500 leading-relaxed" value={localText.styles} onChange={e => handleLocalText('styles', e.target.value)}></textarea></div>
                   <div className="flex flex-col"><label className="font-bold text-sm mb-2">2. อัปโหลดรูปตัวอย่างรูปแบบม่าน</label>
                     <div className="flex flex-col gap-2 overflow-y-auto pr-2 max-h-[400px]">
                       {(appDB.styles || []).map(styleName => (
                         <div key={styleName} className="flex items-center justify-between border p-2 rounded bg-gray-50">
                           <span className="text-sm font-bold flex-1 truncate mr-2">{styleName}</span>
                           {appDB.styleImages?.[styleName] ? <img src={appDB.styleImages[styleName]} className="w-10 h-10 object-cover bg-white border mr-2 rounded"/> : <div className="w-10 h-10 bg-gray-200 border border-dashed flex items-center justify-center mr-2 rounded text-[8px] text-gray-500">ไม่มีรูป</div>}
                           <label className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded text-xs cursor-pointer">อัปโหลด<input type="file" accept={ACCEPTED_IMAGE_FORMATS} className="hidden" onChange={handleImageUpload((base64) => { setAppDB(prev => ({ ...prev, styleImages: { ...(prev.styleImages || {}), [styleName]: base64 } })); })}/></label>
                         </div>
                       ))}
                     </div>
                   </div>
                 </div>
              </div>
            )}

            {activeTab === 'masks' && (
              <div className="flex flex-col gap-4">
                 <h3 className="font-bold text-lg text-blue-700 border-b pb-2">จัดการ Mask ผ้าม่านทับหน้างาน</h3>
                 <p className="text-xs text-gray-600 mb-2">* เคล็ดลับ: เพื่อให้ Mask ชิดขอบสมบูรณ์แบบ กรุณาตัดรูป (Crop) ให้ชิดเนื้อผ้าม่านที่สุด ไม่มีขอบใส (Transparent) เหลืออยู่</p>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="flex flex-col gap-3 border p-4 rounded-lg bg-gray-50">
                     <label className="font-bold text-sm text-gray-800">1. อัปโหลด Mask (PNG โปร่งใส แนะนำ)</label>
                     <div className="flex flex-col gap-3">
                        <select id="maskStyle" className="border p-2 rounded text-sm outline-none focus:border-blue-500">
                          <option value="">- เลือกรุปแบบม่าน -</option>
                          {(appDB.styles || []).map(s=><option key={s} value={s}>{s}</option>)}
                        </select>
                        <select id="maskAction" className="border p-2 rounded text-sm outline-none focus:border-blue-500">
                          <option value="ALL">- ทุกการเปิด/ปิด (สำหรับม่านม้วน, พับ, มู่ลี่) -</option>
                          {(appDB.actions || []).map(s=><option key={s} value={s}>{s}</option>)}
                        </select>
                        <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded text-sm font-bold text-center cursor-pointer shadow-sm transition-colors mt-2">
                          <Upload size={16} className="inline mr-2"/> อัปโหลดรูป Mask
                          <input type="file" accept={ACCEPTED_IMAGE_FORMATS} className="hidden" onChange={handleImageUpload((base64) => {
                            const st = document.getElementById('maskStyle').value;
                            const ac = document.getElementById('maskAction').value || 'ALL';
                            if(st && ac) {
                              const newDB = JSON.parse(JSON.stringify(appDB));
                              if(!newDB.masks) newDB.masks = {};
                              if(!newDB.masks[st]) newDB.masks[st] = {};
                              newDB.masks[st][ac] = base64;
                              setAppDB(newDB);
                            } else {
                              alert("กรุณาเลือกรูปแบบและลักษณะการเปิดปิดก่อนอัปโหลด");
                            }
                          })}/>
                        </label>
                     </div>
                   </div>
                   <div className="flex flex-col gap-2 overflow-y-auto max-h-[400px]">
                      <label className="font-bold text-sm text-gray-800">2. Mask ที่มีในระบบ</label>
                      {Object.entries(appDB.masks || {}).flatMap(([st, actions]) => 
                        Object.entries(actions).map(([ac, img]) => (
                          <div key={`${st}-${ac}`} className="flex items-center justify-between border border-gray-200 p-2 rounded bg-white shadow-sm">
                            <div className="flex flex-col flex-1">
                              <span className="text-sm font-bold text-blue-800">{st}</span>
                              <span className="text-xs text-gray-500">{ac === 'ALL' ? 'ทุกการเปิดปิด' : ac}</span>
                            </div>
                            <div className="w-16 h-16 bg-gray-100 border rounded mr-3 flex items-center justify-center overflow-hidden">
                              <img src={img} className="w-full h-full object-contain"/>
                            </div>
                            <button onClick={()=>{
                              const newDB = JSON.parse(JSON.stringify(appDB));
                              delete newDB.masks[st][ac];
                              if(Object.keys(newDB.masks[st]).length === 0) delete newDB.masks[st];
                              setAppDB(newDB);
                            }} className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors" title="ลบ Mask"><Trash2 size={16}/></button>
                          </div>
                        ))
                      )}
                      {Object.keys(appDB.masks || {}).length === 0 && <div className="text-sm text-gray-400 italic p-4 text-center border border-dashed rounded">ยังไม่มีข้อมูล Mask</div>}
                   </div>
                 </div>
              </div>
            )}

            {activeTab === 'margins' && (
              <div className="flex flex-col gap-4">
                 <h3 className="font-bold text-lg text-blue-700 border-b pb-2">จัดการระยะชายม่าน และรูปตัวอย่าง</h3>
                 <div className="grid grid-cols-2 gap-6">
                   <div className="flex flex-col gap-4">
                     <div><label className="font-bold text-sm mb-1 block">ระยะด้านล่าง (บรรทัดละ 1 รายการ)</label><textarea rows="8" className="w-full border p-2 text-sm rounded focus:outline-blue-500" value={localText.margins_bottom} onChange={e => handleLocalText('margins_bottom', e.target.value)}></textarea></div>
                     <div><label className="font-bold text-sm mb-1 block">ระยะด้านบน / ซ้าย / ขวา (ใช้ร่วมกัน)</label><textarea rows="4" className="w-full border p-2 text-sm rounded focus:outline-blue-500" value={localText.margins_horizontal} onChange={e => handleLocalText('margins_horizontal', e.target.value)}></textarea></div>
                   </div>
                   <div className="flex flex-col"><label className="font-bold text-sm mb-2">อัปโหลดรูปตัวอย่างระยะด้านล่าง</label>
                     <div className="flex flex-col gap-2 overflow-y-auto pr-2 max-h-[400px]">
                       {(appDB.margins?.bottom || []).map(marginName => (
                         <div key={marginName} className="flex items-center justify-between border p-2 rounded bg-gray-50">
                           <span className="text-sm font-bold flex-1 truncate mr-2">{marginName}</span>
                           {appDB.marginImages?.[marginName] ? <img src={appDB.marginImages[marginName]} className="w-10 h-10 object-cover bg-white border mr-2 rounded"/> : <div className="w-10 h-10 bg-gray-200 border border-dashed flex items-center justify-center mr-2 rounded text-[8px] text-gray-500">ไม่มีรูป</div>}
                           <label className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded text-xs cursor-pointer">อัปโหลด<input type="file" accept={ACCEPTED_IMAGE_FORMATS} className="hidden" onChange={handleImageUpload((base64) => { setAppDB(prev => ({ ...prev, marginImages: { ...(prev.marginImages || {}), [marginName]: base64 } })); })}/></label>
                         </div>
                       ))}
                     </div>
                   </div>
                 </div>
              </div>
            )}
            {['tracks', 'accessories'].includes(activeTab) && (
              <div className="flex flex-col gap-4">
                 <h3 className="font-bold text-lg text-blue-700 border-b pb-2">แก้ไขตัวเลือกอื่นๆ (พิมพ์ 1 รายการต่อบรรทัด)</h3>
                 {activeTab === 'tracks' && (
                   <div className="grid grid-cols-2 gap-4">
                     <div><label className="font-bold text-sm block mb-1">ชนิดรางม่าน</label><textarea rows="15" className="w-full border p-2 text-sm rounded" value={localText.tracks} onChange={e => handleLocalText('tracks', e.target.value)}></textarea></div>
                     <div><label className="font-bold text-sm block mb-1">ชนิดขาจับ</label><textarea rows="15" className="w-full border p-2 text-sm rounded" value={localText.brackets} onChange={e => handleLocalText('brackets', e.target.value)}></textarea></div>
                   </div>
                 )}
                 {activeTab === 'accessories' && (
                   <div className="grid grid-cols-2 gap-4">
                     <div><label className="font-bold text-sm block mb-1">อุปกรณ์เสริม</label><textarea rows="15" className="w-full border p-2 text-sm rounded" value={localText.accessories} onChange={e => handleLocalText('accessories', e.target.value)}></textarea></div>
                     <div><label className="font-bold text-sm block mb-1">การแขวนม่าน</label><textarea rows="15" className="w-full border p-2 text-sm rounded" value={localText.hangStyles} onChange={e => handleLocalText('hangStyles', e.target.value)}></textarea></div>
                   </div>
                 )}
              </div>
            )}
          </div>
        </div>
        <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
           <button onClick={() => setShowDBSettings(false)} className="px-6 py-2 rounded font-bold text-gray-600 hover:bg-gray-200">ปิด</button>
           <button onClick={handleSaveAndClose} className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 shadow">บันทึกฐานข้อมูล</button>
        </div>
      </div>
    </div>
  );
};

// --- Component: User Management Modal ---
const UserManagementModal = ({ show, onClose }) => {
  const [accounts, setAccounts] = useState([]);
  const [newN, setNewN] = useState('');
  const [newU, setNewU] = useState('');
  const [newP, setNewP] = useState('');
  const [newR, setNewR] = useState('user');

  useEffect(() => {
    if(!show) return;
    const fetchAcc = async () => {
      const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'accounts'));
      if(snap.exists() && snap.data().users) setAccounts(snap.data().users);
      else setAccounts(DEFAULT_ACCOUNTS);
    };
    fetchAcc();
  }, [show]);

  const saveAcc = async (newAccounts) => {
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'accounts'), { users: newAccounts });
    setAccounts(newAccounts);
  };

  const handleAdd = () => {
    if(!newN || !newU || !newP) return alert('กรุณากรอก ชื่อ, Username และ Password ให้ครบถ้วน');
    if(accounts.find(a => a.username === newU)) return alert('Username นี้มีอยู่แล้ว');
    const newAcc = [...accounts, { id: Date.now().toString(), username: newU, password: newP, role: newR, name: newN }];
    saveAcc(newAcc);
    setNewN(''); setNewU(''); setNewP('');
  };

  const handleDel = (id) => {
    if(accounts.find(a=>a.id===id).username === 'Admin') return alert('ลบบัญชี Admin หลักไม่ได้');
    saveAcc(accounts.filter(a => a.id !== id));
  };

  if(!show) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-[100000] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <h2 className="text-lg font-bold flex items-center"><Users className="mr-2"/> จัดการพนักงาน</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500"><X size={20}/></button>
        </div>
        <div className="p-4 flex flex-col gap-4">
          <div className="flex gap-2 items-end bg-blue-50 p-3 rounded border border-blue-100">
            <div className="flex-1"><label className="text-xs font-bold block">ชื่อ-นามสกุล</label><input type="text" value={newN} onChange={e=>setNewN(e.target.value)} className="w-full border p-1.5 rounded text-sm"/></div>
            <div className="flex-[0.8]"><label className="text-xs font-bold block">Username</label><input type="text" value={newU} onChange={e=>setNewU(e.target.value)} className="w-full border p-1.5 rounded text-sm"/></div>
            <div className="flex-[0.8]"><label className="text-xs font-bold block">Password</label><input type="text" value={newP} onChange={e=>setNewP(e.target.value)} className="w-full border p-1.5 rounded text-sm"/></div>
            <div><label className="text-xs font-bold block">สิทธิ์</label><select value={newR} onChange={e=>setNewR(e.target.value)} className="w-full border p-1.5 rounded text-sm"><option value="user">User</option><option value="admin">Admin</option></select></div>
            <button onClick={handleAdd} className="bg-green-600 text-white px-4 py-1.5 rounded text-sm font-bold shadow">เพิ่ม</button>
          </div>
          <div className="border rounded overflow-hidden max-h-[300px] overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-800 text-white sticky top-0"><tr><th className="p-2">ชื่อพนักงาน</th><th className="p-2">Username</th><th className="p-2">Password</th><th className="p-2">Role</th><th className="p-2 text-center">ลบ</th></tr></thead>
              <tbody>
                {accounts.map(acc => (
                  <tr key={acc.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{acc.name || '-'}</td>
                    <td className="p-2 font-bold">{acc.username}</td>
                    <td className="p-2 text-gray-600">{acc.password}</td>
                    <td className="p-2">{acc.role === 'admin' ? <span className="text-blue-600 font-bold">Admin</span> : 'User'}</td>
                    <td className="p-2 text-center"><button onClick={()=>handleDel(acc.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Component: Login Form ---
const LoginScreen = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'accounts'));
      let accounts = DEFAULT_ACCOUNTS;
      if (snap.exists() && snap.data().users) accounts = snap.data().users;
      
      const user = accounts.find(u => u.username === username && u.password === password);
      if (user) {
        localStorage.setItem('curtainAppUser', JSON.stringify(user));
        onLogin(user);
      }
      else setError('Username หรือ Password ไม่ถูกต้อง');
    } catch(err) {
      const user = DEFAULT_ACCOUNTS.find(u => u.username === username && u.password === password);
      if (user) {
        localStorage.setItem('curtainAppUser', JSON.stringify(user));
        onLogin(user);
      } else setError('ระบบขัดข้อง กรุณาลองใหม่');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-sm border-t-4 border-blue-600">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Confirmation Form</h1>
          <p className="text-gray-500 text-sm mt-1">ลงชื่อเข้าใช้ระบบสรุปงานผ้าม่าน</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Username</label>
            <input type="text" value={username} onChange={e=>setUsername(e.target.value)} className="w-full border p-2 rounded focus:outline-blue-500" required />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full border p-2 rounded focus:outline-blue-500" required />
          </div>
          {error && <p className="text-red-500 text-sm text-center font-bold">{error}</p>}
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded mt-2 shadow">เข้าสู่ระบบ</button>
        </form>
      </div>
    </div>
  );
};

// --- Component: Interactive Image Area ---
const ImageAreaEditor = ({ item, appDB, handleItemChange }) => {
  const [activeAreaId, setActiveAreaId] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const [mode, setMode] = useState('draw'); 
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [cursorPos, setCursorPos] = useState(null); 
  const [pointDrag, setPointDrag] = useState(null); 
  const [panelPos, setPanelPos] = useState({ x: 10, y: 10 });
  const [draggingPanel, setDraggingPanel] = useState(false);
  const [panelDragStart, setPanelDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleGlobalPointMove = (e) => {
      if (pointDrag && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const trueX = (e.clientX - rect.left - pan.x) / zoom;
        const trueY = (e.clientY - rect.top - pan.y) / zoom;
        const xPct = Math.max(0, Math.min(100, (trueX / rect.width) * 100));
        const yPct = Math.max(0, Math.min(100, (trueY / rect.height) * 100));

        handleItemChange(item.id, 'areas', item.areas.map(a => {
          if (a.id === pointDrag.areaId) {
            const newPts = [...a.points];
            newPts[pointDrag.pIdx] = { x: xPct, y: yPct };
            return { ...a, points: newPts };
          }
          return a;
        }));
      }
    };
    const handleGlobalPointUp = () => setPointDrag(null);

    if (pointDrag) {
      window.addEventListener('mousemove', handleGlobalPointMove);
      window.addEventListener('mouseup', handleGlobalPointUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalPointMove);
      window.removeEventListener('mouseup', handleGlobalPointUp);
    }
  }, [pointDrag, pan, zoom, item.areas, item.id]);

  useEffect(() => {
    const handleGlobalPanelMove = (e) => {
      if (draggingPanel && wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        let newX = e.clientX - rect.left - panelDragStart.x;
        let newY = e.clientY - rect.top - panelDragStart.y;
        newX = Math.max(-500, Math.min(newX, window.innerWidth));
        newY = Math.max(-200, Math.min(newY, window.innerHeight));
        setPanelPos({ x: newX, y: newY });
      }
    };
    const handleGlobalPanelUp = () => setDraggingPanel(false);

    if (draggingPanel) {
      window.addEventListener('mousemove', handleGlobalPanelMove);
      window.addEventListener('mouseup', handleGlobalPanelUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalPanelMove);
      window.removeEventListener('mouseup', handleGlobalPanelUp);
    }
  }, [draggingPanel, panelDragStart]);

  const onPanelMouseDown = (e) => {
    e.stopPropagation();
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setDraggingPanel(true);
      setPanelDragStart({ x: e.clientX - rect.left - panelPos.x, y: e.clientY - rect.top - panelPos.y });
    }
  };

  const handleAddArea = () => {
    const newAreaId = Date.now().toString() + '_a' + (item.areas.length + 1);
    const newArea = { 
      id: newAreaId, points: [], width: '', height: '', 
      lineColor: '#EF4444', lineWidth: 2, fabrics: [], layers: 2,
      labelColor: '#EF4444', labelSize: 14, wPos: 'top', hPos: 'right',
      maskType: '', maskPct: 20, maskOpacity: 87
    };
    handleItemChange(item.id, 'areas', [...item.areas, newArea]);
    setActiveAreaId(newAreaId);
    setMode('draw');
  };

  const handleRemoveArea = (areaId) => {
    handleItemChange(item.id, 'areas', item.areas.filter(a => a.id !== areaId));
    if (activeAreaId === areaId) setActiveAreaId(null);
  };

  const handleUpdateArea = (areaId, field, value) => {
    handleItemChange(item.id, 'areas', item.areas.map(a => a.id === areaId ? { ...a, [field]: value } : a));
  };

  const handleWheel = (e) => {
    if(!item.image || mode !== 'pan') return;
    e.preventDefault();
    const zoomFactor = -e.deltaY * 0.005;
    setZoom(z => Math.max(0.5, Math.min(5, z + zoomFactor)));
  };

  const handleMouseDown = (e) => { if (mode === 'pan') setIsPanning({ x: e.clientX - pan.x, y: e.clientY - pan.y }); };

  const handleMouseMove = (e) => {
    if (mode === 'pan' && isPanning) { setPan({ x: e.clientX - isPanning.x, y: e.clientY - isPanning.y }); return; }
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const trueX = (e.clientX - rect.left - pan.x) / zoom;
      const trueY = (e.clientY - rect.top - pan.y) / zoom;
      const xPct = Math.max(0, Math.min(100, (trueX / rect.width) * 100));
      const yPct = Math.max(0, Math.min(100, (trueY / rect.height) * 100));
      if (mode === 'draw' && activeAreaId && !pointDrag && !isPanning) setCursorPos({ x: xPct, y: yPct });
      else setCursorPos(null);
    }
  };

  const handleMouseUp = () => setIsPanning(false);
  const handleMouseLeave = () => { setIsPanning(false); setCursorPos(null); };

  const handleContentClick = (e) => {
    if (mode !== 'draw' || !activeAreaId || pointDrag || isPanning || draggingPanel) return;
    const rect = containerRef.current.getBoundingClientRect();
    const trueX = (e.clientX - rect.left - pan.x) / zoom;
    const trueY = (e.clientY - rect.top - pan.y) / zoom;
    const xPct = Math.max(0, Math.min(100, (trueX / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, (trueY / rect.height) * 100));

    const area = item.areas.find(a => a.id === activeAreaId);
    if (area && area.points.length > 0) {
      const lastPt = area.points[area.points.length - 1];
      if (Math.hypot(lastPt.x - xPct, lastPt.y - yPct) < 1) return; 
    }
    handleItemChange(item.id, 'areas', item.areas.map(a => a.id === activeAreaId ? { ...a, points: [...a.points, { x: xPct, y: yPct }] } : a));
  };
  
  const handleDoubleClick = (e) => {
    if (mode === 'draw') { e.stopPropagation(); setActiveAreaId(null); setCursorPos(null); }
  };

  const handlePointMouseDown = (e, areaId, pIdx) => { e.stopPropagation(); setActiveAreaId(areaId); setPointDrag({ areaId, pIdx }); };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const compressedDataUrl = await processImageFile(file, 1200, 0.8);
      if(compressedDataUrl) handleItemChange(item.id, 'image', compressedDataUrl);
    }
  };

  const activeArea = item.areas.find(a => a.id === activeAreaId);

  return (
    <div ref={wrapperRef} className="flex flex-col w-full h-full relative border-b border-gray-300 bg-white">
      <div 
        ref={containerRef}
        className={`relative w-full flex-grow overflow-hidden bg-gray-100 ${mode === 'pan' ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : (activeAreaId ? 'cursor-crosshair' : 'cursor-default')}`}
        onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave} onClick={handleContentClick} onDoubleClick={handleDoubleClick}
      >
        {item.image ? (
          <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }} className="w-full h-full relative transition-transform duration-75 ease-out">
            <img src={item.image} alt="Window view" className="w-full h-full object-cover pointer-events-none" />
            
            <label className="absolute top-2 left-2 bg-white/90 border border-gray-300 text-gray-700 px-3 py-1.5 rounded shadow-sm hover:bg-white no-print z-40 cursor-pointer flex items-center text-xs font-bold transition-colors" title="เปลี่ยนเฉพาะรูปพื้นหลัง">
              <Upload size={14} className="mr-1.5"/> เปลี่ยนรูปหน้างาน
              <input type="file" accept={ACCEPTED_IMAGE_FORMATS} className="hidden" onChange={handleImageUpload} />
            </label>

            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                {item.areas.map(area => (
                  <clipPath key={`clip-${area.id}`} id={`clip-${area.id}`}>
                    <polygon points={area.points.map(p => `${p.x},${p.y}`).join(' ')} />
                  </clipPath>
                ))}
              </defs>

              {item.areas.map(area => {
                if(area.points.length < 3) return null;
                const minX = Math.min(...area.points.map(p=>p.x));
                const maxX = Math.max(...area.points.map(p=>p.x));
                const minY = Math.min(...area.points.map(p=>p.y));
                const maxY = Math.max(...area.points.map(p=>p.y));
                const w = maxX - minX;
                const h = maxY - minY;
                
                const styleMain1 = item.styleMain1 || item.styleMain || '';
                const autoMaskType = styleMain1.match(/ม้วน|พับ|มู่ลี่/) ? 'height' : 'width';
                const maskType = area.maskType || autoMaskType;
                const mPct = (area.maskPct || 20) / 100;
                const maskOpacity = (area.maskOpacity ?? 87) / 100;
                
                const action = item.styleAction1 || item.styleAction || '';
                const masks = appDB.masks?.[styleMain1] || {};
                const maskImgFallback = masks[action] || masks['ALL'] || Object.values(masks)[0];
                let maskElements = [];
                
                if (maskImgFallback) {
                  if (maskType === 'height') {
                    let topAngle = 0;
                    if (area.points.length >= 2) {
                      let topPts = [...area.points].sort((a,b)=>a.y - b.y).slice(0,2).sort((a,b)=>a.x - b.x);
                      if (topPts.length === 2 && topPts[1].x !== topPts[0].x) {
                        topAngle = Math.atan2(topPts[1].y - topPts[0].y, topPts[1].x - topPts[0].x) * (180/Math.PI);
                      }
                    }
                    maskElements.push(
                      <image 
                        key="T" href={maskImgFallback} 
                        x={minX - w*0.1} y={minY - h*0.1} 
                        width={w * 1.2} height={(h * mPct) + (h * 0.1)} 
                        preserveAspectRatio="none" 
                        clipPath={`url(#clip-${area.id})`} 
                        opacity={maskOpacity}
                        transform={`rotate(${topAngle} ${minX + w/2} ${minY})`}
                      />
                    );
                  } else {
                    if (action.includes('แยกกลาง')) {
                      const leftImg = masks['รวบซ้าย'] || maskImgFallback;
                      const rightImg = masks['รวบขวา'] || maskImgFallback;
                      maskElements.push(<image key="L" href={leftImg} x={minX} y={minY} width={w * mPct} height={h} preserveAspectRatio="none" clipPath={`url(#clip-${area.id})`} opacity={maskOpacity} />);
                      maskElements.push(<image key="R" href={rightImg} x={maxX - (w * mPct)} y={minY} width={w * mPct} height={h} preserveAspectRatio="none" clipPath={`url(#clip-${area.id})`} opacity={maskOpacity} />);
                    } else if (action.includes('ขวา')) {
                      const rightImg = masks['รวบขวา'] || masks[action] || maskImgFallback;
                      maskElements.push(<image key="R" href={rightImg} x={maxX - (w * mPct)} y={minY} width={w * mPct} height={h} preserveAspectRatio="none" clipPath={`url(#clip-${area.id})`} opacity={maskOpacity} />);
                    } else {
                      const leftImg = masks['รวบซ้าย'] || masks[action] || maskImgFallback;
                      maskElements.push(<image key="L" href={leftImg} x={minX} y={minY} width={w * mPct} height={h} preserveAspectRatio="none" clipPath={`url(#clip-${area.id})`} opacity={maskOpacity} />);
                    }
                  }
                }

                return (
                  <g key={`fill-group-${area.id}`}>
                    <polygon points={area.points.map(p => `${p.x},${p.y}`).join(' ')} fill={area.lineColor} fillOpacity={0.15} stroke="none" />
                    {maskElements}
                  </g>
                );
              })}
              {mode === 'draw' && activeAreaId && !pointDrag && cursorPos && activeArea && activeArea.points.length > 1 && (
                <polygon points={[...activeArea.points, cursorPos].map(p => `${p.x},${p.y}`).join(' ')} fill={activeArea.lineColor} fillOpacity={0.1} stroke="none" />
              )}
            </svg>

            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {item.areas.map(area => {
                const isActive = activeAreaId === area.id;
                return (
                  <g key={area.id}>
                    {area.points.map((p, idx) => {
                      const isLast = idx === area.points.length - 1;
                      const nextP = isLast ? area.points[0] : area.points[idx + 1];
                      if (mode === 'draw' && isActive && isLast && !pointDrag) return null;
                      if (area.points.length < 2) return null;
                      return (
                        <line key={`line-${idx}`} x1={`${p.x}%`} y1={`${p.y}%`} x2={`${nextP.x}%`} y2={`${nextP.y}%`} stroke={area.lineColor} strokeWidth={area.lineWidth / zoom} strokeDasharray={isActive && !pointDrag ? "4 4" : "0"} className={isActive && !pointDrag ? "animate-pulse" : ""} style={{ pointerEvents: 'none' }} />
                      );
                    })}
                    {area.points.map((p, idx) => (
                      <g key={idx} className="cursor-move" style={{ pointerEvents: 'auto' }} onMouseDown={(e) => handlePointMouseDown(e, area.id, idx)}>
                        <circle cx={`${p.x}%`} cy={`${p.y}%`} r={4/zoom} fill="white" stroke={area.lineColor} strokeWidth={2/zoom} />
                      </g>
                    ))}
                  </g>
                );
              })}
              {mode === 'draw' && activeAreaId && !pointDrag && cursorPos && activeArea && activeArea.points.length > 0 && (
                <g style={{ pointerEvents: 'none' }}>
                  <line x1={`${activeArea.points[activeArea.points.length - 1].x}%`} y1={`${activeArea.points[activeArea.points.length - 1].y}%`} x2={`${cursorPos.x}%`} y2={`${cursorPos.y}%`} stroke={activeArea.lineColor} strokeWidth={2/zoom} strokeDasharray="4 4" />
                  <line x1={`${cursorPos.x}%`} y1={`${cursorPos.y}%`} x2={`${activeArea.points[0].x}%`} y2={`${activeArea.points[0].y}%`} stroke={activeArea.lineColor} strokeWidth={2/zoom} strokeDasharray="4 4" opacity="0.5" />
                </g>
              )}
            </svg>

            {item.areas.map(area => {
              if(area.points.length === 0) return null;
              
              let wMidX = 50, wMidY = 0, wAng = 0;
              let hMidX = 0, hMidY = 50, hAng = -90;

              if (area.points.length >= 2) {
                let edges = [];
                for(let i=0; i<area.points.length; i++) {
                  let p1 = area.points[i];
                  let p2 = area.points[(i+1)%area.points.length];
                  edges.push({ p1, p2, midX: (p1.x+p2.x)/2, midY: (p1.y+p2.y)/2, dx: p2.x - p1.x, dy: p2.y - p1.y });
                }
                
                let tEdge = edges.reduce((prev, curr) => prev.midY < curr.midY ? prev : curr);
                let bEdge = edges.reduce((prev, curr) => prev.midY > curr.midY ? prev : curr);
                let lEdge = edges.reduce((prev, curr) => prev.midX < curr.midX ? prev : curr);
                let rEdge = edges.reduce((prev, curr) => prev.midX > curr.midX ? prev : curr);

                const getVisualAngle = (edge, defaultAng) => {
                  if (!containerRef.current) return defaultAng;
                  const rect = containerRef.current.getBoundingClientRect();
                  const pxDx = edge.dx * (rect.width / 100);
                  const pxDy = edge.dy * (rect.height / 100);
                  if (pxDx === 0 && pxDy === 0) return defaultAng;
                  let ang = Math.atan2(pxDy, pxDx) * (180 / Math.PI);
                  if (ang > 90 || ang < -90) ang += 180;
                  return ang;
                };

                const wPos = area.wPos || 'top';
                const hPos = area.hPos || 'right';

                if (wPos === 'top') { wMidX = tEdge.midX; wMidY = tEdge.midY; wAng = getVisualAngle(tEdge, 0); }
                else { wMidX = bEdge.midX; wMidY = bEdge.midY; wAng = getVisualAngle(bEdge, 0); }

                if (hPos === 'left') { hMidX = lEdge.midX; hMidY = lEdge.midY; hAng = getVisualAngle(lEdge, -90); }
                else { hMidX = rEdge.midX; hMidY = rEdge.midY; hAng = getVisualAngle(rEdge, 90); }
              }

              const lblSize = (area.labelSize || 14) / zoom;
              
              return (
                <div key={`labels-${area.id}`} className="absolute inset-0 pointer-events-none">
                  {area.width && (
                    <div style={{ position: 'absolute', left: `${wMidX}%`, top: `${wMidY}%`, transform: `translate(-50%, -50%) rotate(${wAng}deg)`, color: area.labelColor || area.lineColor, fontSize: `${lblSize}px`, whiteSpace: 'nowrap' }} className="bg-white/95 px-2 py-0.5 rounded shadow-md border border-gray-300 font-bold z-10 text-center">
                      {area.width} ซม.
                    </div>
                  )}
                  {area.height && (
                    <div style={{ position: 'absolute', left: `${hMidX}%`, top: `${hMidY}%`, transform: `translate(-50%, -50%) rotate(${hAng}deg)`, color: area.labelColor || area.lineColor, fontSize: `${lblSize}px`, whiteSpace: 'nowrap' }} className="bg-white/95 px-2 py-0.5 rounded shadow-md border border-gray-300 font-bold z-10 text-center">
                      {area.height} ซม.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-100 bg-gray-50 no-print">
            <label className="cursor-pointer bg-white text-blue-600 border border-blue-600 px-6 py-3 rounded-lg shadow-sm flex items-center hover:bg-blue-50 transition-colors font-bold">
              <Upload size={20} className="mr-2" /> อัปโหลดรูปหน้างาน
              <input type="file" accept={ACCEPTED_IMAGE_FORMATS} className="hidden" onChange={handleImageUpload} />
            </label>
          </div>
        )}
      </div>

      {item.image && showControls && (
        <div 
          style={{ position: 'fixed', left: panelPos.x, top: panelPos.y, width: '340px' }}
          className="z-[99999] bg-white/95 backdrop-blur-sm border border-gray-300 rounded shadow-2xl flex flex-col no-print cursor-default transition-shadow"
          onMouseDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}
        >
          <div onMouseDown={onPanelMouseDown} className="bg-gray-800 text-white px-3 py-2 flex justify-between items-center cursor-move rounded-t">
            <span className="font-bold text-xs flex items-center"><Move size={14} className="mr-1"/> เครื่องมือพื้นที่ (ลากอิสระ)</span>
            <button onClick={() => setShowControls(false)} className="hover:text-red-400 text-gray-300"><X size={16}/></button>
          </div>
          
          <div className="flex gap-1 p-2 bg-gray-100 border-b">
            <button onClick={() => setMode('pan')} className={`flex-1 flex justify-center items-center px-2 py-1.5 rounded text-xs font-bold transition-colors ${mode === 'pan' ? 'bg-indigo-600 text-white shadow' : 'bg-white border text-gray-700 hover:bg-gray-50'}`}><Move size={14} className="mr-1"/> เลื่อน/ซูม</button>
            <button onClick={() => setMode('draw')} className={`flex-1 flex justify-center items-center px-2 py-1.5 rounded text-xs font-bold transition-colors ${mode === 'draw' ? 'bg-red-500 text-white shadow' : 'bg-white border text-gray-700 hover:bg-gray-50'}`}><MousePointerClick size={14} className="mr-1"/> วาดพื้นที่</button>
          </div>

          <div className="p-2 text-sm flex flex-col gap-2 max-h-[350px] overflow-y-auto">
            <div className="flex justify-between items-center">
               <button onClick={()=>{handleAddArea();}} className="bg-green-600 text-white px-3 py-1.5 rounded shadow-sm font-bold flex items-center text-xs hover:bg-green-700"><Plus size={14} className="mr-1"/> เพิ่มพื้นที่ม่าน</button>
               {mode === 'draw' && activeAreaId && <span className="text-red-500 font-bold bg-red-50 px-2 py-1.5 rounded border border-red-200 text-[10px] animate-pulse">ดับเบิลคลิก เพื่อจบเส้น</span>}
            </div>

            {item.areas.map((area, idx) => {
              const isActive = activeAreaId === area.id;
              const styleMain1 = item.styleMain1 || item.styleMain || '';
              const autoMaskType = styleMain1.match(/ม้วน|พับ|มู่ลี่/) ? 'height' : 'width';
              return (
                <div key={area.id} className={`flex flex-col gap-2 border p-2.5 rounded bg-white transition-all ${isActive ? 'border-blue-400 ring-2 ring-blue-100 shadow-md' : 'border-gray-200'}`}>
                  <div className="flex flex-wrap gap-1 items-center justify-between">
                    <button onClick={() => { setActiveAreaId(isActive ? null : area.id); setMode('draw'); }} className={`px-2 py-1 rounded border font-bold flex items-center text-xs ${isActive ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'}`}>บานที่ {idx + 1}</button>
                    <div className="flex items-center gap-1.5 ml-auto">
                       <button onClick={() => handleUpdateArea(area.id, 'points', [])} className="text-xs text-orange-600 hover:bg-orange-50 px-2 py-1 rounded border border-orange-200 font-bold">ล้างเส้น</button>
                       <button onClick={() => handleRemoveArea(area.id)} className="bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 px-2 py-1 rounded border border-red-200" title="ลบพื้นที่"><Trash2 size={14}/></button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 justify-between w-full mt-1">
                    <div className="flex items-center border px-2 py-1 rounded bg-gray-50 flex-1">
                      <span className="text-gray-500 text-xs font-bold whitespace-nowrap mr-1">กว้าง:</span>
                      <input type="text" placeholder="ซม." value={area.width} onChange={(e)=>handleUpdateArea(area.id, 'width', e.target.value)} className="w-10 bg-transparent outline-none border-b border-gray-300 focus:border-blue-500 text-center text-blue-700 font-bold text-xs"/>
                      <select value={area.wPos || 'top'} onChange={(e)=>handleUpdateArea(area.id, 'wPos', e.target.value)} className="text-[10px] bg-transparent outline-none cursor-pointer ml-auto"><option value="top">บน</option><option value="bottom">ล่าง</option></select>
                    </div>
                    <div className="flex items-center border px-2 py-1 rounded bg-gray-50 flex-1">
                      <span className="text-gray-500 text-xs font-bold whitespace-nowrap mr-1">สูง:</span>
                      <input type="text" placeholder="ซม." value={area.height} onChange={(e)=>handleUpdateArea(area.id, 'height', e.target.value)} className="w-10 bg-transparent outline-none border-b border-gray-300 focus:border-blue-500 text-center text-blue-700 font-bold text-xs"/>
                      <select value={area.hPos || 'right'} onChange={(e)=>handleUpdateArea(area.id, 'hPos', e.target.value)} className="text-[10px] bg-transparent outline-none cursor-pointer ml-auto"><option value="left">ซ้าย</option><option value="right">ขวา</option></select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 border-t pt-2 mt-1 bg-blue-50/30 p-2 rounded">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-indigo-800">รูปแบบ Mask:</span>
                      <select value={area.maskType || autoMaskType} onChange={(e)=>handleUpdateArea(area.id, 'maskType', e.target.value)} className="border border-indigo-200 rounded bg-white px-2 py-1 outline-none text-indigo-700 font-bold text-[11px]">
                        <option value="width">เปิดข้าง (จีบ/ลอน)</option>
                        <option value="height">ดึงลง (ม้วน/พับ/มู่ลี่)</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1">
                      <label className="flex items-center gap-1">
                        <span className="font-bold text-gray-600">% แสดงผล:</span>
                        <select value={area.maskPct || 20} onChange={(e)=>handleUpdateArea(area.id, 'maskPct', parseInt(e.target.value))} className="border rounded bg-white px-1 py-0.5 outline-none text-blue-700 font-bold">
                          {[10, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100].map(sz => <option key={sz} value={sz}>{sz}%</option>)}
                        </select>
                      </label>
                      <label className="flex items-center gap-1">
                        <span className="font-bold text-gray-600">ความทึบ:</span>
                        <select value={area.maskOpacity ?? 87} onChange={(e)=>handleUpdateArea(area.id, 'maskOpacity', parseInt(e.target.value))} className="border rounded bg-white px-1 py-0.5 outline-none text-blue-700 font-bold">
                          {[10, 20, 30, 40, 50, 60, 70, 80, 87, 90, 100].map(sz => <option key={sz} value={sz}>{sz}%</option>)}
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center text-xs border-t pt-2 mt-1 justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-gray-700">สี:</span>
                      {PRESET_COLORS.map(c => (
                        <button key={c} onClick={(e) => { e.stopPropagation(); handleUpdateArea(area.id, 'lineColor', c); handleUpdateArea(area.id, 'labelColor', c); }} className={`w-4 h-4 rounded-full border ${area.lineColor === c ? 'ring-2 ring-offset-1 ring-blue-500 border-transparent' : 'border-gray-300'}`} style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <label className="flex items-center">
                      <span className="font-bold mr-1 text-gray-700">อักษร:</span>
                      <select value={area.labelSize || 14} onChange={(e)=>handleUpdateArea(area.id, 'labelSize', parseInt(e.target.value))} className="border rounded bg-white px-1 py-0.5 outline-none font-bold text-blue-700">
                        {[10, 12, 14, 16, 18, 20, 24, 28, 32].map(sz => <option key={sz} value={sz}>{sz}px</option>)}
                      </select>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {item.image && !showControls && (
        <button onClick={(e) => { e.stopPropagation(); setShowControls(true); }} className="absolute top-2 right-2 bg-white/90 border border-gray-300 text-gray-700 p-2 rounded shadow-sm hover:bg-white no-print z-40 flex items-center text-xs font-bold">
          <Eye size={14} className="mr-2"/> เปิดแผงเครื่องมือพื้นที่
        </button>
      )}
    </div>
  );
};

// --- Main App Component ---
const App = () => {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [appUser, setAppUser] = useState(null); 
  const [view, setView] = useState('dashboard'); 
  const [projectsList, setProjectsList] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [appDB, setAppDB] = useState(DEFAULT_DB);
  const [showDBSettings, setShowDBSettings] = useState(false);
  const [showUserMgmt, setShowUserMgmt] = useState(false);
  const [showCustomFabricModal, setShowCustomFabricModal] = useState(false);

  const [generalInfo, setGeneralInfo] = useState({
    surveyDate: new Date().toISOString().split('T')[0], confirmDate: '', installDates: [], location: '',
    customerName: '', customerPhone: '', agentName: '', agentPhone: '', customFabrics: [],
    terms: `กรณีมีการเปลี่ยนแปลงรายละเอียดจากที่ตกลงไว้ในใบสรุปงานติดตั้งผ้าม่านนี้ ผู้สั่งซื้อยินยอมที่จะชำระเงินเพิ่มในส่วนของ\n(A) ค่าแก้ไขผ้าม่านและอุปกรณ์ เช่น ความสูง ความกว้างของผ้าม่าน รางม่าน ที่เกิดจากหน้างานเปลี่ยนแปลง บิ้วท์อินเพิ่มเติม ฯลฯ\n(B) ค่าติดตั้งรางละ 200 บาท\n(C) ค่าเดินทาง 1,500 บาท ใน กทม. (ต่างจังหวัดคิดตามระยะทาง)\nการเลื่อนคิวงานติตตั้ง ขอความกรุณาลูกค้าแจ้งพนักงานขายก่อนวันติดตั้ง อย่างน้อย 5 วันทำการ ถ้าน้อยกว่า 5 วัน จะมีค่าดำเนินการ 3,000 บาท / ครั้ง\nบริษัทฯ จะรับผิดชอบดำเนินการแก้ไขงาน ในกรณีที่ความผิดพลาดเกิดจากบริษัทฯ เท่านั้น`
  });
  const [tempInstallDate, setTempInstallDate] = useState('');
  const [items, setItems] = useState([]);

  useEffect(() => {
    const storedUser = localStorage.getItem('curtainAppUser');
    if (storedUser) setAppUser(JSON.parse(storedUser));

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try { await signInWithCustomToken(auth, __initial_auth_token); } 
          catch (tokenError) { await signInAnonymously(auth); }
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error("Auth Error:", err); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setFirebaseUser);
    return () => unsubscribe();
  }, []);

  const loadProjectsList = async () => {
    if (!firebaseUser || !appUser) return;
    try {
      const querySnapshot = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'projects'));
      let allProjects = [];
      querySnapshot.forEach((doc) => allProjects.push({ id: doc.id, ...doc.data() }));
      
      if (appUser.role !== 'admin') allProjects = allProjects.filter(p => p.owner === appUser.username);
      allProjects.sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      setProjectsList(allProjects);
    } catch(e) { console.error("Load Projects Error:", e); }
  };

  useEffect(() => {
    if (firebaseUser && appUser && view === 'dashboard') loadProjectsList();
  }, [firebaseUser, appUser, view]);

  // Real-time DB Sync Fix
  useEffect(() => {
    if (!firebaseUser || !appUser) return;
    const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'appDB');
    const unsub = onSnapshot(settingsRef, (snap) => {
      if (snap.exists()) {
        setAppDB(snap.data());
        localStorage.setItem('backupAppDB', JSON.stringify(snap.data()));
      } else {
        const localBackup = localStorage.getItem('backupAppDB');
        if(localBackup) setAppDB(JSON.parse(localBackup));
      }
    }, (err) => {
      const localBackup = localStorage.getItem('backupAppDB');
      if(localBackup) setAppDB(JSON.parse(localBackup));
    });
    return () => unsub();
  }, [firebaseUser, appUser]);

  const handleLogout = () => {
    localStorage.removeItem('curtainAppUser');
    setAppUser(null);
  };

  if (!appUser) return <LoginScreen onLogin={(user) => setAppUser(user)} />;

  const handleCreateNew = () => {
    setCurrentProjectId(Date.now().toString());
    setGeneralInfo({
      surveyDate: new Date().toISOString().split('T')[0], confirmDate: '', installDates: [], location: '',
      customerName: '', customerPhone: '', agentName: '', agentPhone: '', customFabrics: [],
      terms: `กรณีมีการเปลี่ยนแปลงรายละเอียดจากที่ตกลงไว้ในใบสรุปงานติดตั้งผ้าม่านนี้ ผู้สั่งซื้อยินยอมที่จะชำระเงินเพิ่มในส่วนของ\n(A) ค่าแก้ไขผ้าม่านและอุปกรณ์ เช่น ความสูง ความกว้างของผ้าม่าน รางม่าน ที่เกิดจากหน้างานเปลี่ยนแปลง บิ้วท์อินเพิ่มเติม ฯลฯ\n(B) ค่าติดตั้งรางละ 200 บาท\n(C) ค่าเดินทาง 1,500 บาท ใน กทม. (ต่างจังหวัดคิดตามระยะทาง)\nการเลื่อนคิวงานติตตั้ง ขอความกรุณาลูกค้าแจ้งพนักงานขายก่อนวันติดตั้ง อย่างน้อย 5 วันทำการ ถ้าน้อยกว่า 5 วัน จะมีค่าดำเนินการ 3,000 บาท / ครั้ง\nบริษัทฯ จะรับผิดชอบดำเนินการแก้ไขงาน ในกรณีที่ความผิดพลาดเกิดจากบริษัทฯ เท่านั้น`
    });
    setItems([]);
    addItem();
    setView('editor');
  };

  const handleEdit = (proj) => {
    setCurrentProjectId(proj.id);
    setGeneralInfo({ ...proj.generalInfo, customFabrics: proj.generalInfo?.customFabrics || [] });
    // Migrate older items to support layers if needed
    const migratedItems = (proj.items || []).map(item => ({
      ...item,
      layers: item.layers || 2,
      styleMain1: item.styleMain1 || item.styleMain || '',
      styleAction1: item.styleAction1 || item.styleAction || ''
    }));
    setItems(migratedItems);
    if (migratedItems.length === 0) addItem();
    setView('editor');
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if(window.confirm('คุณต้องการลบใบงานนี้ใช่หรือไม่?')) {
      try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projects', id)); loadProjectsList(); } 
      catch(err) { console.error(err); }
    }
  };

  const saveData = async () => {
    if (!firebaseUser) return;
    setSaving(true); setSaveStatus('กำลังบันทึก...');
    try {
      const pId = currentProjectId || Date.now().toString();
      const projData = { 
        generalInfo, items, updatedAt: new Date().toISOString(),
        owner: appUser.role === 'admin' && projectsList.find(p=>p.id === pId)?.owner ? projectsList.find(p=>p.id === pId).owner : appUser.username 
      };
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projects', pId), projData);
      setCurrentProjectId(pId);
      setSaveStatus('บันทึกสำเร็จ!'); setTimeout(() => setSaveStatus(''), 3000);
    } catch (err) { setSaveStatus('เกิดข้อผิดพลาด'); }
    setSaving(false);
  };

  const printDocument = () => { window.print(); };

  const handleSharePDF = () => {
    const originalTitle = document.title;
    document.title = `ใบสรุปงานติดตั้งผ้าม่าน คุณ ${generalInfo.customerName || 'ลูกค้า'}`;
    window.print();
    setTimeout(() => { document.title = originalTitle; }, 2000);
  };

  const handleGeneralChange = (e) => setGeneralInfo(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const addInstallDate = () => { if (tempInstallDate && !generalInfo.installDates.includes(tempInstallDate)) { setGeneralInfo(prev => ({ ...prev, installDates: [...prev.installDates, tempInstallDate] })); setTempInstallDate(''); } };
  const removeInstallDate = (date) => setGeneralInfo(prev => ({ ...prev, installDates: prev.installDates.filter(d => d !== date) }));

  const addItem = () => {
    setItems(prev => [...prev, {
      id: Date.now().toString(), image: null, layers: 2,
      areas: [{ id: Date.now().toString() + '_a1', points: [], width: '', height: '', lineColor: '#EF4444', lineWidth: 2, fabrics: [], labelColor: '#EF4444', labelSize: 14, wPos: 'top', hPos: 'right', maskPct: 20, maskOpacity: 87, maskType: '' }],
      roomPos: '', styleMain1: '', styleAction1: '', styleMain2: '', styleAction2: '', tracks: [], bracket: '', accessories: [], hangStyle: '',
      marginLeft: '', customMarginLeft: '', marginRight: '', customMarginRight: '', marginTop: '', customMarginTop: '', marginBottom: '', customMarginBottom: '', note: ''
    }]);
  };
  
  const removeItem = (id) => setItems(prev => prev.filter(item => item.id !== id));
  
  // Safe functional state update to handle synchronous rapid changes (like layers toggle)
  const handleItemChange = (id, field, value) => {
    setItems(prevItems => prevItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleLayerChange = (id, newLayerVal) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id === id) {
        if (newLayerVal === 1) return { ...item, layers: 1, styleMain2: '', styleAction2: '' };
        return { ...item, layers: 2 };
      }
      return item;
    }));
  };

  const addFabricToArea = (itemId, areaId) => {
    setItems(prevItems => prevItems.map(item => item.id === itemId ? {
      ...item,
      areas: item.areas.map(a => a.id === areaId ? {
        ...a, fabrics: [...a.fabrics, { id: Date.now().toString(), mainType: '', subType: '', name: '', color: '' }]
      } : a)
    } : item));
  };
  
  const updateFabric = (itemId, areaId, fabricId, field, value) => {
    setItems(prevItems => prevItems.map(item => item.id === itemId ? {
      ...item,
      areas: item.areas.map(a => a.id === areaId ? {
        ...a, fabrics: a.fabrics.map(f => f.id === fabricId ? { 
          ...f, [field]: value, 
          ...(field === 'mainType' ? {subType:'',name:'',color:''} : {}), 
          ...(field === 'subType' ? {name:'',color:''} : {}), 
          ...(field === 'name' ? {color:''} : {}) 
        } : f)
      } : a)
    } : item));
  };
  
  const removeFabric = (itemId, areaId, fabricId) => {
    setItems(prevItems => prevItems.map(item => item.id === itemId ? {
      ...item,
      areas: item.areas.map(a => a.id === areaId ? {
        ...a, fabrics: a.fabrics.filter(f => f.id !== fabricId)
      } : a)
    } : item));
  };

  const handleMultiSelect = (itemId, field, value) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id === itemId) {
        const currentList = item[field] || [];
        return { ...item, [field]: currentList.includes(value) ? currentList.filter(v => v !== value) : [...currentList, value] };
      }
      return item;
    }));
  };

  if (view === 'dashboard') {
    return (
      <div className="min-h-screen bg-gray-100 p-8 font-sans">
        <UserManagementModal show={showUserMgmt} onClose={()=>setShowUserMgmt(false)} />
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm mb-6 border-b-4 border-blue-600">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Confirmation Form</h1>
              <p className="text-sm text-gray-500">ระบบจัดการใบงานผ้าม่าน - สวัสดีคุณ <span className="font-bold text-blue-600">{appUser.name || appUser.username}</span> {appUser.role === 'admin' && '(Admin)'}</p>
            </div>
            <div className="flex gap-3">
              {appUser.role === 'admin' && <button onClick={()=>setShowUserMgmt(true)} className="bg-purple-600 text-white px-4 py-2 rounded flex items-center font-bold hover:bg-purple-700 shadow"><Users size={16} className="mr-2"/> จัดการพนักงาน</button>}
              <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded flex items-center font-bold hover:bg-red-600 shadow"><LogOut size={16} className="mr-2"/> ออกจากระบบ</button>
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
             <h2 className="text-xl font-bold text-gray-700">รายการใบงานทั้งหมด ({projectsList.length})</h2>
             <button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center font-bold shadow-md"><Plus size={18} className="mr-2"/> สร้างใบงานใหม่</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {projectsList.map(proj => (
               <div key={proj.id} onClick={()=>handleEdit(proj)} className="bg-white p-4 rounded-lg shadow hover:shadow-lg cursor-pointer border border-gray-200 transition-all group relative">
                 <div className="flex justify-between items-start mb-2">
                   <div className="flex items-center gap-3">
                     <div className="bg-blue-100 p-3 rounded-full text-blue-600"><FileText size={24}/></div>
                     <div>
                       <h3 className="font-bold text-gray-800 break-words w-48 text-base">{proj.generalInfo?.customerName || 'ไม่มีชื่อลูกค้า'}</h3>
                       <p className="text-xs text-gray-500 mt-1">{proj.generalInfo?.location || 'ไม่มีข้อมูลสถานที่'}</p>
                     </div>
                   </div>
                   <button onClick={(e)=>handleDelete(proj.id, e)} className="text-red-400 hover:text-red-600 p-1.5 bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                 </div>
                 <div className="text-xs text-gray-500 mt-4 border-t pt-3 flex justify-between">
                   <span>ผู้ทำ: <span className="font-bold text-gray-700">{proj.owner}</span></span>
                   <span>อัปเดต: {new Date(proj.updatedAt).toLocaleDateString('th-TH')}</span>
                 </div>
               </div>
             ))}
             {projectsList.length === 0 && <div className="col-span-full text-center p-10 bg-white rounded-lg border-2 border-dashed text-gray-400 font-bold">ยังไม่มีใบงานในระบบ</div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 font-sans print:p-0">
      <DatabaseModal appDB={appDB} setAppDB={setAppDB} showDBSettings={showDBSettings} setShowDBSettings={setShowDBSettings} saveData={saveData} />
      <CustomFabricModal show={showCustomFabricModal} onClose={()=>setShowCustomFabricModal(false)} onAdd={(fab)=>setGeneralInfo(prev=>({...prev, customFabrics: [...(prev.customFabrics||[]), fab]}))} />

      <style>{`
        @media print {
          @page { size: landscape A4; margin: 10mm; }
          body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; display: block; }
          .no-print { display: none !important; }
          .print-hidden { display: none !important; }
          .print-block { display: block !important; }
          .print-flex { display: flex !important; }
          
          .avoid-break { page-break-inside: avoid !important; }
          
          /* Force centering per page */
          .print-center-page {
            height: 100vh;
            width: 100%;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            box-sizing: border-box;
          }
          
          .print-content-wrapper {
            width: 100% !important;
            max-width: 277mm !important; /* Width of A4 (297mm) minus margins */
          }
          
          .print-transform-none { transform: none !important; }
          
          /* Utility wrappers for text */
          .whitespace-pre-wrap { white-space: pre-wrap !important; word-break: break-word !important; }
          
          /* Hide inputs and show divs */
          select { display: none !important; }
        }
      `}</style>

      <div className="max-w-[1200px] mx-auto bg-white shadow-lg p-6 md:p-8 rounded-sm relative z-0 print:shadow-none print:p-0 print:bg-transparent w-full print:max-w-none">
        
        {/* --- Page 1: General Info --- */}
        <div className="print-center-page w-full">
          <div className="print-content-wrapper w-full">
            <div className="text-center mb-6 border-b-2 border-gray-800 pb-3 flex justify-between items-center avoid-break relative">
              <button onClick={()=>{saveData(); setView('dashboard');}} className="absolute -left-16 md:-left-20 top-1/2 transform -translate-y-1/2 no-print bg-gray-200 hover:bg-gray-300 text-gray-700 p-2 rounded-full shadow-md transition-colors"><ArrowLeft size={24}/></button>
              <div className="w-1/3 text-left no-print flex gap-2">
                <button onClick={saveData} disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded flex items-center hover:bg-indigo-700 text-sm shadow font-bold transition-colors"><Save size={16} className="mr-2"/> {saving ? 'บันทึก...' : 'บันทึกงาน'}</button>
                {appUser.role === 'admin' && <button onClick={()=>setShowDBSettings(true)} className="bg-gray-700 text-white px-4 py-2 rounded flex items-center hover:bg-gray-800 text-sm shadow font-bold transition-colors"><Settings size={16} className="mr-2"/> ฐานข้อมูล</button>}
                {saveStatus && <span className="text-xs text-green-600 ml-2 self-center font-bold bg-green-50 px-2 py-1 rounded">{saveStatus}</span>}
              </div>
              <h1 className="text-2xl font-bold text-gray-800 w-1/3">ใบสรุปงานติดตั้งผ้าม่าน</h1>
              <div className="w-1/3 text-right"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4 avoid-break text-sm relative z-0">
              <div className="p-4 border border-gray-300 rounded-md bg-gray-50">
                <h2 className="font-bold mb-3 border-b border-gray-300 pb-1 inline-block text-base text-gray-800">ส่วนผู้จัดทำ</h2>
                <div className="space-y-2.5">
                  <div className="flex items-center"><span className="w-36 font-bold text-gray-700">วันที่วัดพื้นที่ :</span><input type="date" name="surveyDate" value={generalInfo.surveyDate} onChange={handleGeneralChange} className="flex-1 border-b border-gray-300 outline-none focus:border-blue-500 px-1 bg-transparent" /></div>
                  <div className="flex items-center"><span className="w-36 font-bold text-gray-700">วันที่คอนเฟิร์ม :</span><input type="date" name="confirmDate" value={generalInfo.confirmDate} onChange={handleGeneralChange} className="flex-1 border-b border-gray-300 outline-none focus:border-blue-500 px-1 bg-transparent" /></div>
                  <div className="flex flex-col"><span className="font-bold mb-1 text-gray-700">วันที่ติดตั้งผ้าม่าน :</span>
                    <div className="flex flex-wrap gap-1.5 items-center min-h-[28px] border-b border-gray-300 pb-1">
                      {generalInfo.installDates.length > 0 ? generalInfo.installDates.map((d, i) => (<span key={i} className="bg-white px-2 py-0.5 rounded border shadow-sm flex items-center font-bold text-blue-800 print:text-black">{d} <span className="mx-1 print-hidden no-print font-normal text-gray-400">/</span><X size={12} className="ml-1 cursor-pointer text-red-500 no-print hover:bg-red-100 rounded-full" onClick={() => removeInstallDate(d)}/></span>)) : <span className="text-gray-400 italic no-print text-xs">ยังไม่ได้ระบุ</span>}
                      <div className="flex items-center ml-auto no-print"><input type="date" value={tempInstallDate} onChange={(e)=>setTempInstallDate(e.target.value)} className="border rounded px-2 py-1 text-xs outline-none focus:border-blue-500"/><button onClick={addInstallDate} className="bg-blue-100 text-blue-700 p-1.5 rounded ml-1 hover:bg-blue-200 transition-colors"><Plus size={14}/></button></div>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-700">สถานที่ติดตั้ง :</span>
                    <textarea name="location" value={generalInfo.location} onChange={handleGeneralChange} rows="2" className="w-full border border-gray-300 rounded p-2 mt-1 outline-none focus:border-blue-500 print-hidden resize-none bg-white text-sm font-medium"></textarea>
                    <div className="hidden print-block w-full mt-1 text-[15px] font-bold whitespace-pre-wrap text-black border-b border-gray-300 pb-1">{generalInfo.location || '-'}</div>
                  </div>
                </div>
                <div className="mt-6 text-center"><p className="border-b border-gray-400 w-48 mx-auto mb-1"></p><p className="text-gray-600 text-sm font-bold">ผู้จัดทำ</p></div>
              </div>
              <div className="p-4 border border-gray-300 rounded-md bg-blue-50/30">
                <h2 className="font-bold mb-3 border-b border-gray-300 pb-1 inline-block text-base text-gray-800">ส่วนลูกค้า</h2>
                <div className="space-y-2.5">
                  <div className="flex items-center"><span className="w-32 font-bold text-gray-700">ชื่อ-นามสกุล :</span><input type="text" name="customerName" value={generalInfo.customerName} onChange={handleGeneralChange} className="flex-1 border-b border-gray-300 outline-none focus:border-blue-500 px-1 font-bold text-blue-800 text-[15px] print:text-black bg-transparent" /></div>
                  <div className="flex items-center"><span className="w-32 font-bold text-gray-700">เบอร์ติดต่อ :</span><input type="text" name="customerPhone" value={generalInfo.customerPhone} onChange={handleGeneralChange} className="flex-1 border-b border-gray-300 outline-none focus:border-blue-500 px-1 font-medium bg-transparent" /></div>
                  <div className="flex items-center mt-4"><span className="w-32 font-bold text-gray-700">ผู้ติดต่อแทน :</span><input type="text" name="agentName" value={generalInfo.agentName} onChange={handleGeneralChange} className="flex-1 border-b border-gray-300 outline-none focus:border-blue-500 px-1 font-medium bg-transparent" /></div>
                  <div className="flex items-center"><span className="w-32 font-bold text-gray-700">เบอร์ติดต่อ :</span><input type="text" name="agentPhone" value={generalInfo.agentPhone} onChange={handleGeneralChange} className="flex-1 border-b border-gray-300 outline-none focus:border-blue-500 px-1 font-medium bg-transparent" /></div>
                </div>
                <div className="mt-8 text-center"><p className="border-b border-gray-400 w-48 mx-auto mb-1"></p><p className="text-gray-600 text-sm font-bold">ผู้สั่งซื้อ</p></div>
              </div>
            </div>

            <div className="mb-6 avoid-break bg-red-50 p-3 rounded border border-red-200 relative z-0">
              <h3 className="font-bold text-red-600 print:text-gray-800 mb-2 text-sm print:text-[15px] underline">หมายเหตุเงื่อนไข :</h3>
              <textarea name="terms" value={generalInfo.terms} onChange={handleGeneralChange} rows="4" className="w-full text-xs bg-transparent outline-none print-hidden text-gray-700 leading-tight resize-none"></textarea>
              <div className="hidden print-block w-full text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap font-medium">{generalInfo.terms}</div>
            </div>
          </div>
        </div>

        <hr className="my-6 border-gray-300 no-print" />

        {/* --- Page 2+: Items Mapping --- */}
        <div className="space-y-10 print:space-y-0 w-full">
          {items.map((item, index) => {
            const sMain1 = item.styleMain1 || item.styleMain || '';
            const sMain2 = item.styleMain2 || '';
            const styleImg1 = sMain1 && appDB.styleImages?.[sMain1];
            
            const getFabImg = (fab) => {
              if(!fab) return null;
              if(fab.mainType === 'ผ้านอกระบบ (เฉพาะงานนี้)') {
                return (generalInfo.customFabrics || []).find(f => f.subType === fab.subType && f.name === fab.name && f.color === fab.color)?.image;
              }
              return appDB.curtainTypes[fab.mainType]?.[fab.subType]?.[fab.name]?.[fab.color];
            };

            let imgMain = null; let txtMain = ''; let colMain = '';
            let imgSheer = null; let txtSheer = ''; let colSheer = '';
            
            if(item.areas.length > 0) {
               const allFabs = item.areas.flatMap(a => a.fabrics);
               const fab1 = allFabs[0];
               const fab2 = allFabs[1];

               if(fab1) {
                 imgMain = getFabImg(fab1);
                 txtMain = fab1.subType || 'ม่าน 1';
                 colMain = `${fab1.name || ''} ${fab1.name && fab1.color ? '/' : ''} ${fab1.color || ''}`.trim();
               }
               if(fab2 && item.layers === 2) {
                 imgSheer = getFabImg(fab2);
                 txtSheer = fab2.subType || 'ม่าน 2';
                 colSheer = `${fab2.name || ''} ${fab2.name && fab2.color ? '/' : ''} ${fab2.color || ''}`.trim();
               }
            }

            const marginImg = item.marginBottom && item.marginBottom !== '-' ? appDB.marginImages?.[item.marginBottom] : null;

            return (
              <div key={item.id} className="print-center-page w-full relative mb-10 print:mb-0">
                <div className="print-content-wrapper w-full border-2 border-gray-800 p-1 relative rounded bg-white hover:z-50 transition-all duration-300 shadow-sm hover:shadow-md">
                  <div className="absolute top-0 left-0 bg-gray-800 text-white px-4 py-1.5 text-sm font-bold z-10 rounded-br">รายการที่ {index + 1}</div>
                  <button onClick={() => removeItem(item.id)} className="no-print absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 shadow z-20 transition-transform hover:scale-110"><Trash2 size={16} /></button>

                  <div className="border border-gray-300 flex flex-col md:flex-row h-[750px] print:h-[185mm] mt-8 md:mt-0 bg-white relative overflow-hidden w-full box-border">
                    
                    {/* Left Column 70% */}
                    <div className="w-full md:w-[70%] border-r border-gray-300 flex flex-col bg-white h-full relative z-20">
                      
                      <div className="h-[70%] w-full border-b border-gray-300 flex flex-col relative bg-gray-100 shrink-0">
                        <ImageAreaEditor item={item} appDB={appDB} handleItemChange={handleItemChange} />
                      </div>
                      
                      <div className="h-[30%] w-full p-2 bg-gray-50 flex items-center">
                        <div className="w-full h-full grid grid-cols-4 gap-3 print:gap-4">
                          
                          <div className="flex flex-col items-center bg-white border border-gray-200 p-2 rounded shadow-sm h-full justify-between overflow-hidden">
                            <span className="text-[13px] font-bold text-gray-800 w-full text-center mb-2 shrink-0">รูปแบบม่าน</span>
                            <div className="flex-1 w-full bg-gray-50 border border-gray-100 flex items-center justify-center rounded overflow-hidden p-0 relative mb-2">
                              {styleImg1 ? <img src={styleImg1} className="w-full h-full object-cover" /> : <img src={SVGS.style_default} className="max-w-[50px] max-h-[50px] opacity-50" />}
                            </div>
                            <span className="text-[11px] text-blue-800 print:text-black print:whitespace-normal print:break-words w-full text-center font-bold shrink-0">
                              {sMain1 || '-'} {item.layers === 2 ? ` / ${sMain2 || '-'}` : ''}
                            </span>
                          </div>

                          <div className="flex flex-col items-center bg-white border border-gray-200 p-2 rounded shadow-sm h-full justify-between overflow-hidden">
                            <span className="text-[13px] font-bold text-gray-800 w-full text-center mb-2 shrink-0">{txtMain || 'ชั้นที่ 1'}</span>
                            <div className="flex-1 w-full border border-gray-100 flex items-center justify-center rounded overflow-hidden bg-gray-50 p-0 mb-2">
                              {imgMain ? <img src={imgMain} className="w-full h-full object-cover" /> : <span className="text-[10px] text-gray-400">-</span>}
                            </div>
                            <span className="text-[11px] text-gray-700 w-full text-center font-bold shrink-0 print:whitespace-normal print:break-words">{colMain || '-'}</span>
                          </div>

                          <div className={`flex flex-col items-center bg-white border border-gray-200 p-2 rounded shadow-sm h-full justify-between overflow-hidden ${item.layers === 1 ? 'opacity-40 print:opacity-50' : ''}`}>
                            <span className="text-[13px] font-bold text-gray-800 w-full text-center mb-2 shrink-0">{item.layers === 2 ? (txtSheer || 'ชั้นที่ 2') : 'ชั้นที่ 2'}</span>
                            <div className="flex-1 w-full border border-gray-100 flex items-center justify-center rounded overflow-hidden bg-gray-50 p-0 mb-2">
                              {item.layers === 2 && imgSheer ? <img src={imgSheer} className="w-full h-full object-cover" /> : <span className="text-[10px] text-gray-400">-</span>}
                            </div>
                            <span className="text-[11px] text-gray-700 w-full text-center font-bold shrink-0 print:whitespace-normal print:break-words">{item.layers === 2 ? (colSheer || '-') : '-'}</span>
                          </div>

                          <div className="flex flex-col items-center bg-white border border-gray-200 p-2 rounded shadow-sm h-full justify-between overflow-hidden">
                            <span className="text-[13px] font-bold text-gray-800 w-full text-center mb-2 shrink-0">ระยะชายม่าน</span>
                            <div className="flex-1 w-full bg-gray-50 border border-gray-100 flex items-center justify-center rounded overflow-hidden p-0 mb-2">
                              {marginImg ? <img src={marginImg} className="w-full h-full object-cover" /> : <span className="text-[10px] text-gray-400">-</span>}
                            </div>
                            <span className="text-[11px] text-gray-700 w-full text-center font-bold shrink-0 print:whitespace-normal print:break-words">{item.marginBottom || '-'}</span>
                          </div>

                        </div>
                      </div>
                    </div>

                    {/* Right Column 30% */}
                    <div className="w-full md:w-[30%] text-xs flex flex-col bg-white overflow-y-auto print:overflow-hidden h-full relative z-10">
                      
                      <div className="bg-gray-800 text-white p-3 print:bg-white print:text-black print:p-3 print:pb-0 flex flex-col shrink-0">
                        <span className="mb-1 text-gray-300 print-hidden font-bold text-xs">ห้อง / ตำแหน่ง :</span>
                        <textarea value={item.roomPos} onChange={(e)=>handleItemChange(item.id, 'roomPos', e.target.value)} className="w-full bg-transparent outline-none border-b border-gray-500 focus:border-white resize-none text-sm font-bold leading-tight print-hidden placeholder-gray-400 text-yellow-300" placeholder="ระบุห้อง เช่น ชั้น 1 / โถงกลม บานที่ 1" rows="2" />
                        <div className="hidden print-block w-full text-[15px] font-bold leading-tight text-black whitespace-pre-wrap border-b border-gray-800 pb-2 mb-1">{item.roomPos || '-'}</div>
                      </div>
                      
                      <div className="p-3 print:pt-1 flex-1 flex flex-col justify-between gap-4 print:gap-2 h-full">
                        
                        <div className="border border-gray-300 p-2 rounded bg-gray-50">
                          <div className="flex justify-between items-center mb-2 border-b border-gray-300 pb-1">
                            <span className="font-bold text-gray-800 text-[14px]">รายละเอียดวัสดุ/ผ้า</span>
                            <button onClick={()=>setShowCustomFabricModal(true)} className="no-print bg-indigo-100 hover:bg-indigo-200 text-indigo-700 border border-indigo-200 px-2 py-1 rounded text-[10px] font-bold shadow-sm transition-colors flex items-center"><Plus size={12} className="mr-0.5"/> ผ้านอกระบบ</button>
                          </div>
                          {item.areas.length === 0 && <span className="text-gray-400 italic no-print text-xs">เพิ่มพื้นที่บนรูปหน้างานก่อน</span>}
                          {item.areas.map((area, aIdx) => (
                            <div key={area.id} className="mb-3 border-l-[3px] border-blue-500 print:border-gray-800 pl-2">
                              <div className="font-bold text-blue-800 print:text-black mb-1.5 flex justify-between items-center bg-blue-50 print:bg-gray-200 px-1.5 py-1 rounded text-[12px]">
                                <span>บานที่ {aIdx + 1} <span className="font-normal">(ก:{area.width||'-'} ส:{area.height||'-'})</span></span>
                                <div className="flex items-center gap-2">
                                  {area.fabrics.length < (item.layers || 2) && (
                                    <button onClick={()=>addFabricToArea(item.id, area.id)} className="text-blue-600 hover:text-blue-800 no-print flex items-center bg-white px-2 py-0.5 border border-blue-200 shadow-sm rounded text-[10px] transition-colors"><Plus size={12} className="mr-0.5"/> เพิ่มผ้า</button>
                                  )}
                                </div>
                              </div>
                              {area.fabrics.map((fab) => {
                                const isCustom = fab.mainType === 'ผ้านอกระบบ (เฉพาะงานนี้)';
                                const mainTypeOptions = [...Object.keys(appDB.curtainTypes || {}), ...(generalInfo.customFabrics?.length > 0 ? ['ผ้านอกระบบ (เฉพาะงานนี้)'] : [])];
                                
                                let subTypeOptions = [];
                                let nameOptions = [];
                                let colorOptions = [];

                                if(isCustom) {
                                  const cFabs = generalInfo.customFabrics || [];
                                  subTypeOptions = [...new Set(cFabs.map(f=>f.subType))].filter(Boolean);
                                  nameOptions = [...new Set(cFabs.filter(f=>f.subType === fab.subType).map(f=>f.name))].filter(Boolean);
                                  colorOptions = [...new Set(cFabs.filter(f=>f.subType === fab.subType && f.name === fab.name).map(f=>f.color))].filter(Boolean);
                                } else {
                                  subTypeOptions = fab.mainType ? Object.keys(appDB.curtainTypes[fab.mainType] || {}) : [];
                                  nameOptions = fab.subType ? Object.keys(appDB.curtainTypes[fab.mainType]?.[fab.subType] || {}) : [];
                                  colorOptions = fab.name ? Object.keys(appDB.curtainTypes[fab.mainType]?.[fab.subType]?.[fab.name] || {}) : [];
                                }

                                return (
                                  <div key={fab.id} className="flex flex-col gap-1.5 mb-1.5 bg-white p-1.5 border border-gray-200 rounded relative pr-5 print:pr-1 shadow-sm print:shadow-none">
                                    <button onClick={()=>removeFabric(item.id, area.id, fab.id)} className="absolute top-1 right-1 text-red-500 hover:bg-red-50 rounded no-print transition-colors"><X size={14}/></button>
                                    
                                    <div className="print-hidden flex flex-col gap-1.5">
                                      <div className="flex gap-1.5">
                                        <select value={fab.mainType} onChange={(e)=>updateFabric(item.id, area.id, fab.id, 'mainType', e.target.value)} className={`w-1/2 border-b border-gray-300 outline-none text-[11px] bg-transparent font-bold ${isCustom ? 'text-indigo-600' : 'text-gray-700'}`}>
                                          <option value="">-หมวดหมู่-</option>{mainTypeOptions.map(o=><option key={o} value={o}>{o}</option>)}
                                        </select>
                                        <select value={fab.subType} onChange={(e)=>updateFabric(item.id, area.id, fab.id, 'subType', e.target.value)} className="w-1/2 border-b border-gray-300 outline-none text-[11px] bg-transparent font-bold text-indigo-700" disabled={!fab.mainType}>
                                          <option value="">-ประเภทม่าน-</option>{subTypeOptions.map(o=><option key={o} value={o}>{o}</option>)}
                                        </select>
                                      </div>
                                      <div className="flex gap-1.5">
                                        <select value={fab.name} onChange={(e)=>updateFabric(item.id, area.id, fab.id, 'name', e.target.value)} className="w-1/2 border-b border-gray-300 outline-none text-[11px] bg-transparent font-medium" disabled={!fab.subType}>
                                          <option value="">-รุ่น/ชื่อ-</option>{nameOptions.map(o=><option key={o} value={o}>{o}</option>)}
                                        </select>
                                        <select value={fab.color} onChange={(e)=>updateFabric(item.id, area.id, fab.id, 'color', e.target.value)} className="w-1/2 border-b border-gray-300 outline-none text-[11px] bg-transparent font-medium text-gray-600" disabled={!fab.name}>
                                          <option value="">-สี-</option>{colorOptions.map(o=><option key={o} value={o}>{o}</option>)}
                                        </select>
                                      </div>
                                    </div>

                                    <div className="hidden print-flex flex-col gap-0.5 text-[12px] leading-snug">
                                      <span className="font-bold text-gray-900 whitespace-pre-wrap">{fab.mainType || '-'} {fab.subType ? `/ ${fab.subType}` : ''}</span>
                                      <span className="text-gray-800 whitespace-pre-wrap">{fab.name || '-'} {fab.color ? `/ ${fab.color}` : ''}</span>
                                    </div>

                                  </div>
                                )
                              })}
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-col gap-3 py-1 flex-1 justify-center">
                          <div className="flex flex-col"><span className="font-bold text-gray-800 text-[14px] border-b border-gray-300 pb-1 mb-1">รูปแบบการทำงาน</span>
                            <div className="flex items-center gap-4 mb-2 bg-gray-100 p-1.5 rounded print-hidden">
                              <span className="text-[11px] font-bold text-gray-600">จำนวนชั้นม่าน:</span>
                              <label className="flex items-center gap-1 text-[11px] cursor-pointer font-bold"><input type="radio" checked={item.layers === 1} onChange={()=>handleLayerChange(item.id, 1)}/> 1 ชั้น</label>
                              <label className="flex items-center gap-1 text-[11px] cursor-pointer font-bold"><input type="radio" checked={item.layers !== 1} onChange={()=>handleLayerChange(item.id, 2)}/> 2 ชั้น</label>
                            </div>
                            
                            <div className="flex gap-1.5 items-center mt-0.5 print-hidden">
                              {item.layers !== 1 && <span className="text-[10px] font-bold text-gray-500 w-10 shrink-0">ชั้นที่ 1:</span>}
                              <select value={sMain1} onChange={(e)=>handleItemChange(item.id, 'styleMain1', e.target.value)} className="w-1/2 border-b border-gray-400 outline-none bg-transparent text-blue-800 font-bold text-xs"><option value="">-รูปแบบ-</option>{(appDB.styles || []).map(s=><option key={s} value={s}>{s}</option>)}</select>
                              <span className="text-gray-400 font-bold">/</span>
                              <select value={item.styleAction1 || item.styleAction || ''} onChange={(e)=>handleItemChange(item.id, 'styleAction1', e.target.value)} className="w-1/2 border-b border-gray-400 outline-none bg-transparent text-blue-800 font-bold text-xs"><option value="">-เปิดปิด-</option>{(appDB.actions || []).map(s=><option key={s} value={s}>{s}</option>)}</select>
                            </div>
                            
                            <div className="hidden print-block text-[13px] font-bold text-gray-800 mt-1 whitespace-pre-wrap">
                              {item.layers !== 1 && <span className="text-gray-600 mr-1">ชั้นที่ 1:</span>}
                              {sMain1 || '-'} {item.styleAction1 || item.styleAction ? `/ ${item.styleAction1 || item.styleAction}` : ''}
                            </div>

                            {item.layers !== 1 && (
                              <>
                                <div className="flex gap-1.5 items-center mt-1.5 print-hidden">
                                  <span className="text-[10px] font-bold text-gray-500 w-10 shrink-0">ชั้นที่ 2:</span>
                                  <select value={sMain2} onChange={(e)=>handleItemChange(item.id, 'styleMain2', e.target.value)} className="w-1/2 border-b border-gray-400 outline-none bg-transparent text-blue-800 font-bold text-xs"><option value="">-รูปแบบ-</option>{(appDB.styles || []).map(s=><option key={s} value={s}>{s}</option>)}</select>
                                  <span className="text-gray-400 font-bold">/</span>
                                  <select value={item.styleAction2 || ''} onChange={(e)=>handleItemChange(item.id, 'styleAction2', e.target.value)} className="w-1/2 border-b border-gray-400 outline-none bg-transparent text-blue-800 font-bold text-xs"><option value="">-เปิดปิด-</option>{(appDB.actions || []).map(s=><option key={s} value={s}>{s}</option>)}</select>
                                </div>
                                <div className="hidden print-block text-[13px] font-bold text-gray-800 mt-1 whitespace-pre-wrap">
                                  <span className="text-gray-600 mr-1">ชั้นที่ 2:</span>
                                  {sMain2 || '-'} {item.styleAction2 ? `/ ${item.styleAction2}` : ''}
                                </div>
                              </>
                            )}
                          </div>

                          <div className="flex flex-col"><span className="font-bold text-gray-800 text-[14px] border-b border-gray-300 pb-1 mb-1">รางม่าน</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {item.tracks?.map(t => <span key={t} className="bg-gray-100 px-2 py-0.5 rounded border border-gray-300 text-[12px] flex items-center shadow-sm font-bold text-gray-800">{t} <X size={10} className="ml-1 cursor-pointer text-red-500 no-print" onClick={()=>handleMultiSelect(item.id, 'tracks', t)}/></span>)}
                              <select className="w-full border-b border-gray-300 outline-none no-print mt-1 text-[11px] text-gray-500 font-medium bg-transparent" onChange={(e) => {if(e.target.value) handleMultiSelect(item.id, 'tracks', e.target.value); e.target.value='';}}><option value="">+ เพิ่มชนิดรางม่าน</option>{(appDB.tracks || []).map(s=><option key={s} value={s}>{s}</option>)}</select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mt-1">
                             <div className="flex flex-col">
                               <span className="font-bold text-gray-800 text-[14px] border-b border-gray-300 pb-1 mb-1">ขาจับราง</span>
                               <select value={item.bracket} onChange={(e)=>handleItemChange(item.id, 'bracket', e.target.value)} className="border-b border-gray-300 outline-none print-hidden bg-transparent text-xs font-medium mt-0.5"><option value="">-ระบุ-</option>{(appDB.brackets || []).map(s=><option key={s} value={s}>{s}</option>)}</select>
                               <div className="hidden print-block text-[13px] font-bold mt-1 whitespace-pre-wrap text-gray-800">{item.bracket || '-'}</div>
                             </div>
                             <div className="flex flex-col">
                               <span className="font-bold text-gray-800 text-[14px] border-b border-gray-300 pb-1 mb-1">การแขวน</span>
                               <select value={item.hangStyle} onChange={(e)=>handleItemChange(item.id, 'hangStyle', e.target.value)} className="border-b border-gray-300 outline-none print-hidden bg-transparent text-xs font-medium mt-0.5"><option value="">-ระบุ-</option>{(appDB.hangStyles || []).map(s=><option key={s} value={s}>{s}</option>)}</select>
                               <div className="hidden print-block text-[13px] font-bold mt-1 whitespace-pre-wrap text-gray-800">{item.hangStyle || '-'}</div>
                             </div>
                          </div>

                          <div className="flex flex-col mt-1"><span className="font-bold text-gray-800 text-[14px] border-b border-gray-300 pb-1 mb-1">อุปกรณ์เสริม</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {item.accessories?.map(t => <span key={t} className="bg-gray-100 px-2 py-0.5 rounded border border-gray-300 text-[12px] flex items-center shadow-sm font-bold text-gray-800">{t} <X size={10} className="ml-1 cursor-pointer text-red-500 no-print" onClick={()=>handleMultiSelect(item.id, 'accessories', t)}/></span>)}
                              <select className="w-full border-b border-gray-300 outline-none no-print mt-1 text-[11px] text-gray-500 font-medium bg-transparent" onChange={(e) => {if(e.target.value) handleMultiSelect(item.id, 'accessories', e.target.value); e.target.value='';}}><option value="">+ เพิ่มอุปกรณ์เสริม</option>{(appDB.accessories || []).map(s=><option key={s} value={s}>{s}</option>)}</select>
                            </div>
                          </div>
                        </div>

                        <div className="border border-gray-300 p-2 rounded bg-gray-50">
                          <span className="font-bold text-gray-800 block mb-1.5 border-b border-gray-300 pb-1 text-[14px]">ระยะการเผื่อม่าน</span>
                          <div className="grid grid-cols-1 gap-y-2 text-[12px]">
                            <div className="flex gap-3">
                              <div className="flex flex-col w-1/2"><span className="text-gray-600 font-bold">ด้านซ้าย:</span>
                                <select value={item.marginLeft} onChange={(e)=>handleItemChange(item.id, 'marginLeft', e.target.value)} className="border-b border-gray-300 outline-none print-hidden bg-transparent font-medium"><option value="">-เลือก-</option>{(appDB.margins?.horizontal || []).map(s=><option key={s} value={s}>{s}</option>)}</select>
                                {item.marginLeft === 'ระบุเอง...' && <input type="text" value={item.customMarginLeft} onChange={(e)=>handleItemChange(item.id, 'customMarginLeft', e.target.value)} placeholder="พิมพ์ระบุ..." className="border-b border-dashed border-gray-400 bg-transparent outline-none mt-1 print-hidden text-blue-700 font-bold"/>}
                                <div className="hidden print-block font-bold text-gray-800 whitespace-pre-wrap mt-0.5">{item.marginLeft === 'ระบุเอง...' ? item.customMarginLeft : (item.marginLeft || '-')}</div>
                              </div>
                              <div className="flex flex-col w-1/2"><span className="text-gray-600 font-bold">ด้านขวา:</span>
                                <select value={item.marginRight} onChange={(e)=>handleItemChange(item.id, 'marginRight', e.target.value)} className="border-b border-gray-300 outline-none print-hidden bg-transparent font-medium"><option value="">-เลือก-</option>{(appDB.margins?.horizontal || []).map(s=><option key={s} value={s}>{s}</option>)}</select>
                                {item.marginRight === 'ระบุเอง...' && <input type="text" value={item.customMarginRight} onChange={(e)=>handleItemChange(item.id, 'customMarginRight', e.target.value)} placeholder="พิมพ์ระบุ..." className="border-b border-dashed border-gray-400 bg-transparent outline-none mt-1 print-hidden text-blue-700 font-bold"/>}
                                <div className="hidden print-block font-bold text-gray-800 whitespace-pre-wrap mt-0.5">{item.marginRight === 'ระบุเอง...' ? item.customMarginRight : (item.marginRight || '-')}</div>
                              </div>
                            </div>
                            <div className="flex gap-3 items-start mt-1">
                              <div className="flex flex-col w-1/2"><span className="text-gray-600 font-bold">ด้านบน:</span>
                                <select value={item.marginTop} onChange={(e)=>handleItemChange(item.id, 'marginTop', e.target.value)} className="border-b border-gray-300 outline-none print-hidden bg-transparent text-blue-700 font-bold"><option value="">-เลือก-</option>{(appDB.margins?.top || []).map(s=><option key={s} value={s}>{s}</option>)}</select>
                                {item.marginTop === 'ระบุเอง...' && <input type="text" value={item.customMarginTop} onChange={(e)=>handleItemChange(item.id, 'customMarginTop', e.target.value)} placeholder="พิมพ์ระบุ..." className="border-b border-dashed border-gray-400 bg-transparent outline-none mt-1 print-hidden text-blue-700 font-bold"/>}
                                <div className="hidden print-block font-bold text-gray-800 whitespace-pre-wrap mt-0.5">{item.marginTop === 'ระบุเอง...' ? item.customMarginTop : (item.marginTop || '-')}</div>
                              </div>
                              <div className="flex flex-col w-1/2"><span className="text-gray-600 font-bold">ด้านล่าง:</span>
                                <select value={item.marginBottom} onChange={(e)=>handleItemChange(item.id, 'marginBottom', e.target.value)} className="border-b border-gray-300 outline-none print-hidden bg-transparent text-blue-700 font-bold"><option value="">-เลือก-</option>{(appDB.margins?.bottom || []).map(s=><option key={s} value={s}>{s}</option>)}</select>
                                {item.marginBottom === 'ระบุเอง...' && <input type="text" value={item.customMarginBottom} onChange={(e)=>handleItemChange(item.id, 'customMarginBottom', e.target.value)} placeholder="พิมพ์ระบุ..." className="border-b border-dashed border-gray-400 bg-transparent outline-none mt-1 print-hidden text-blue-700 font-bold"/>}
                                <div className="hidden print-block font-bold text-gray-800 whitespace-pre-wrap mt-0.5">{item.marginBottom === 'ระบุเอง...' ? item.customMarginBottom : (item.marginBottom || '-')}</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col border-t border-gray-300 pt-2 shrink-0">
                          <span className="font-bold text-red-600 print:text-gray-800 text-[14px] mb-1">หมายเหตุ</span>
                          <textarea value={item.note} onChange={(e)=>handleItemChange(item.id, 'note', e.target.value)} rows="2" 
                            className="w-full border border-red-200 rounded p-1.5 text-red-600 focus:outline-none focus:border-red-400 print-hidden resize-none bg-red-50 text-[12px] leading-tight"
                            placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)"></textarea>
                          <div className="hidden print-block w-full text-[13px] leading-relaxed whitespace-pre-wrap font-bold text-red-600">{item.note || '-'}</div>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-8 right-8 flex flex-col gap-4 no-print z-[999999]">
        <button onClick={addItem} className="bg-green-600 hover:bg-green-700 text-white rounded-full p-4 shadow-xl flex items-center justify-center transition-transform hover:scale-110 border-2 border-white" title="เพิ่มหน้าต่างบานใหม่">
          <Plus size={24} />
        </button>
        <button onClick={handleSharePDF} className="bg-orange-500 hover:bg-orange-600 text-white rounded-full p-4 shadow-xl flex items-center justify-center transition-transform hover:scale-110 border-2 border-white" title="แชร์เป็น PDF (แนวนอน)">
          <Share2 size={24} />
        </button>
        <button onClick={printDocument} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-xl flex items-center justify-center transition-transform hover:scale-110 border-2 border-white" title="พิมพ์เอกสาร">
          <Printer size={24} />
        </button>
      </div>
    </div>
  );
};

export default App;