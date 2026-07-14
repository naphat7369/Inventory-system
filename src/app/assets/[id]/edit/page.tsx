import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import EditAssetForm from './EditAssetForm';

export default async function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const asset = await prisma.asset.findUnique({
    where: { id }
  });
  if (!asset) notFound();

  const [categories, properties, allAssets] = await Promise.all([
    prisma.category.findMany({ include: { customFields: true } }),
    prisma.property.findMany(),
    prisma.asset.findMany({ 
      where: { id: { not: id } }, // Exclude self
      orderBy: { assetId: 'asc' } 
    })
  ]);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Edit Asset</h1>
      <EditAssetForm asset={asset} categories={categories} properties={properties} allAssets={allAssets} />
    </div>
  );
}
