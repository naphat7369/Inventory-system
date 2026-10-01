"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MEMO_UPLOAD_CHUNK_BYTES } from '@/lib/memo-upload';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Plus, Trash2, ArrowUp, ArrowDown, Save, Eye, Lock, Bookmark, BookmarkPlus, Loader2, Paperclip, UploadCloud, FileText, Download, X } from 'lucide-react';
import Link from 'next/link';
import { DEFAULT_S_HOTEL_LOGO_URL } from '@/lib/constants';
import { SignatureTemplateManager, SignatureTemplate } from './components/SignatureTemplateManager';
import { SearchableSelect, type SearchableSelectOption } from './components/SearchableSelect';

export type Signature = {
  id?: string;
  role: string;
  name?: string | null;
  position?: string | null;
  sortOrder: number;
};

async function uploadMemoAttachmentInChunks(memoId: string, file: File) {
  if (file.size < 1) throw new Error(`ไฟล์ “${file.name}” ไม่มีข้อมูล`);
  const uploadId = crypto.randomUUID();
  const chunkCount = Math.ceil(file.size / MEMO_UPLOAD_CHUNK_BYTES);

  for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
    const start = chunkIndex * MEMO_UPLOAD_CHUNK_BYTES;
    const chunk = file.slice(start, Math.min(start + MEMO_UPLOAD_CHUNK_BYTES, file.size));
    const headers = {
      'Content-Type': 'application/octet-stream',
      'X-Upload-Id': uploadId,
      'X-Upload-Chunk-Index': String(chunkIndex),
      'X-Upload-Chunk-Count': String(chunkCount),
      'X-Upload-File-Size': String(file.size),
      'X-Upload-File-Name': encodeURIComponent(file.name),
      'X-Upload-File-Type': file.type || 'application/octet-stream',
    };
    let response: Response | null = null;
    let lastNetworkError: unknown = null;
    const maxAttempts = chunkIndex < chunkCount - 1 ? 3 : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        response = await fetch(`/api/memos/${memoId}/attachments`, { method: 'POST', headers, body: chunk });
        break;
      } catch (error) {
        lastNetworkError = error;
        if (attempt < maxAttempts) await new Promise((resolve) => window.setTimeout(resolve, attempt * 300));
      }
    }

    if (!response) throw lastNetworkError instanceof Error ? lastNetworkError : new Error('การเชื่อมต่อถูกตัดระหว่างอัปโหลด');
    const body = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) throw new Error(body.error ?? `แนบไฟล์ “${file.name}” ไม่สำเร็จ`);
  }
}

export type DepartmentItem = {
  id: string;
  name: string;
  nameEn?: string | null;
  code: string;
  logoUrl?: string | null;
  logoAssetId?: string | null;
  branchId?: string | null;
};

export type MemoTypeItem = {
  id: string;
  name: string;
  code: string;
  branchId: string | null;
};

export type MemoUserItem = {
  id: string;
  username: string;
  fullName: string | null;
  position: string | null;
  branchId: string | null;
  isAllBranches?: boolean;
  branch?: { name: string; code: string } | null;
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
  approvalStatus?: string;
  memoTypeId?: string | null;
  signatures?: Signature[];
  attachments?: MemoAttachmentItem[];
};

export type MemoAttachmentItem = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

export type MemoFormProps = {
  departments: DepartmentItem[];
  initialData?: MemoInitialData | null;
  isEdit?: boolean;
  userDepartmentId?: string | null;
  isAdmin?: boolean;
  memoTypes?: MemoTypeItem[];
  currentUser: MemoUserItem;
  approvers?: MemoUserItem[];
  attachmentLimits?: { maxFileMb: number; maxTotalMb: number };
};

const DEFAULT_SIGNATURES: Signature[] = [
  { role: 'นำเสนอโดย', name: '', position: '', sortOrder: 0 },
  { role: 'พิจารณาโดย', name: '', position: '', sortOrder: 1 },
  { role: 'พิจารณาโดย', name: '', position: '', sortOrder: 2 },
  { role: 'อนุมัติโดย', name: '', position: '', sortOrder: 3 },
  { role: 'อนุมัติโดย', name: '', position: '', sortOrder: 4 },
];

