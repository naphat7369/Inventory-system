'use client';

import Link from 'next/link';
import { ChangeEvent, PointerEvent, useEffect, useRef, useState } from 'react';
import { Check, ImagePlus, Loader2, PenLine, Star, Trash2, Type } from 'lucide-react';
import { cleanAndCropSignatureImage } from '@/lib/signature-image';

type SignatureType = 'TYPED' | 'DRAWN' | 'UPLOADED';
type Signature = { id: string; name: string; type: string; data: string; isDefault: boolean; updatedAt: string };

const typeLabels: Record<string, string> = { TYPED: 'พิมพ์ชื่อ', DRAWN: 'วาดลายเซ็น', UPLOADED: 'อัปโหลดรูป' };

function SignaturePreview({ signature, compact = false }: { signature: Pick<Signature, 'type' | 'data'>; compact?: boolean }) {
  return <div className={`grid place-items-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white ${compact ? 'h-24' : 'h-36'} dark:border-slate-700`}>
    {signature.type === 'TYPED'
      ? <span className="max-w-full truncate px-4 font-serif text-3xl italic text-slate-800">{signature.data}</span>
      : signature.type === 'UPLOADED'
        ? <CleanSignaturePreview source={signature.data} />
        // eslint-disable-next-line @next/next/no-img-element
        : <img src={signature.data} alt="ตัวอย่างลายเซ็น" className="max-h-full max-w-full object-contain p-3" />}
  </div>;
}

function CleanSignaturePreview({ source }: { source: string }) {
  const [processedSource, setProcessedSource] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void cleanAndCropSignatureImage(source).then((result) => {
      if (active) setProcessedSource(result);
    });
    return () => { active = false; };
  }, [source]);
  if (!processedSource) return <Loader2 className="h-5 w-5 animate-spin text-slate-400" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={processedSource} alt="ตัวอย่างลายเซ็น" className="max-h-full max-w-full object-contain p-3" />;
}

