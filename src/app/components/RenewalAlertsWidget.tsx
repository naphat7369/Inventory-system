import prisma from '@/lib/prisma';
import Link from 'next/link';
import { FileText, AlertTriangle, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { computeRenewalStatus } from '@/app/actions';

export async function RenewalAlertsWidget() {
  const contracts = await prisma.renewalContract.findMany({
    orderBy: { endDate: 'asc' },
    select: {
      id: true,
      title: true,
      contractNo: true,
      category: true,
      endDate: true,
      alertAdvanceDays: true,
    },
  });

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const alertItems = (
    await Promise.all(
      contracts.map(async (c) => {
        const status = await computeRenewalStatus(c.endDate, c.alertAdvanceDays);
        const end = new Date(c.endDate);
        end.setHours(0, 0, 0, 0);
        const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return { ...c, status, daysLeft };
      })
    )
  ).filter((c) => c.status === 'EXPIRED' || c.status === 'EXPIRING_SOON');


  const expiredCount = alertItems.filter((c) => c.status === 'EXPIRED').length;
  const expiringSoonCount = alertItems.filter((c) => c.status === 'EXPIRING_SOON').length;

  if (alertItems.length === 0) {
    return (
      <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-900/40 text-emerald-400 rounded-lg border border-emerald-500/30">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-100">สัญญาต่ออายุทั้งหมดเป็นปกติ</h3>
            <p className="text-xs text-gray-400">ไม่มีสัญญาที่หมดอายุหรือใกล้หมดอายุในขณะนี้</p>
          </div>
        </div>
        <Link
          href="/renewals"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-blue-400 rounded-lg transition-colors"
        >
          ไปที่คลังเอกสารต่ออายุ
          <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  return (
    <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl text-white space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2.5">
          <FileText size={22} className="text-amber-400" />
          <div>
            <h3 className="text-sm font-bold text-gray-100 flex items-center gap-2">
              การแจ้งเตือนต่ออายุสัญญา (Contract Renewal Alerts)
              <span className="px-2 py-0.5 bg-red-500/20 text-red-300 border border-red-500/30 rounded-full text-xs">
                {alertItems.length} รายการ
              </span>
            </h3>
            <p className="text-xs text-gray-400">
              พบหมดอายุแล้ว {expiredCount} รายการ และกำลังจะหมดอายุเร็วๆ นี้ {expiringSoonCount} รายการ
            </p>
          </div>
        </div>
        <Link
          href="/renewals"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white rounded-lg transition-colors shrink-0"
        >
          จัดการเอกสารทั้งหมด
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Top 3-5 alerts list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {alertItems.slice(0, 3).map((item) => (
          <div
            key={item.id}
            className={`p-3 rounded-lg border text-xs flex flex-col justify-between ${
              item.status === 'EXPIRED'
                ? 'bg-red-950/40 border-red-500/40 text-red-200'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-gray-200 truncate pr-2">{item.title}</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-gray-900/80 rounded border border-gray-700">
                  {item.category}
                </span>
              </div>
              {item.contractNo && <p className="text-[11px] text-gray-400 mb-2">เลขที่: {item.contractNo}</p>}
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-800/80 text-[11px]">
              <span className="text-gray-400">
                หมดอายุ: {new Date(item.endDate).toLocaleDateString('th-TH')}
              </span>
              {item.status === 'EXPIRED' ? (
                <span className="font-bold text-red-400 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  หมดอายุแล้ว
                </span>
              ) : (
                <span className="font-bold text-amber-400 flex items-center gap-1">
                  <Clock size={12} />
                  อีก {item.daysLeft} วัน
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