const SIGNATURE_ROLES = ['นำเสนอโดย', 'พิจารณาโดย', 'อนุมัติโดย'];
const normalizeSignatureRole = (role: string) => role.trim() === 'รับทราบโดย' ? 'พิจารณาโดย' : role;
const userDisplayName = (user: MemoUserItem) => user.fullName?.trim() || user.username;
const departmentHeader = (department?: DepartmentItem) =>
  (department?.nameEn?.trim() || department?.name?.trim() || '').toLocaleUpperCase('en-US');

export function MemoForm({ departments, initialData, isEdit, userDepartmentId, isAdmin = false, memoTypes = [], currentUser, approvers = [], attachmentLimits = { maxFileMb: 20, maxTotalMb: 100 } }: MemoFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoadingApprovalSignatures, setIsLoadingApprovalSignatures] = useState(false);
  const [approvalSignatureError, setApprovalSignatureError] = useState('');
  const [approvalSignatureSource, setApprovalSignatureSource] = useState<string | null>(null);

  // Template States
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
  const [saveTemplateLoading, setSaveTemplateLoading] = useState(false);
  const [templates, setTemplates] = useState<SignatureTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  // Determine initial department ID
  const defaultDeptId = isEdit
    ? (initialData?.departmentId || '')
    : (userDepartmentId || (isAdmin ? (departments[0]?.id || '') : ''));

  const [departmentId, setDepartmentId] = useState(defaultDeptId);
  const selectedDepartment = departments.find(d => d.id === departmentId);
  const [memoTypeId, setMemoTypeId] = useState(initialData?.memoTypeId || '');
  const availableMemoTypes = memoTypes.filter((type) => !type.branchId || type.branchId === selectedDepartment?.branchId);
  const approverOptions: SearchableSelectOption[] = approvers.map((approver) => ({
    value: userDisplayName(approver),
    label: `${userDisplayName(approver)}${approver.position ? ` — ${approver.position}` : ''}${approver.isAllBranches ? ' (ทุกสาขา)' : approver.branch ? ` (${approver.branch.code})` : ''}`,
    searchText: `${approver.username} ${approver.position ?? ''} ${approver.branch?.name ?? ''} ${approver.branch?.code ?? ''}`,
  }));

  const [subHeader, setSubHeader] = useState(
    initialData?.subHeader || departmentHeader(selectedDepartment)
  );

  const [documentDate, setDocumentDate] = useState(
    initialData?.documentDate 
      ? new Date(initialData.documentDate).toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0]
  );
  const [recipient, setRecipient] = useState(initialData?.recipient || '');
  const [sender] = useState(initialData?.sender || userDisplayName(currentUser));
  const [subject, setSubject] = useState(initialData?.subject || '');
  const [reference, setReference] = useState(initialData?.reference || '');
  const [carbonCopy, setCarbonCopy] = useState(initialData?.carbonCopy || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [remark, setRemark] = useState(initialData?.remark || '');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<MemoAttachmentItem[]>(initialData?.attachments ?? []);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [attachmentSelectionMessage, setAttachmentSelectionMessage] = useState('');
  const [attachmentSelectionError, setAttachmentSelectionError] = useState('');
  
  const [signatures, setSignatures] = useState<Signature[]>(
    initialData?.signatures && initialData.signatures.length > 0
      ? initialData.signatures.map((signature) => ({ ...signature, role: normalizeSignatureRole(signature.role) }))
      : DEFAULT_SIGNATURES.map((signature, index) => index === 0
        ? { ...signature, name: userDisplayName(currentUser), position: currentUser.position }
        : signature)
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

  useEffect(() => {
    if (!isFinal && !isCancelled) {
      fetchTemplates();
    }
  }, [isFinal, isCancelled]);

  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const res = await fetch('/api/signature-templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (e) {
      console.error('Failed to fetch templates');
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleChange = () => {
    if (!isDirty) setIsDirty(true);
  };

  const applyApprovalSignatures = async (typeId: string, deptId: string) => {
    if (!typeId || !deptId) return;
    setIsLoadingApprovalSignatures(true);
    setApprovalSignatureError('');
    try {
      const params = new URLSearchParams({ memoTypeId: typeId, departmentId: deptId });
      const response = await fetch(`/api/e-approve/signature-preview?${params.toString()}`);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'ไม่สามารถสร้างรายการลายเซ็นจาก Approval Chain ได้');
      setSignatures((body.signatures as Signature[]).map((signature, index) => ({ ...signature, role: normalizeSignatureRole(signature.role), sortOrder: index })));
      setSelectedTemplateId('');
      setApprovalSignatureSource(`${body.memoType.name} · ${body.branch.name}`);
      handleChange();
    } catch (error) {
      setApprovalSignatureError(error instanceof Error ? error.message : 'ไม่สามารถสร้างรายการลายเซ็นจาก Approval Chain ได้');
      setApprovalSignatureSource(null);
    } finally {
      setIsLoadingApprovalSignatures(false);
    }
  };

  const handleMemoTypeChange = (typeId: string) => {
    setMemoTypeId(typeId);
    setApprovalSignatureError('');
    setApprovalSignatureSource(null);
    handleChange();
    if (typeId) void applyApprovalSignatures(typeId, departmentId);
  };

  const handleDepartmentChange = (newDeptId: string) => {
    setDepartmentId(newDeptId);
    handleChange();
    const dept = departments.find(d => d.id === newDeptId);
    const selectedType = memoTypes.find((type) => type.id === memoTypeId);
    if (selectedType?.branchId && selectedType.branchId !== dept?.branchId) {
      setMemoTypeId('');
      setApprovalSignatureSource(null);
    } else if (memoTypeId) {
      void applyApprovalSignatures(memoTypeId, newDeptId);
    }
    if (dept) setSubHeader(departmentHeader(dept));
  };

  const handleSignatureRoleChange = (index: number, role: string) => {
    const next = [...signatures];
    next[index] = role === 'นำเสนอโดย'
      ? { ...next[index], role, name: userDisplayName(currentUser), position: currentUser.position }
      : { ...next[index], role, name: '', position: '' };
    setSignatures(next);
    handleChange();
  };

  const handleSignatureUserChange = (index: number, selectedName: string) => {
    const selectedUser = selectedName === userDisplayName(currentUser)
      ? currentUser
      : approvers.find((approver) => userDisplayName(approver) === selectedName);
    const next = [...signatures];
    next[index] = { ...next[index], name: selectedName, position: selectedUser?.position ?? '' };
    setSignatures(next);
    handleChange();
  };

  const addSignature = () => {
    setSignatures([...signatures, { role: 'อนุมัติโดย', name: '', position: '', sortOrder: signatures.length }]);
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

  const [pendingTemplate, setPendingTemplate] = useState<SignatureTemplate | null>(null);

  const executeApplyTemplate = (template: SignatureTemplate) => {
    const copiedSignatures = template.items.map((item, index) => ({
      id: crypto.randomUUID(),
      role: normalizeSignatureRole(item.role),
      name: item.name,
      position: item.position ?? "",
      sortOrder: index,
    }));

    setSignatures(copiedSignatures);
    setApprovalSignatureSource(null);
    setApprovalSignatureError('');
    setIsTemplateManagerOpen(false);
    setSelectedTemplateId(template.id);
    handleChange();
  };

  const handleApplyTemplate = (template: SignatureTemplate): boolean => {
    if (signatures.length > 0 && signatures.some(s => s.role || s.name)) {
      setPendingTemplate(template);
      return false; // wait for modal
    }
    executeApplyTemplate(template);
    return true;
  };

  const handleTemplateSelection = (templateId: string) => {
    if (!templateId) {
      setSelectedTemplateId('');
      return;
    }
    
    const template = templates.find(t => t.id === templateId);
    if (template) {
      handleApplyTemplate(template);
    }
  };

  const confirmTemplateOverwrite = () => {
    if (pendingTemplate) {
      executeApplyTemplate(pendingTemplate);
      setPendingTemplate(null);
    }
  };

  const cancelTemplateOverwrite = () => {
    setPendingTemplate(null);
    setSelectedTemplateId('');
  };

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState('');

  const handleSaveAsTemplate = () => {
    if (signatures.length === 0) {
      alert('กรุณาเพิ่มผู้เซ็นอย่างน้อย 1 คนก่อนบันทึกเทมเพลต');
      return;
    }

    const validSignatures = signatures.filter(s => s.role.trim() !== '' && s.name?.trim() !== '');
    if (validSignatures.length !== signatures.length) {
      alert('กรุณากรอกบทบาทและชื่อผู้เซ็นให้ครบถ้วนก่อนบันทึกเทมเพลต');
      return;
    }

    setSaveTemplateName('');
    setIsSaveModalOpen(true);
  };

  const submitSaveTemplate = async () => {
    if (!saveTemplateName || saveTemplateName.trim() === '') return;

    setSaveTemplateLoading(true);
    try {
      const validSignatures = signatures.filter(s => s.role.trim() !== '' && s.name?.trim() !== '');
      const res = await fetch('/api/signature-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveTemplateName,
          items: validSignatures
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save template');
      }

      alert('บันทึกเทมเพลตเรียบร้อยแล้ว');
      await fetchTemplates(); // Refresh list
      setSelectedTemplateId(data.id);
      setIsSaveModalOpen(false);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaveTemplateLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, _isPreview: boolean = false) => {
    e.preventDefault();
    if (isCancelled) return;
    
    setLoading(true);

    try {
      const payload = {
        departmentId,
        memoTypeId: memoTypeId || null,
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
      if (pendingFiles.length > 0) {
        try {
          for (const file of pendingFiles) {
            await uploadMemoAttachmentInChunks(savedData.id, file);
          }
        } catch (uploadError) {
          setIsDirty(false);
          const detail = uploadError instanceof TypeError
            ? 'การเชื่อมต่อถูกตัดระหว่างอัปโหลด กรุณาลองใหม่อีกครั้ง'
            : uploadError instanceof Error ? uploadError.message : 'เกิดข้อผิดพลาด';
          alert(`บันทึก Memo แล้ว แต่แนบไฟล์ไม่สำเร็จ: ${detail}`);
          router.push(`/memos/${savedData.id}/edit`);
          return;
        }
        setPendingFiles([]);
      }
      setIsDirty(false);
      
      router.push(`/memos/${savedData.id}`);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการบันทึกเอกสาร');
    } finally {
      setLoading(false);
    }
  };

  const selectAttachments = (incoming: File[]) => {
    setAttachmentSelectionMessage('');
    setAttachmentSelectionError('');
    if (incoming.length === 0) {
      setAttachmentSelectionError('ไม่พบไฟล์ที่เลือก กรุณาเลือกไฟล์อีกครั้ง');
      return;
    }
    const maxFileBytes = attachmentLimits.maxFileMb * 1024 * 1024;
    const invalid = incoming.find((file) => file.size > maxFileBytes);
    if (invalid) {
      setAttachmentSelectionError(`ไฟล์ “${invalid.name}” ต้องไม่เกิน ${attachmentLimits.maxFileMb} MB`);
      return;
    }
    const next = [...pendingFiles];
    incoming.forEach((file) => {
      if (!next.some((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)) next.push(file);
    });
    if (existingAttachments.length + next.length > 20) {
      setAttachmentSelectionError('แนบไฟล์ได้สูงสุด 20 ไฟล์ต่อ Memo');
      return;
    }
    const totalBytes = existingAttachments.reduce((sum, item) => sum + item.fileSize, 0) + next.reduce((sum, item) => sum + item.size, 0);
    if (totalBytes > attachmentLimits.maxTotalMb * 1024 * 1024) {
      setAttachmentSelectionError(`ไฟล์แนบรวมต้องไม่เกิน ${attachmentLimits.maxTotalMb} MB`);
      return;
    }
    setPendingFiles(next);
    const addedCount = next.length - pendingFiles.length;
    setAttachmentSelectionMessage(addedCount > 0
      ? `เลือกแล้ว ${addedCount} ไฟล์ · กดบันทึกเพื่ออัปโหลด`
      : 'ไฟล์ที่เลือกมีอยู่ในรายการแล้ว');
    handleChange();
  };

  const handleAttachmentInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = '';
    selectAttachments(incoming);
  };

  const removePendingAttachment = (index: number) => {
    setPendingFiles((items) => {
      const next = items.filter((_, itemIndex) => itemIndex !== index);
      setAttachmentSelectionMessage(next.length > 0
        ? `มี ${next.length} ไฟล์รออัปโหลด · กดบันทึกเพื่ออัปโหลด`
        : 'นำไฟล์ที่รออัปโหลดออกแล้ว');
      return next;
    });
    setAttachmentSelectionError('');
  };

  const deleteExistingAttachment = async (attachment: MemoAttachmentItem) => {
    if (!initialData?.id || !window.confirm(`ลบไฟล์ “${attachment.fileName}” ใช่หรือไม่?`)) return;
    const response = await fetch(`/api/memos/${initialData.id}/attachments/${attachment.id}`, { method: 'DELETE' });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return alert(body.error ?? 'ลบไฟล์ไม่สำเร็จ');
    setExistingAttachments((items) => items.filter((item) => item.id !== attachment.id));
  };

  const formatFileSize = (bytes: number) => bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

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
              readOnly
              placeholder="ระบบจะดึงชื่อจาก Department"
              required
              disabled={isFinal || isCancelled}
              className="w-full cursor-not-allowed px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800 uppercase disabled:opacity-60 text-sm font-medium"
            />
            <p className="text-[11px] text-gray-500 mt-1">ดึงจากชื่อภาษาอังกฤษของ Department อัตโนมัติ และแสดงเป็นตัวพิมพ์ใหญ่</p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ประเภท Memo สำหรับ E‑Approve <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">ไม่บังคับ</span>
            </label>
            <select
              value={memoTypeId}
              onChange={(event) => handleMemoTypeChange(event.target.value)}
              disabled={isFinal || isCancelled}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 disabled:opacity-60 text-sm"
            >
              <option value="">ไม่ใช้ประเภท E‑Approve — กำหนดรายชื่อผู้เซ็นเอง</option>
              {availableMemoTypes.map((type) => <option value={type.id} key={type.id}>{type.name} ({type.code})</option>)}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {memoTypeId
                ? 'ระบบจะใช้กฎ Required Approvers ของประเภทที่เลือก และนำรายชื่อมาใส่ใน Signatures ให้อัตโนมัติ'
                : 'กรณีไม่เลือก ระบบจะบันทึกเป็น Memo ปกติ และคุณสามารถเพิ่ม แก้ไข หรือลบรายชื่อผู้เซ็นในส่วน Signatures ได้เอง'}
            </p>
            {isLoadingApprovalSignatures && <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-blue-600"><Loader2 className="h-4 w-4 animate-spin"/>กำลังนำ Approval Chain ไปสร้างรายการลายเซ็น...</p>}
            {approvalSignatureSource && !isLoadingApprovalSignatures && <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">✓ นำรายชื่อผู้ลงนามจาก {approvalSignatureSource} มาใส่ด้านท้ายเอกสารแล้ว</p>}
            {approvalSignatureError && <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{approvalSignatureError}</p>}
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
            <SearchableSelect
              value={recipient}
              onChange={(value) => { setRecipient(value); handleChange(); }}
              options={[
                ...(recipient && !approvers.some((approver) => userDisplayName(approver) === recipient)
                  ? [{ value: recipient, label: `${recipient} (ข้อมูลเดิม)`, searchText: recipient }]
                  : []),
                ...approverOptions,
              ]}
              placeholder="ค้นหาชื่อ ตำแหน่ง หรือสาขา..."
              ariaLabel="ค้นหาและเลือกผู้รับหรือผู้อนุมัติ"
              required
              disabled={isCancelled}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              From (จาก) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={sender}
              readOnly
              required
              disabled={isCancelled}
              className="w-full cursor-not-allowed px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800 disabled:opacity-60 text-sm"
            />
            <p className="mt-1 text-[11px] text-gray-500">ดึงจากชื่อผู้ใช้งานที่สร้าง Memo โดยอัตโนมัติ</p>
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

      {/* Supporting Documents */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b pb-4">
          <div><h2 className="flex items-center gap-2 text-xl font-bold"><Paperclip className="h-5 w-5 text-blue-600"/>เอกสารแนบเพิ่มเติม</h2><p className="mt-1 text-xs text-gray-500">รองรับ PDF, Word, Excel, PNG และ JPG · ไม่เกิน {attachmentLimits.maxFileMb} MB ต่อไฟล์ / รวม {attachmentLimits.maxTotalMb} MB</p></div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{existingAttachments.length + pendingFiles.length}/20 ไฟล์</span>
        </div>
        {!isCancelled && !isFinal && <>
          <input ref={attachmentInputRef} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" className="sr-only" onChange={handleAttachmentInputChange}/>
          <button type="button" onClick={() => attachmentInputRef.current?.click()} className="flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 px-5 py-7 text-center transition hover:border-blue-400 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-blue-900 dark:bg-blue-950/20">
            <UploadCloud className="h-8 w-8 text-blue-600"/><span className="mt-2 text-sm font-bold text-blue-700 dark:text-blue-300">เลือกเอกสารจากเครื่อง</span><span className="mt-1 text-xs text-slate-500">เลือกได้หลายไฟล์พร้อมกัน</span>
          </button>
          {(attachmentSelectionMessage || attachmentSelectionError) && <p aria-live="polite" className={`mt-3 rounded-lg px-3 py-2 text-sm font-semibold ${attachmentSelectionError ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'}`}>
            {attachmentSelectionError || attachmentSelectionMessage}
          </p>}
        </>}
        {(existingAttachments.length > 0 || pendingFiles.length > 0) && <div className="mt-4 space-y-2">
          {existingAttachments.map((attachment) => <div key={attachment.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800"><FileText className="h-4 w-4"/></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{attachment.fileName}</p><p className="text-xs text-slate-500">{formatFileSize(attachment.fileSize)} · บันทึกแล้ว</p></div>{initialData?.id && <a href={`/api/memos/${initialData.id}/attachments/${attachment.id}`} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="ดาวน์โหลด"><Download className="h-4 w-4"/></a>}{!isCancelled && !isFinal && <button type="button" onClick={() => void deleteExistingAttachment(attachment)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50" title="ลบ"><Trash2 className="h-4 w-4"/></button>}</div>)}
          {pendingFiles.map((file, index) => <div key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/40 p-3 dark:border-blue-900 dark:bg-blue-950/20"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950"><FileText className="h-4 w-4"/></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{file.name}</p><p className="text-xs text-blue-600">{formatFileSize(file.size)} · พร้อมอัปโหลดเมื่อบันทึก</p></div><button type="button" onClick={() => removePendingAttachment(index)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50" title="นำออก"><X className="h-4 w-4"/></button></div>)}
        </div>}
      </div>

      {/* Signatures Form */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <div className="flex flex-col md:flex-row justify-between md:items-end mb-6 border-b pb-4 gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              Signatures (รายชื่อผู้เซ็น)
            </h2>
            <p className="text-xs text-gray-500 mt-1">เพิ่มและแก้ไขผู้เซ็นได้เอง หรือเลือก Memo Type / เทมเพลตเพื่อเติมรายชื่ออัตโนมัติ ระบบจะจัดตำแหน่งตามจำนวนผู้เซ็น</p>
        </div>

          {!isCancelled && !isFinal && (
            <div className="flex flex-col items-end gap-2">
              {/* Template Selector Section */}
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 p-2 rounded-lg border border-gray-200 dark:border-slate-700 w-full md:w-auto">
                {isLoadingTemplates ? (
                  <div className="flex items-center text-sm text-gray-500 px-3 py-1.5"><Loader2 size={16} className="animate-spin mr-2"/> โหลดเทมเพลต...</div>
                ) : (
                  <>
                    <select 
                      value={selectedTemplateId} 
                      onChange={e => handleTemplateSelection(e.target.value)}
                      className="text-sm px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 min-w-[150px]"
                    >
                      <option value="">-- เลือกเทมเพลตลายเซ็น --</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.items.length})</option>
                      ))}
                    </select>
                    <button 
                      type="button" 
                      onClick={() => setIsTemplateManagerOpen(true)}
                      className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-md transition-colors"
                      title="จัดการเทมเพลต"
                    >
                      <Bookmark size={16} />
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button 
                  type="button" 
                  onClick={handleSaveAsTemplate} 
                  disabled={saveTemplateLoading || signatures.length === 0}
                  className="text-sm flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 px-2 py-1.5 font-medium transition-colors disabled:opacity-50"
                >
                  {saveTemplateLoading ? <Loader2 size={16} className="animate-spin" /> : <BookmarkPlus size={16} />} 
                  บันทึกเป็นเทมเพลต
                </button>
                <button type="button" onClick={addSignature} className="text-sm flex items-center gap-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors font-medium border border-gray-200 dark:border-slate-600">
                  <Plus size={16} /> Add Signature Box
                </button>
              </div>
            </div>
          )}
        </div>

        {approvalSignatureSource && (
          <div className="mb-5 flex flex-col gap-2 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30 sm:flex-row sm:items-center sm:justify-between">
            <div><div className="font-bold text-blue-800 dark:text-blue-200">ชุดลายเซ็นจาก E‑Approve</div><div className="text-xs text-blue-600 dark:text-blue-300">{approvalSignatureSource} · เรียงตาม Approval Chain และตัดผู้อนุมัติซ้ำแล้ว</div></div>
            <span className="w-fit rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">{signatures.length} รายชื่อ</span>
          </div>
        )}
        
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
                  <select
                    value={sig.role}
                    onChange={e => handleSignatureRoleChange(index, e.target.value)}
                    required
                    disabled={isCancelled}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 disabled:opacity-60"
                  >
                    {!SIGNATURE_ROLES.includes(sig.role) && sig.role && <option value={sig.role}>{sig.role} (ข้อมูลเดิม)</option>}
                    {SIGNATURE_ROLES.map((role) => <option value={role} key={role}>{role}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Name (ชื่อ-นามสกุล)</label>
                  <SearchableSelect
                    value={sig.name || ''}
                    onChange={(value) => handleSignatureUserChange(index, value)}
                    options={sig.role === 'นำเสนอโดย'
                      ? [{ value: userDisplayName(currentUser), label: `${userDisplayName(currentUser)}${currentUser.position ? ` — ${currentUser.position}` : ''}`, searchText: currentUser.username }]
                      : [
                          ...(sig.name && !approvers.some((approver) => userDisplayName(approver) === sig.name)
                            ? [{ value: sig.name, label: `${sig.name} (ข้อมูลเดิม)`, searchText: sig.name }]
                            : []),
                          ...approverOptions,
                        ]}
                    placeholder="ค้นหาและเลือกผู้เซ็น..."
                    ariaLabel={`ค้นหาและเลือกผู้เซ็นลำดับ ${index + 1}`}
                    compact
                    disabled={isCancelled}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Position (ตำแหน่ง)</label>
                  <input
                    type="text"
                    value={sig.position || ''}
                    readOnly
                    disabled={isCancelled}
                    className="w-full cursor-not-allowed px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-md bg-slate-100 dark:bg-slate-800 disabled:opacity-60"
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
      
      {isTemplateManagerOpen && (
        <SignatureTemplateManager
          isOpen={isTemplateManagerOpen}
          onClose={() => {
            setIsTemplateManagerOpen(false);
            fetchTemplates(); // refresh list in case it was edited/deleted
          }}
          onApplyTemplate={handleApplyTemplate}
          currentSignatures={signatures}
        />
      )}

      {/* Confirm Overwrite Modal */}
      {pendingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm p-6 border border-gray-200 dark:border-slate-800 flex flex-col gap-4 text-center">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-2">
              <Bookmark size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">ใช้เทมเพลต "{pendingTemplate.name}" หรือไม่?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                รายชื่อผู้เซ็นที่คุณกรอกไว้อยู่ในขณะนี้จะถูก <strong className="text-gray-700 dark:text-gray-200">แทนที่ทั้งหมด</strong> ด้วยข้อมูลจากเทมเพลต
              </p>
            </div>
            <div className="flex items-center gap-3 w-full mt-2">
              <button
                type="button"
                onClick={cancelTemplateOverwrite}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 rounded-xl font-medium transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmTemplateOverwrite}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm"
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Template Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm p-6 border border-gray-200 dark:border-slate-800 flex flex-col gap-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center">
                <BookmarkPlus size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">บันทึกเป็นเทมเพลต</h3>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ตั้งชื่อเทมเพลตชุดลายเซ็นนี้
              </label>
              <input
                type="text"
                autoFocus
                value={saveTemplateName}
                onChange={(e) => setSaveTemplateName(e.target.value)}
                placeholder="เช่น หัวหน้าแผนกบุคคล"
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-800 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    submitSaveTemplate();
                  }
                }}
              />
            </div>
            
            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                disabled={saveTemplateLoading}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={submitSaveTemplate}
                disabled={!saveTemplateName.trim() || saveTemplateLoading}
                className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saveTemplateLoading && <Loader2 size={16} className="animate-spin" />}
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
