"use client";

import { useState, useEffect } from 'react';
import { Trash2, Edit2, Check, X, Bookmark, Loader2 } from 'lucide-react';

export type SignatureTemplateItem = {
  id?: string;
  role: string;
  name: string;
  position: string | null;
  sortOrder: number;
};

export type SignatureTemplate = {
  id: string;
  name: string;
  items: SignatureTemplateItem[];
  updatedAt: string;
};

type SignatureTemplateManagerProps = {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (template: SignatureTemplate) => void;
  currentSignatures: any[]; // The current signatures in the form, used for "overwrite" feature
};

export function SignatureTemplateManager({ isOpen, onClose, onApplyTemplate, currentSignatures }: SignatureTemplateManagerProps) {
  const [templates, setTemplates] = useState<SignatureTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/signature-templates');
      if (!res.ok) throw new Error('Failed to load templates');
      const data = await res.json();
      setTemplates(data);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดเทมเพลต');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      setEditingId(null);
    }
  }, [isOpen]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`ต้องการลบเทมเพลต “${name}” หรือไม่?\n\nการลบนี้ไม่กระทบ Memo ที่เคยใช้เทมเพลตนี้`)) return;
    
    setActionLoading(id);
    try {
      const res = await fetch(`/api/signature-templates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete template');
      
      setTemplates(templates.filter(t => t.id !== id));
      alert('ลบเทมเพลตเรียบร้อยแล้ว');
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการลบเทมเพลต');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartEdit = (template: SignatureTemplate) => {
    setEditingId(template.id);
    setEditName(template.name);
  };

  const handleSaveEdit = async (id: string, template: SignatureTemplate) => {
    if (editName.trim() === '') {
      alert('ชื่อเทมเพลตต้องไม่ว่าง');
      return;
    }
    
    // Check if they want to overwrite items or just rename
    const overwriteItems = window.confirm(`คุณต้องการบันทึกรายชื่อผู้เซ็นปัจจุบันทับเทมเพลต “${template.name}” ด้วยหรือไม่?\n\n- กด OK: เพื่อแทนที่ผู้เซ็นด้วยรายการปัจจุบันในฟอร์ม\n- กด Cancel: เพื่อเปลี่ยนแค่ชื่อเทมเพลตอย่างเดียว`);
    
    const itemsToSave = overwriteItems ? currentSignatures : template.items;
    
    // Validate
    if (itemsToSave.length === 0) {
      alert('เทมเพลตต้องมีผู้เซ็นอย่างน้อย 1 คน');
      return;
    }
    
    for (const item of itemsToSave) {
      if (!item.role || item.role.trim() === '') {
        alert('บทบาทของผู้เซ็นทุกคนต้องไม่ว่าง');
        return;
      }
      if (!item.name || item.name.trim() === '') {
        alert('ชื่อผู้เซ็นทุกคนต้องไม่ว่าง');
        return;
      }
    }

    setActionLoading(id);
    try {
      const res = await fetch(`/api/signature-templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          items: itemsToSave
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update template');
      
      setTemplates(templates.map(t => t.id === id ? data : t));
      setEditingId(null);
      alert('บันทึกการแก้ไขเรียบร้อยแล้ว');
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการแก้ไขเทมเพลต');
    } finally {
      setActionLoading(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden border border-gray-200 dark:border-slate-800">
        
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-slate-800">
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
            <Bookmark className="text-blue-600" /> จัดการเทมเพลตลายเซ็น
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-gray-50 dark:bg-slate-900/50">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="animate-spin text-blue-600 mr-2" size={24} />
              <span className="text-gray-500">กำลังโหลดเทมเพลต...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              <p>{error}</p>
              <button onClick={fetchTemplates} className="mt-4 px-4 py-2 bg-gray-200 dark:bg-slate-800 rounded-lg text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-300 transition-colors">ลองใหม่</button>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                <Bookmark size={24} />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">ยังไม่มีเทมเพลตลายเซ็น</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">คุณสามารถจัดรายชื่อผู้เซ็นด้านล่าง แล้วบันทึกไว้ใช้ครั้งถัดไปได้</p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map(template => (
                <div key={template.id} className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4 justify-between md:items-center">
                  
                  {editingId === template.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input 
                        type="text" 
                        value={editName} 
                        onChange={e => setEditName(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        placeholder="ชื่อเทมเพลต..."
                        autoFocus
                      />
                      <button 
                        onClick={() => handleSaveEdit(template.id, template)}
                        disabled={actionLoading === template.id}
                        className="p-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-md hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50"
                        title="บันทึก"
                      >
                        {actionLoading === template.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      </button>
                      <button 
                        onClick={() => setEditingId(null)}
                        disabled={actionLoading === template.id}
                        className="p-1.5 bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50"
                        title="ยกเลิก"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-base">{template.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        ผู้เซ็น {template.items.length} คน • แก้ไขล่าสุด: {new Date(template.updatedAt).toLocaleDateString('th-TH')}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {template.items.slice(0, 3).map((item, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-600">
                            {item.name}
                          </span>
                        ))}
                        {template.items.length > 3 && (
                          <span className="text-[10px] px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-500 rounded-full">
                            +{template.items.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {editingId !== template.id && (
                    <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 md:border-l border-gray-100 dark:border-slate-700 pt-3 md:pt-0 md:pl-4">
                      <button 
                        onClick={() => onApplyTemplate(template)}
                        disabled={actionLoading !== null}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        ใช้เทมเพลต
                      </button>
                      <button 
                        onClick={() => handleStartEdit(template)}
                        disabled={actionLoading !== null}
                        className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-md transition-colors disabled:opacity-50"
                        title="แก้ไข"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(template.id, template.name)}
                        disabled={actionLoading !== null}
                        className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-slate-700 rounded-md transition-colors disabled:opacity-50"
                        title="ลบ"
                      >
                        {actionLoading === template.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
