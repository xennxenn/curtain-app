import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Printer, Image as ImageIcon, Upload, Download, Save, X, MousePointerClick, Settings, Database, Eye, EyeOff, Move, Users, LogOut, FileText, ArrowLeft, Share2, ChevronLeft, ChevronRight, ImagePlus } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc, onSnapshot } from 'firebase/firestore';

// --- Firebase Initialization (Online Sync) ---
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
const appId = "curtain-app-3d38a";

// ---------------------------------------------------------
// ☁️ CLOUDINARY UPLOAD SETTINGS (ทดแทน IMGBB)
// ---------------------------------------------------------
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dsxpwfujb/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "ml_default"; 

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
  { id: '1', username: 'Admin', password: '1234', role: 'admin', name: 'ผู้ดูแลระบบ', signatureUrl: '' },
  { id: '2', username: 'T65099', password: '65099', role: 'user', name: 'พนักงานทดสอบ', signatureUrl: '' }
];

// --- Utility: AutoFit Text Component ---
const AutoFitText = ({ text, className }) => {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const resizeText = () => {
      if (!containerRef.current || !textRef.current) return;
      const cw = containerRef.current.clientWidth;
      const tw = textRef.current.scrollWidth;
      
      // ถ้าข้อความกว้างกว่ากล่อง ให้คำนวณสเกลย่อส่วนลงมา
      if (tw > cw && cw > 0) {
        setScale((cw - 4) / tw); // เผื่อขอบซ้ายขวาเล็กน้อย (4px)
      } else {
        setScale(1); // ถ้าไม่เกินก็ไม่ต้องย่อ (แสดงขนาดปกติที่ 13px)
      }
    };

    resizeText();
    
    // รันซ้ำเผื่อ font โหลดช้า หรือ layout หน้าจอเพิ่งขยับเสร็จ
    const timeoutId = setTimeout(resizeText, 150);

    let observer;
    if (window.ResizeObserver && containerRef.current) {
      observer = new ResizeObserver(() => resizeText());
      observer.observe(containerRef.current);
    }

    return () => {
      clearTimeout(timeoutId);
      if (observer) observer.disconnect();
    };
  }, [text]);

  if (!text) return null;

  return (
      <div ref={containerRef} className="w-full overflow-hidden flex items-center justify-center min-h-[20px]">
          <span 
              ref={textRef} 
              className={`font-bold whitespace-nowrap origin-center ${className || ''}`} 
              style={{ fontSize: '13px', transform: `scale(${scale})`, display: 'inline-block' }}
          >
              {text}
          </span>
      </div>
  );
};

// --- Utility: Alert/Confirm Dialog System ---
const AlertDialog = ({ dialog, onClose }) => {
  if (!dialog) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-[9999999] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
        <p className="text-gray-800 mb-6 font-bold text-sm whitespace-pre-wrap">{dialog.message}</p>
        <div className="flex gap-4 w-full justify-center">
          {dialog.type === 'confirm' && (
            <button onClick={onClose} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded font-bold text-gray-700 text-sm">ยกเลิก</button>
          )}
          <button onClick={() => { if(dialog.onConfirm) dialog.onConfirm(); onClose(); }} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-sm shadow">
            {dialog.type === 'confirm' ? 'ตกลง' : 'รับทราบ'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Utility: Delay Function for Rate Limiting ---
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// --- Utility: NEW Cloudinary Upload Function ---
const uploadImageToCloudinary = async (base64Str) => {
  try {
    const formData = new FormData();
    formData.append("file", base64Str);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const res = await fetch(CLOUDINARY_URL, {
      method: "POST",
      body: formData
    });
    
    if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    return data.secure_url; 
  } catch (e) {
    console.error("Cloudinary Upload failed:", e);
    return null;
  }
};

// --- Utility: Background Removal for Signatures ---
const removeWhiteBackground = (dataUrl) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2];
        if (r > 190 && g > 190 && b > 190) {
          data[i+3] = 0;
        }
      }
      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = dataUrl;
  });
};

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

const processImageFile = async (file, maxWidth = 1024, quality = 0.7, setDialog) => {
  let processFile = file;
  
  if (file.name.toLowerCase().match(/\.(heic|heif)$/i)) {
    try {
      const heic2any = await loadHeic2Any();
      const convertedBlob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.8 });
      const blobArray = Array.isArray(convertedBlob) ? convertedBlob : [convertedBlob];
      processFile = new File(blobArray, file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: "image/jpeg" });
    } catch (err) {
      console.error("HEIC conversion failed", err);
      if(setDialog) setDialog({ type: 'alert', message: "ไม่สามารถแปลงไฟล์ HEIC/HEIF ได้ กรุณาใช้ไฟล์ JPG/PNG" });
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
        if(setDialog) setDialog({ type: 'alert', message: "ไฟล์รูปภาพไม่รองรับ หรือมีปัญหา" });
        resolve(null);
      };
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(processFile);
  });
};

// --- Component: Custom Project Fabric Modal ---
const CustomFabricModal = ({ show, onClose, onAdd, setDialog }) => {
  if (!show) return null;
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const f = document.getElementById('customFabImg').files[0];
    const subType = document.getElementById('customFabSubType').value;
    const name = document.getElementById('customFabName').value;
    const color = document.getElementById('customFabColor').value;
    if(!subType || !name || !color || !f) {
      return setDialog({ type: 'alert', message: 'กรุณากรอกข้อมูลและเลือกรูปภาพให้ครบถ้วน' });
    }
    
    setLoading(true);
    const compressed = await processImageFile(f, 400, 0.7, setDialog);
    if (compressed) {
      try {
        const imgUrl = await uploadImageToCloudinary(compressed);
        if(imgUrl) {
          onAdd({ id: Date.now().toString(), mainType: 'ผ้านอกระบบ (เฉพาะงานนี้)', subType, name, color, image: imgUrl });
          onClose();
        } else {
          setDialog({ type: 'alert', message: 'อัปโหลดรูปภาพไม่สำเร็จ กรุณาลองใหม่' });
        }
      } catch (err) {
        setDialog({ type: 'alert', message: 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ' });
      }
    }
    setLoading(false);
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
          <div><label className="text-xs font-bold block mb-1">สี</label><input id="customFabColor" type="text" className="w-full border p-2 rounded text-sm focus:outline-indigo-500" placeholder="เช่น สีเทาเข้ม" onInput={(e) => e.target.value = e.target.value.toUpperCase()}/></div>
          <div>
            <label className="text-xs font-bold block mb-1">รูปตัวอย่างเนื้อผ้า</label>
            <label className={`bg-gray-100 border border-gray-300 text-gray-700 px-3 py-2 rounded text-sm flex justify-center items-center font-bold ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200 cursor-pointer'}`}>
              <Upload size={16} className="mr-2"/> {loading ? 'กำลังอัปโหลด...' : 'เลือกรูปภาพ'}
              <input type="file" accept={ACCEPTED_IMAGE_FORMATS} className="hidden" id="customFabImg" disabled={loading} onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const colorInput = document.getElementById('customFabColor');
                  if (colorInput && !colorInput.value.trim()) {
                    colorInput.value = file.name.replace(/\.[^/.]+$/, "").toUpperCase();
                  }
                }
              }}/>
            </label>
          </div>
          <button type="submit" disabled={loading} className={`bg-indigo-600 text-white font-bold py-2 rounded mt-2 shadow ${loading ? 'opacity-50' : 'hover:bg-indigo-700'}`}>{loading ? 'โปรดรอ...' : 'บันทึกผ้าเข้าใบงาน'}</button>
        </form>
      </div>
    </div>
  );
};

