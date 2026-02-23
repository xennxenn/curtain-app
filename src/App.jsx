import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Printer, Image as ImageIcon, Upload, Save, X, MousePointerClick, Settings, Database, Eye, EyeOff, Move, Users, LogOut, FileText, ArrowLeft, Edit3 } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';

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
const appId = 'curtain-app-v1'; // ไอดีสำหรับแยกระบบฐานข้อมูล

// --- SVGs for default fallback ---
const SVGS = {
  style_default: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" fill="%23eee" stroke="%23333" stroke-width="2"/><text x="50" y="55" font-size="12" text-anchor="middle" fill="%23999">ไม่มีรูป</text></svg>',
  floor_1cm: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="20" y="10" width="60" height="75" fill="%23ccc" stroke="%23333"/><line x1="10" y1="90" x2="90" y2="90" stroke="%23000" stroke-width="4"/><text x="50" y="88" font-size="10" text-anchor="middle">1 ซม.</text></svg>',
  floor_default: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="20" y="10" width="60" height="80" fill="%23ccc" stroke="%23333"/><line x1="10" y1="90" x2="90" y2="90" stroke="%23000" stroke-width="4"/></svg>'
};

const PRESET_COLORS = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#A855F7', '#EC4899', '#000000', '#FFFFFF'];

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

// Default Accounts
const DEFAULT_ACCOUNTS = [
  { id: '1', username: 'Admin', password: '1234', role: 'admin', name: 'ผู้ดูแลระบบ' },
  { id: '2', username: 'T65099', password: '65099', role: 'user', name: 'พนักงานทดสอบ' }
];

// --- Utility: Image Compression ---
const compressImage = (file, maxWidth = 1200, quality = 0.7) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality)); // Compress to JPEG
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

