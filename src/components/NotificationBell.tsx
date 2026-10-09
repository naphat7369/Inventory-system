'use client';
import { Bell, CheckCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Item = { id: string; type: string; payload: string; readAt: string | null; createdAt: string; memo: { id: string; documentNo: string | null; subject: string } | null };

export function NotificationBell({ initialUnreadCount = 0 }: { initialUnreadCount?: number }) {
  const router = useRouter(); const box = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false); const [items, setItems] = useState<Item[]>([]); const [unread, setUnread] = useState(initialUnreadCount);
  const load = async () => { const r = await fetch('/api/notifications', { cache: 'no-store' }); if (r.ok) { const b = await r.json(); setItems(b.items); setUnread(b.unreadCount); } };
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 60_000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { const close = (event: MouseEvent) => { if (box.current && !box.current.contains(event.target as Node)) setOpen(false); }; document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close); }, []);
  const openItem = async (item: Item) => { if (!item.readAt) await fetch(`/api/notifications/${item.id}/read`, { method: 'PATCH' }); setOpen(false); if (item.memo) router.push(`/memos/${item.memo.id}`); await load(); };
  const readAll = async () => { await fetch('/api/notifications/read-all', { method: 'POST' }); await load(); };
  return <div ref={box} className="relative">
    <button type="button" onClick={() => setOpen(!open)} aria-label="การแจ้งเตือน" className="relative grid h-10 w-10 place-items-center rounded-lg bg-gray-800 text-gray-200 hover:bg-gray-700"><Bell className="h-5 w-5"/>{unread > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">{unread > 99 ? '99+' : unread}</span>}</button>
    {open && <div className="fixed left-3 right-3 top-16 z-[70] max-h-[70vh] overflow-hidden rounded-2xl border bg-white text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-white md:absolute md:left-auto md:right-0 md:top-12 md:w-96"><div className="flex items-center justify-between border-b p-4 dark:border-slate-800"><b>การแจ้งเตือน</b><button onClick={() => void readAll()} className="inline-flex items-center gap-1 text-xs font-bold text-blue-600"><CheckCheck className="h-4 w-4"/>อ่านทั้งหมด</button></div><div className="max-h-[55vh] overflow-y-auto">{items.map(item => <button key={item.id} onClick={() => void openItem(item)} className={`block w-full border-b p-4 text-left text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 ${item.readAt ? 'opacity-60' : 'bg-blue-50/60 dark:bg-blue-950/20'}`}><div className="font-bold">{label(item.type)}</div><div className="mt-1 text-xs text-slate-500">{item.memo ? `${item.memo.documentNo ?? 'Memo'} · ${item.memo.subject}` : 'ข้อความจากระบบ'}</div><div className="mt-1 text-[11px] text-slate-400">{new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.createdAt))}</div></button>)}{items.length === 0 && <div className="p-8 text-center text-sm text-slate-500">ยังไม่มีการแจ้งเตือน</div>}</div></div>}
  </div>;
}
function label(type: string) { return ({ APPROVAL_PENDING: 'มี Memo รอคุณอนุมัติ', REVISION_REQUESTED: 'Memo ถูกส่งกลับให้แก้ไข', PDF_FAILED: 'สร้าง Official PDF ไม่สำเร็จ', OFFICIAL_EMAIL_SKIPPED: 'ไม่ได้ส่ง Official PDF ทางอีเมล' } as Record<string,string>)[type] ?? 'การแจ้งเตือน E‑Approve'; }
