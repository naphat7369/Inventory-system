"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Plus, Trash2, ArrowUp, ArrowDown, Save, Eye, Lock } from 'lucide-react';
import Link from 'next/link';
import { DEFAULT_S_HOTEL_LOGO_URL } from '@/lib/constants';

export type Signature = {
  id?: string;
  role: string;
  name?: string | null;
  position?: string | null;
  sortOrder: number;
};

export type DepartmentItem = {
  id: string;
  name: string;
  nameEn?: string | null;
  code: string;
  logoUrl?: string | null;
  logoAssetId?: string | null;
};

export type MemoInitialData = {
  id?: string;
  departmentId?: string;
  subHeader?: string | null;
  logoUrl?: string | null;
  logoAssetId?: string | null;
  documentDate?: string | Date;
  recipient?: string;
  sender?: string;
  subject?: string;
  reference?: string | null;
  carbonCopy?: string | null;
  content?: string;
  remark?: string | null;
  status?: string;
  signatures?: Signature[];
};

export type MemoFormProps = {
  departments: DepartmentItem[];
  initialData?: MemoInitialData | null;
  isEdit?: boolean;
  userDepartmentId?: string | null;
  isAdmin?: boolean;
};

const DEFAULT_SIGNATURES: Signature[] = [
  { role: 'นำเสนอโดย', name: '', position: '', sortOrder: 0 },
  { role: 'รับทราบโดย', name: '', position: '', sortOrder: 1 },
  { role: 'รับทราบโดย', name: '', position: '', sortOrder: 2 },
  { role: 'อนุมัติโดย', name: '', position: '', sortOrder: 3 },
  { role: 'อนุมัติโดย', name: '', position: '', sortOrder: 4 },
];