// --- Component: Database Settings Modal ---
const DatabaseModal = ({ appDB, setAppDB, showDBSettings, setShowDBSettings, saveData }) => {
  if (!showDBSettings) return null;
  const [activeTab, setActiveTab] = useState('fabrics');
  const [cat, setCat] = useState('ผ้าม่าน');
  const [type, setType] = useState('');
  
  const updateArrayDB = (field, text) => {
    const arr = text.split('\n').map(s => s.trim()).filter(s => s !== '');
    if (field.includes('.')) {
      const [p1, p2] = field.split('.');
      setAppDB(prev => ({ ...prev, [p1]: { ...prev[p1], [p2]: arr } }));
    } else {
      setAppDB(prev => ({ ...prev, [field]: arr }));
    }
  };

  const handleImageUpload = (callback) => async (e) => {
    const file = e.target.files[0];
    if (file) {
      const compressedDataUrl = await compressImage(file, 800, 0.6);
      callback(compressedDataUrl);
    }
  };

  const addFabricType = (newType) => {
    if(!newType) return;
    const newDB = JSON.parse(JSON.stringify(appDB));
    if(!newDB.curtainTypes[cat]) newDB.curtainTypes[cat] = {};
    newDB.curtainTypes[cat][newType] = {};
    setAppDB(newDB);
  };

  const addFabricItem = async () => {
    const n = document.getElementById('addFabName').value;
    const c = document.getElementById('addFabColor').value;
    const f = document.getElementById('addFabImg').files[0];
    if(n && c && f) {
      const compressedImg = await compressImage(f, 600, 0.6);
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
                    {Object.keys((appDB.curtainTypes && appDB.curtainTypes[cat]) || {}).map(t => (
                      <button key={t} onClick={()=>setType(t)} className={`px-4 py-1.5 border rounded text-sm transition-colors ${type===t ? 'bg-indigo-600 text-white border-indigo-600 shadow' : 'bg-white hover:bg-gray-50'}`}>{t}</button>
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
                            <input type="file" accept="image/*" className="hidden" id="addFabImg"/>
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
                   <div className="flex flex-col"><label className="font-bold text-sm mb-2">1. รายชื่อรูปแบบม่าน (บรรทัดละ 1 รายการ)</label><textarea rows="15" className="w-full border p-3 text-sm rounded focus:outline-blue-500 leading-relaxed" value={(appDB.styles || []).join('\n')} onChange={e => updateArrayDB('styles', e.target.value)}></textarea></div>
                   <div className="flex flex-col"><label className="font-bold text-sm mb-2">2. อัปโหลดรูปตัวอย่างรูปแบบม่าน</label>
                     <div className="flex flex-col gap-2 overflow-y-auto pr-2 max-h-[400px]">
                       {(appDB.styles || []).map(styleName => (
                         <div key={styleName} className="flex items-center justify-between border p-2 rounded bg-gray-50">
                           <span className="text-sm font-bold flex-1 truncate mr-2">{styleName}</span>
                           {appDB.styleImages?.[styleName] ? <img src={appDB.styleImages[styleName]} className="w-10 h-10 object-cover bg-white border mr-2 rounded"/> : <div className="w-10 h-10 bg-gray-200 border border-dashed flex items-center justify-center mr-2 rounded text-[8px] text-gray-500">ไม่มีรูป</div>}
                           <label className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded text-xs cursor-pointer">อัปโหลด<input type="file" accept="image/*" className="hidden" onChange={handleImageUpload((base64) => { setAppDB(prev => ({ ...prev, styleImages: { ...(prev.styleImages || {}), [styleName]: base64 } })); })}/></label>
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
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload((base64) => {
                            const st = document.getElementById('maskStyle').value;
                            const ac = document.getElementById('maskAction').value || 'ALL';
                            if(st && ac) {
                              const newDB = JSON.parse(JSON.stringify(appDB));
                              if(!newDB.masks) newDB.masks = {};
                              if(!newDB.masks[st]) newDB.masks[st] = {};
                              newDB.masks[st][ac] = base64;
                              setAppDB(newDB);
                            } else { alert("กรุณาเลือกรูปแบบและลักษณะการเปิดปิดก่อนอัปโหลด"); }
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
                     <div><label className="font-bold text-sm mb-1 block">ระยะด้านล่าง (บรรทัดละ 1 รายการ)</label><textarea rows="8" className="w-full border p-2 text-sm rounded focus:outline-blue-500" value={(appDB.margins?.bottom || []).join('\n')} onChange={e => updateArrayDB('margins.bottom', e.target.value)}></textarea></div>
                     <div><label className="font-bold text-sm mb-1 block">ระยะด้านบน / ซ้าย / ขวา (ใช้ร่วมกัน)</label><textarea rows="4" className="w-full border p-2 text-sm rounded focus:outline-blue-500" value={(appDB.margins?.top || []).join('\n')} onChange={e => updateArrayDB('margins.top', e.target.value)}></textarea></div>
                   </div>
                   <div className="flex flex-col"><label className="font-bold text-sm mb-2">อัปโหลดรูปตัวอย่างระยะด้านล่าง</label>
                     <div className="flex flex-col gap-2 overflow-y-auto pr-2 max-h-[400px]">
                       {(appDB.margins?.bottom || []).map(marginName => (
                         <div key={marginName} className="flex items-center justify-between border p-2 rounded bg-gray-50">
                           <span className="text-sm font-bold flex-1 truncate mr-2">{marginName}</span>
                           {appDB.marginImages?.[marginName] ? <img src={appDB.marginImages[marginName]} className="w-10 h-10 object-cover bg-white border mr-2 rounded"/> : <div className="w-10 h-10 bg-gray-200 border border-dashed flex items-center justify-center mr-2 rounded text-[8px] text-gray-500">ไม่มีรูป</div>}
                           <label className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded text-xs cursor-pointer">อัปโหลด<input type="file" accept="image/*" className="hidden" onChange={handleImageUpload((base64) => { setAppDB(prev => ({ ...prev, marginImages: { ...(prev.marginImages || {}), [marginName]: base64 } })); })}/></label>
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
                     <div><label className="font-bold text-sm block mb-1">ชนิดรางม่าน</label><textarea rows="15" className="w-full border p-2 text-sm rounded" value={(appDB.tracks || []).join('\n')} onChange={e => updateArrayDB('tracks', e.target.value)}></textarea></div>
                     <div><label className="font-bold text-sm block mb-1">ชนิดขาจับ</label><textarea rows="15" className="w-full border p-2 text-sm rounded" value={(appDB.brackets || []).join('\n')} onChange={e => updateArrayDB('brackets', e.target.value)}></textarea></div>
                   </div>
                 )}
                 {activeTab === 'accessories' && (
                   <div className="grid grid-cols-2 gap-4">
                     <div><label className="font-bold text-sm block mb-1">อุปกรณ์เสริม</label><textarea rows="15" className="w-full border p-2 text-sm rounded" value={(appDB.accessories || []).join('\n')} onChange={e => updateArrayDB('accessories', e.target.value)}></textarea></div>
                     <div><label className="font-bold text-sm block mb-1">การแขวนม่าน</label><textarea rows="15" className="w-full border p-2 text-sm rounded" value={(appDB.hangStyles || []).join('\n')} onChange={e => updateArrayDB('hangStyles', e.target.value)}></textarea></div>
                   </div>
                 )}
              </div>
            )}
          </div>
        </div>
        <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
           <button onClick={() => setShowDBSettings(false)} className="px-6 py-2 rounded font-bold text-gray-600 hover:bg-gray-200">ปิด</button>
           <button onClick={() => { saveData(); setShowDBSettings(false); }} className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 shadow">บันทึกข้อมูลเข้า Server</button>
        </div>
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
    };
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
    };
  }, [draggingPanel, panelDragStart]);

  const onPanelMouseDown = (e) => {
    e.stopPropagation();
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setDraggingPanel(true);
      setPanelDragStart({
        x: e.clientX - rect.left - panelPos.x,
        y: e.clientY - rect.top - panelPos.y
      });
    }
  };

  const handleAddArea = () => {
    const newAreaId = Date.now().toString() + '_a' + (item.areas.length + 1);
    const newArea = { 
      id: newAreaId, points: [], width: '', height: '', 
      lineColor: '#EF4444', lineWidth: 2, fabrics: [],
      labelColor: '#EF4444', labelSize: 12, wPos: 'top', hPos: 'right',
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
      const dist = Math.hypot(lastPt.x - xPct, lastPt.y - yPct);
      if (dist < 1) return; 
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
      const compressedDataUrl = await compressImage(file, 1200, 0.7);
      handleItemChange(item.id, 'image', compressedDataUrl);
    }
  };

  const activeArea = item.areas.find(a => a.id === activeAreaId);

  return (
    <div ref={wrapperRef} className="flex flex-col w-full h-full relative border-b border-gray-300">
      <div 
        ref={containerRef}
        className={`relative w-full flex-grow overflow-hidden bg-gray-100 print:bg-transparent ${mode === 'pan' ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : (activeAreaId ? 'cursor-crosshair' : 'cursor-default')}`}
        onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave} onClick={handleContentClick} onDoubleClick={handleDoubleClick}
      >
        {item.image ? (
          <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }} className="w-full h-full relative print:transform-none transition-transform duration-75 ease-out">
            <img src={item.image} alt="Window view" className="w-full h-full object-cover pointer-events-none" />
            
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
                
                const autoMaskType = item.styleMain?.match(/ม้วน|พับ|มู่ลี่/) ? 'height' : 'width';
                const maskType = area.maskType || autoMaskType;
                const mPct = (area.maskPct || 20) / 100;
                const maskOpacity = (area.maskOpacity ?? 87) / 100;
                
                const style = item.styleMain;
                const action = item.styleAction || '';
                const masks = appDB.masks?.[style] || {};
                const maskImgFallback = masks[action] || masks['ALL'] || Object.values(masks)[0];
                let maskElements = [];
                
                if (maskImgFallback) {
                  if (maskType === 'height') {
                    maskElements.push(<image key="T" href={maskImgFallback} x={minX} y={minY} width={w} height={h * mPct} preserveAspectRatio="none" clipPath={`url(#clip-${area.id})`} opacity={maskOpacity} />);
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
                        <circle cx={`${p.x}%`} cy={`${p.y}%`} r={6/zoom} fill="white" stroke={area.lineColor} strokeWidth={2/zoom} />
                        <text x={`${p.x}%`} y={`${p.y}%`} dy={3/zoom} fill={area.lineColor} fontSize={9/zoom} fontWeight="bold" textAnchor="middle" style={{ pointerEvents: 'none' }}>{idx + 1}</text>
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
              const minX = Math.min(...area.points.map(p=>p.x)), maxX = Math.max(...area.points.map(p=>p.x));
              const minY = Math.min(...area.points.map(p=>p.y)), maxY = Math.max(...area.points.map(p=>p.y));
              const midX = (minX + maxX) / 2, midY = (minY + maxY) / 2;
              const wPos = area.wPos || 'top', hPos = area.hPos || 'right';
              const lblSize = (area.labelSize || 12) / zoom;
              return (
                <div key={`labels-${area.id}`} className="absolute inset-0 pointer-events-none">
                  {area.width && (<div style={{ position: 'absolute', left: `${midX}%`, top: wPos === 'top' ? `${minY}%` : `${maxY}%`, transform: `translate(-50%, ${wPos === 'top' ? '-100%' : '0'})`, color: area.labelColor || area.lineColor, fontSize: `${lblSize}px`, marginTop: wPos === 'top' ? `-${4/zoom}px` : `${4/zoom}px` }} className="bg-white/90 px-1.5 py-0.5 rounded shadow-sm border border-gray-300 font-bold whitespace-nowrap z-10">ความกว้าง {area.width} ซม.</div>)}
                  {area.height && (<div style={{ position: 'absolute', top: `${midY}%`, left: hPos === 'left' ? `${minX}%` : `${maxX}%`, transform: `translate(${hPos === 'left' ? '-100%' : '0'}, -50%)`, color: area.labelColor || area.lineColor, fontSize: `${lblSize}px`, marginLeft: hPos === 'left' ? `-${4/zoom}px` : `${4/zoom}px` }} className="bg-white/90 px-1.5 py-0.5 rounded shadow-sm border border-gray-300 font-bold whitespace-nowrap z-10">ความสูง {area.height} ซม.</div>)}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-100 bg-gray-50 no-print">
            <label className="cursor-pointer bg-white text-blue-600 border border-blue-600 px-6 py-3 rounded-lg shadow-sm flex items-center hover:bg-blue-50 transition-colors font-bold">
              <Upload size={20} className="mr-2" /> อัปโหลดรูปหน้างาน
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>
        )}
      </div>

      {item.image && showControls && (
        <div 
          style={{ position: 'fixed', left: panelPos.x, top: panelPos.y, width: '320px' }}
          className="z-[99999] bg-white/95 backdrop-blur-sm border border-gray-300 rounded shadow-2xl flex flex-col no-print cursor-default transition-shadow"
          onMouseDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}
        >
          <div onMouseDown={onPanelMouseDown} className="bg-gray-800 text-white px-3 py-2 flex justify-between items-center cursor-move rounded-t">
            <span className="font-bold text-[10px] flex items-center"><Move size={12} className="mr-1"/> เครื่องมือพื้นที่ (ลากอิสระ)</span>
            <button onClick={() => setShowControls(false)} className="hover:text-red-400 text-gray-300"><X size={14}/></button>
          </div>
          
          <div className="flex gap-1 p-2 bg-gray-100 border-b">
            <button onClick={() => setMode('pan')} className={`flex-1 flex justify-center items-center px-2 py-1 rounded text-[10px] font-bold transition-colors ${mode === 'pan' ? 'bg-indigo-600 text-white shadow' : 'bg-white border text-gray-700 hover:bg-gray-50'}`}><Move size={12} className="mr-1"/> เลื่อน/ซูม</button>
            <button onClick={() => setMode('draw')} className={`flex-1 flex justify-center items-center px-2 py-1 rounded text-[10px] font-bold transition-colors ${mode === 'draw' ? 'bg-red-500 text-white shadow' : 'bg-white border text-gray-700 hover:bg-gray-50'}`}><MousePointerClick size={12} className="mr-1"/> วาดพื้นที่</button>
          </div>

          <div className="p-2 text-xs flex flex-col gap-2 max-h-[350px] overflow-y-auto">
            <div className="flex justify-between items-center">
               <button onClick={()=>{handleAddArea();}} className="bg-green-600 text-white px-2 py-1 rounded shadow-sm font-bold flex items-center text-[10px] hover:bg-green-700"><Plus size={12} className="mr-1"/> เพิ่มพื้นที่ม่าน</button>
               {mode === 'draw' && activeAreaId && <span className="text-red-500 font-bold bg-red-50 px-2 py-1 rounded border border-red-200 text-[9px] animate-pulse">ดับเบิลคลิก เพื่อจบเส้น</span>}
            </div>

            {item.areas.map((area, idx) => {
              const isActive = activeAreaId === area.id;
              const autoMaskType = item.styleMain?.match(/ม้วน|พับ|มู่ลี่/) ? 'height' : 'width';
              return (
                <div key={area.id} className={`flex flex-col gap-1.5 border p-2 rounded bg-white transition-all ${isActive ? 'border-blue-400 ring-2 ring-blue-100 shadow-md' : 'border-gray-200'}`}>
                  <div className="flex flex-wrap gap-1 items-center justify-between">
                    <button onClick={() => { setActiveAreaId(isActive ? null : area.id); setMode('draw'); }} className={`px-2 py-0.5 rounded border font-bold flex items-center text-[10px] ${isActive ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'}`}>พ.{idx + 1}</button>
                    <div className="flex items-center gap-1 ml-auto">
                       <button onClick={() => handleUpdateArea(area.id, 'points', [])} className="text-[9px] text-orange-600 hover:bg-orange-50 px-1 py-0.5 rounded border border-orange-200">ล้างเส้น</button>
                       <button onClick={() => handleRemoveArea(area.id)} className="bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 px-1 py-0.5 rounded border border-red-200" title="ลบพื้นที่"><Trash2 size={10}/></button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 justify-between w-full mt-1">
                    <div className="flex items-center border px-1 py-0.5 rounded bg-gray-50 flex-1">
                      <span className="text-gray-500 text-[9px] font-bold whitespace-nowrap mr-1">กว้าง:</span>
                      <input type="text" placeholder="ซม." value={area.width} onChange={(e)=>handleUpdateArea(area.id, 'width', e.target.value)} className="w-8 bg-transparent outline-none border-b border-gray-300 focus:border-blue-500 text-center text-blue-700 font-bold text-[10px]"/>
                      <select value={area.wPos || 'top'} onChange={(e)=>handleUpdateArea(area.id, 'wPos', e.target.value)} className="text-[8px] bg-transparent outline-none cursor-pointer ml-auto"><option value="top">บน</option><option value="bottom">ล่าง</option></select>
                    </div>
                    <div className="flex items-center border px-1 py-0.5 rounded bg-gray-50 flex-1">
                      <span className="text-gray-500 text-[9px] font-bold whitespace-nowrap mr-1">สูง:</span>
                      <input type="text" placeholder="ซม." value={area.height} onChange={(e)=>handleUpdateArea(area.id, 'height', e.target.value)} className="w-8 bg-transparent outline-none border-b border-gray-300 focus:border-blue-500 text-center text-blue-700 font-bold text-[10px]"/>
                      <select value={area.hPos || 'right'} onChange={(e)=>handleUpdateArea(area.id, 'hPos', e.target.value)} className="text-[8px] bg-transparent outline-none cursor-pointer ml-auto"><option value="left">ซ้าย</option><option value="right">ขวา</option></select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 border-t pt-1.5 mt-0.5 bg-blue-50/30 p-1 rounded">
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="font-bold text-indigo-800">รูปแบบ Mask:</span>
                      <select value={area.maskType || autoMaskType} onChange={(e)=>handleUpdateArea(area.id, 'maskType', e.target.value)} className="border border-indigo-200 rounded bg-white px-1 py-0.5 outline-none text-indigo-700 font-bold">
                        <option value="width">เปิดข้าง (จีบ/ลอน)</option>
                        <option value="height">ดึงลง (ม้วน/พับ/มู่ลี่)</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between text-[9px]">
                      <label className="flex items-center gap-1">
                        <span className="font-bold text-gray-600">% แสดงผล:</span>
                        <select value={area.maskPct || 20} onChange={(e)=>handleUpdateArea(area.id, 'maskPct', parseInt(e.target.value))} className="border rounded bg-white px-1 outline-none text-blue-700 font-bold">
                          {[10, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100].map(sz => <option key={sz} value={sz}>{sz}%</option>)}
                        </select>
                      </label>
                      <label className="flex items-center gap-1">
                        <span className="font-bold text-gray-600">ความทึบ:</span>
                        <select value={area.maskOpacity ?? 87} onChange={(e)=>handleUpdateArea(area.id, 'maskOpacity', parseInt(e.target.value))} className="border rounded bg-white px-1 outline-none text-blue-700 font-bold">
                          {[10, 20, 30, 40, 50, 60, 70, 80, 87, 90, 100].map(sz => <option key={sz} value={sz}>{sz}%</option>)}
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center text-[9px] border-t pt-1 mt-0.5 justify-between">
                    <div className="flex items-center gap-1">
                      <span className="font-bold">สี:</span>
                      {PRESET_COLORS.map(c => (
                        <button key={c} onClick={(e) => { e.stopPropagation(); handleUpdateArea(area.id, 'lineColor', c); handleUpdateArea(area.id, 'labelColor', c); }} className={`w-3.5 h-3.5 rounded-full border ${area.lineColor === c ? 'ring-2 ring-offset-1 ring-blue-500 border-transparent' : 'border-gray-300'}`} style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <label className="flex items-center">
                      <span className="font-bold mr-1">อักษร:</span>
                      <select value={area.labelSize || 12} onChange={(e)=>handleUpdateArea(area.id, 'labelSize', parseInt(e.target.value))} className="border rounded bg-white px-1 outline-none py-0.5">
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
        <button onClick={(e) => { e.stopPropagation(); setShowControls(true); }} className="absolute top-2 right-2 bg-white/90 border border-gray-300 text-gray-700 p-1.5 rounded shadow-sm hover:bg-white no-print z-40 flex items-center text-[10px] font-bold">
          <Eye size={12} className="mr-1"/> เปิดแผงเครื่องมือพื้นที่
        </button>
      )}
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
      if (user) onLogin(user);
      else setError('Username หรือ Password ไม่ถูกต้อง');
    } catch(err) {
      // Fallback
      const user = DEFAULT_ACCOUNTS.find(u => u.username === username && u.password === password);
      if (user) onLogin(user); else setError('ระบบขัดข้อง กรุณาลองใหม่');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-sm">
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

// --- Component: User Management Modal (Admin Only) ---
const UserManagementModal = ({ show, onClose }) => {
  const [accounts, setAccounts] = useState([]);
  const [newN, setNewN] = useState(''); // เพิ่ม State สำหรับเก็บชื่อ
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
            <div><label className="text-xs font-bold block">สิทธิ์</label><select value={newR} onChange={e=>setNewR(e.target.value)} className="w-full border p-1.5 rounded text-sm"><option value="user">User (พนักงาน)</option><option value="admin">Admin</option></select></div>
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

// --- Main App Component ---
const App = () => {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [appUser, setAppUser] = useState(null); // Pseudo-user { username, role }
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'editor'
  
  // Project List State
  const [projectsList, setProjectsList] = useState([]);
  
  // Editor State
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [appDB, setAppDB] = useState(DEFAULT_DB);
  
  // Modals
  const [showDBSettings, setShowDBSettings] = useState(false);
  const [showUserMgmt, setShowUserMgmt] = useState(false);

  // Blank Editor Initial State
  const [generalInfo, setGeneralInfo] = useState({
    surveyDate: new Date().toISOString().split('T')[0], confirmDate: '', installDates: [], location: '',
    customerName: '', customerPhone: '', agentName: '', agentPhone: '',
    terms: `กรณีมีการเปลี่ยนแปลงรายละเอียดจากที่ตกลงไว้ในใบสรุปงานติดตั้งผ้าม่านนี้ ผู้สั่งซื้อยินยอมที่จะชำระเงินเพิ่มในส่วนของ\n(A) ค่าแก้ไขผ้าม่านและอุปกรณ์ เช่น ความสูง ความกว้างของผ้าม่าน รางม่าน ที่เกิดจากหน้างานเปลี่ยนแปลง บิ้วท์อินเพิ่มเติม ฯลฯ\n(B) ค่าติดตั้งรางละ 200 บาท\n(C) ค่าเดินทาง 1,500 บาท ใน กทม. (ต่างจังหวัดคิดตามระยะทาง)\nการเลื่อนคิวงานติตตั้ง ขอความกรุณาลูกค้าแจ้งพนักงานขายก่อนวันติดตั้ง อย่างน้อย 5 วันทำการ ถ้าน้อยกว่า 5 วัน จะมีค่าดำเนินการ 3,000 บาท / ครั้ง\nบริษัทฯ จะรับผิดชอบดำเนินการแก้ไขงาน ในกรณีที่ความผิดพลาดเกิดจากบริษัทฯ เท่านั้น`
  });
  const [tempInstallDate, setTempInstallDate] = useState('');
  const [items, setItems] = useState([]);

  // Init Firebase
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
        else await signInAnonymously(auth);
      } catch (err) { console.error("Auth Error:", err); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setFirebaseUser);
    return () => unsubscribe();
  }, []);

  // Fetch Projects List when on Dashboard
  const loadProjectsList = async () => {
    if (!firebaseUser || !appUser) return;
    try {
      const querySnapshot = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'projects'));
      let allProjects = [];
      querySnapshot.forEach((doc) => allProjects.push({ id: doc.id, ...doc.data() }));
      
      // RBAC Filtering: Normal users only see their own, Admin sees all
      if (appUser.role !== 'admin') {
        allProjects = allProjects.filter(p => p.owner === appUser.username);
      }
      // Sort by date desc
      allProjects.sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      setProjectsList(allProjects);
    } catch(e) { console.error("Load Projects Error:", e); }
  };

  useEffect(() => {
    if (firebaseUser && appUser && view === 'dashboard') loadProjectsList();
  }, [firebaseUser, appUser, view]);

  // Load Global DB Settings
  useEffect(() => {
    if (!firebaseUser || !appUser) return;
    const loadDB = async () => {
      try {
        const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'appDB'));
        if (snap.exists()) setAppDB(snap.data());
      } catch(e) { console.error(e); }
    };
    loadDB();
  }, [firebaseUser, appUser]);

  // Handle Login Flow
  if (!appUser) return <LoginScreen onLogin={(user) => setAppUser(user)} />;

  // --- Dashboard Actions ---
  const handleCreateNew = () => {
    setCurrentProjectId(Date.now().toString());
    setGeneralInfo({
      surveyDate: new Date().toISOString().split('T')[0], confirmDate: '', installDates: [], location: '',
      customerName: '', customerPhone: '', agentName: '', agentPhone: '',
      terms: `กรณีมีการเปลี่ยนแปลงรายละเอียดจากที่ตกลงไว้ในใบสรุปงานติดตั้งผ้าม่านนี้ ผู้สั่งซื้อยินยอมที่จะชำระเงินเพิ่มในส่วนของ\n(A) ค่าแก้ไขผ้าม่านและอุปกรณ์ เช่น ความสูง ความกว้างของผ้าม่าน รางม่าน ที่เกิดจากหน้างานเปลี่ยนแปลง บิ้วท์อินเพิ่มเติม ฯลฯ\n(B) ค่าติดตั้งรางละ 200 บาท\n(C) ค่าเดินทาง 1,500 บาท ใน กทม. (ต่างจังหวัดคิดตามระยะทาง)\nการเลื่อนคิวงานติตตั้ง ขอความกรุณาลูกค้าแจ้งพนักงานขายก่อนวันติดตั้ง อย่างน้อย 5 วันทำการ ถ้าน้อยกว่า 5 วัน จะมีค่าดำเนินการ 3,000 บาท / ครั้ง\nบริษัทฯ จะรับผิดชอบดำเนินการแก้ไขงาน ในกรณีที่ความผิดพลาดเกิดจากบริษัทฯ เท่านั้น`
    });
    setItems([]);
    addItem();
    setView('editor');
  };

  const handleEdit = (proj) => {
    setCurrentProjectId(proj.id);
    setGeneralInfo(proj.generalInfo || {});
    setItems(proj.items || []);
    if (!proj.items || proj.items.length === 0) addItem();
    setView('editor');
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if(window.confirm('คุณต้องการลบใบงานนี้ใช่หรือไม่?')) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projects', id));
        loadProjectsList();
      } catch(err) { console.error(err); }
    }
  };

  // --- Editor Actions ---
  const saveData = async () => {
    if (!firebaseUser) return;
    setSaving(true); setSaveStatus('บันทึก...');
    try {
      if(appUser.role === 'admin') await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'appDB'), appDB);
      
      const pId = currentProjectId || Date.now().toString();
      const projData = { 
        generalInfo, 
        items, 
        updatedAt: new Date().toISOString(),
        owner: appUser.role === 'admin' && projectsList.find(p=>p.id === pId)?.owner ? projectsList.find(p=>p.id === pId).owner : appUser.username // Keep original owner if admin edits
      };
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projects', pId), projData);
      setCurrentProjectId(pId);
      setSaveStatus('สำเร็จ!'); setTimeout(() => setSaveStatus(''), 3000);
    } catch (err) { setSaveStatus('ผิดพลาด'); }
    setSaving(false);
  };

  const printDocument = () => {
    const originalTitle = document.title;
    document.title = `ใบงานสรุปงานติดตั้งผ้าม่าน คุณ${generalInfo.customerName || 'ลูกค้า'}`;
    window.print();
    document.title = originalTitle; // Restore
  };

  const handleGeneralChange = (e) => setGeneralInfo(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const addInstallDate = () => { if (tempInstallDate && !generalInfo.installDates.includes(tempInstallDate)) { setGeneralInfo(prev => ({ ...prev, installDates: [...prev.installDates, tempInstallDate] })); setTempInstallDate(''); } };
  const removeInstallDate = (date) => setGeneralInfo(prev => ({ ...prev, installDates: prev.installDates.filter(d => d !== date) }));

  const addItem = () => {
    setItems(prev => [...prev, {
      id: Date.now().toString(), image: null,
      areas: [{ id: Date.now().toString() + '_a1', points: [], width: '', height: '', lineColor: '#EF4444', lineWidth: 2, fabrics: [], labelColor: '#EF4444', labelSize: 14, wPos: 'top', hPos: 'right', maskPct: 20, maskOpacity: 87, maskType: '' }],
      roomPos: '', styleMain: '', styleAction: '', tracks: [], bracket: '', accessories: [], hangStyle: '',
      marginLeft: '', customMarginLeft: '', marginRight: '', customMarginRight: '', marginTop: '', customMarginTop: '', marginBottom: '', customMarginBottom: '', note: ''
    }]);
  };
  const removeItem = (id) => setItems(items.filter(item => item.id !== id));
  const handleItemChange = (id, field, value) => setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));

  const addFabricToArea = (itemId, areaId) => handleItemChange(itemId, 'areas', items.find(i=>i.id===itemId).areas.map(a => a.id === areaId ? { ...a, fabrics: [...a.fabrics, { id: Date.now().toString(), mainType: '', subType: '', name: '', color: '' }] } : a));
  const updateFabric = (itemId, areaId, fabricId, field, value) => handleItemChange(itemId, 'areas', items.find(i=>i.id===itemId).areas.map(a => a.id === areaId ? { ...a, fabrics: a.fabrics.map(f => f.id === fabricId ? { ...f, [field]: value, ...(field === 'mainType' ? {subType:'',name:'',color:''} : {}), ...(field === 'subType' ? {name:'',color:''} : {}), ...(field === 'name' ? {color:''} : {}) } : f) } : a));
  const removeFabric = (itemId, areaId, fabricId) => handleItemChange(itemId, 'areas', items.find(i=>i.id===itemId).areas.map(a => a.id === areaId ? { ...a, fabrics: a.fabrics.filter(f => f.id !== fabricId) } : a));
  const handleMultiSelect = (itemId, field, value) => {
    const currentList = items.find(i => i.id === itemId)[field] || [];
    handleItemChange(itemId, field, currentList.includes(value) ? currentList.filter(v => v !== value) : [...currentList, value]);
  };

  // --- Render Dashboard View ---
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
              <button onClick={()=>setAppUser(null)} className="bg-red-500 text-white px-4 py-2 rounded flex items-center font-bold hover:bg-red-600 shadow"><LogOut size={16} className="mr-2"/> ออกจากระบบ</button>
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
                   <div className="flex items-center gap-2">
                     <div className="bg-blue-100 p-2 rounded-full text-blue-600"><FileText size={20}/></div>
                     <div>
                       <h3 className="font-bold text-gray-800 truncate w-48">{proj.generalInfo?.customerName || 'ไม่มีชื่อลูกค้า'}</h3>
                       <p className="text-xs text-gray-500">{proj.generalInfo?.location || 'ไม่มีข้อมูลสถานที่'}</p>
                     </div>
                   </div>
                   <button onClick={(e)=>handleDelete(proj.id, e)} className="text-red-400 hover:text-red-600 p-1 bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                 </div>
                 <div className="text-xs text-gray-500 mt-4 border-t pt-2 flex justify-between">
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

  // --- Render Editor View ---
  return (
    <div className="min-h-screen bg-gray-100 py-8 font-sans">
      <DatabaseModal appDB={appDB} setAppDB={setAppDB} showDBSettings={showDBSettings} setShowDBSettings={setShowDBSettings} saveData={saveData} />

      <style>{`
        @media print {
          body { background: white; -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .print-border-none { border: none !important; background: transparent !important; resize: none !important; box-shadow: none !important; padding: 0 !important; }
          .print-bg-transparent { background: transparent !important; }
          .page-break { page-break-before: always; }
          .avoid-break { page-break-inside: avoid; }
          .shadow-lg { box-shadow: none !important; }
          .max-w-[1200px] { max-width: 100% !important; margin: 0 auto !important; padding: 0 10px !important; }
          .print-h-auto { height: auto !important; max-height: none !important; overflow: visible !important; page-break-inside: avoid; }
          .print-overflow-visible { overflow: visible !important; }
          .print-transform-none { transform: none !important; }
          select { appearance: none; -webkit-appearance: none; border: none; background: transparent; padding: 0; margin: 0;}
          input::placeholder, textarea::placeholder { color: transparent; }
          .gap-8 { gap: 1rem !important; }
          .mb-8 { margin-bottom: 1rem !important; }
          .p-8 { padding: 1rem !important; }
        }
      `}</style>

      <div className="max-w-[1200px] mx-auto bg-white shadow-lg p-8 rounded-sm relative z-0">
        <div className="text-center mb-6 border-b-2 border-gray-800 pb-3 flex justify-between items-center avoid-break relative">
          
          <button onClick={()=>{saveData(); setView('dashboard');}} className="absolute -left-20 top-1/2 transform -translate-y-1/2 no-print bg-gray-200 hover:bg-gray-300 text-gray-700 p-2 rounded-full shadow-md"><ArrowLeft size={24}/></button>

          <div className="w-1/3 text-left no-print flex gap-2">
            <button onClick={saveData} disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded flex items-center hover:bg-indigo-700 text-sm shadow font-bold"><Save size={16} className="mr-2"/> {saving ? 'บันทึก...' : 'บันทึกงานออนไลน์'}</button>
            {appUser.role === 'admin' && <button onClick={()=>setShowDBSettings(true)} className="bg-gray-700 text-white px-4 py-2 rounded flex items-center hover:bg-gray-800 text-sm shadow font-bold"><Database size={16} className="mr-2"/> จัดการฐานข้อมูล</button>}
            {saveStatus && <span className="text-xs text-green-600 ml-2 self-center font-bold bg-green-50 px-2 py-1 rounded">{saveStatus}</span>}
          </div>
          <h1 className="text-2xl font-bold text-gray-800 w-1/3">ใบสรุปงานติดตั้งผ้าม่าน</h1>
          <div className="w-1/3 text-right"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 avoid-break text-sm relative z-0">
          <div className="p-4 border rounded-md print-border-none">
            <h2 className="font-bold mb-3 border-b pb-1 inline-block text-base">ส่วนผู้จัดทำ</h2>
            <div className="space-y-2">
              <div className="flex items-center"><span className="w-32 font-medium">วันที่วัดพื้นที่ :</span><input type="date" name="surveyDate" value={generalInfo.surveyDate} onChange={handleGeneralChange} className="flex-1 border-b border-gray-300 outline-none focus:border-blue-500 px-1 print-border-none" /></div>
              <div className="flex items-center"><span className="w-32 font-medium">วันที่คอนเฟิร์ม :</span><input type="date" name="confirmDate" value={generalInfo.confirmDate} onChange={handleGeneralChange} className="flex-1 border-b border-gray-300 outline-none focus:border-blue-500 px-1 print-border-none" /></div>
              <div className="flex flex-col"><span className="font-medium mb-1">วันที่ติดตั้งผ้าม่าน :</span>
                <div className="flex flex-wrap gap-1 items-center min-h-[28px] border-b border-gray-300 pb-1 print-border-none">
                  {generalInfo.installDates.length > 0 ? generalInfo.installDates.map((d, i) => (<span key={i} className="bg-gray-50 px-2 py-0.5 rounded border flex items-center print-border-none print-bg-transparent font-bold">{d} <span className="mx-1 print-hidden no-print font-normal text-gray-400">/</span><X size={12} className="ml-1 cursor-pointer text-red-500 no-print" onClick={() => removeInstallDate(d)}/></span>)) : <span className="text-gray-400 italic no-print text-xs">ยังไม่ได้ระบุ</span>}
                  <div className="flex items-center ml-auto no-print"><input type="date" value={tempInstallDate} onChange={(e)=>setTempInstallDate(e.target.value)} className="border rounded px-1 text-xs outline-none"/><button onClick={addInstallDate} className="bg-blue-100 text-blue-700 p-1 rounded ml-1"><Plus size={14}/></button></div>
                </div>
              </div>
              <div className="flex flex-col"><span className="font-medium">สถานที่ติดตั้งผ้าม่าน :</span><textarea name="location" value={generalInfo.location} onChange={handleGeneralChange} rows="2" className="w-full border border-gray-300 rounded p-1 mt-1 outline-none focus:border-blue-500 print-border-none resize-none bg-gray-50 print-bg-transparent"></textarea></div>
            </div>
            <div className="mt-6 text-center"><p className="border-b border-gray-400 w-48 mx-auto mb-1"></p><p className="text-gray-600">ผู้จัดทำ</p></div>
          </div>
          <div className="p-4 border rounded-md print-border-none">
            <h2 className="font-bold mb-3 border-b pb-1 inline-block text-base">ส่วนลูกค้า</h2>
            <div className="space-y-2">
              <div className="flex items-center"><span className="w-28 font-medium">ชื่อ-นามสกุล :</span><input type="text" name="customerName" value={generalInfo.customerName} onChange={handleGeneralChange} className="flex-1 border-b border-gray-300 outline-none focus:border-blue-500 px-1 print-border-none font-bold text-blue-800 print:text-black" /></div>
              <div className="flex items-center"><span className="w-28 font-medium">เบอร์ติดต่อ :</span><input type="text" name="customerPhone" value={generalInfo.customerPhone} onChange={handleGeneralChange} className="flex-1 border-b border-gray-300 outline-none focus:border-blue-500 px-1 print-border-none" /></div>
              <div className="flex items-center mt-4"><span className="w-28 font-medium">ผู้ติดต่อแทน :</span><input type="text" name="agentName" value={generalInfo.agentName} onChange={handleGeneralChange} className="flex-1 border-b border-gray-300 outline-none focus:border-blue-500 px-1 print-border-none" /></div>
              <div className="flex items-center"><span className="w-28 font-medium">เบอร์ติดต่อ :</span><input type="text" name="agentPhone" value={generalInfo.agentPhone} onChange={handleGeneralChange} className="flex-1 border-b border-gray-300 outline-none focus:border-blue-500 px-1 print-border-none" /></div>
            </div>
            <div className="mt-6 text-center"><p className="border-b border-gray-400 w-48 mx-auto mb-1"></p><p className="text-gray-600">ผู้สั่งซื้อ</p></div>
          </div>
        </div>

        <div className="mb-6 avoid-break bg-red-50 p-3 rounded border border-red-100 print-bg-transparent print-border-none relative z-0">
          <h3 className="font-bold text-red-600 mb-1 text-sm underline">หมายเหตุเงื่อนไข :</h3>
          <textarea name="terms" value={generalInfo.terms} onChange={handleGeneralChange} rows="4" className="w-full text-[10px] bg-transparent outline-none print-border-none text-gray-700 leading-tight resize-none"></textarea>
        </div>

        <hr className="my-8 border-gray-300 no-print" />

        <div className="space-y-10">
          {items.map((item, index) => {
            const styleImg = item.styleMain && appDB.styleImages?.[item.styleMain];
            let imgMain = null; let txtMain = ''; let colMain = '';
            let imgSheer = null; let txtSheer = ''; let colSheer = '';
            
            if(item.areas.length > 0) {
               const allFabs = item.areas.flatMap(a => a.fabrics);
               const mainFab = allFabs.find(f => f.subType?.includes('ทึบ') || f.subType?.toLowerCase().includes('blackout')) || allFabs[0];
               if(mainFab) {
                 imgMain = mainFab.mainType && mainFab.subType && mainFab.name && mainFab.color ? appDB.curtainTypes[mainFab.mainType]?.[mainFab.subType]?.[mainFab.name]?.[mainFab.color] : null;
                 txtMain = mainFab.subType || 'ผ้าม่าน 1';
                 colMain = mainFab.name || mainFab.color ? `${mainFab.name || ''} / ${mainFab.color || ''}`.trim() : '';
               }
               const sheerFab = allFabs.find(f => f.subType?.includes('โปร่ง') || f.subType?.toLowerCase().includes('sheer')) || (allFabs.length > 1 ? allFabs[1] : null);
               if(sheerFab && sheerFab !== mainFab) {
                 imgSheer = sheerFab.mainType && sheerFab.subType && sheerFab.name && sheerFab.color ? appDB.curtainTypes[sheerFab.mainType]?.[sheerFab.subType]?.[sheerFab.name]?.[sheerFab.color] : null;
                 txtSheer = sheerFab.subType || 'ผ้าม่าน 2';
                 colSheer = sheerFab.name || sheerFab.color ? `${sheerFab.name || ''} / ${sheerFab.color || ''}`.trim() : '';
               }
            }

            const marginImg = item.marginBottom && item.marginBottom !== '-' ? appDB.marginImages?.[item.marginBottom] || (item.marginBottom.includes('1 ซม.') ? SVGS.floor_1cm : SVGS.floor_default) : null;

            return (
              <div key={item.id} className="border-2 border-gray-800 p-1 relative avoid-break page-break rounded bg-white hover:z-50 transition-all duration-300">
                <div className="absolute top-0 left-0 bg-gray-800 text-white px-3 py-1 text-sm font-bold z-10 rounded-br">รายการที่ {index + 1}</div>
                <button onClick={() => removeItem(item.id)} className="no-print absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 shadow z-20"><Trash2 size={16} /></button>

                <div className="border border-gray-300 flex flex-col md:flex-row h-[750px] print:h-auto print:overflow-visible mt-6 md:mt-0 bg-white relative">
                  
                  {/* Left Column 70% */}
                  <div className="w-full md:w-[70%] border-r border-gray-300 flex flex-col bg-white h-full print:h-auto relative z-20">
                    <div className="h-[60%] print:h-[450px] w-full border-b border-gray-300 flex flex-col relative bg-gray-100">
                      <ImageAreaEditor item={item} appDB={appDB} handleItemChange={handleItemChange} />
                    </div>
                    <div className="h-[40%] print:h-[250px] w-full p-2 bg-gray-50 border-t border-gray-300 print-bg-transparent print-border-none">
                      <div className="grid grid-cols-4 gap-2 h-full">
                        <div className="flex flex-col items-center bg-white border border-gray-200 p-1.5 rounded shadow-sm print-border-none h-full justify-between overflow-hidden">
                          <span className="text-[10px] font-bold text-gray-700 truncate w-full text-center mb-1 shrink-0">รูปแบบม่าน</span>
                          <div className="flex-1 w-full bg-gray-50 border border-gray-100 flex items-center justify-center rounded overflow-hidden">
                            {styleImg ? <img src={styleImg} className="w-full h-full object-cover" /> : <img src={SVGS.style_default} className="max-w-[40px] max-h-[40px] opacity-50" />}
                          </div>
                          <span className="text-[9px] text-gray-500 truncate w-full text-center mt-1 font-bold shrink-0" title={item.styleMain}>{item.styleMain || '-'}</span>
                        </div>
                        <div className="flex flex-col items-center bg-white border border-gray-200 p-1.5 rounded shadow-sm print-border-none h-full justify-between overflow-hidden">
                          <span className="text-[10px] font-bold text-gray-700 truncate w-full text-center mb-1 shrink-0">{txtMain || 'ม่านทึบ'}</span>
                          <div className="flex-1 w-full border border-gray-100 flex items-center justify-center rounded overflow-hidden bg-gray-50 p-0">
                            {imgMain ? <img src={imgMain} className="w-full h-full object-cover" /> : <span className="text-[9px] text-gray-400">ไม่มีรูป</span>}
                          </div>
                          <span className="text-[9px] text-gray-600 truncate w-full text-center mt-1 font-bold shrink-0" title={colMain}>{colMain || '-'}</span>
                        </div>
                        <div className="flex flex-col items-center bg-white border border-gray-200 p-1.5 rounded shadow-sm print-border-none h-full justify-between overflow-hidden">
                          <span className="text-[10px] font-bold text-gray-700 truncate w-full text-center mb-1 shrink-0">{txtSheer || 'ม่านโปร่ง'}</span>
                          <div className="flex-1 w-full border border-gray-100 flex items-center justify-center rounded overflow-hidden bg-gray-50 p-0">
                            {imgSheer ? <img src={imgSheer} className="w-full h-full object-cover" /> : <span className="text-[9px] text-gray-400">{txtSheer ? 'ไม่มีรูป' : '-'}</span>}
                          </div>
                          <span className="text-[9px] text-gray-600 truncate w-full text-center mt-1 font-bold shrink-0" title={colSheer}>{colSheer || '-'}</span>
                        </div>
                        <div className="flex flex-col items-center bg-white border border-gray-200 p-1.5 rounded shadow-sm print-border-none h-full justify-between overflow-hidden">
                          <span className="text-[10px] font-bold text-gray-700 truncate w-full text-center mb-1 shrink-0">ระยะชายม่าน</span>
                          <div className="flex-1 w-full bg-gray-50 border border-gray-100 flex items-center justify-center rounded overflow-hidden p-0">
                            {marginImg ? <img src={marginImg} className="w-full h-full object-cover" /> : <span className="text-[9px] text-gray-400">-</span>}
                          </div>
                          <span className="text-[9px] text-gray-500 truncate w-full text-center mt-1 font-bold shrink-0" title={item.marginBottom}>{item.marginBottom || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 30% Right Column: Text Information & Settings */}
                  <div className="w-full md:w-[30%] text-[10px] flex flex-col bg-white overflow-y-auto print:overflow-visible print:h-auto relative z-10">
                    <div className="bg-gray-800 text-white p-2 flex flex-col print-border-none print-bg-transparent md:pt-6 shrink-0">
                      <span className="mb-0.5 text-gray-300 print-hidden font-bold text-[11px]">ห้อง / ตำแหน่ง :</span>
                      <textarea value={item.roomPos} onChange={(e)=>handleItemChange(item.id, 'roomPos', e.target.value)} className="w-full bg-transparent outline-none border-b border-gray-500 focus:border-white resize-none text-[12px] font-bold leading-tight print-border-none placeholder-gray-400 text-yellow-300 print:text-black" placeholder="ระบุห้อง..." rows="2" />
                    </div>
                    
                    <div className="p-2 flex-1 flex flex-col justify-between gap-3 h-full">
                      <div className="border border-gray-300 p-1.5 rounded bg-gray-50 print-border-none print-bg-transparent">
                        <div className="flex justify-between items-center mb-1.5 border-b border-gray-300 pb-1">
                          <span className="font-bold text-gray-800 text-[11px]">รายละเอียดวัสดุ/ผ้า</span>
                        </div>
                        {item.areas.length === 0 && <span className="text-gray-400 italic no-print">เพิ่มพื้นที่บนรูปหน้างานก่อน</span>}
                        {item.areas.map((area, aIdx) => (
                          <div key={area.id} className="mb-2 border-l-2 border-blue-500 pl-1.5">
                            <div className="font-bold text-blue-800 mb-1 flex justify-between items-center bg-blue-50 px-1 py-0.5 rounded print-bg-transparent">
                              <span>พ.{aIdx + 1} (ก:{area.width||'-'} ส:{area.height||'-'})</span>
                              <button onClick={()=>addFabricToArea(item.id, area.id)} className="text-blue-600 hover:text-blue-800 no-print flex items-center bg-white px-1.5 py-0.5 border border-blue-200 shadow-sm rounded text-[9px]"><Plus size={10} className="mr-0.5"/> เพิ่ม</button>
                            </div>
                            {area.fabrics.map((fab) => {
                              const mainTypeOptions = Object.keys(appDB.curtainTypes || {});
                              const subTypeOptions = fab.mainType ? Object.keys(appDB.curtainTypes[fab.mainType] || {}) : [];
                              const nameOptions = fab.subType ? Object.keys(appDB.curtainTypes[fab.mainType][fab.subType] || {}) : [];
                              const colorOptions = fab.name ? Object.keys(appDB.curtainTypes[fab.mainType][fab.subType][fab.name] || {}) : [];

                              return (
                                <div key={fab.id} className="flex flex-col gap-1 mb-1 bg-white p-1 border border-gray-200 rounded print-border-none relative pr-4 shadow-sm">
                                  <button onClick={()=>removeFabric(item.id, area.id, fab.id)} className="absolute top-0.5 right-0.5 text-red-500 hover:bg-red-50 rounded no-print"><X size={10}/></button>
                                  <div className="flex gap-1">
                                    <select value={fab.mainType} onChange={(e)=>updateFabric(item.id, area.id, fab.id, 'mainType', e.target.value)} className="w-1/2 border-b border-gray-300 outline-none text-[9px] print-border-none bg-transparent font-bold text-gray-700">
                                      <option value="">-หมวดหมู่-</option>{mainTypeOptions.map(o=><option key={o} value={o}>{o}</option>)}
                                    </select>
                                    <select value={fab.subType} onChange={(e)=>updateFabric(item.id, area.id, fab.id, 'subType', e.target.value)} className="w-1/2 border-b border-gray-300 outline-none text-[9px] print-border-none bg-transparent font-bold text-indigo-700" disabled={!fab.mainType}>
                                      <option value="">-ประเภทม่าน-</option>{subTypeOptions.map(o=><option key={o} value={o}>{o}</option>)}
                                    </select>
                                  </div>
                                  <div className="flex gap-1">
                                    <select value={fab.name} onChange={(e)=>updateFabric(item.id, area.id, fab.id, 'name', e.target.value)} className="w-1/2 border-b border-gray-300 outline-none text-[9px] print-border-none bg-transparent" disabled={!fab.subType}>
                                      <option value="">-รุ่น/ชื่อ-</option>{nameOptions.map(o=><option key={o} value={o}>{o}</option>)}
                                    </select>
                                    <select value={fab.color} onChange={(e)=>updateFabric(item.id, area.id, fab.id, 'color', e.target.value)} className="w-1/2 border-b border-gray-300 outline-none text-[9px] print-border-none bg-transparent" disabled={!fab.name}>
                                      <option value="">-สี-</option>{colorOptions.map(o=><option key={o} value={o}>{o}</option>)}
                                    </select>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col gap-2 py-1 flex-1 justify-center">
                        <div className="flex flex-col"><span className="font-bold text-gray-700">รูปแบบการทำงาน</span>
                          <div className="flex gap-1 items-center">
                            <select value={item.styleMain} onChange={(e)=>handleItemChange(item.id, 'styleMain', e.target.value)} className="w-1/2 border-b border-gray-400 outline-none print-border-none bg-transparent text-blue-800 font-bold"><option value="">-รูปแบบ-</option>{(appDB.styles || []).map(s=><option key={s} value={s}>{s}</option>)}</select>
                            <span className="text-gray-400">/</span>
                            <select value={item.styleAction} onChange={(e)=>handleItemChange(item.id, 'styleAction', e.target.value)} className="w-1/2 border-b border-gray-400 outline-none print-border-none bg-transparent text-blue-800 font-bold"><option value="">-เปิดปิด-</option>{(appDB.actions || []).map(s=><option key={s} value={s}>{s}</option>)}</select>
                          </div>
                        </div>

                        <div className="flex flex-col"><span className="font-bold text-gray-700">รางม่าน</span>
                          <div className="flex flex-wrap gap-1 mt-0.5 print-border-none">
                            {item.tracks?.map(t => <span key={t} className="bg-gray-100 px-1 py-0.5 rounded border border-gray-300 text-[9px] flex items-center shadow-sm">{t} <X size={8} className="ml-1 cursor-pointer text-red-500 no-print" onClick={()=>handleMultiSelect(item.id, 'tracks', t)}/></span>)}
                            <select className="w-full border-b border-gray-300 outline-none no-print mt-0.5 text-[9px] text-gray-500" onChange={(e) => {if(e.target.value) handleMultiSelect(item.id, 'tracks', e.target.value); e.target.value='';}}><option value="">+ เพิ่มชนิดรางม่าน</option>{(appDB.tracks || []).map(s=><option key={s} value={s}>{s}</option>)}</select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                           <div className="flex flex-col"><span className="font-bold text-gray-700">ขาจับราง</span>
                             <select value={item.bracket} onChange={(e)=>handleItemChange(item.id, 'bracket', e.target.value)} className="border-b border-gray-300 outline-none print-border-none bg-transparent"><option value="">-ระบุ-</option>{(appDB.brackets || []).map(s=><option key={s} value={s}>{s}</option>)}</select>
                           </div>
                           <div className="flex flex-col"><span className="font-bold text-gray-700">การแขวน</span>
                             <select value={item.hangStyle} onChange={(e)=>handleItemChange(item.id, 'hangStyle', e.target.value)} className="border-b border-gray-300 outline-none print-border-none bg-transparent"><option value="">-ระบุ-</option>{(appDB.hangStyles || []).map(s=><option key={s} value={s}>{s}</option>)}</select>
                           </div>
                        </div>

                        <div className="flex flex-col"><span className="font-bold text-gray-700">อุปกรณ์เสริม</span>
                          <div className="flex flex-wrap gap-1 mt-0.5 print-border-none">
                            {item.accessories?.map(t => <span key={t} className="bg-gray-100 px-1 py-0.5 rounded border border-gray-300 text-[9px] flex items-center shadow-sm">{t} <X size={8} className="ml-1 cursor-pointer text-red-500 no-print" onClick={()=>handleMultiSelect(item.id, 'accessories', t)}/></span>)}
                            <select className="w-full border-b border-gray-300 outline-none no-print mt-0.5 text-[9px] text-gray-500" onChange={(e) => {if(e.target.value) handleMultiSelect(item.id, 'accessories', e.target.value); e.target.value='';}}><option value="">+ เพิ่มอุปกรณ์เสริม</option>{(appDB.accessories || []).map(s=><option key={s} value={s}>{s}</option>)}</select>
                          </div>
                        </div>
                      </div>

                      <div className="border border-gray-300 p-1.5 rounded bg-gray-50 print-border-none print-bg-transparent">
                        <span className="font-bold text-gray-700 block mb-1 border-b border-gray-300 pb-0.5 text-[11px]">ระยะการเผื่อม่าน</span>
                        <div className="grid grid-cols-1 gap-y-1.5 text-[9px]">
                          <div className="flex gap-2">
                            <div className="flex flex-col w-1/2"><span className="text-gray-500">ซ้าย:</span><select value={item.marginLeft} onChange={(e)=>handleItemChange(item.id, 'marginLeft', e.target.value)} className="border-b border-gray-300 outline-none print-border-none bg-transparent"><option value="">-เลือก-</option>{(appDB.margins?.horizontal || []).map(s=><option key={s} value={s}>{s}</option>)}</select>
                              {item.marginLeft === 'ระบุเอง...' && <input type="text" value={item.customMarginLeft} onChange={(e)=>handleItemChange(item.id, 'customMarginLeft', e.target.value)} placeholder="พิมพ์..." className="border-b border-dashed border-gray-400 bg-transparent outline-none mt-0.5 print-border-none"/>}</div>
                            <div className="flex flex-col w-1/2"><span className="text-gray-500">ขวา:</span><select value={item.marginRight} onChange={(e)=>handleItemChange(item.id, 'marginRight', e.target.value)} className="border-b border-gray-300 outline-none print-border-none bg-transparent"><option value="">-เลือก-</option>{(appDB.margins?.horizontal || []).map(s=><option key={s} value={s}>{s}</option>)}</select>
                              {item.marginRight === 'ระบุเอง...' && <input type="text" value={item.customMarginRight} onChange={(e)=>handleItemChange(item.id, 'customMarginRight', e.target.value)} placeholder="พิมพ์..." className="border-b border-dashed border-gray-400 bg-transparent outline-none mt-0.5 print-border-none"/>}</div>
                          </div>
                          <div className="flex gap-2 items-start mt-0.5">
                            <div className="flex flex-col w-1/2"><span className="text-gray-500">บน:</span><select value={item.marginTop} onChange={(e)=>handleItemChange(item.id, 'marginTop', e.target.value)} className="border-b border-gray-300 outline-none print-border-none bg-transparent text-blue-700 font-bold"><option value="">-เลือก-</option>{(appDB.margins?.top || []).map(s=><option key={s} value={s}>{s}</option>)}</select>
                              {item.marginTop === 'ระบุเอง...' && <input type="text" value={item.customMarginTop} onChange={(e)=>handleItemChange(item.id, 'customMarginTop', e.target.value)} placeholder="พิมพ์..." className="border-b border-dashed border-gray-400 bg-transparent outline-none mt-0.5 print-border-none"/>}</div>
                            <div className="flex flex-col w-1/2"><span className="text-gray-500">ล่าง:</span><select value={item.marginBottom} onChange={(e)=>handleItemChange(item.id, 'marginBottom', e.target.value)} className="border-b border-gray-300 outline-none print-border-none bg-transparent text-blue-700 font-bold"><option value="">-เลือก-</option>{(appDB.margins?.bottom || []).map(s=><option key={s} value={s}>{s}</option>)}</select>
                              {item.marginBottom === 'ระบุเอง...' && <input type="text" value={item.customMarginBottom} onChange={(e)=>handleItemChange(item.id, 'customMarginBottom', e.target.value)} placeholder="พิมพ์..." className="border-b border-dashed border-gray-400 bg-transparent outline-none mt-0.5 print-border-none"/>}</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col pt-1.5 border-t border-gray-200 shrink-0">
                        <span className="font-bold text-red-600">หมายเหตุ</span>
                        <textarea value={item.note} onChange={(e)=>handleItemChange(item.id, 'note', e.target.value)} rows="2" 
                          className="w-full mt-0.5 border border-red-200 rounded p-1 text-red-600 focus:outline-none focus:border-red-400 print-border-none resize-none bg-red-50"
                          placeholder="ระบุหมายเหตุเพิ่มเติม..."></textarea>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Buttons: Add / Print */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-4 no-print z-[999999]">
        <button onClick={addItem} className="bg-green-600 hover:bg-green-700 text-white rounded-full p-4 shadow-xl flex items-center justify-center transition-transform hover:scale-110 border-2 border-white" title="เพิ่มหน้าต่างบานใหม่">
          <Plus size={24} />
        </button>
        <button onClick={printDocument} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-xl flex items-center justify-center transition-transform hover:scale-110 border-2 border-white" title="แชร์ / บันทึกเป็น PDF">
          <Printer size={24} />
        </button>
      </div>
    </div>
  );
};

export default App;