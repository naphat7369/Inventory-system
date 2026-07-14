'use client';

import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';
import { updateAssetStatus } from '@/app/actions';

export default function PrintableLabel({ asset, role }: { asset: any, role?: string }) {
  const componentRef = useRef(null);
  
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
  });

  // Collect all items to print
  const itemsToPrint = [asset];
  if (asset.parent) {
    itemsToPrint.push(asset.parent);
  }
  // Optional: Also print children? The user specifically asked for "label ของ Parent Asset เพิ่มมาอีกอัน".
  // If we also want children, uncomment the following:
  // if (asset.children && asset.children.length > 0) {
  //   itemsToPrint.push(...asset.children);
  // }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-4 items-center mb-4">
        <button 
          onClick={() => handlePrint()}
          className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-900 transition-colors"
        >
          <Printer size={20} /> Print Label
        </button>
        
        {role === 'ADMIN' ? (
          <select 
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            value={asset.status}
            onChange={(e) => updateAssetStatus(asset.id, e.target.value)}
          >
            <option value="Available">Available</option>
            <option value="In-use">In-use</option>
            <option value="Repairing">Repairing</option>
            <option value="Disposed">Disposed</option>
          </select>
        ) : (
          <div className={`px-4 py-2 rounded-lg font-medium border ${
            asset.status === 'Available' ? 'bg-green-50 text-green-700 border-green-200' :
            asset.status === 'In-use' ? 'bg-blue-50 text-blue-700 border-blue-200' :
            asset.status === 'Repairing' ? 'bg-orange-50 text-orange-700 border-orange-200' :
            'bg-gray-50 text-gray-700 border-gray-200'
          }`}>
            {asset.status}
          </div>
        )}
      </div>

      <div className="bg-gray-50 rounded-xl shadow-sm border border-gray-200 p-8 flex flex-col items-center gap-8 overflow-y-auto max-h-[600px]">
        {/* Printable Area */}
        <div ref={componentRef} className="print:p-0 flex flex-col gap-8">
          {itemsToPrint.map((item, index) => {
            const itemQrUrl = typeof window !== 'undefined' ? `${window.location.origin}/assets/${item.id}` : '';
            return (
              <div 
                key={item.id}
                className="border-2 border-gray-800 rounded-lg p-6 w-96 bg-white print:border-none print:shadow-none break-inside-avoid page-break-after"
              >
                <div className="flex items-center justify-between border-b-2 border-gray-800 pb-4 mb-4">
                  <div>
                    <h2 className="font-bold text-xl uppercase tracking-wider">{item.category?.name || 'ASSET'}</h2>
                    <p className="text-gray-500 text-sm">Asset ID: {item.assetId}</p>
                  </div>
                  <div className="w-12 h-12 bg-gray-900 rounded flex items-center justify-center text-white font-bold text-xs">
                    LOGO
                  </div>
                </div>
                
                <div className="flex gap-6 items-center">
                  <div className="flex-1 space-y-2 min-w-0">
                    <p className="font-semibold text-lg break-words leading-tight">{item.name}</p>
                    <div>
                      <p className="text-gray-500 mb-1 text-xs">Prop / Loc</p>
                      <p className="font-semibold text-gray-900 text-sm">{item.property?.name || '-'}{item.location ? ` / ${item.location}` : ''}</p>
                    </div>
                    <p className="text-sm"><span className="text-gray-500">Dept:</span> {item.department || '-'}</p>
                    {item.parentId && item.id === asset.id && item.parent && (
                      <p className="text-sm"><span className="text-gray-500">Conn:</span> {item.parent.assetId}</p>
                    )}
                    <p className="text-sm"><span className="text-gray-500">IP:</span> {item.ipAddress || '-'}</p>
                  </div>
                  <div className="bg-white p-2 border border-gray-200 rounded-lg shrink-0">
                    <QRCodeSVG value={itemQrUrl || item.assetId} size={96} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