export function ApprovalSignaturesClient({ initialSignatures }: { initialSignatures: Signature[] }) {
  const [signatures, setSignatures] = useState(initialSignatures);
  const [type, setType] = useState<SignatureType>('TYPED');
  const [name, setName] = useState('ลายเซ็นหลัก');
  const [typed, setTyped] = useState('');
  const [imageData, setImageData] = useState('');
  const [makeDefault, setMakeDefault] = useState(initialSignatures.length === 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    if (type !== 'DRAWN') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    const context = canvas.getContext('2d');
    context?.scale(ratio, ratio);
    if (context) { context.lineCap = 'round'; context.lineJoin = 'round'; context.lineWidth = 2.5; context.strokeStyle = '#0f172a'; }
  }, [type]);

  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const startDraw = (event: PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId); drawing.current = true;
    const context = event.currentTarget.getContext('2d'); const pos = point(event);
    context?.beginPath(); context?.moveTo(pos.x, pos.y);
  };
  const draw = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const context = event.currentTarget.getContext('2d'); const pos = point(event);
    context?.lineTo(pos.x, pos.y); context?.stroke();
  };
  const stopDraw = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return; drawing.current = false;
    setImageData(event.currentTarget.toDataURL('image/png'));
  };
  const clearCanvas = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const context = canvas.getContext('2d'); context?.clearRect(0, 0, canvas.width, canvas.height); setImageData('');
  };
  const upload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; setError('');
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1_500_000) {
      setError('กรุณาเลือก PNG, JPG หรือ WebP ขนาดไม่เกิน 1.5 MB'); event.target.value = ''; return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      void cleanAndCropSignatureImage(String(reader.result)).then(setImageData);
    };
    reader.readAsDataURL(file);
  };
  const resetInput = () => { setTyped(''); setImageData(''); setName('ลายเซ็นหลัก'); clearCanvas(); };
  const create = async () => {
    const data = type === 'TYPED' ? typed.trim() : imageData;
    if (!name.trim() || !data) return setError('กรุณาระบุชื่อรายการและสร้างลายเซ็นให้ครบ');
    setLoading(true); setError('');
    const response = await fetch('/api/approval-signatures', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, type, data, isDefault: makeDefault }) });
    const body = await response.json().catch(() => ({})); setLoading(false);
    if (!response.ok) return setError(body.error ?? 'บันทึกลายเซ็นไม่สำเร็จ');
    setSignatures((items) => [body, ...items.map((item) => makeDefault ? { ...item, isDefault: false } : item)]);
    setMakeDefault(false); resetInput();
  };
  const setDefault = async (id: string) => {
    setLoading(true); setError('');
    const response = await fetch(`/api/approval-signatures/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isDefault: true }) });
    const body = await response.json().catch(() => ({})); setLoading(false);
    if (!response.ok) return setError(body.error ?? 'ตั้งค่าเริ่มต้นไม่สำเร็จ');
    setSignatures((items) => items.map((item) => ({ ...item, isDefault: item.id === id })));
  };
  const remove = async (id: string) => {
    if (!window.confirm('ลบลายเซ็นนี้ใช่หรือไม่? ประวัติการอนุมัติเดิมจะไม่ถูกเปลี่ยนแปลง')) return;
    setLoading(true); setError('');
    const response = await fetch(`/api/approval-signatures/${id}`, { method: 'DELETE' });
    const body = await response.json().catch(() => ({})); setLoading(false);
    if (!response.ok) return setError(body.error ?? 'ลบลายเซ็นไม่สำเร็จ');
    const remaining = signatures.filter((item) => item.id !== id);
    if (!remaining.some((item) => item.isDefault) && remaining[0]) remaining[0] = { ...remaining[0], isDefault: true };
    setSignatures(remaining);
  };

  return <main className="min-h-screen bg-slate-50 p-4 dark:bg-slate-950 md:p-8">
    <div className="mx-auto max-w-6xl">
      <Link href="/memos/approvals" className="text-sm font-semibold text-blue-600 hover:underline">&larr; กลับกล่องงานอนุมัติ</Link>
      <div className="mt-4"><h1 className="text-2xl font-black text-slate-900 dark:text-white md:text-3xl">ลายเซ็นของฉัน</h1><p className="mt-1 text-sm text-slate-500">ใช้เป็นลายเซ็นผู้นำเสนอ Memo และผู้อนุมัติ E-Approve โดยแบบ Default จะถูกเลือกให้อัตโนมัติ</p></div>
      {error && <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</div>}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-6">
          <h2 className="text-lg font-bold">เพิ่มลายเซ็นใหม่</h2>
          <div className="mt-4 grid grid-cols-3 gap-2">{([{ key: 'TYPED', label: 'พิมพ์ชื่อ', icon: Type }, { key: 'DRAWN', label: 'วาด', icon: PenLine }, { key: 'UPLOADED', label: 'อัปโหลด', icon: ImagePlus }] as const).map((item) => <button key={item.key} type="button" onClick={() => { setType(item.key); setImageData(''); setError(''); }} className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-sm font-bold ${type === item.key ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30' : 'border-slate-200 text-slate-500 dark:border-slate-700'}`}><item.icon className="h-5 w-5"/>{item.label}</button>)}</div>
          <label className="mt-5 block text-sm font-bold">ชื่อรายการ</label><input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950" placeholder="เช่น ลายเซ็นหลัก" />
          {type === 'TYPED' && <div className="mt-4"><label className="block text-sm font-bold">ชื่อที่ใช้เป็นลายเซ็น</label><input value={typed} onChange={(event) => setTyped(event.target.value)} maxLength={150} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950" placeholder="พิมพ์ชื่อ-นามสกุล" />{typed && <div className="mt-3"><SignaturePreview signature={{ type, data: typed }}/></div>}</div>}
          {type === 'DRAWN' && <div className="mt-4"><div className="flex items-center justify-between"><label className="text-sm font-bold">วาดลายเซ็นในกรอบ</label><button type="button" onClick={clearCanvas} className="text-xs font-bold text-rose-600">ล้าง</button></div><canvas ref={canvasRef} onPointerDown={startDraw} onPointerMove={draw} onPointerUp={stopDraw} onPointerCancel={stopDraw} className="mt-1 h-44 w-full touch-none rounded-xl border border-dashed border-slate-400 bg-white" /></div>}
          {type === 'UPLOADED' && <div className="mt-4"><label className="block text-sm font-bold">ไฟล์ลายเซ็น (PNG, JPG, WebP)</label><input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} className="mt-1 block w-full rounded-xl border border-slate-300 p-2 text-sm dark:border-slate-700" />{imageData && <div className="mt-3"><SignaturePreview signature={{ type, data: imageData }}/></div>}</div>}
          <label className="mt-5 flex cursor-pointer items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={makeDefault} onChange={(event) => setMakeDefault(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600"/>ตั้งเป็นลายเซ็นเริ่มต้น</label>
          <button type="button" onClick={() => void create()} disabled={loading} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4"/>}บันทึกลายเซ็น</button>
        </section>
        <section><div className="flex items-end justify-between"><div><h2 className="text-lg font-bold">ลายเซ็นที่บันทึก</h2><p className="text-xs text-slate-500">สูงสุด 10 แบบ · {signatures.length}/10</p></div></div>
          <div className="mt-3 space-y-3">{signatures.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">ยังไม่มีลายเซ็น กรุณาสร้างอย่างน้อย 1 แบบก่อนอนุมัติเอกสาร</div>}{signatures.map((signature) => <article key={signature.id} className={`rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900 ${signature.isDefault ? 'border-blue-400 ring-2 ring-blue-100 dark:ring-blue-950' : 'border-slate-200 dark:border-slate-800'}`}><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{signature.name}</h3>{signature.isDefault && <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-[10px] font-black text-blue-700"><Star className="h-3 w-3 fill-current"/>ค่าเริ่มต้น</span>}</div><p className="mt-0.5 text-xs text-slate-500">{typeLabels[signature.type] ?? signature.type}</p></div><div className="flex gap-1">{!signature.isDefault && <button type="button" disabled={loading} onClick={() => void setDefault(signature.id)} className="rounded-lg px-2.5 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50">ตั้งเป็น Default</button>}<button type="button" disabled={loading} onClick={() => void remove(signature.id)} aria-label={`ลบ ${signature.name}`} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4"/></button></div></div><div className="mt-3"><SignaturePreview signature={signature} compact/></div></article>)}</div>
        </section>
      </div>
    </div>
  </main>;
}
