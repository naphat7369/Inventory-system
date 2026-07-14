import prisma from '@/lib/prisma';
import NewAssetForm from './NewAssetForm';

export default async function NewAssetPage() {
  const [categories, properties, allAssets] = await Promise.all([
    prisma.category.findMany({ include: { customFields: true } }),
    prisma.property.findMany(),
    prisma.asset.findMany({ orderBy: { assetId: 'asc' } })
  ]);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Add New Asset</h1>
      <NewAssetForm categories={categories} properties={properties} allAssets={allAssets} />
    </div>
  );
}