export function MemoForm({ departments, initialData, isEdit, userDepartmentId, isAdmin = false }: MemoFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Determine initial department ID
  const defaultDeptId = isEdit
    ? (initialData?.departmentId || '')
    : (userDepartmentId || (isAdmin ? (departments[0]?.id || '') : ''));

  const [departmentId, setDepartmentId] = useState(defaultDeptId);
  const selectedDepartment = departments.find(d => d.id === departmentId);

  const [subHeader, setSubHeader] = useState(
    initialData?.subHeader || 
    (selectedDepartment?.nameEn || (selectedDepartment ? `${selectedDepartment.name} DEPARTMENT`.toLocaleUpperCase('en-US') : ''))
  );

  const [documentDate, setDocumentDate] = useState(
    initialData?.documentDate 
      ? new Date(initialData.documentDate).toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0]
  );
  const [recipient, setRecipient] = useState(initialData?.recipient || '');
  const [sender, setSender] = useState(initialData?.sender || '');
  const [subject, setSubject] = useState(initialData?.subject || '');
  const [reference, setReference] = useState(initialData?.reference || '');
  const [carbonCopy, setCarbonCopy] = useState(initialData?.carbonCopy || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [remark, setRemark] = useState(initialData?.remark || '');
  
  const [signatures, setSignatures] = useState<Signature[]>(
    initialData?.signatures && initialData.signatures.length > 0 ? initialData.signatures : DEFAULT_SIGNATURES
  );

  const isFinal = isEdit && initialData?.status === 'FINAL';
  const isCancelled = isEdit && initialData?.status === 'CANCELLED';

  // Read logo from existing memo snapshot if edit, otherwise default S Hotel logo
  const currentDisplayLogo = isEdit && initialData?.logoUrl ? initialData.logoUrl : DEFAULT_S_HOTEL_LOGO_URL;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleChange = () => {
    if (!isDirty) setIsDirty(true);
  };

  const handleDepartmentChange = (newDeptId: string) => {
    setDepartmentId(newDeptId);
    handleChange();
    const dept = departments.find(d => d.id === newDeptId);
    if (dept && !isEdit) {
      const newSubHeader = dept.nameEn || `${dept.name} DEPARTMENT`.toLocaleUpperCase('en-US');
      setSubHeader(newSubHeader);
    }
  };

  const handleSignatureChange = (index: number, field: keyof Signature, value: string) => {
    const newSigs = [...signatures];
    newSigs[index] = { ...newSigs[index], [field]: value };
    setSignatures(newSigs);
    handleChange();
  };

  const addSignature = () => {
    setSignatures([...signatures, { role: 'ลงชื่อ', name: '', position: '', sortOrder: signatures.length }]);
    handleChange();
  };

  const removeSignature = (index: number) => {
    const newSigs = signatures.filter((_, i) => i !== index).map((s, i) => ({ ...s, sortOrder: i }));
    setSignatures(newSigs);
    handleChange();
  };

  const moveSignature = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === signatures.length - 1) return;
    
    const newSigs = [...signatures];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    const temp = newSigs[index];
    newSigs[index] = newSigs[swapIndex];
    newSigs[swapIndex] = temp;
    
    newSigs[index].sortOrder = index;
    newSigs[swapIndex].sortOrder = swapIndex;
    
    setSignatures(newSigs);
    handleChange();
  };

  const handleSubmit = async (e: React.FormEvent, isPreview: boolean = false) => {
    e.preventDefault();
    if (isCancelled) return;
    
    setLoading(true);

    try {
      const payload = {
        departmentId,
        subHeader: subHeader.trim().toLocaleUpperCase('en-US'),
        documentDate,
        recipient,
        sender,
        subject,
        reference: reference || null,
        carbonCopy: carbonCopy || null,
        content,
        remark: remark.trim() || null,
        signatures: signatures.filter(s => s.role.trim() !== '')
      };

      const url = isEdit && initialData?.id ? `/api/memos/${initialData.id}` : '/api/memos';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save memo');
      }

      const savedData = await res.json();
      setIsDirty(false);
      
      if (isPreview) {
        router.push(`/memos/${savedData.id}`);
      } else {
        router.push('/memos');
      }
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการบันทึกเอกสาร');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="max-w-5xl mx-auto flex flex-col gap-8 pb-16" onChange={handleChange}>
      
      {/* Header & Logo Snapshot Section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h2 className="text-xl font-bold mb-6 border-b pb-4">การตั้งค่าหัวเอกสาร & Logo (Header & Branding)</h2>
        
        {/* Fixed S HOTEL Logo Display */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-800/40 rounded-xl border border-gray-200 dark:border-slate-700">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Logo ประจำเอกสาร (Fixed S HOTEL Logo)
          </label>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg flex items-center justify-center p-2 shadow-xs shrink-0">
                <img
                  src={currentDisplayLogo}
                  alt="S HOTEL Logo"
                  className="max-w-full max-h-full object-contain"
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                    ⭐ S HOTEL Official Logo (v1)
                  </span>
                  {isFinal && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      🔒 ล็อกตามสถานะ FINAL
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  โลโก้ทางการของ S HOTEL กำหนดเป็นมาตรฐานตายตัวและจะถูกบันทึกเป็น Snapshot ประจำเอกสารฉบับนี้โดยอัตโนมัติ
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Subheader & Department selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Department (แผนก) <span className="text-red-500">*</span>
            </label>
            
            {isAdmin ? (
              // Admin can select from active departments
              <div>
                <select
                  value={departmentId}
                  onChange={e => handleDepartmentChange(e.target.value)}
                  required
                  disabled={isFinal || isCancelled}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 disabled:opacity-60 text-sm"
                >
                  <option value="">-- Select Department --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
                {(isFinal || isCancelled) && <p className="text-xs text-gray-500 mt-1">Cannot change department after finalizing.</p>}
                {!isFinal && !isCancelled && <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">👑 สิทธิ์ Admin: สามารถเลือกแผนกที่เปิดใช้งานเพื่อสร้าง Memo ได้</p>}
              </div>
            ) : (
              // Regular user: locked to their own department
              <div>
                <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 font-medium">
                  <span>{selectedDepartment ? `${selectedDepartment.name} (${selectedDepartment.code})` : 'ไม่ระบุแผนก'}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Lock size={12} /> แผนกประจำบัญชี
                  </span>
                </div>
                <input type="hidden" name="departmentId" value={departmentId} />
                <p className="text-xs text-gray-500 mt-1">สร้าง Memo ในนามแผนกของคุณเท่านั้น (ไม่สามารถเปลี่ยนแผนกได้)</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ชื่อแผนกภาษาอังกฤษ (ใต้คำว่า MEMORANDUM) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={subHeader}
              onChange={e => {
                setSubHeader(e.target.value.toLocaleUpperCase('en-US'));
                handleChange();
              }}
              placeholder="เช่น ACCOUNT DEPARTMENT, FOOD & BEVERAGE DEPARTMENT"
              required
              disabled={isFinal || isCancelled}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 uppercase disabled:opacity-60 text-sm font-medium"
            />
            <p className="text-[11px] text-gray-500 mt-1">จะถูกแปลงเป็นตัวพิมพ์ใหญ่ (UPPERCASE) อัตโนมัติเสมอ</p>
          </div>
        </div>
      </div>

      {/* Main Memo Form Fields */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h2 className="text-xl font-bold mb-6 border-b pb-4">รายละเอียดบันทึกข้อความ (Memo Details)</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Document Date (วันที่) <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={documentDate}
              onChange={e => { setDocumentDate(e.target.value); handleChange(); }}
              required
              disabled={isCancelled}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 disabled:opacity-60 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              To (เรียน) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={recipient}
              onChange={e => { setRecipient(e.target.value); handleChange(); }}
              placeholder="เช่น ดร.สรัญ ลิ้มสวัสดิ์วงศ์ Managing Director"
              required
              disabled={isCancelled}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 disabled:opacity-60 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              From (จาก) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={sender}
              onChange={e => { setSender(e.target.value); handleChange(); }}
              placeholder="เช่น นภัทร วรรณหม้อ ( IT Officer)"
              required
              disabled={isCancelled}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 disabled:opacity-60 text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reference (อ้างถึง)
            </label>
            <input
              type="text"
              value={reference}
              onChange={e => { setReference(e.target.value); handleChange(); }}
              placeholder="เช่น การหยุดงานเกิน 4 วัน"
              disabled={isCancelled}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 disabled:opacity-60 text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Subject (เรื่อง) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={e => { setSubject(e.target.value); handleChange(); }}
              placeholder="เช่น ขออนุญาตลาหยุดงานเกิน 4 วัน"
              required
              disabled={isCancelled}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 disabled:opacity-60 text-sm font-medium"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              CC (สำเนา)
            </label>
            <input
              type="text"
              value={carbonCopy}
              onChange={e => { setCarbonCopy(e.target.value); handleChange(); }}
              placeholder="เช่น HR S31"
              disabled={isCancelled}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 disabled:opacity-60 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Content Editor */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h2 className="text-xl font-bold mb-6 border-b pb-4">Content (เนื้อหา)</h2>
        <RichTextEditor 
          value={content} 
          onChange={(val) => { setContent(val); handleChange(); }} 
          disabled={isCancelled}
        />
      </div>

      {/* Signatures Form */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div>
            <h2 className="text-xl font-bold">Signatures (รายชื่อผู้เซ็น)</h2>
            <p className="text-xs text-gray-500 mt-1">ระบบจะจัดตำแหน่งให้อยู่กึ่งกลางสวยงามตามจำนวนผู้เซ็นโดยอัตโนมัติ</p>
          </div>
          {!isCancelled && (
            <button type="button" onClick={addSignature} className="text-sm flex items-center gap-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors">
              <Plus size={16} /> Add Signature Box
            </button>
          )}
        </div>
        
        <div className="space-y-4">
          {signatures.map((sig, index) => (
            <div key={index} className="flex flex-col md:flex-row gap-3 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700 items-center">
              <div className="flex flex-col gap-1 text-gray-400">
                <button type="button" onClick={() => moveSignature(index, 'up')} disabled={index === 0 || isCancelled} className="hover:text-gray-700 disabled:opacity-30">
                  <ArrowUp size={18} />
                </button>
                <button type="button" onClick={() => moveSignature(index, 'down')} disabled={index === signatures.length - 1 || isCancelled} className="hover:text-gray-700 disabled:opacity-30">
                  <ArrowDown size={18} />
                </button>
              </div>
              
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Role (เช่น นำเสนอโดย, อนุมัติโดย)</label>
                  <input
                    type="text"
                    value={sig.role}
                    onChange={e => handleSignatureChange(index, 'role', e.target.value)}
                    required
                    disabled={isCancelled}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Name (ชื่อ-นามสกุล)</label>
                  <input
                    type="text"
                    value={sig.name || ''}
                    onChange={e => handleSignatureChange(index, 'name', e.target.value)}
                    disabled={isCancelled}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Position (ตำแหน่ง)</label>
                  <input
                    type="text"
                    value={sig.position || ''}
                    onChange={e => handleSignatureChange(index, 'position', e.target.value)}
                    disabled={isCancelled}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 disabled:opacity-60"
                  />
                </div>
              </div>
              
              {!isCancelled && (
                <button type="button" onClick={() => removeSignature(index)} className="text-red-500 hover:text-red-700 p-2 ml-2 self-start md:self-center" title="Delete">
                  <Trash2 size={20} />
                </button>
              )}
            </div>
          ))}
          {signatures.length === 0 && (
            <p className="text-center text-gray-500 py-4">No signatures added.</p>
          )}
        </div>
      </div>

      {/* Footer Remarks / หมายเหตุกั้นท้าย */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <div className="mb-4 border-b pb-3">
          <h2 className="text-xl font-bold">หมายเหตุกั้นท้าย (Footer Remarks)</h2>
          <p className="text-xs text-gray-500 mt-1">
            ข้อความหมายเหตุเพิ่มเติมที่จะแสดงในส่วนกั้นท้ายเอกสาร (ใต้ลายเซ็น) เช่น เงื่อนไข สิทธิ ข้อกำหนด หรือคำชี้แจงเพิ่มเติม
          </p>
        </div>
        <textarea
          value={remark}
          onChange={e => { setRemark(e.target.value); handleChange(); }}
          placeholder="เช่น หมายเหตุ: 1. อุปกรณ์คอมพิวเตอร์และสิทธิ์การใช้งานถือเป็นกรรมสิทธิ์ของโรงแรม S Hotel&#10;2. เมื่อสิ้นสุดการใช้งานต้องส่งมอบคืนแผนก IT ทันที"
          rows={3}
          disabled={isCancelled}
          className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 disabled:opacity-60 text-sm font-sans"
        />
      </div>

      <div className="flex gap-4 justify-end">
        <Link href={isEdit && initialData?.id ? `/memos/${initialData.id}` : "/memos"} className="px-6 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium">
          Cancel
        </Link>
        {!isCancelled && (
          <>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, false)}
              disabled={loading || !departmentId || !subject || !content}
              className="px-6 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
            >
              <Save size={18} /> {isEdit ? 'Save Changes' : 'Save Draft'}
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={loading || !departmentId || !subject || !content}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
            >
              <Eye size={18} /> Save & Preview
            </button>
          </>
        )}
      </div>
    </form>
  );
}