// --- Component: Database Settings Modal ---
const DatabaseModal = ({ appDB, setAppDB, showDBSettings, setShowDBSettings, saveAppDB, setDialog, setBgUploadQueue }) => {
  if (!showDBSettings) return null;
  const [activeTab, setActiveTab] = useState('fabrics');
  const [cat, setCat] = useState('ผ้าม่าน');
  const [type, setType] = useState('');
  const [localText, setLocalText] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingBulk, setIsUploadingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState('');
  const [searchFabric, setSearchFabric] = useState('');

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

  const handleSaveAndClose = async () => {
    const cleanedDB = JSON.parse(JSON.stringify(appDB));
    ['styles', 'actions', 'tracks', 'brackets', 'accessories', 'hangStyles'].forEach(k => {
       if(cleanedDB[k]) cleanedDB[k] = cleanedDB[k].map(s=>s.trim()).filter(Boolean);
    });
    if(cleanedDB.margins) {
       ['bottom', 'top', 'horizontal'].forEach(k => {
          if(cleanedDB.margins[k]) cleanedDB.margins[k] = cleanedDB.margins[k].map(s=>s.trim()).filter(Boolean);
       });
    }
    // ส่งข้อมูลบันทึกขึ้น Firebase เสมอ 
    const success = await saveAppDB(cleanedDB); 
    if (success) {
      setAppDB(cleanedDB);
      setShowDBSettings(false);
    }
  };

  // --- RECOVERY FUNCTION ---
  const handleRecoverLocal = async () => {
    const localBackup = localStorage.getItem('backupAppDB');
    if (localBackup) {
      try {
        const parsed = JSON.parse(localBackup);
        if (Object.keys(parsed.curtainTypes?.['ผ้าม่าน'] || {}).length > 0) {
          setAppDB(parsed);
          await saveAppDB(parsed);
          setDialog({ type: 'alert', message: 'กู้คืนข้อมูลจากความจำเครื่องนี้สำเร็จแล้ว! ข้อมูลออนไลน์กลับมาแล้วครับ' });
        } else {
          setDialog({ type: 'alert', message: 'ข้อมูลสำรองในเครื่องนี้ว่างเปล่า ไม่สามารถกู้คืนได้' });
        }
      } catch (e) {
        setDialog({ type: 'alert', message: 'ไฟล์สำรองในเครื่องเสียหาย' });
      }
    } else {
      setDialog({ type: 'alert', message: 'ขออภัย ไม่พบข้อมูลสำรองในเครื่องนี้ กรุณาลองกดปุ่มนี้ในคอมพิวเตอร์เครื่องที่คุณเคยอัปเดตข้อมูลล่าสุด' });
    }
  };

  // --- EXPORT/IMPORT DB FUNCTIONS ---
  const handleExportDB = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appDB));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "curtain_db_backup_" + new Date().toISOString().split('T')[0] + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportDB = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedDB = JSON.parse(event.target.result);
        if (importedDB && importedDB.curtainTypes) {
          setAppDB(importedDB);
          await saveAppDB(importedDB);
          setDialog({ type: 'alert', message: 'นำเข้าข้อมูลและบันทึกขึ้นระบบออนไลน์สำเร็จ!' });
        } else {
          setDialog({ type: 'alert', message: 'ไฟล์ไม่ถูกต้อง หรือโครงสร้างข้อมูลไม่ตรงกัน' });
        }
      } catch (err) {
        setDialog({ type: 'alert', message: 'เกิดข้อผิดพลาดในการอ่านไฟล์ JSON' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImageUpload = (callback) => async (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsUploading(true);
      const compressed = await processImageFile(file, 600, 0.7, setDialog);
      if(compressed) {
        try {
            const url = await uploadImageToCloudinary(compressed);
            if(url) callback(url);
            else setDialog({ type: 'alert', message: 'อัปโหลดล้มเหลว กรุณาลองใหม่' });
        } catch (err) {
            setDialog({ type: 'alert', message: 'ระบบขัดข้อง กรุณาลองใหม่' });
        }
      }
      setIsUploading(false);
    }
  };

  const handleBulkUploadQueue = (e) => {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/') || f.name.toLowerCase().match(/\.(heic|heif)$/i));
    if (files.length === 0) return;
    if (!type) {
      setDialog({ type: 'alert', message: "กรุณาเลือกประเภทม่านก่อนทำการอัปโหลดแบบกลุ่ม" });
      return;
    }

    const newTasks = files.map(file => {
      const pathParts = file.webkitRelativePath ? file.webkitRelativePath.split('/') : [file.name];
      let folderName = "";
      let fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "").toUpperCase();

      if (pathParts.length > 1) {
          folderName = pathParts[pathParts.length - 2].toUpperCase();
      } else {
          folderName = "ไม่ระบุรุ่น";
      }
      return { file, folderName, fileNameWithoutExt, type, cat };
    });

    setBgUploadQueue(newTasks); 
    e.target.value = ''; 
    setDialog({ type: 'alert', message: `นำรูปภาพจำนวน ${files.length} รายการเข้าสู่คิวอัปโหลดแล้ว!\n\nระบบจะทยอยอัปโหลดผ่าน Cloudinary อยู่เบื้องหลัง\n(สังเกตกล่องสถานะมุมซ้ายล่าง)\nคุณสามารถปิดแผงตั้งค่านี้และทำงานอื่นต่อไปได้เลยครับ` });
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
    setDialog({
      type: 'confirm',
      message: `ต้องการลบหมวดหมู่ "${t}" ใช่หรือไม่? ข้อมูลผ้าด้านในจะถูกลบทั้งหมด`,
      onConfirm: () => {
        const newDB = JSON.parse(JSON.stringify(appDB));
        delete newDB.curtainTypes[cat][t];
        setAppDB(newDB);
        if(type === t) { setType(''); setSearchFabric(''); }
      }
    });
  };

  const addFabricItem = async () => {
    const n = document.getElementById('addFabName').value;
    const c = document.getElementById('addFabColor').value;
    const f = document.getElementById('addFabImg').files[0];
    if(n && c && f) {
      setIsUploading(true);
      const compressedImg = await processImageFile(f, 400, 0.7, setDialog);
      if(compressedImg) {
        try {
            const url = await uploadImageToCloudinary(compressedImg);
            if(url) {
              const newDB = JSON.parse(JSON.stringify(appDB));
              if(!newDB.curtainTypes[cat][type]) newDB.curtainTypes[cat][type] = {};
              if(!newDB.curtainTypes[cat][type][n]) newDB.curtainTypes[cat][type][n] = {};
              newDB.curtainTypes[cat][type][n][c] = url;
              setAppDB(newDB);
              document.getElementById('addFabName').value=''; 
              document.getElementById('addFabColor').value=''; 
              document.getElementById('addFabImg').value='';
            } else {
              setDialog({ type: 'alert', message: "อัปโหลดรูปล้มเหลว" });
            }
        } catch (err) {
            setDialog({ type: 'alert', message: "เกิดข้อผิดพลาดในการอัปโหลด ลองใหม่อีกครั้ง" });
        }
      }
      setIsUploading(false);
    } else { 
      setDialog({ type: 'alert', message: "กรุณาใส่ข้อมูลและเลือกรูปภาพให้ครบ" }); 
    }
  };

  const deleteFabricItem = (typeName, itemName, itemColor) => {
    const newDB = JSON.parse(JSON.stringify(appDB));
    delete newDB.curtainTypes[cat][typeName][itemName][itemColor];
    if(Object.keys(newDB.curtainTypes[cat][typeName][itemName]).length === 0) delete newDB.curtainTypes[cat][typeName][itemName];
    setAppDB(newDB);
  };

  let fabricList = [];
  if (type && appDB.curtainTypes[cat] && appDB.curtainTypes[cat][type]) {
    Object.entries(appDB.curtainTypes[cat][type]).forEach(([itemName, colors]) => {
      Object.entries(colors).forEach(([itemColor, imgUrl]) => {
        fabricList.push({ itemName, itemColor, imgUrl });
      });
    });
    fabricList.sort((a, b) => a.itemName.localeCompare(b.itemName) || a.itemColor.localeCompare(b.itemColor));
    if (searchFabric.trim()) {
      const term = searchFabric.toLowerCase();
      fabricList = fabricList.filter(f => f.itemName.toLowerCase().includes(term) || f.itemColor.toLowerCase().includes(term));
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[100000] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <h2 className="text-xl font-bold flex items-center text-blue-800"><Database className="mr-2"/> ฐานข้อมูลออนไลน์ (Admin Only)</h2>
          <button onClick={() => setShowDBSettings(false)} className="text-gray-500 hover:text-red-500"><X size={24}/></button>
        </div>
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          <div className="w-full md:w-1/4 border-b md:border-b-0 md:border-r bg-gray-100 p-2 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-y-auto whitespace-nowrap">
            {[{id: 'fabrics', label: 'เนื้อผ้าและม่าน'}, {id: 'styles', label: 'รูปแบบม่าน'}, {id: 'masks', label: 'มาสก์หน้างาน'}, {id: 'margins', label: 'ระยะชายม่าน'}, {id: 'tracks', label: 'รางม่าน & ขาจับ'}, {id: 'accessories', label: 'อุปกรณ์เสริม'}].map(t => (
              <button key={t.id} onClick={()=>setActiveTab(t.id)} className={`text-left px-3 py-2 rounded text-sm ${activeTab===t.id ? 'bg-blue-600 text-white font-bold shadow' : 'hover:bg-gray-200 text-gray-700'}`}>{t.label}</button>
            ))}
          </div>
          <div className="w-full md:w-3/4 p-4 overflow-y-auto bg-white">
            {activeTab === 'fabrics' && (
              <div className="flex flex-col gap-4">
                <h3 className="font-bold text-lg text-blue-700 border-b pb-2">จัดการเนื้อผ้าและม่าน</h3>
                <div>
                  <label className="block text-sm font-bold mb-2">1. หมวดหมู่หลัก</label>
                  <div className="flex gap-2 flex-wrap">
                    {Object.keys(appDB.curtainTypes || {}).map(c => (
                      <button key={c} onClick={()=>{setCat(c); setType(''); setSearchFabric('');}} className={`px-4 py-1.5 border rounded-full text-sm transition-colors ${cat===c ? 'bg-blue-600 text-white border-blue-600 shadow' : 'bg-white hover:bg-gray-50'}`}>{c}</button>
                    ))}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 border rounded-lg">
                  <label className="block text-sm font-bold mb-3">2. ประเภทม่าน ({cat})</label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {Object.keys((appDB.curtainTypes && appDB.curtainTypes[cat]) || {}).map((t, idx, arr) => (
                      <div key={t} className={`flex items-center border rounded transition-colors ${type===t ? 'bg-indigo-600 text-white border-indigo-600 shadow' : 'bg-white hover:bg-gray-100'}`}>
                        <button onClick={()=>{setType(t); setSearchFabric('');}} className="px-4 py-1.5 text-sm font-bold">{t}</button>
                        <div className="flex flex-col border-l border-white/20">
                          <button onClick={()=>moveFabricType(-1, t)} disabled={idx===0} className="px-1 py-0.5 hover:bg-black/20 disabled:opacity-30"><ChevronLeft size={10} className="rotate-90"/></button>
                          <button onClick={()=>moveFabricType(1, t)} disabled={idx===arr.length-1} className="px-1 py-0.5 hover:bg-black/20 disabled:opacity-30"><ChevronRight size={10} className="rotate-90"/></button>
                        </div>
                        <button onClick={()=>deleteFabricType(t)} className="px-2 py-1.5 border-l border-white/20 hover:bg-red-500 hover:text-white text-red-500"><Trash2 size={12}/></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input type="text" id="newType" placeholder="เพิ่มประเภทม่านใหม่..." className="border px-3 py-1.5 rounded text-sm w-full md:w-64 focus:outline-blue-500"/>
                    <button onClick={()=>{const v=document.getElementById('newType').value; addFabricType(v); document.getElementById('newType').value='';}} className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded text-sm font-bold">เพิ่ม</button>
                  </div>
                </div>

                {type && (
                  <div className="bg-indigo-50 p-4 border border-indigo-100 rounded-lg flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row justify-between md:items-center border-b border-indigo-200 pb-2 gap-2">
                      <label className="block text-sm font-bold">3. รายการผ้า ({type})</label>
                      <input 
                        type="text" 
                        placeholder="🔍 พิมพ์ค้นหารุ่น หรือสี..." 
                        value={searchFabric}
                        onChange={e => setSearchFabric(e.target.value)}
                        className="border px-3 py-1 rounded-full text-xs w-full md:w-64 focus:outline-indigo-500 bg-white shadow-inner"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {fabricList.map(({ itemName, itemColor, imgUrl }) => (
                        <div key={`${itemName}-${itemColor}`} className="bg-white border p-2 rounded flex gap-2 relative group shadow-sm">
                          <button onClick={()=>deleteFabricItem(type, itemName, itemColor)} className="absolute top-1 right-1 bg-red-100 text-red-600 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                          <img src={imgUrl} alt="" className="w-12 h-12 object-cover rounded border"/>
                          <div className="flex flex-col justify-center flex-1 overflow-hidden">
                            <span className="text-xs font-bold truncate">{itemName}</span>
                            <span className="text-[10px] text-gray-500 truncate">{itemColor}</span>
                          </div>
                        </div>
                      ))}
                      {fabricList.length === 0 && (
                        <div className="col-span-full text-center text-gray-400 text-sm py-4">ไม่พบรายการผ้าที่ค้นหา</div>
                      )}
                    </div>

                    <div className="bg-white p-3 border rounded shadow-sm flex flex-col gap-2 mt-2">
                       <span className="text-sm font-bold text-indigo-700">เพิ่มรายการผ้าใหม่ (ทีละรายการ)</span>
                       <div className="flex flex-col md:flex-row gap-2 md:items-center">
                          <input type="text" id="addFabName" placeholder="ชื่อรุ่น (เช่น LONERO)" className="border px-2 py-1.5 rounded text-sm w-full md:w-1/3 focus:outline-indigo-500"/>
                          <input type="text" id="addFabColor" placeholder="ชื่อสี (เช่น GREY)" className="border px-2 py-1.5 rounded text-sm w-full md:w-1/3 focus:outline-indigo-500" onInput={(e) => e.target.value = e.target.value.toUpperCase()}/>
                          <label className={`bg-gray-100 border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-sm flex-1 flex justify-center items-center ${isUploading ? 'opacity-50' : 'cursor-pointer hover:bg-gray-200'}`}>
                            {isUploading ? 'กำลังอัปโหลด...' : <><Upload size={14} className="mr-1"/> เลือกรูปภาพ</>}
                            <input type="file" accept={ACCEPTED_IMAGE_FORMATS} className="hidden" id="addFabImg" disabled={isUploading} onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                const colorInput = document.getElementById('addFabColor');
                                if (colorInput && !colorInput.value.trim()) {
                                  colorInput.value = file.name.replace(/\.[^/.]+$/, "").toUpperCase();
                                }
                              }
                            }}/>
                          </label>
                       </div>
                       <button onClick={addFabricItem} disabled={isUploading} className={`bg-indigo-600 text-white py-1.5 rounded text-sm font-bold mt-1 ${isUploading ? 'opacity-50' : 'hover:bg-indigo-700'}`}>บันทึกรายการผ้า</button>
                    </div>

                    {/* --- BULK UPLOAD FOLDER SECTION --- */}
                    <div className="bg-indigo-50 p-3 border border-indigo-200 rounded shadow-sm flex flex-col gap-2 mt-2">
                       <span className="text-sm font-bold text-indigo-800">เพิ่มรายการแบบกลุ่ม (เข้าคิวทำงานเบื้องหลัง)</span>
                       <p className="text-[11px] text-gray-600 leading-tight">
                         <b>💡 เคล็ดลับ:</b> ให้นำโฟลเดอร์รุ่นผ้าทั้งหมด ไปใส่ไว้ใน <b>"โฟลเดอร์หลัก 1 อัน"</b> แล้วกดเลือกโฟลเดอร์หลักนั้น<br/>
                         ระบบจะจัดคิวอัปโหลดทีละรูป เพื่อป้องกันปัญหาโดนตัดการเชื่อมต่อจากเซิร์ฟเวอร์
                       </p>
                       <label className={`bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded text-sm flex justify-center items-center font-bold shadow-sm transition-colors cursor-pointer hover:bg-indigo-100 border-indigo-300 text-indigo-700`}>
                         <Upload size={14} className="mr-1"/> เลือกโฟลเดอร์หลัก (รวมหลายรุ่น)
                         <input type="file" webkitdirectory="true" directory="true" multiple accept={ACCEPTED_IMAGE_FORMATS} className="hidden" onChange={handleBulkUploadQueue}/>
                       </label>
                    </div>

                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'styles' && (
              <div className="flex flex-col gap-4">
                 <h3 className="font-bold text-lg text-blue-700 border-b pb-2">จัดการรูปแบบผ้าม่าน และรูปตัวอย่าง</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="flex flex-col"><label className="font-bold text-sm mb-2">1. รายชื่อรูปแบบม่าน (บรรทัดละ 1 รายการ)</label><textarea rows="15" className="w-full border p-3 text-sm rounded focus:outline-blue-500 leading-relaxed" value={localText.styles} onChange={e => handleLocalText('styles', e.target.value)}></textarea></div>
                   <div className="flex flex-col"><label className="font-bold text-sm mb-2">2. อัปโหลดรูปตัวอย่างรูปแบบม่าน</label>
                     <div className="flex flex-col gap-2 overflow-y-auto pr-2 max-h-[400px]">
                       {(appDB.styles || []).map(styleName => (
                         <div key={styleName} className="flex items-center justify-between border p-2 rounded bg-gray-50">
                           <span className="text-sm font-bold flex-1 truncate mr-2">{styleName}</span>
                           {appDB.styleImages?.[styleName] ? <img src={appDB.styleImages[styleName]} className="w-10 h-10 object-cover bg-white border mr-2 rounded"/> : <div className="w-10 h-10 bg-gray-200 border border-dashed flex items-center justify-center mr-2 rounded text-[8px] text-gray-500">ไม่มีรูป</div>}
                           <label className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded text-xs cursor-pointer">อัปโหลด
                            <input type="file" accept={ACCEPTED_IMAGE_FORMATS} className="hidden" onChange={handleImageUpload((url) => { setAppDB(prev => ({ ...prev, styleImages: { ...(prev.styleImages || {}), [styleName]: url } })); })}/>
                           </label>
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
                        <label className={`bg-blue-600 text-white px-4 py-2.5 rounded text-sm font-bold text-center shadow-sm transition-colors mt-2 ${isUploading ? 'opacity-50' : 'hover:bg-blue-700 cursor-pointer'}`}>
                          <Upload size={16} className="inline mr-2"/> {isUploading ? 'กำลังอัปโหลด...' : 'อัปโหลดรูป Mask'}
                          <input type="file" accept={ACCEPTED_IMAGE_FORMATS} className="hidden" disabled={isUploading} onChange={handleImageUpload((url) => {
                            const st = document.getElementById('maskStyle').value;
                            const ac = document.getElementById('maskAction').value || 'ALL';
                            if(st && ac) {
                              const newDB = JSON.parse(JSON.stringify(appDB));
                              if(!newDB.masks) newDB.masks = {};
                              if(!newDB.masks[st]) newDB.masks[st] = {};
                              newDB.masks[st][ac] = url;
                              setAppDB(newDB);
                            } else {
                              setDialog({ type: 'alert', message: "กรุณาเลือกรูปแบบและลักษณะการเปิดปิดก่อนอัปโหลด" });
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
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                           <label className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded text-xs cursor-pointer">อัปโหลด
                            <input type="file" accept={ACCEPTED_IMAGE_FORMATS} className="hidden" onChange={handleImageUpload((url) => { setAppDB(prev => ({ ...prev, marginImages: { ...(prev.marginImages || {}), [marginName]: url } })); })}/>
                           </label>
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
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div><label className="font-bold text-sm block mb-1">ชนิดรางม่าน</label><textarea rows="15" className="w-full border p-2 text-sm rounded" value={localText.tracks} onChange={e => handleLocalText('tracks', e.target.value)}></textarea></div>
                     <div><label className="font-bold text-sm block mb-1">ชนิดขาจับ</label><textarea rows="15" className="w-full border p-2 text-sm rounded" value={localText.brackets} onChange={e => handleLocalText('brackets', e.target.value)}></textarea></div>
                   </div>
                 )}
                 {activeTab === 'accessories' && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div><label className="font-bold text-sm block mb-1">อุปกรณ์เสริม</label><textarea rows="15" className="w-full border p-2 text-sm rounded" value={localText.accessories} onChange={e => handleLocalText('accessories', e.target.value)}></textarea></div>
                     <div><label className="font-bold text-sm block mb-1">การแขวนม่าน</label><textarea rows="15" className="w-full border p-2 text-sm rounded" value={localText.hangStyles} onChange={e => handleLocalText('hangStyles', e.target.value)}></textarea></div>
                   </div>
                 )}
              </div>
            )}
          </div>
        </div>
        <div className="p-4 border-t bg-gray-50 flex flex-wrap justify-between items-center gap-2">
           <div className="flex gap-2">
               <button onClick={handleRecoverLocal} className="text-orange-600 hover:bg-orange-50 px-3 py-2 rounded font-bold text-xs md:text-sm">⚠️ กู้คืนข้อมูล (Local)</button>
               <button onClick={handleExportDB} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 px-3 py-2 rounded font-bold text-xs md:text-sm flex items-center"><Download size={14} className="mr-1"/> Export สำรองข้อมูล</button>
               <label className="bg-sky-50 text-sky-600 hover:bg-sky-100 border border-sky-200 px-3 py-2 rounded font-bold text-xs md:text-sm flex items-center cursor-pointer">
                  <Upload size={14} className="mr-1"/> Import ข้อมูล
                  <input type="file" accept=".json" className="hidden" onChange={handleImportDB} />
               </label>
           </div>
           <div className="flex gap-2 mt-2 md:mt-0 w-full md:w-auto justify-end">
               <button onClick={() => setShowDBSettings(false)} className="px-6 py-2 rounded font-bold text-gray-600 hover:bg-gray-200">ปิด</button>
               <button onClick={handleSaveAndClose} className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 shadow">บันทึกฐานข้อมูลออนไลน์</button>
           </div>
        </div>
      </div>
    </div>
  );
};

// --- Component: User Management Modal ---
const UserManagementModal = ({ show, onClose, setDialog, allAccounts, setAllAccounts }) => {
  const [newN, setNewN] = useState('');
  const [newU, setNewU] = useState('');
  const [newP, setNewP] = useState('');
  const [newR, setNewR] = useState('user');
  const [newSig, setNewSig] = useState('');
  const [isUploadingSig, setIsUploadingSig] = useState(false);

  const saveAcc = async (newAccounts) => {
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'accounts'), { users: newAccounts });
    setAllAccounts(newAccounts);
  };

  const handleAdd = () => {
    if(!newN || !newU || !newP) return setDialog({ type: 'alert', message: 'กรุณากรอก ชื่อ, Username และ Password ให้ครบถ้วน' });
    if(allAccounts.find(a => a.username === newU)) return setDialog({ type: 'alert', message: 'Username นี้มีอยู่แล้ว' });
    const newAcc = [...allAccounts, { id: Date.now().toString(), username: newU, password: newP, role: newR, name: newN, signatureUrl: newSig }];
    saveAcc(newAcc);
    setNewN(''); setNewU(''); setNewP(''); setNewSig('');
  };

  const handleDel = (id) => {
    if(allAccounts.find(a=>a.id===id).username === 'Admin') return setDialog({ type: 'alert', message: 'ลบบัญชี Admin หลักไม่ได้' });
    saveAcc(allAccounts.filter(a => a.id !== id));
  };

  const handleSigUpload = async (e, accountId = null) => {
    const file = e.target.files[0];
    if(file){
       setIsUploadingSig(true);
       const cmp = await processImageFile(file, 600, 0.8, setDialog);
       if(cmp){
          try {
              const transparent = await removeWhiteBackground(cmp);
              const url = await uploadImageToCloudinary(transparent);
              if(url) {
                 if(accountId) {
                     // อัปเดตลายเซ็นให้พนักงานที่มีอยู่แล้ว
                     const updatedAccounts = allAccounts.map(acc => 
                         acc.id === accountId ? { ...acc, signatureUrl: url } : acc
                     );
                     saveAcc(updatedAccounts);
                     setDialog({ type: 'alert', message: 'อัปเดตลายเซ็นสำเร็จ' });
                 } else {
                     // สำหรับฟอร์มเพิ่มพนักงานใหม่
                     setNewSig(url);
                 }
              }
              else setDialog({ type: 'alert', message: 'อัปโหลดลายเซ็นต์ไม่สำเร็จ' });
          } catch (err) {
              setDialog({ type: 'alert', message: 'ระบบโควต้าอัปโหลดรูปภาพเต็มชั่วคราว (Rate Limit) กรุณารอสักพักแล้วลองใหม่' });
          }
       }
       setIsUploadingSig(false);
    }
  };

  if(!show) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-[100000] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <h2 className="text-lg font-bold flex items-center"><Users className="mr-2"/> จัดการพนักงาน</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500"><X size={20}/></button>
        </div>
        <div className="p-4 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-2 md:items-end bg-blue-50 p-3 rounded border border-blue-100">
            <div className="flex-1"><label className="text-xs font-bold block">ชื่อ-นามสกุล</label><input type="text" value={newN} onChange={e=>setNewN(e.target.value)} className="w-full border p-1.5 rounded text-sm"/></div>
            <div className="flex-1 md:flex-[0.6]"><label className="text-xs font-bold block">Username</label><input type="text" value={newU} onChange={e=>setNewU(e.target.value)} className="w-full border p-1.5 rounded text-sm"/></div>
            <div className="flex-1 md:flex-[0.6]"><label className="text-xs font-bold block">Password</label><input type="text" value={newP} onChange={e=>setNewP(e.target.value)} className="w-full border p-1.5 rounded text-sm"/></div>
            <div><label className="text-xs font-bold block">สิทธิ์</label><select value={newR} onChange={e=>setNewR(e.target.value)} className="w-full border p-1.5 rounded text-sm"><option value="user">User</option><option value="admin">Admin</option></select></div>
            <div className="flex-1 md:flex-[0.8]"><label className="text-xs font-bold block text-indigo-700">ลายเซ็นต์ (กระดาษขาว)</label>
               <label className={`w-full border border-indigo-300 p-1.5 rounded text-xs flex justify-center items-center font-bold transition-colors ${isUploadingSig ? 'opacity-50 cursor-wait bg-gray-200' : 'bg-white hover:bg-indigo-50 text-indigo-700 cursor-pointer'}`}>
                 {isUploadingSig ? 'กำลังอัปโหลด...' : (newSig ? '✔️ มีรูปแล้ว (คลิกเปลี่ยน)' : '+ เลือกรูป')}
                 <input type="file" accept="image/*" className="hidden" disabled={isUploadingSig} onChange={(e) => handleSigUpload(e)} />
               </label>
            </div>
            <button onClick={handleAdd} className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded text-sm font-bold shadow w-full md:w-auto mt-2 md:mt-0 transition-colors">เพิ่ม</button>
          </div>
          <div className="border rounded overflow-hidden max-h-[400px] overflow-x-auto overflow-y-auto">
            <table className="w-full text-sm text-left min-w-[700px]">
              <thead className="bg-gray-800 text-white sticky top-0 z-10">
                <tr>
                  <th className="p-2 w-24 text-center">ลายเซ็นต์</th>
                  <th className="p-2">ชื่อพนักงาน</th>
                  <th className="p-2">Username</th>
                  <th className="p-2">Password</th>
                  <th className="p-2">Role</th>
                  <th className="p-2 text-center">ลบ</th>
                </tr>
              </thead>
              <tbody>
                {allAccounts.map(acc => (
                  <tr key={acc.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 flex flex-col items-center justify-center gap-1">
                      {acc.signatureUrl ? (
                         <img src={acc.signatureUrl} className="h-8 object-contain mix-blend-multiply" alt="sig"/>
                      ) : (
                         <span className="text-gray-300 text-xs">-</span>
                      )}
                      <label className="text-[10px] text-blue-600 hover:text-blue-800 cursor-pointer font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200 w-full text-center">
                        เปลี่ยนลายเซ็น
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleSigUpload(e, acc.id)} />
                      </label>
                    </td>
                    <td className="p-2 font-bold text-gray-800">{acc.name || '-'}</td>
                    <td className="p-2 text-gray-600">{acc.username}</td>
                    <td className="p-2 text-gray-500">{acc.password}</td>
                    <td className="p-2">{acc.role === 'admin' ? <span className="text-blue-600 font-bold">Admin</span> : 'User'}</td>
                    <td className="p-2 text-center"><button onClick={()=>handleDel(acc.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors"><Trash2 size={16}/></button></td>
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
const ImageAreaEditor = ({ item, appDB, handleItemChange, setDialog, idPrefix = 'editor' }) => {
  const [activeAreaId, setActiveAreaId] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [mode, setMode] = useState('draw'); 
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [cursorPos, setCursorPos] = useState(null); 
  const [pointDrag, setPointDrag] = useState(null); 
  const [panelPos, setPanelPos] = useState({ x: 10, y: 10 });
  const [draggingPanel, setDraggingPanel] = useState(false);
  const [panelDragStart, setPanelDragStart] = useState({ x: 0, y: 0 });
  const [isUploadingObj, setIsUploadingObj] = useState(false);

  const containerRef = useRef(null);
  const wrapperRef = useRef(null);

  // Esc key to cancel drawing
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isDrawing && activeAreaId) {
        handleItemChange(item.id, 'areas', item.areas.map(a => a.id === activeAreaId ? { ...a, points: [] } : a));
        setIsDrawing(false);
        setCursorPos(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawing, activeAreaId, item.areas, item.id, handleItemChange]);

  useEffect(() => {
    const handleGlobalPointMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      if (pointDrag && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const trueX = (clientX - rect.left - pan.x) / zoom;
        const trueY = (clientY - rect.top - pan.y) / zoom;
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
      window.addEventListener('touchmove', handleGlobalPointMove, { passive: false });
      window.addEventListener('mouseup', handleGlobalPointUp);
      window.addEventListener('touchend', handleGlobalPointUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalPointMove);
      window.removeEventListener('touchmove', handleGlobalPointMove);
      window.removeEventListener('mouseup', handleGlobalPointUp);
      window.removeEventListener('touchmove', handleGlobalPointUp);
    }
  }, [pointDrag, pan, zoom, item.areas, item.id]);

  useEffect(() => {
    const handleGlobalPanelMove = (e) => {
      if (draggingPanel && wrapperRef.current) {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const rect = wrapperRef.current.getBoundingClientRect();
        let newX = clientX - rect.left - panelDragStart.x;
        let newY = clientY - rect.top - panelDragStart.y;
        newX = Math.max(-500, Math.min(newX, window.innerWidth));
        newY = Math.max(-200, Math.min(newY, window.innerHeight));
        setPanelPos({ x: newX, y: newY });
      }
    };
    const handleGlobalPanelUp = () => setDraggingPanel(false);

    if (draggingPanel) {
      window.addEventListener('mousemove', handleGlobalPanelMove);
      window.addEventListener('touchmove', handleGlobalPanelMove, { passive: false });
      window.addEventListener('mouseup', handleGlobalPanelUp);
      window.addEventListener('touchend', handleGlobalPanelUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalPanelMove);
      window.removeEventListener('touchmove', handleGlobalPanelMove);
      window.removeEventListener('mouseup', handleGlobalPanelUp);
      window.removeEventListener('touchmove', handleGlobalPanelUp);
    }
  }, [draggingPanel, panelDragStart]);

  const onPanelMouseDown = (e) => {
    e.stopPropagation();
    if (wrapperRef.current) {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const rect = wrapperRef.current.getBoundingClientRect();
      setDraggingPanel(true);
      setPanelDragStart({ x: clientX - rect.left - panelPos.x, y: clientY - rect.top - panelPos.y });
    }
  };

  const handleAddArea = () => {
    const newAreaId = Date.now().toString() + '_a' + (item.areas.length + 1);
    const newArea = { 
      id: newAreaId, points: [], width: '', height: '', 
      lineColor: '#EF4444', lineWidth: 2, fabrics: [], layers: 2,
      labelColor: '#EF4444', labelSize: 14, wPos: 'top', hPos: 'right',
      maskType: '', maskPct: 20, maskOpacity: 87,
      styleMain1: '', styleAction1: '', styleMain2: '', styleAction2: ''
    };
    handleItemChange(item.id, 'areas', [...item.areas, newArea]);
    setActiveAreaId(newAreaId);
    setIsDrawing(true);
    setMode('draw');
  };

  const handleRemoveArea = (areaId) => {
    handleItemChange(item.id, 'areas', item.areas.filter(a => a.id !== areaId));
    if (activeAreaId === areaId) {
      setActiveAreaId(null);
      setIsDrawing(false);
    }
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

  const handleMouseDown = (e) => { 
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    if (mode === 'pan') setIsPanning({ x: clientX - pan.x, y: clientY - pan.y }); 
  };

  const handleMouseMove = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    if (mode === 'pan' && isPanning) { 
        if (e.cancelable) e.preventDefault();
        setPan({ x: clientX - isPanning.x, y: clientY - isPanning.y }); 
        return; 
    }
    if (mode === 'draw' && activeAreaId && isDrawing) {
        if (e.cancelable) e.preventDefault();
    }
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const trueX = (clientX - rect.left - pan.x) / zoom;
      const trueY = (clientY - rect.top - pan.y) / zoom;
      const xPct = Math.max(0, Math.min(100, (trueX / rect.width) * 100));
      const yPct = Math.max(0, Math.min(100, (trueY / rect.height) * 100));
      if (mode === 'draw' && activeAreaId && isDrawing && !pointDrag && !isPanning) setCursorPos({ x: xPct, y: yPct });
      else setCursorPos(null);
    }
  };

  const handleMouseUp = () => setIsPanning(false);
  const handleMouseLeave = () => { setIsPanning(false); setCursorPos(null); };

  const handleContentClick = (e) => {
    if (mode !== 'draw' || !activeAreaId || !isDrawing || pointDrag || isPanning || draggingPanel) return;
    
    // Fallbacks for touch vs mouse event coordinates on click
    const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    if(!clientX && !clientY) return;

    const rect = containerRef.current.getBoundingClientRect();
    const trueX = (clientX - rect.left - pan.x) / zoom;
    const trueY = (clientY - rect.top - pan.y) / zoom;
    const xPct = Math.max(0, Math.min(100, (trueX / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, (trueY / rect.height) * 100));

    const area = item.areas.find(a => a.id === activeAreaId);
    if (area && area.points.length > 0) {
      const lastPt = area.points[area.points.length - 1];
      if (Math.hypot(lastPt.x - xPct, lastPt.y - yPct) < 1) return; 
    }
    handleItemChange(item.id, 'areas', item.areas.map(a => a.id === activeAreaId ? { ...a, points: [...a.points, { x: xPct, y: yPct }] } : a));
  };

  const handlePointMouseDown = (e, areaId, pIdx) => { 
    e.stopPropagation(); 
    setActiveAreaId(areaId); 
    
    if (isDrawing && pIdx === 0 && item.areas.find(a => a.id === areaId).points.length > 2) {
      setIsDrawing(false);
      setCursorPos(null);
      return;
    }

    setPointDrag({ areaId, pIdx }); 
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsUploadingObj(true);
      const compressedDataUrl = await processImageFile(file, 1024, 0.7, setDialog);
      if(compressedDataUrl) {
         try {
             const url = await uploadImageToCloudinary(compressedDataUrl);
             if (url) {
               handleItemChange(item.id, 'image', url);
               setShowControls(true);
             } else setDialog({ type: 'alert', message: 'อัปโหลดรูปล้มเหลว' });
         } catch (err) {
             setDialog({ type: 'alert', message: 'ระบบขัดข้อง กรุณาลองใหม่' });
         }
      }
      setIsUploadingObj(false);
    }
  };

  const activeArea = item.areas.find(a => a.id === activeAreaId);

  return (
    <div ref={wrapperRef} className="flex flex-col w-full h-full relative border-b md:border-b-0 print:border-b-0 border-gray-300 bg-white">
      <div 
        className={`relative w-full flex-grow overflow-hidden bg-gray-100 ${mode === 'pan' ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : (activeAreaId && isDrawing ? 'cursor-crosshair' : 'cursor-default')}`}
        style={{ touchAction: 'none' }}
        onWheel={handleWheel} 
        onMouseDown={handleMouseDown} onTouchStart={handleMouseDown}
        onMouseMove={handleMouseMove} onTouchMove={handleMouseMove}
        onMouseUp={handleMouseUp} onTouchEnd={handleMouseUp}
        onMouseLeave={handleMouseLeave} onClick={handleContentClick}
      >
        {item.image ? (
          <>
            <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }} className={`w-full h-full absolute top-0 left-0 flex items-center justify-center transition-transform duration-75 ease-out ${(item.imageFit || 'fill') === 'fit' ? 'bg-white' : ''}`}>
              <div ref={containerRef} className="relative max-w-full max-h-full" style={item.imageFit === 'fit' ? { display: 'inline-flex' } : { width: '100%', height: '100%', display: 'flex' }}>
                <img src={item.image} alt="Window view" className="pointer-events-none block" style={item.imageFit === 'fit' ? { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' } : { width: '100%', height: '100%', objectFit: 'cover' }} />
                
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ top: 0, left: 0 }}>
                  <defs>
                    {item.areas.map(area => {
                      const clipId = `clip-${idPrefix}-${item.id}-${area.id}`;
                      return (
                        <clipPath key={clipId} id={clipId}>
                          <polygon points={area.points.map(p => `${p.x},${p.y}`).join(' ')} />
                        </clipPath>
                      )
                    })}
                  </defs>

                  {item.areas.map((area, idx) => {
                    if(area.points.length < 3) return null;
                    const minX = Math.min(...area.points.map(p=>p.x));
                    const maxX = Math.max(...area.points.map(p=>p.x));
                    const minY = Math.min(...area.points.map(p=>p.y));
                    const maxY = Math.max(...area.points.map(p=>p.y));
                    const w = maxX - minX;
                    const h = maxY - minY;
                    const clipId = `clip-${idPrefix}-${item.id}-${area.id}`;
                    
                    const styleMain1 = area.styleMain1 || item.styleMain1 || item.styleMain || '';
                    const autoMaskType = styleMain1.match(/ม้วน|พับ|มู่ลี่/) ? 'height' : 'width';
                    const maskType = area.maskType || autoMaskType;
                    const mPct = (area.maskPct || 20) / 100;
                    const maskOpacity = (area.maskOpacity ?? 87) / 100;
                    
                    const action = area.styleAction1 || item.styleAction1 || item.styleAction || '';
                    const masks = appDB.masks?.[styleMain1] || {};
                    const maskImgFallback = masks[action] || masks['ALL'] || Object.values(masks)[0];
                    let maskElements = [];
                    
                    const dist = (p1, p2) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
                    
                    if (maskImgFallback) {
                      if (maskType === 'height') {
                        let isQuad = area.points.length === 4;
                        let TL, TR, BL, BR;
                        if (isQuad) {
                          let sortedY = [...area.points].sort((a, b) => a.y - b.y);
                          let top2 = sortedY.slice(0, 2).sort((a, b) => a.x - b.x);
                          let bot2 = sortedY.slice(2, 4).sort((a, b) => a.x - b.x);
                          TL = top2[0]; TR = top2[1]; BL = bot2[0]; BR = bot2[1];
                        } else {
                          TL = {x: minX, y: minY}; TR = {x: maxX, y: minY};
                          BL = {x: minX, y: maxY}; BR = {x: maxX, y: maxY};
                        }

                        let dropL = { x: TL.x + (BL.x - TL.x) * mPct, y: TL.y + (BL.y - TL.y) * mPct };
                        let dropR = { x: TR.x + (BR.x - TR.x) * mPct, y: TR.y + (BR.y - TR.y) * mPct };

                        let clipPoly = `${TL.x},${TL.y} ${TR.x},${TR.y} ${dropR.x},${dropR.y} ${dropL.x},${dropL.y}`;
                        let clipIdAct = `${clipId}-height-act`;

                        let W = Math.max(0.1, dist(TL, TR));
                        let H = Math.max(0.1, dist(TL, dropL));

                        let u_x = (TR.x - TL.x) / W;
                        let u_y = (TR.y - TL.y) / W;
                        let v_x = (dropL.x - TL.x) / H;
                        let v_y = (dropL.y - TL.y) / H;

                        let D = u_x * v_y - u_y * v_x;
                        let imgW = W;
                        let imgH = H;

                        if (Math.abs(D) > 1e-6) {
                          let dx = dropR.x - TL.x;
                          let dy = dropR.y - TL.y;
                          let x_R = (dx * v_y - dy * v_x) / D;
                          let y_R = (u_x * dy - u_y * dx) / D;
                          imgW = Math.max(W, x_R);
                          imgH = Math.max(H, y_R);
                        }

                        maskElements.push(
                          <React.Fragment key="T">
                            <clipPath id={clipIdAct}><polygon points={clipPoly} /></clipPath>
                            <g clipPath={`url(#${clipIdAct})`}>
                              <image 
                                href={maskImgFallback} 
                                x="0" y="0" 
                                width={imgW} height={imgH} 
                                preserveAspectRatio="none" 
                                opacity={maskOpacity}
                                transform={area.points.length === 4 ? `matrix(${u_x} ${u_y} ${v_x} ${v_y} ${TL.x} ${TL.y})` : `translate(${TL.x}, ${TL.y})`}
                              />
                            </g>
                          </React.Fragment>
                        );
                      } else {
                        if (action.includes('แยกกลาง')) {
                          const leftImg = masks['รวบซ้าย'] || maskImgFallback;
                          const rightImg = masks['รวบขวา'] || maskImgFallback;
                          maskElements.push(
                            <g key="W" clipPath={`url(#${clipId})`}>
                              <image href={leftImg} x={minX} y={minY} width={w * mPct} height={h} preserveAspectRatio="none" opacity={maskOpacity} />
                              <image href={rightImg} x={maxX - (w * mPct)} y={minY} width={w * mPct} height={h} preserveAspectRatio="none" opacity={maskOpacity} />
                            </g>
                          );
                        } else if (action.includes('ขวา')) {
                          const rightImg = masks['รวบขวา'] || masks[action] || maskImgFallback;
                          maskElements.push(
                            <g key="R" clipPath={`url(#${clipId})`}>
                              <image href={rightImg} x={maxX - (w * mPct)} y={minY} width={w * mPct} height={h} preserveAspectRatio="none" opacity={maskOpacity} />
                            </g>
                          );
                        } else {
                          const leftImg = masks['รวบซ้าย'] || masks[action] || maskImgFallback;
                          maskElements.push(
                            <g key="L" clipPath={`url(#${clipId})`}>
                              <image href={leftImg} x={minX} y={minY} width={w * mPct} height={h} preserveAspectRatio="none" opacity={maskOpacity} />
                            </g>
                          );
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
                  {mode === 'draw' && activeAreaId && isDrawing && !pointDrag && cursorPos && activeArea && activeArea.points.length > 0 && (
                    <polygon points={[...activeArea.points, cursorPos].map(p => `${p.x},${p.y}`).join(' ')} fill={activeArea.lineColor} fillOpacity={0.1} stroke="none" />
                  )}
                </svg>

                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ top: 0, left: 0 }}>
                  {item.areas.map(area => {
                    const isActive = activeAreaId === area.id;
                    return (
                      <g key={area.id}>
                        {area.points.map((p, idx) => {
                          const isLast = idx === area.points.length - 1;
                          const nextP = isLast ? area.points[0] : area.points[idx + 1];
                          if (mode === 'draw' && isActive && isDrawing && isLast && !pointDrag) return null;
                          if (area.points.length < 2) return null;
                          return (
                            <line key={`line-${idx}`} x1={`${p.x}%`} y1={`${p.y}%`} x2={`${nextP.x}%`} y2={`${nextP.y}%`} stroke={area.lineColor} strokeWidth={area.lineWidth / zoom} strokeDasharray={isActive && !pointDrag && isDrawing ? "4 4" : "0"} className={isActive && !pointDrag && isDrawing ? "animate-pulse" : ""} style={{ pointerEvents: 'none' }} />
                          );
                        })}
                        {area.points.map((p, idx) => {
                          const isFirstPoint = idx === 0;
                          const isCurrentlyDrawing = mode === 'draw' && isActive && isDrawing;
                          const isHighlight = isCurrentlyDrawing && isFirstPoint && area.points.length >= 2;
                          const circleRadius = isHighlight ? 8/zoom : 4/zoom;
                          
                          return (
                            <g key={idx} className="cursor-move" style={{ pointerEvents: 'auto' }}>
                              <circle cx={`${p.x}%`} cy={`${p.y}%`} r={circleRadius} fill={isHighlight ? "#FFD700" : "white"} stroke={area.lineColor} strokeWidth={isHighlight ? 3/zoom : 2/zoom} onMouseDown={(e) => handlePointMouseDown(e, area.id, idx)} onTouchStart={(e) => handlePointMouseDown(e, area.id, idx)} className={isHighlight ? "animate-pulse" : ""} />
                            </g>
                          );
                        })}
                      </g>
                    );
                  })}
                  {mode === 'draw' && activeAreaId && isDrawing && !pointDrag && cursorPos && activeArea && activeArea.points.length > 0 && (
                    <g style={{ pointerEvents: 'none' }}>
                      <line x1={`${activeArea.points[activeArea.points.length - 1].x}%`} y1={`${activeArea.points[activeArea.points.length - 1].y}%`} x2={`${cursorPos.x}%`} y2={`${cursorPos.y}%`} stroke={activeArea.lineColor} strokeWidth={2/zoom} strokeDasharray="4 4" />
                      <line x1={`${cursorPos.x}%`} y1={`${cursorPos.y}%`} x2={`${activeArea.points[0].x}%`} y2={`${activeArea.points[0].y}%`} stroke={activeArea.lineColor} strokeWidth={2/zoom} strokeDasharray="4 4" opacity="0.5" />
                    </g>
                  )}
                </svg>

                {item.areas.map((area, idx) => {
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
                      {item.areas.length >= 2 && area.points[0] && (
                        <div style={{ position: 'absolute', left: `${area.points[0].x}%`, top: `${area.points[0].y}%`, transform: `translate(-50%, -100%) translateY(-10px)`, color: area.lineColor, fontSize: `${12/zoom}px`, whiteSpace: 'nowrap' }} className="bg-white/90 px-1.5 py-0.5 rounded shadow-sm border border-gray-300 font-bold z-10 text-center">
                          บานที่ {idx + 1}
                        </div>
                      )}
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
            </div>

            <div className="absolute top-2 left-2 flex flex-wrap gap-2 z-40 no-print" onMouseDown={e=>e.stopPropagation()} onTouchStart={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()} onWheel={e=>e.stopPropagation()}>
              <label className={`cursor-pointer bg-white/90 border border-gray-300 text-gray-700 px-3 py-1.5 rounded shadow-sm hover:bg-white flex items-center text-xs font-bold transition-colors ${isUploadingObj ? 'opacity-50 cursor-wait' : ''}`} title="เปลี่ยนเฉพาะรูปพื้นหลัง">
                <Upload size={14} className="mr-1.5"/> {isUploadingObj ? 'กำลังอัปโหลด...' : 'เปลี่ยนรูปหน้างาน'}
                <input type="file" accept={ACCEPTED_IMAGE_FORMATS} className="hidden" disabled={isUploadingObj} onChange={handleImageUpload} />
              </label>
              <button onClick={() => handleItemChange(item.id, 'imageFit', (item.imageFit || 'fill') === 'fill' ? 'fit' : 'fill')} className="cursor-pointer bg-white/90 border border-gray-300 text-gray-700 px-3 py-1.5 rounded shadow-sm hover:bg-white flex items-center text-xs font-bold transition-colors" title="เปลี่ยนรูปแบบการจัดวางรูปภาพ">
                {(item.imageFit || 'fill') === 'fill' ? 'โหมด: เต็มกรอบ (Fill)' : 'โหมด: พอดีภาพ (Fit)'}
              </button>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-100 bg-gray-50 no-print">
            <label className={`cursor-pointer bg-white text-blue-600 border border-blue-600 px-6 py-3 rounded-lg shadow-sm flex items-center transition-colors font-bold ${isUploadingObj ? 'opacity-50 cursor-wait' : 'hover:bg-blue-50'}`}>
              <Upload size={20} className="mr-2" /> {isUploadingObj ? 'กำลังอัปโหลด...' : 'อัปโหลดรูปหน้างาน'}
              <input type="file" accept={ACCEPTED_IMAGE_FORMATS} className="hidden" disabled={isUploadingObj} onChange={handleImageUpload} />
            </label>
          </div>
        )}
      </div>

      {item.image && showControls && (
        <div 
          style={{ position: 'fixed', left: panelPos.x, top: panelPos.y }}
          className="w-[90vw] sm:w-[340px] max-w-[340px] z-[99999] bg-white/95 backdrop-blur-sm border border-gray-300 rounded shadow-2xl flex flex-col no-print cursor-default transition-shadow"
          onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}
        >
          <div onMouseDown={onPanelMouseDown} onTouchStart={onPanelMouseDown} className="bg-gray-800 text-white px-3 py-2 flex justify-between items-center cursor-move rounded-t">
            <span className="font-bold text-xs flex items-center"><Move size={14} className="mr-1"/> เครื่องมือพื้นที่ (ลากอิสระ)</span>
            <button onClick={() => setShowControls(false)} className="hover:text-red-400 text-gray-300"><X size={16}/></button>
          </div>
          
          <div className="flex gap-1 p-2 bg-gray-100 border-b">
            <button onClick={() => setMode('pan')} className={`flex-1 flex justify-center items-center px-2 py-1.5 rounded text-xs font-bold transition-colors ${mode === 'pan' ? 'bg-indigo-600 text-white shadow' : 'bg-white border text-gray-700 hover:bg-gray-50'}`}><Move size={14} className="mr-1"/> เลื่อน/ซูม</button>
            <button onClick={() => setMode('draw')} className={`flex-1 flex justify-center items-center px-2 py-1.5 rounded text-xs font-bold transition-colors ${mode === 'draw' ? 'bg-red-500 text-white shadow' : 'bg-white border text-gray-700 hover:bg-gray-50'}`}><MousePointerClick size={14} className="mr-1"/> จัดการพื้นที่</button>
          </div>

          <div className="p-2 text-sm flex flex-col gap-2 max-h-[350px] overflow-y-auto">
            <div className="flex justify-between items-center">
               <button onClick={()=>{handleAddArea();}} className="bg-green-600 text-white px-3 py-1.5 rounded shadow-sm font-bold flex items-center text-xs hover:bg-green-700"><Plus size={14} className="mr-1"/> เพิ่มพื้นที่ม่าน</button>
               {mode === 'draw' && activeAreaId && isDrawing && <span className="text-red-500 font-bold bg-red-50 px-2 py-1.5 rounded border border-red-200 text-[10px] animate-pulse">คลิกจุดเริ่มต้น เพื่อจบเส้น (ESC ยกเลิก)</span>}
            </div>

            {item.areas.map((area, idx) => {
              const isActive = activeAreaId === area.id;
              const styleMain1 = area.styleMain1 || item.styleMain1 || item.styleMain || '';
              const autoMaskType = styleMain1.match(/ม้วน|พับ|มู่ลี่/) ? 'height' : 'width';
              return (
                <div key={area.id} className={`flex flex-col gap-2 border p-2.5 rounded bg-white transition-all ${isActive ? 'border-blue-400 ring-2 ring-blue-100 shadow-md' : 'border-gray-200'}`}>
                  <div className="flex flex-wrap gap-1 items-center justify-between">
                    <div className="flex gap-1 items-center">
                      <button onClick={() => { setActiveAreaId(isActive ? null : area.id); if(!isActive) setIsDrawing(false); setMode('draw'); }} className={`px-2 py-1 rounded border font-bold flex items-center text-xs ${isActive ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'}`}>บานที่ {idx + 1}</button>
                      {isActive && (
                        <button onClick={() => setIsDrawing(!isDrawing)} className={`px-2 py-1 text-[10px] rounded font-bold shadow-sm transition-colors ${isDrawing ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                          {isDrawing ? 'หยุดวาดจุด' : '+ วาดจุดเพิ่ม'}
                        </button>
                      )}
                    </div>
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
  const [dialog, setDialog] = useState(null);
  const [allAccounts, setAllAccounts] = useState(DEFAULT_ACCOUNTS);
  
  // Dashboard Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');

  // Background Upload State
  const [bgUploadQueue, setBgUploadQueue] = useState([]);
  const [bgUploadProgress, setBgUploadProgress] = useState({ current: 0, total: 0, active: false });
  const processingRef = useRef(false);
  const appDBRef = useRef(appDB);

  const [generalInfo, setGeneralInfo] = useState({
    surveyDate: new Date().toISOString().split('T')[0], confirmDate: '', installDates: [], location: '',
    customerName: '', customerPhone: '', agentName: '', agentPhone: '', customFabrics: [],
    creatorName: '', creatorSignature: '',
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

  useEffect(() => {
    if (!firebaseUser) return;
    const fetchAcc = async () => {
      const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'accounts'));
      if(snap.exists() && snap.data().users) setAllAccounts(snap.data().users);
      else setAllAccounts(DEFAULT_ACCOUNTS);
    };
    fetchAcc();
  }, [firebaseUser]);

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

  // Real-time DB Sync Fix - 100% Online Only with Recovery
  useEffect(() => {
    if (!firebaseUser || !appUser) return;
    const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'appDB');
    const unsub = onSnapshot(settingsRef, (snap) => {
      if (snap.exists() && snap.data() && Object.keys(snap.data()).length > 0) {
        const mergedDB = { ...DEFAULT_DB, ...snap.data() };
        setAppDB(mergedDB);
        appDBRef.current = mergedDB;
        localStorage.setItem('backupAppDB', JSON.stringify(mergedDB)); // Save backup to device
      } else {
        const localBackup = localStorage.getItem('backupAppDB');
        if(localBackup) {
           setAppDB(JSON.parse(localBackup));
           appDBRef.current = JSON.parse(localBackup);
        } else {
           setAppDB(DEFAULT_DB);
           appDBRef.current = DEFAULT_DB;
        }
      }
    }, (err) => {
      console.error("DB Sync Error:", err);
    });
    return () => unsub();
  }, [firebaseUser, appUser]);
  
  // Sync appDBRef when appDB changes manually
  useEffect(() => {
      appDBRef.current = appDB;
  }, [appDB]);

  const saveAppDBToFirebase = async (newDB) => {
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'appDB'), newDB);
      return true;
    } catch (err) {
      console.error("Failed to save appDB", err);
      if (err.code === 'resource-exhausted' || err.message.includes('large') || err.message.includes('Limit')) {
          setDialog({ type: 'alert', message: 'เกิดข้อผิดพลาด: ข้อมูลรูปภาพในฐานข้อมูลเต็มความจุ (เกิน 1MB) กรุณาลบรูปที่ไม่จำเป็นออกแล้วลองบันทึกใหม่' });
      } else {
          setDialog({ type: 'alert', message: 'เกิดข้อผิดพลาดในการบันทึกฐานข้อมูล: ' + err.message });
      }
      return false;
    }
  };
  
  // --- Background Queue Processor ---
  useEffect(() => {
    const processQueue = async () => {
      processingRef.current = true;
      const queueToProcess = [...bgUploadQueue];
      setBgUploadProgress({ current: 0, total: queueToProcess.length, active: true });
      
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 0; i < queueToProcess.length; i++) {
        const task = queueToProcess[i];
        setBgUploadProgress(p => ({ ...p, current: i + 1 }));
        
        const compressedImg = await processImageFile(task.file, 400, 0.7, null);
        if (compressedImg) {
          try {
            // Upload with Cloudinary (No strict rate limits like ImgBB)
            const url = await uploadImageToCloudinary(compressedImg); 
            if (url) {
              setAppDB(prev => {
                const newDB = JSON.parse(JSON.stringify(prev));
                if (!newDB.curtainTypes[task.cat]) newDB.curtainTypes[task.cat] = {};
                if (!newDB.curtainTypes[task.cat][task.type]) newDB.curtainTypes[task.cat][task.type] = {};
                if (!newDB.curtainTypes[task.cat][task.type][task.folderName]) newDB.curtainTypes[task.cat][task.type][task.folderName] = {};
                newDB.curtainTypes[task.cat][task.type][task.folderName][task.fileNameWithoutExt] = url;
                return newDB;
              });
              successCount++;
            } else { failCount++; }
          } catch (err) { 
              console.error("Task failed:", err);
              failCount++; 
          }
        } else { failCount++; }
      }
      
      // Finalize Batch
      setTimeout(() => {
        saveAppDBToFirebase(appDBRef.current);
        setDialog({ type: 'alert', message: `✅ อัปโหลดรูปภาพเบื้องหลังเสร็จสิ้น!\nสำเร็จ: ${successCount} รูป\nล้มเหลว: ${failCount} รูป` });
        setBgUploadQueue([]); 
        setBgUploadProgress({ current: 0, total: 0, active: false });
        processingRef.current = false;
      }, 1000);
    };

    if (bgUploadQueue.length > 0 && !processingRef.current) {
      processQueue();
    }
  }, [bgUploadQueue]);

  const handleLogout = () => {
    localStorage.removeItem('curtainAppUser');
    setAppUser(null);
  };

  if (!appUser) return <LoginScreen onLogin={(user) => setAppUser(user)} />;

  const handleCreateNew = () => {
    setCurrentProjectId(Date.now().toString());
    const currentUserInfo = allAccounts.find(u => u.username === appUser.username) || appUser;
    
    setGeneralInfo({
      surveyDate: new Date().toISOString().split('T')[0], confirmDate: '', installDates: [], location: '',
      customerName: '', customerPhone: '', agentName: '', agentPhone: '', customFabrics: [],
      creatorName: currentUserInfo.name || currentUserInfo.username,
      creatorSignature: currentUserInfo.signatureUrl || '',
      terms: `กรณีมีการเปลี่ยนแปลงรายละเอียดจากที่ตกลงไว้ในใบสรุปงานติดตั้งผ้าม่านนี้ ผู้สั่งซื้อยินยอมที่จะชำระเงินเพิ่มในส่วนของ\n(A) ค่าแก้ไขผ้าม่านและอุปกรณ์ เช่น ความสูง ความกว้างของผ้าม่าน รางม่าน ที่เกิดจากหน้างานเปลี่ยนแปลง บิ้วท์อินเพิ่มเติม ฯลฯ\n(B) ค่าติดตั้งรางละ 200 บาท\n(C) ค่าเดินทาง 1,500 บาท ใน กทม. (ต่างจังหวัดคิดตามระยะทาง)\nการเลื่อนคิวงานติตตั้ง ขอความกรุณาลูกค้าแจ้งพนักงานขายก่อนวันติดตั้ง อย่างน้อย 5 วันทำการ ถ้าน้อยกว่า 5 วัน จะมีค่าดำเนินการ 3,000 บาท / ครั้ง\nบริษัทฯ จะรับผิดชอบดำเนินการแก้ไขงาน ในกรณีที่ความผิดพลาดเกิดจากบริษัทฯ เท่านั้น`
    });
    setItems([]);
    addItem();
    setView('editor');
  };

  const handleEdit = (proj) => {
    setCurrentProjectId(proj.id);
    
    const ownerAcc = allAccounts.find(u => u.username === proj.owner);
    let cName = proj.generalInfo?.creatorName;
    let cSig = proj.generalInfo?.creatorSignature;
    
    // Auto-resolve older projects that might have saved username instead of actual name
    if (ownerAcc) {
        if (!cName || cName === proj.owner) cName = ownerAcc.name || ownerAcc.username;
        if (!cSig) cSig = ownerAcc.signatureUrl || '';
    }

    setGeneralInfo({ 
       ...proj.generalInfo, 
       customFabrics: proj.generalInfo?.customFabrics || [],
       creatorName: cName || appUser.name || appUser.username,
       creatorSignature: cSig || ''
    });
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

  const handleDelete = (id, e) => {
    e.stopPropagation();
    setDialog({
      type: 'confirm',
      message: 'คุณต้องการลบใบงานนี้ใช่หรือไม่?',
      onConfirm: async () => {
        try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projects', id)); loadProjectsList(); } 
        catch(err) { console.error(err); }
      }
    });
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
  
  const handleCreatorChange = (e) => {
    const val = e.target.value;
    const u = allAccounts.find(acc => (acc.name || acc.username) === val);
    setGeneralInfo(prev => ({
      ...prev,
      creatorName: val,
      creatorSignature: u ? (u.signatureUrl || '') : prev.creatorSignature
    }));
  };

  const addInstallDate = () => { if (tempInstallDate && !generalInfo.installDates.includes(tempInstallDate)) { setGeneralInfo(prev => ({ ...prev, installDates: [...prev.installDates, tempInstallDate] })); setTempInstallDate(''); } };
  const removeInstallDate = (date) => setGeneralInfo(prev => ({ ...prev, installDates: prev.installDates.filter(d => d !== date) }));

  const addItem = () => {
    setItems(prev => [...prev, {
      id: Date.now().toString(), image: null, imageFit: 'fill', layers: 2,
      areas: [{ id: Date.now().toString() + '_a1', points: [], width: '', height: '', lineColor: '#EF4444', lineWidth: 2, fabrics: [], labelColor: '#EF4444', labelSize: 14, wPos: 'top', hPos: 'right', maskPct: 20, maskOpacity: 87, maskType: '', styleMain1: '', styleAction1: '', styleMain2: '', styleAction2: '' }],
      roomPos: '', styleMain1: '', styleAction1: '', styleMain2: '', styleAction2: '', tracks: [], bracket: '', accessories: [], hangStyle: '',
      marginLeft: '', customMarginLeft: '', marginRight: '', customMarginRight: '', marginTop: '', customMarginTop: '', marginBottom: '', customMarginBottom: '', note: ''
    }]);
  };
  
  const removeItem = (id) => setItems(prev => prev.filter(item => item.id !== id));
  
  const handleItemChange = (id, field, value) => {
    setItems(prevItems => prevItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const updateAreaField = (itemId, areaId, field, value) => {
    setItems(prevItems => prevItems.map(item => item.id === itemId ? {
      ...item,
      areas: item.areas.map(a => a.id === areaId ? { ...a, [field]: value } : a)
    } : item));
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
    if (!value.trim()) return;
    setItems(prevItems => prevItems.map(item => {
      if (item.id === itemId) {
        const currentList = item[field] || [];
        return { ...item, [field]: currentList.includes(value) ? currentList.filter(v => v !== value) : [...currentList, value] };
      }
      return item;
    }));
  };

  // Helper Function for Smart Grouping Areas by Dimensions & Styles
  const getGroupedAreas = (item) => {
    const groups = {};
    item.areas.forEach((area, idx) => {
      const w = area.width || '-';
      const h = area.height || '-';
      const s1 = area.styleMain1 || item.styleMain1 || item.styleMain || '-';
      const a1 = area.styleAction1 || item.styleAction1 || item.styleAction || '-';
      const s2 = item.layers === 2 ? (area.styleMain2 || item.styleMain2 || '-') : '';
      const a2 = item.layers === 2 ? (area.styleAction2 || item.styleAction2 || '-') : '';
      
      let key = `${w}|${h}###${s1}|${a1}|${s2}|${a2}`;
      
      if (!groups[key]) {
        groups[key] = { labelNums: [], w, h, s1, a1, s2, a2 };
      }
      groups[key].labelNums.push(idx + 1);
    });
    return Object.values(groups);
  };

  const formatBaanLabel = (nums, total) => {
    if (nums.length === total && total > 1) return "ทุกบาน";
    if (nums.length === 1) return `บานที่ ${nums[0]}`;
    if (nums.length === 2) return `บานที่ ${nums[0]} และ ${nums[1]}`;
    return `บานที่ ${nums.slice(0, -1).join(', ')} และ ${nums[nums.length - 1]}`;
  };

  // Filter projects for Dashboard
  const filteredProjects = projectsList.filter(proj => {
    const matchSearch = proj.generalInfo?.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const passSearch = searchQuery.trim() === '' || matchSearch;
    const passFilter = filterEmployee === '' || proj.owner === filterEmployee;
    return passSearch && passFilter;
  });

  if (view === 'dashboard') {
    return (
      <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans">
        <AlertDialog dialog={dialog} onClose={() => setDialog(null)} />
        <UserManagementModal show={showUserMgmt} onClose={()=>setShowUserMgmt(false)} setDialog={setDialog} allAccounts={allAccounts} setAllAccounts={setAllAccounts} />
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between md:items-center bg-white p-4 rounded-lg shadow-sm mb-6 border-b-4 border-blue-600 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Confirmation Form</h1>
              <p className="text-sm text-gray-500">ระบบจัดการใบงานผ้าม่าน - สวัสดีคุณ <span className="font-bold text-blue-600">{appUser.name || appUser.username}</span> {appUser.role === 'admin' && '(Admin)'}</p>
            </div>
            <div className="flex flex-wrap gap-2 md:gap-3">
              {appUser.role === 'admin' && <button onClick={()=>setShowUserMgmt(true)} className="bg-purple-600 text-white px-4 py-2 rounded flex items-center justify-center font-bold hover:bg-purple-700 shadow flex-1 md:flex-none"><Users size={16} className="mr-2"/> จัดการพนักงาน</button>}
              <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded flex items-center justify-center font-bold hover:bg-red-600 shadow flex-1 md:flex-none"><LogOut size={16} className="mr-2"/> ออกจากระบบ</button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-3">
             <h2 className="text-xl font-bold text-gray-700 whitespace-nowrap mr-auto w-full md:w-auto">รายการใบงานทั้งหมด ({filteredProjects.length})</h2>
             <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
               <input 
                 type="text" 
                 placeholder="🔍 ค้นหาชื่อลูกค้า..." 
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
                 className="border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-blue-500 shadow-sm w-full sm:w-64"
               />
               {appUser.role === 'admin' && (
                 <select 
                   value={filterEmployee}
                   onChange={e => setFilterEmployee(e.target.value)}
                   className="border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-blue-500 shadow-sm w-full sm:w-auto"
                 >
                   <option value="">- พนักงานทั้งหมด -</option>
                   {allAccounts.map(acc => (
                     <option key={acc.id} value={acc.username}>{acc.name || acc.username}</option>
                   ))}
                 </select>
               )}
               <button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg flex items-center justify-center font-bold shadow-md transition-colors w-full sm:w-auto shrink-0"><Plus size={18} className="mr-1.5"/> สร้างใบงาน</button>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {filteredProjects.map(proj => {
               const creatorNameDisplay = allAccounts.find(a => a.username === proj.owner)?.name || proj.owner;
               return (
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
                     <span>ผู้ทำ: <span className="font-bold text-gray-700">{creatorNameDisplay}</span></span>
                     <span>อัปเดต: {new Date(proj.updatedAt).toLocaleDateString('th-TH')}</span>
                   </div>
                 </div>
               )
             })}
             {filteredProjects.length === 0 && <div className="col-span-full text-center p-10 bg-white rounded-lg border-2 border-dashed text-gray-400 font-bold">ไม่พบใบงานที่ค้นหา</div>}
          </div>
        </div>
      </div>
    );
  }

  const currentCreatorAcc = allAccounts.find(a => (a.name || a.username) === generalInfo.creatorName);
  const displayCreatorName = generalInfo.creatorName || '-';

  return (
    <div className="min-h-screen bg-gray-100 py-8 font-sans print:p-0">
      <AlertDialog dialog={dialog} onClose={() => setDialog(null)} />
      <DatabaseModal appDB={appDB} setAppDB={setAppDB} showDBSettings={showDBSettings} setShowDBSettings={setShowDBSettings} saveAppDB={saveAppDBToFirebase} setDialog={setDialog} setBgUploadQueue={setBgUploadQueue} />
      <CustomFabricModal show={showCustomFabricModal} onClose={()=>setShowCustomFabricModal(false)} onAdd={(fab)=>setGeneralInfo(prev=>({...prev, customFabrics: [...(prev.customFabrics||[]), fab]}))} setDialog={setDialog} />

      {/* --- BACKGROUND UPLOAD TOAST --- */}
      {bgUploadProgress.active && (
        <div className="fixed bottom-6 left-6 bg-indigo-900 text-white p-4 rounded-lg shadow-2xl z-[9999999] flex flex-col gap-2 w-72 border border-indigo-700 no-print transition-all">
            <div className="flex items-center justify-between">
                <span className="font-bold text-sm flex items-center"><Upload size={14} className="mr-2 animate-bounce"/> อัปโหลดรูปลงฐานข้อมูล...</span>
            </div>
            <div className="w-full bg-indigo-950 rounded-full h-2.5 overflow-hidden border border-indigo-800">
                <div className="bg-emerald-400 h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${(bgUploadProgress.current / bgUploadProgress.total) * 100}%` }}></div>
            </div>
            <div className="flex justify-between text-xs font-bold text-indigo-200">
                <span>กำลังประมวลผล (แอบทำเบื้องหลัง)</span>
                <span>{bgUploadProgress.current} / {bgUploadProgress.total}</span>
            </div>
        </div>
      )}

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

      <div className="max-w-[1200px] mx-auto bg-white shadow-lg p-4 md:p-8 rounded-sm relative z-0 print:shadow-none print:p-0 print:bg-transparent w-full print:max-w-none">
        
        {/* --- Page 1: General Info --- */}
        <div className="print-center-page w-full">
          <div className="print-content-wrapper w-full">
            <div className="text-center mb-6 border-b-2 border-gray-800 pb-3 flex justify-between items-center avoid-break relative">
              <button onClick={()=>{saveData(); setView('dashboard');}} className="absolute -left-12 md:-left-20 top-1/2 transform -translate-y-1/2 no-print bg-gray-200 hover:bg-gray-300 text-gray-700 p-2 rounded-full shadow-md transition-colors"><ArrowLeft size={24}/></button>
              <div className="w-1/3 text-left no-print flex flex-col md:flex-row gap-2">
                {appUser.role === 'admin' && <button onClick={()=>setShowDBSettings(true)} className="bg-gray-700 text-white px-3 py-2 rounded flex items-center hover:bg-gray-800 text-xs shadow font-bold transition-colors w-fit"><Settings size={16} className="mr-1.5"/> ฐานข้อมูล</button>}
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800 w-1/3">ใบสรุปงานติดตั้งผ้าม่าน</h1>
              <div className="w-1/3 text-right"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-4 avoid-break text-sm relative z-0">
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
                
                {/* Creator & Signature Section */}
                <div className="mt-8 flex flex-col items-center justify-end relative h-24">
                  {generalInfo.creatorSignature && (
                    <div className="h-12 w-full flex justify-center items-end mb-1">
                      <img src={generalInfo.creatorSignature} className="max-h-full object-contain mix-blend-multiply" alt="signature" />
                    </div>
                  )}
                  {appUser.role === 'admin' ? (
                    <select 
                       value={generalInfo.creatorName || ''} 
                       onChange={handleCreatorChange} 
                       className="border-b border-gray-400 w-48 text-center text-[15px] font-bold text-blue-800 outline-none appearance-none bg-transparent cursor-pointer print-hidden relative z-10 pb-0.5"
                    >
                      <option value="">- ระบุผู้จัดทำ -</option>
                      {allAccounts.map(a => <option key={a.id} value={a.name || a.username}>{a.name || a.username}</option>)}
                    </select>
                  ) : (
                    <div className="border-b border-gray-400 w-48 text-center text-[15px] font-bold text-blue-800 print-hidden relative z-10 pb-0.5">
                      {displayCreatorName}
                    </div>
                  )}
                  <div className="hidden print-block w-48 text-center text-[15px] font-bold border-b border-gray-400 pb-0.5 text-black relative z-10">
                    {displayCreatorName}
                  </div>
                  <p className="text-gray-600 text-sm font-bold mt-1">ผู้จัดทำ</p>
                </div>
              </div>

              <div className="p-4 border border-gray-300 rounded-md bg-blue-50/30 flex flex-col">
                <h2 className="font-bold mb-3 border-b border-gray-300 pb-1 inline-block text-base text-gray-800">ส่วนลูกค้า</h2>
                <div className="space-y-2.5">
                  <div className="flex items-center"><span className="w-32 font-bold text-gray-700">ชื่อ-นามสกุล :</span><input type="text" name="customerName" value={generalInfo.customerName} onChange={handleGeneralChange} className="flex-1 border-b border-gray-300 outline-none focus:border-blue-500 px-1 font-bold text-blue-800 text-[15px] print:text-black bg-transparent" /></div>
                  <div className="flex items-center"><span className="w-32 font-bold text-gray-700">เบอร์ติดต่อ :</span><input type="text" name="customerPhone" value={generalInfo.customerPhone} onChange={handleGeneralChange} className="flex-1 border-b border-gray-300 outline-none focus:border-blue-500 px-1 font-medium bg-transparent" /></div>
                  <div className="flex items-center mt-4"><span className="w-32 font-bold text-gray-700">ผู้ติดต่อแทน :</span><input type="text" name="agentName" value={generalInfo.agentName} onChange={handleGeneralChange} className="flex-1 border-b border-gray-300 outline-none focus:border-blue-500 px-1 font-medium bg-transparent" /></div>
                  <div className="flex items-center"><span className="w-32 font-bold text-gray-700">เบอร์ติดต่อ :</span><input type="text" name="agentPhone" value={generalInfo.agentPhone} onChange={handleGeneralChange} className="flex-1 border-b border-gray-300 outline-none focus:border-blue-500 px-1 font-medium bg-transparent" /></div>
                </div>
                <div className="mt-auto pt-8 text-center flex flex-col items-center justify-end h-24">
                  <p className="border-b border-gray-400 w-48 mx-auto mb-1"></p>
                  <p className="text-gray-600 text-sm font-bold">ผู้สั่งซื้อ</p>
                </div>
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
        <div className="space-y-10 print:space-y-0 w-full flex flex-col items-center">
          {items.map((item, index) => {
            const primaryArea = item.areas[0] || {};
            const sMain1 = primaryArea.styleMain1 || item.styleMain1 || item.styleMain || '';
            const sMain2 = primaryArea.styleMain2 || item.styleMain2 || '';
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
               const allFabs = primaryArea.fabrics || [];
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

                  <div className="border border-gray-300 flex flex-col lg:flex-row print:flex-row h-auto lg:h-[750px] print:h-[185mm] mt-8 md:mt-0 bg-white relative overflow-hidden w-full box-border">
                    
                    {/* Left Column 70% */}
                    <div className="w-full lg:w-[70%] print:w-[70%] min-h-[400px] h-[50vh] sm:h-[60vh] lg:h-full print:h-full border-b lg:border-b-0 print:border-b-0 lg:border-r print:border-r border-gray-300 flex flex-col bg-white relative z-20">
                      
                      <div className="flex-1 w-full border-b border-gray-300 flex flex-col relative bg-gray-100 shrink-0 overflow-hidden">
                        <ImageAreaEditor item={item} appDB={appDB} handleItemChange={handleItemChange} setDialog={setDialog} idPrefix="print" />
                      </div>
                      
                      <div className="h-[25%] lg:h-[30%] print:h-[30%] min-h-[100px] w-full p-2 bg-gray-50 flex items-center overflow-x-auto">
                        <div className="w-full h-full min-w-[350px] md:min-w-[400px] grid grid-cols-4 gap-1.5 sm:gap-2 print:gap-4">
                          
                          <div className="flex flex-col items-center bg-white border border-gray-200 p-1.5 sm:p-2 rounded shadow-sm h-full justify-between overflow-hidden">
                            <span className="text-[11px] sm:text-[13px] font-bold text-gray-800 w-full text-center mb-1 sm:mb-2 shrink-0">รูปแบบม่าน</span>
                            <div className="flex-1 w-full bg-gray-50 border border-gray-100 flex items-center justify-center rounded overflow-hidden p-0 relative mb-1 sm:mb-2">
                              {styleImg1 ? <img src={styleImg1} className="w-full h-full object-cover" /> : <div dangerouslySetInnerHTML={{__html: SVGS.th}} className="w-full h-full" />}
                            </div>
                            <AutoFitText text={`${sMain1 || '-'} ${item.layers === 2 ? `/ ${sMain2 || '-'}` : ''}`} className="text-blue-800 print:text-black" />
                          </div>

                          <div className="flex flex-col items-center bg-white border border-gray-200 p-1.5 sm:p-2 rounded shadow-sm h-full justify-between overflow-hidden">
                            <span className="text-[11px] sm:text-[13px] font-bold text-gray-800 w-full text-center mb-1 sm:mb-2 shrink-0">{txtMain || 'ชั้นที่ 1'}</span>
                            <div className="flex-1 w-full border border-gray-100 flex items-center justify-center rounded overflow-hidden bg-gray-50 p-0 mb-1 sm:mb-2">
                              {imgMain ? <img src={imgMain} className="w-full h-full object-cover" /> : <span className="text-[10px] text-gray-400">-</span>}
                            </div>
                            <AutoFitText text={colMain || '-'} className="text-gray-700" />
                          </div>

                          <div className={`flex flex-col items-center bg-white border border-gray-200 p-1.5 sm:p-2 rounded shadow-sm h-full justify-between overflow-hidden ${item.layers === 1 ? 'opacity-40 print:opacity-50' : ''}`}>
                            <span className="text-[11px] sm:text-[13px] font-bold text-gray-800 w-full text-center mb-1 sm:mb-2 shrink-0">{item.layers === 2 ? (txtSheer || 'ชั้นที่ 2') : 'ชั้นที่ 2'}</span>
                            <div className="flex-1 w-full border border-gray-100 flex items-center justify-center rounded overflow-hidden bg-gray-50 p-0 mb-1 sm:mb-2">
                              {item.layers === 2 && imgSheer ? <img src={imgSheer} className="w-full h-full object-cover" /> : <span className="text-[10px] text-gray-400">-</span>}
                            </div>
                            <AutoFitText text={item.layers === 2 ? (colSheer || '-') : '-'} className="text-gray-700" />
                          </div>

                          <div className="flex flex-col items-center bg-white border border-gray-200 p-1.5 sm:p-2 rounded shadow-sm h-full justify-between overflow-hidden">
                            <span className="text-[11px] sm:text-[13px] font-bold text-gray-800 w-full text-center mb-1 sm:mb-2 shrink-0">ระยะชายม่าน</span>
                            <div className="flex-1 w-full bg-gray-50 border border-gray-100 flex items-center justify-center rounded overflow-hidden p-0 mb-1 sm:mb-2">
                              {marginImg ? <img src={marginImg} className="w-full h-full object-cover" /> : <span className="text-[10px] text-gray-400">-</span>}
                            </div>
                            <AutoFitText text={item.marginBottom || '-'} className="text-gray-700" />
                          </div>

                        </div>
                      </div>
                    </div>

                    {/* Right Column 30% */}
                    <div className="w-full lg:w-[30%] print:w-[30%] text-xs flex flex-col bg-white overflow-y-auto print:overflow-visible min-h-[400px] lg:h-full print:h-auto relative z-10 print:justify-start">
                      
                      <div className="bg-gray-800 text-white p-3 print:bg-white print:text-black print:p-3 print:pb-0 flex flex-col shrink-0">
                        <span className="mb-1 text-gray-300 print-hidden font-bold text-xs">ห้อง / ตำแหน่ง :</span>
                        <textarea value={item.roomPos} onChange={(e)=>handleItemChange(item.id, 'roomPos', e.target.value)} className="w-full bg-transparent outline-none border-b border-gray-500 focus:border-white resize-none text-sm font-bold leading-tight print-hidden placeholder-gray-400 text-yellow-300" placeholder="ระบุห้อง เช่น ชั้น 1 / โถงกลม บานที่ 1" rows="2" />
                        <div className="hidden print-block w-full text-[15px] font-bold leading-tight text-black whitespace-pre-wrap border-b border-gray-800 pb-2 mb-1">{item.roomPos || '-'}</div>
                      </div>
                      
                      <div className="p-3 print:p-2 flex flex-col justify-start gap-4 print:gap-3 h-full print:h-auto print:justify-start">
                        
                        {/* ---------------- EDITOR VIEW (NO PRINT) ---------------- */}
                        <div className="border border-gray-300 p-2 rounded bg-gray-50 no-print">
                          <div className="flex justify-between items-center mb-2 border-b border-gray-300 pb-1">
                            <span className="font-bold text-gray-800 text-[14px]">รายละเอียดวัสดุ/ผ้า</span>
                            <button onClick={()=>setShowCustomFabricModal(true)} className="no-print bg-indigo-100 hover:bg-indigo-200 text-indigo-700 border border-indigo-200 px-2 py-1 rounded text-[10px] font-bold shadow-sm transition-colors flex items-center"><Plus size={12} className="mr-0.5"/> ผ้านอกระบบ</button>
                          </div>
                          {item.areas.length === 0 && <span className="text-gray-400 italic no-print text-xs">เพิ่มพื้นที่บนรูปหน้างานก่อน</span>}
                          {item.areas.map((area, aIdx) => (
                            <div className="mb-3 border-l-[3px] border-blue-500 pl-2 pb-2 border-b border-gray-200" key={area.id}>
                              <div className="font-bold text-blue-800 mb-1.5 flex justify-between items-center bg-blue-50 px-1.5 py-1 rounded text-[12px]">
                                <span>บานที่ {aIdx + 1} <span className="font-normal">(ก:{area.width||'-'} ส:{area.height||'-'})</span></span>
                                <div className="flex items-center gap-2">
                                  {area.fabrics.length < (item.layers || 2) && (
                                    <button onClick={()=>addFabricToArea(item.id, area.id)} className="text-blue-600 hover:text-blue-800 no-print flex items-center bg-white px-2 py-0.5 border border-blue-200 shadow-sm rounded text-[10px] transition-colors"><Plus size={12} className="mr-0.5"/> เพิ่มผ้า</button>
                                  )}
                                </div>
                              </div>
                              {/* Fabrics List for this area */}
                              {area.fabrics.map((fab) => {
                                const isCustom = fab.mainType === 'ผ้านอกระบบ (เฉพาะงานนี้)';
                                const isCurtain = fab.mainType === 'ผ้าม่าน';
                                const mainTypeOptions = [...Object.keys(appDB.curtainTypes || {}), ...(generalInfo.customFabrics?.length > 0 ? ['ผ้านอกระบบ (เฉพาะงานนี้)'] : [])];
                                
                                let subTypeOptions = []; 
                                let nameOptions = []; 
                                let colorOptions = [];
                                
                                // Combined models for 'ผ้าม่าน'
                                let curtainModels = [];
                                if (isCurtain && appDB.curtainTypes['ผ้าม่าน']) {
                                    Object.entries(appDB.curtainTypes['ผ้าม่าน']).forEach(([sT, mods]) => {
                                        Object.keys(mods).forEach(mName => curtainModels.push({ modelName: mName, subType: sT }));
                                    });
                                    curtainModels.sort((a,b) => a.modelName.localeCompare(b.modelName));
                                }

                                if (isCustom) {
                                  const cFabs = generalInfo.customFabrics || [];
                                  subTypeOptions = [...new Set(cFabs.map(f=>f.subType))].filter(Boolean).sort((a,b)=>a.localeCompare(b));
                                  nameOptions = [...new Set(cFabs.filter(f=>f.subType === fab.subType).map(f=>f.name))].filter(Boolean).sort((a,b)=>a.localeCompare(b));
                                  colorOptions = [...new Set(cFabs.filter(f=>f.subType === fab.subType && f.name === fab.name).map(f=>f.color))].filter(Boolean).sort((a,b)=>a.localeCompare(b));
                                } else if (isCurtain) {
                                  nameOptions = curtainModels.map(m => m.modelName);
                                  const matchModel = curtainModels.find(m => m.modelName === fab.name);
                                  if (matchModel) {
                                      colorOptions = Object.keys(appDB.curtainTypes['ผ้าม่าน'][matchModel.subType][fab.name] || {}).sort();
                                  }
                                } else {
                                  subTypeOptions = fab.mainType ? Object.keys(appDB.curtainTypes[fab.mainType] || {}).sort((a,b)=>a.localeCompare(b)) : [];
                                  nameOptions = fab.subType ? Object.keys(appDB.curtainTypes[fab.mainType]?.[fab.subType] || {}).sort((a,b)=>a.localeCompare(b)) : [];
                                  colorOptions = fab.name ? Object.keys(appDB.curtainTypes[fab.mainType]?.[fab.subType]?.[fab.name] || {}).sort((a,b)=>a.localeCompare(b)) : [];
                                }

                                const nameListId = `names-${item.id}-${area.id}-${fab.id}`;
                                const colorListId = `colors-${item.id}-${area.id}-${fab.id}`;

                                return (
                                  <div key={fab.id} className="flex flex-col gap-1.5 mb-1.5 bg-white p-1.5 border border-gray-200 rounded relative pr-5 shadow-sm">
                                    <button onClick={()=>removeFabric(item.id, area.id, fab.id)} className="absolute top-1 right-1 text-red-500 hover:bg-red-50 rounded no-print transition-colors"><X size={14}/></button>
                                    <div className="flex flex-col gap-1.5">
                                      <div className="flex gap-1.5">
                                        <select value={fab.mainType} onChange={(e)=>updateFabric(item.id, area.id, fab.id, 'mainType', e.target.value)} className={`border-b border-gray-300 outline-none text-[11px] bg-transparent font-bold ${isCustom ? 'text-indigo-600' : 'text-gray-700'} ${isCurtain ? 'w-full' : 'w-1/2'}`}>
                                          <option value="">-หมวดหมู่-</option>{mainTypeOptions.map(o=><option key={o} value={o}>{o}</option>)}
                                        </select>
                                        {!isCurtain && (
                                            <select value={fab.subType} onChange={(e)=>updateFabric(item.id, area.id, fab.id, 'subType', e.target.value)} className="w-1/2 border-b border-gray-300 outline-none text-[11px] bg-transparent font-bold text-indigo-700" disabled={!fab.mainType}>
                                              <option value="">-ประเภทม่าน-</option>{subTypeOptions.map(o=><option key={o} value={o}>{o}</option>)}
                                            </select>
                                        )}
                                      </div>
                                      <div className="flex gap-1.5">
                                        <div className="w-1/2 relative">
                                          <input list={nameListId} value={fab.name} onChange={(e) => {
                                             const val = e.target.value.toUpperCase();
                                             if (isCurtain) {
                                                 const match = curtainModels.find(m => m.modelName === val);
                                                 const sType = match ? match.subType : fab.subType;
                                                 setItems(prev => prev.map(it => it.id === item.id ? { ...it, areas: it.areas.map(a => a.id === area.id ? { ...a, fabrics: a.fabrics.map(f => f.id === fab.id ? { ...f, name: val, subType: sType, color: '' } : f) } : a) } : it));
                                             } else {
                                                 updateFabric(item.id, area.id, fab.id, 'name', val);
                                             }
                                          }} className="w-full border-b border-gray-300 outline-none text-[11px] bg-transparent font-medium" disabled={!fab.mainType || (!isCurtain && !fab.subType)} placeholder="-พิมพ์ค้นหารุ่น-"/>
                                          <datalist id={nameListId}>{nameOptions.map(o=><option key={o} value={o}/>)}</datalist>
                                        </div>
                                        <div className="w-1/2 relative">
                                          <input list={colorListId} value={fab.color} onChange={(e)=>updateFabric(item.id, area.id, fab.id, 'color', e.target.value)} className="w-full border-b border-gray-300 outline-none text-[11px] bg-transparent font-medium text-gray-600" disabled={!fab.name} placeholder="-พิมพ์ค้นหาสี-"/>
                                          <datalist id={colorListId}>{colorOptions.map(o=><option key={o} value={o}/>)}</datalist>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                              
                              {/* Specific Area Style Config (Overrides Global) */}
                              <div className="flex flex-col gap-1.5 mt-2 bg-indigo-50/50 p-2 rounded border border-indigo-100">
                                <span className="font-bold text-[10px] text-indigo-800 mb-0.5">รูปแบบการทำงาน (กำหนดเฉพาะบานนี้)</span>
                                <div className="flex gap-1.5 items-center">
                                  <span className="text-[10px] font-bold text-gray-500 w-10 shrink-0">ชั้นที่ 1:</span>
                                  <select value={area.styleMain1 || ''} onChange={(e)=>updateAreaField(item.id, area.id, 'styleMain1', e.target.value)} className="w-1/2 border-b border-gray-300 outline-none text-[11px] bg-transparent font-bold text-gray-700"><option value="">-ตามค่าเริ่มต้น-</option>{(appDB.styles || []).map(s=><option key={s} value={s}>{s}</option>)}</select>
                                  <select value={area.styleAction1 || ''} onChange={(e)=>updateAreaField(item.id, area.id, 'styleAction1', e.target.value)} className="w-1/2 border-b border-gray-300 outline-none text-[11px] bg-transparent font-bold text-gray-700"><option value="">-ตามค่าเริ่มต้น-</option>{(appDB.actions || []).map(s=><option key={s} value={s}>{s}</option>)}</select>
                                </div>
                                {item.layers === 2 && (
                                  <div className="flex gap-1.5 items-center mt-1">
                                    <span className="text-[10px] font-bold text-gray-500 w-10 shrink-0">ชั้นที่ 2:</span>
                                    <select value={area.styleMain2 || ''} onChange={(e)=>updateAreaField(item.id, area.id, 'styleMain2', e.target.value)} className="w-1/2 border-b border-gray-300 outline-none text-[11px] bg-transparent font-bold text-gray-700"><option value="">-ตามค่าเริ่มต้น-</option>{(appDB.styles || []).map(s=><option key={s} value={s}>{s}</option>)}</select>
                                    <select value={area.styleAction2 || ''} onChange={(e)=>updateAreaField(item.id, area.id, 'styleAction2', e.target.value)} className="w-1/2 border-b border-gray-300 outline-none text-[11px] bg-transparent font-bold text-gray-700"><option value="">-ตามค่าเริ่มต้น-</option>{(appDB.actions || []).map(s=><option key={s} value={s}>{s}</option>)}</select>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* ---------------- PRINT VIEW (SMART GROUPING) ---------------- */}
                        <div className="hidden print-block w-full mt-2">
                          <span className="font-bold text-gray-800 text-[14px] border-b border-gray-800 pb-1 mb-2 block">รูปแบบและขนาดม่าน</span>
                          {getGroupedAreas(item).map((grp, gIdx) => (
                             <div key={gIdx} className="mb-3 pl-2 border-l-[3px] border-gray-800">
                                <span className="font-bold text-black text-[13px] block mb-1">
                                  {formatBaanLabel(grp.labelNums, item.areas.length)} : <span className="font-normal">ก:{grp.w} ส:{grp.h}</span>
                                </span>
                                <div className="text-[12px] leading-snug">
                                   <span className="text-gray-800 block"><span className="font-bold">ชั้นที่ 1:</span> {grp.s1} {grp.a1 !== '-' ? `/ ${grp.a1}` : ''}</span>
                                   {item.layers === 2 && (
                                      <span className="text-gray-800 block mt-0.5"><span className="font-bold">ชั้นที่ 2:</span> {grp.s2} {grp.a2 !== '-' ? `/ ${grp.a2}` : ''}</span>
                                   )}
                                </div>
                             </div>
                          ))}
                        </div>

                        <div className="flex flex-col gap-3 py-1 flex-1 justify-start">
                          <div className="flex flex-col print-hidden">
                            <span className="font-bold text-gray-800 text-[14px] border-b border-gray-300 pb-1 mb-1">รูปแบบการทำงาน (ค่าเริ่มต้นทั้งหมด)</span>
                            <div className="flex items-center gap-4 mb-2 bg-gray-100 p-1.5 rounded">
                              <span className="text-[11px] font-bold text-gray-600">จำนวนชั้นม่าน:</span>
                              <label className="flex items-center gap-1 text-[11px] cursor-pointer font-bold"><input type="radio" checked={item.layers === 1} onChange={()=>handleLayerChange(item.id, 1)}/> 1 ชั้น</label>
                              <label className="flex items-center gap-1 text-[11px] cursor-pointer font-bold"><input type="radio" checked={item.layers !== 1} onChange={()=>handleLayerChange(item.id, 2)}/> 2 ชั้น</label>
                            </div>
                            <div className="flex gap-1.5 items-center mt-0.5">
                              {item.layers !== 1 && <span className="text-[10px] font-bold text-gray-500 w-10 shrink-0">ชั้นที่ 1:</span>}
                              <select value={item.styleMain1 || item.styleMain || ''} onChange={(e)=>handleItemChange(item.id, 'styleMain1', e.target.value)} className="w-1/2 border-b border-gray-400 outline-none bg-transparent text-blue-800 font-bold text-xs"><option value="">-รูปแบบ-</option>{(appDB.styles || []).map(s=><option key={s} value={s}>{s}</option>)}</select>
                              <span className="text-gray-400 font-bold">/</span>
                              <select value={item.styleAction1 || item.styleAction || ''} onChange={(e)=>handleItemChange(item.id, 'styleAction1', e.target.value)} className="w-1/2 border-b border-gray-400 outline-none bg-transparent text-blue-800 font-bold text-xs"><option value="">-เปิดปิด-</option>{(appDB.actions || []).map(s=><option key={s} value={s}>{s}</option>)}</select>
                            </div>
                            {item.layers !== 1 && (
                              <div className="flex gap-1.5 items-center mt-1.5">
                                <span className="text-[10px] font-bold text-gray-500 w-10 shrink-0">ชั้นที่ 2:</span>
                                <select value={item.styleMain2 || ''} onChange={(e)=>handleItemChange(item.id, 'styleMain2', e.target.value)} className="w-1/2 border-b border-gray-400 outline-none bg-transparent text-blue-800 font-bold text-xs"><option value="">-รูปแบบ-</option>{(appDB.styles || []).map(s=><option key={s} value={s}>{s}</option>)}</select>
                                <span className="text-gray-400 font-bold">/</span>
                                <select value={item.styleAction2 || ''} onChange={(e)=>handleItemChange(item.id, 'styleAction2', e.target.value)} className="w-1/2 border-b border-gray-400 outline-none bg-transparent text-blue-800 font-bold text-xs"><option value="">-เปิดปิด-</option>{(appDB.actions || []).map(s=><option key={s} value={s}>{s}</option>)}</select>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col"><span className="font-bold text-gray-800 text-[14px] border-b border-gray-300 pb-1 mb-1">รางม่าน</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {item.tracks?.map(tStr => <span key={tStr} className="bg-gray-100 px-2 py-0.5 rounded border border-gray-300 text-[12px] flex items-center shadow-sm font-bold text-gray-800">{tStr} <X size={10} className="ml-1 cursor-pointer text-red-500 no-print" onClick={()=>handleMultiSelect(item.id, 'tracks', tStr)}/></span>)}
                              <select className="w-full border-b border-gray-300 outline-none no-print mt-1 text-[11px] text-gray-500 font-medium bg-transparent" onChange={(e) => {if(e.target.value) handleMultiSelect(item.id, 'tracks', e.target.value); e.target.value='';}}><option value="">+ เลือกชนิดรางม่าน</option>{(appDB.tracks || []).map(s=><option key={s} value={s}>{s}</option>)}</select>
                              <div className="flex w-full gap-1 mt-1 no-print">
                                 <input type="text" id={`customTrack-${item.id}`} placeholder="หรือพิมพ์ระบุเอง..." className="flex-1 border border-gray-200 rounded px-2 py-1 outline-none text-[11px] bg-white shadow-sm focus:border-blue-400" onKeyDown={(e) => { if(e.key === 'Enter' && e.target.value.trim()) { handleMultiSelect(item.id, 'tracks', e.target.value.trim()); e.target.value=''; } }} />
                                 <button onClick={() => { const inp = document.getElementById(`customTrack-${item.id}`); if(inp && inp.value.trim()) { handleMultiSelect(item.id, 'tracks', inp.value.trim()); inp.value=''; } }} className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 px-2 py-1 rounded text-[11px] font-bold shadow-sm transition-colors">+</button>
                              </div>
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
                              {item.accessories?.map(tStr => <span key={tStr} className="bg-gray-100 px-2 py-0.5 rounded border border-gray-300 text-[12px] flex items-center shadow-sm font-bold text-gray-800">{tStr} <X size={10} className="ml-1 cursor-pointer text-red-500 no-print" onClick={()=>handleMultiSelect(item.id, 'accessories', tStr)}/></span>)}
                              <select className="w-full border-b border-gray-300 outline-none no-print mt-1 text-[11px] text-gray-500 font-medium bg-transparent" onChange={(e) => {if(e.target.value) handleMultiSelect(item.id, 'accessories', e.target.value); e.target.value='';}}><option value="">+ เลือกอุปกรณ์เสริม</option>{(appDB.accessories || []).map(s=><option key={s} value={s}>{s}</option>)}</select>
                              <div className="flex w-full gap-1 mt-1 no-print">
                                 <input type="text" id={`customAcc-${item.id}`} placeholder="หรือพิมพ์ระบุเอง..." className="flex-1 border border-gray-200 rounded px-2 py-1 outline-none text-[11px] bg-white shadow-sm focus:border-blue-400" onKeyDown={(e) => { if(e.key === 'Enter' && e.target.value.trim()) { handleMultiSelect(item.id, 'accessories', e.target.value.trim()); e.target.value=''; } }} />
                                 <button onClick={() => { const inp = document.getElementById(`customAcc-${item.id}`); if(inp && inp.value.trim()) { handleMultiSelect(item.id, 'accessories', inp.value.trim()); inp.value=''; } }} className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 px-2 py-1 rounded text-[11px] font-bold shadow-sm transition-colors">+</button>
                              </div>
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

                        <div className="flex flex-col pt-2 border-t border-gray-300 shrink-0 mt-auto">
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
        <button onClick={saveData} disabled={saving} className={`group relative ${saving ? 'bg-gray-500' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-full p-4 shadow-xl flex items-center justify-center transition-transform hover:scale-110 border-2 border-white`} title="บันทึกงาน">
          <Save size={24} />
          <span className="absolute right-[110%] bg-indigo-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity mr-2">บันทึกงาน</span>
          {saveStatus && <span className="absolute right-[110%] mr-2 bg-green-600 text-white px-3 py-1.5 rounded text-sm font-bold whitespace-nowrap shadow-lg">{saveStatus}</span>}
        </button>
        <button onClick={addItem} className="group relative bg-green-600 hover:bg-green-700 text-white rounded-full p-4 shadow-xl flex items-center justify-center transition-transform hover:scale-110 border-2 border-white" title="เพิ่มหน้าต่างบานใหม่">
          <Plus size={24} />
          <span className="absolute right-[110%] bg-green-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity mr-2">เพิ่มหน้าต่าง</span>
        </button>
        <button onClick={handleSharePDF} className="group relative bg-orange-500 hover:bg-orange-600 text-white rounded-full p-4 shadow-xl flex items-center justify-center transition-transform hover:scale-110 border-2 border-white" title="แชร์เป็น PDF (แนวนอน)">
          <Share2 size={24} />
          <span className="absolute right-[110%] bg-orange-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity mr-2">แชร์ PDF</span>
        </button>
        <button onClick={printDocument} className="group relative bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-xl flex items-center justify-center transition-transform hover:scale-110 border-2 border-white" title="พิมพ์เอกสาร">
          <Printer size={24} />
          <span className="absolute right-[110%] bg-blue-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity mr-2">พิมพ์</span>
        </button>
      </div>
    </div>
  );
};

export default App;