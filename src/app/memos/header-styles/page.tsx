"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function HeaderStylesPage() {
  const [dept, setDept] = useState('IT DEPARTMENT');
  const [docNo, setDocNo] = useState('IT 001/2569');

  const deptList = [
    { name: 'IT DEPARTMENT', no: 'IT 001/2569' },
    { name: 'FOOD & BEVERAGE DEPARTMENT', no: 'FB 015/2568' },
    { name: 'ACCOUNT DEPARTMENT', no: 'ACC 003/2569' },
    { name: 'HUMAN RESOURCES DEPARTMENT', no: 'HR 008/2569' },
    { name: 'ENGINEERING DEPARTMENT', no: 'ENG 002/2569' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/memos" className="flex items-center gap-2 text-blue-600 hover:underline font-medium text-sm">
            <ArrowLeft size={16} /> กลับหน้ารายการ Memo
          </Link>
          <span className="text-xs font-semibold px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full">
            Header Showcase (5 รูปแบบ)
          </span>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            ตัวอย่างรูปแบบ Header Memo & ปรับขนาด Logo (5 แบบ)
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            ปรับขนาด Logo ให้ใหญ่ขึ้นสมส่วน พร้อมออกแบบให้คำว่า <strong>MEMORANDUM</strong> และ <strong>ชื่อแผนก</strong> มีขนาดกว้างเสมอกันและสวยงาม
          </p>
        </div>

        {/* Real-time Department Switcher */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 mb-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            🔍 ทดลองเปลี่ยนชื่อแผนกดูความสวยงาม:
          </span>
          <div className="flex flex-wrap gap-2">
            {deptList.map(item => (
              <button
                key={item.name}
                onClick={() => { setDept(item.name); setDocNo(item.no); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  dept === item.name 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        {/* STYLE 1 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-8 shadow-sm">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>แบบที่ 1: กล่องคู่ขนานความกว้างเท่ากันเป๊ะ (Equal-Width Dual Box)</span>
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-md">
              ★ แนะนำ (ใกล้เคียงต้นฉบับที่สุด)
            </span>
          </div>
          <div className="bg-white text-black p-8 rounded-lg border border-dashed border-slate-300 flex justify-between items-start">
            <div className="w-48 h-28 flex items-center justify-start">
              <img src="/assets/branding/s-hotel-default-v1.png" alt="Logo" className="max-w-[160px] max-h-[105px] object-contain" />
            </div>
            <div className="flex flex-col items-end">
              <div className="w-[250px] border-[1.5px] border-slate-800 text-center bg-gray-100">
                <div className="bg-gray-200 font-sans font-extrabold text-[15px] tracking-[0.22em] py-1 border-b-[1.5px] border-slate-800 text-black">
                  MEMORANDUM
                </div>
                <div className="font-sans font-bold text-[11px] tracking-[0.12em] py-1.5 px-2 bg-white text-black truncate uppercase">
                  {dept}
                </div>
              </div>
              <div className="mt-2.5 font-bold text-[17px] text-black tracking-wide">
                {docNo}
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            <strong>จุดเด่น:</strong> ความกว้างบล็อก 250px คงที่เท่ากันเป๊ะทั้งบนและล่าง MEMORANDUM ในกล่องสีเทา และชื่อแผนกอยู่ในกล่องขาวรองรับอย่างกลมกลืน
          </p>
        </div>

        {/* STYLE 2 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-8 shadow-sm">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              แบบที่ 2: กล่องคอนทราสต์โมเดิร์น สองสีประกบกัน (Modern Contrast Dual-Box)
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 rounded-md">
              Modern Luxury
            </span>
          </div>
          <div className="bg-white text-black p-8 rounded-lg border border-dashed border-slate-300 flex justify-between items-start">
            <div className="w-48 h-28 flex items-center justify-start">
              <img src="/assets/branding/s-hotel-default-v1.png" alt="Logo" className="max-w-[160px] max-h-[105px] object-contain" />
            </div>
            <div className="flex flex-col items-end">
              <div className="w-[250px] rounded border border-slate-900 overflow-hidden text-center shadow-sm">
                <div className="bg-slate-900 text-white font-sans font-extrabold text-[15px] tracking-[0.25em] py-1.5">
                  MEMORANDUM
                </div>
                <div className="bg-slate-100 text-slate-900 font-sans font-bold text-[11px] tracking-[0.14em] py-1 px-2 border-t border-slate-300 uppercase">
                  {dept}
                </div>
              </div>
              <div className="mt-2.5 font-bold text-[17px] text-black tracking-wide">
                {docNo}
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            <strong>จุดเด่น:</strong> แถบ MEMORANDUM สีเข้มตัดตัวอักษรสีขาว และชื่อแผนกสีเทาอ่อน สวยสะดุดตา ทันสมัย
          </p>
        </div>

        {/* STYLE 3 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-8 shadow-sm">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              แบบที่ 3: กรอบเส้นคู่สไตล์คลาสสิกทางการ (Double Line Luxury Frame)
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 rounded-md">
              Classic Hotel
            </span>
          </div>
          <div className="bg-white text-black p-8 rounded-lg border border-dashed border-slate-300 flex justify-between items-start">
            <div className="w-48 h-28 flex items-center justify-start">
              <img src="/assets/branding/s-hotel-default-v1.png" alt="Logo" className="max-w-[160px] max-h-[105px] object-contain" />
            </div>
            <div className="flex flex-col items-end">
              <div className="w-[250px] border-[3px] border-double border-black p-2 text-center bg-[#fafafa]">
                <div className="font-sans font-extrabold text-[16px] tracking-[0.22em] text-black mb-0.5">
                  MEMORANDUM
                </div>
                <div className="w-4/5 h-[1px] bg-black mx-auto my-1"></div>
                <div className="font-sans font-bold text-[11px] tracking-[0.12em] text-slate-800 uppercase">
                  {dept}
                </div>
              </div>
              <div className="mt-2.5 font-bold text-[17px] text-black tracking-wide">
                {docNo}
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            <strong>จุดเด่น:</strong> กรอบเส้นคู่สไตล์โรงแรม 5 ดาวคลาสสิก ดูมีภูมิฐาน เป็นระเบียบและโปร่งสบายตา
          </p>
        </div>

        {/* STYLE 4 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-8 shadow-sm">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              แบบที่ 4: แถบสีเทาเดี่ยว พร้อมเส้นใต้เน้นความเสมอกัน (Clean Header & Underline)
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 rounded-md">
              Minimal Clean
            </span>
          </div>
          <div className="bg-white text-black p-8 rounded-lg border border-dashed border-slate-300 flex justify-between items-start">
            <div className="w-48 h-28 flex items-center justify-start">
              <img src="/assets/branding/s-hotel-default-v1.png" alt="Logo" className="max-w-[160px] max-h-[105px] object-contain" />
            </div>
            <div className="flex flex-col items-end">
              <div className="w-[250px] text-center">
                <div className="bg-slate-200 text-slate-900 font-sans font-extrabold text-[15px] tracking-[0.25em] py-1 rounded-sm">
                  MEMORANDUM
                </div>
                <div className="font-sans font-bold text-[11.5px] tracking-[0.14em] text-slate-800 py-1.5 border-b-2 border-slate-900 mt-1 uppercase">
                  {dept}
                </div>
              </div>
              <div className="mt-2.5 font-bold text-[17px] text-black tracking-wide">
                {docNo}
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            <strong>จุดเด่น:</strong> แถบสีเทาด้านบน และเส้นขีดปิดท้ายด้านล่างความยาว 250px เท่ากันเป๊ะ ดูเรียบหรู คลีน และสวยงาม
          </p>
        </div>

        {/* STYLE 5 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-8 shadow-sm">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              แบบที่ 5: บล็อก 3 ชั้นรวมเลขที่เอกสารในตัว (All-In-One Executive Card)
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 rounded-md">
              Executive Card
            </span>
          </div>
          <div className="bg-white text-black p-8 rounded-lg border border-dashed border-slate-300 flex justify-between items-start">
            <div className="w-48 h-28 flex items-center justify-start">
              <img src="/assets/branding/s-hotel-default-v1.png" alt="Logo" className="max-w-[160px] max-h-[105px] object-contain" />
            </div>
            <div className="flex flex-col items-end">
              <div className="w-[250px] border-[1.5px] border-black text-center bg-white shadow-sm">
                <div className="bg-black text-white font-sans font-extrabold text-[14px] tracking-[0.25em] py-1">
                  MEMORANDUM
                </div>
                <div className="bg-slate-50 text-slate-900 font-sans font-bold text-[11px] tracking-[0.12em] py-1 px-2 border-b border-slate-200 uppercase">
                  {dept}
                </div>
                <div className="py-1 px-2 font-bold text-[14px] text-black bg-white">
                  {docNo}
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            <strong>จุดเด่น:</strong> รวมหัวข้อ ชื่อแผนก และเลขที่เอกสารไว้ในกรอบเดียวกันอย่างเป็นระเบียบชัดเจน
          </p>
        </div>

      </div>
    </div>
  );
}
