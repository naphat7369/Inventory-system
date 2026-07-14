import prisma from '@/lib/prisma';
import PrintAllButton from './PrintAllButton';
import { QRCodeSVG } from 'qrcode.react';

export default async function PrintAssetsPage({ searchParams }: { searchParams: Promise<{ search?: string, status?: string }> }) {
  const { search = '', status = '' } = await searchParams;

  const whereClause: any = {};
  
  if (search) {
    whereClause.OR = [
      { name: { contains: search } },
      { assetId: { contains: search } },
      { owner: { contains: search } },
    ];
  }
  
  if (status) {
    whereClause.status = status;
  }

  const assets = await prisma.asset.findMany({
    where: whereClause,
    include: {
      category: true,
      property: true,
      parent: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col items-center print:p-0 print:max-w-none print:block">
      <div className="mb-8 print:hidden flex justify-center w-full">
        <PrintAllButton />
      </div>

      <div className="flex flex-wrap gap-8 justify-center print:grid print:grid-cols-2 print:gap-4 print:w-full">
        {assets.map(asset => {
          const qrUrl = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BASE_URL 
            ? `${process.env.NEXT_PUBLIC_BASE_URL}/assets/${asset.id}`
            : `http://localhost:3000/assets/${asset.id}`;

          return (
            <div 
              key={asset.id}
              className="border-2 border-gray-800 rounded-lg p-6 w-96 bg-white break-inside-avoid mb-8 print:mb-0 print:border-2 print:border-solid print:border-gray-800 print:w-auto"
            >
              <div className="flex items-center justify-between border-b-2 border-gray-800 pb-4 mb-4">
                <div>
                  <h2 className="font-bold text-xl uppercase tracking-wider">{asset.category.name}</h2>
                  <p className="text-gray-500 text-sm">Asset ID: {asset.assetId}</p>
                </div>
                <div className="w-12 h-12 bg-gray-900 rounded flex items-center justify-center text-white font-bold text-xs">
                  LOGO
                </div>
              </div>
              
              <div className="flex gap-6 items-center">
                <div className="flex-1 space-y-2 min-w-0">
                  <p className="font-semibold text-lg break-words leading-tight">{asset.name}</p>
                  <div>
                    <p className="text-gray-500 mb-1 text-xs">Prop / Loc</p>
                    <p className="font-semibold text-gray-900 text-sm break-words">{asset.property?.name || '-'}{asset.location ? ` / ${asset.location}` : ''}</p>
                  </div>
                  <p className="text-sm"><span className="text-gray-500">Dept:</span> {asset.department || '-'}</p>
                  {asset.parent && (
                    <p className="text-sm"><span className="text-gray-500">Conn:</span> {asset.parent.assetId}</p>
                  )}
                  <p className="text-sm"><span className="text-gray-500">IP:</span> {asset.ipAddress || '-'}</p>
                </div>
                <div className="bg-white p-2 border border-gray-200 rounded-lg shrink-0">
                  <QRCodeSVG value={qrUrl} size={96} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
