'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateAsset } from '@/app/actions';

export default function EditAssetForm({ asset, categories, properties, allAssets }: { asset: any, categories: any[], properties: any[], allAssets: any[] }) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>(asset.categoryId);
  const [selectedProperty, setSelectedProperty] = useState<string>(asset.propertyId || '');
  const [assetIdValue, setAssetIdValue] = useState<string>(asset.assetId || '');
  
  let initialCustomData = {};
  try {
    initialCustomData = asset.customData ? JSON.parse(asset.customData) : {};
  } catch(e) {}
  const [customData, setCustomData] = useState<Record<string, string>>(initialCustomData);

  const activeCategory = categories.find(c => c.id === selectedCategory);
  const customFields = activeCategory?.customFields || [];

  useEffect(() => {
    // Fetch new ID only if category or property is different from the original asset
    if (selectedCategory !== asset.categoryId || selectedProperty !== (asset.propertyId || '')) {
      import('@/app/actions').then(({ getNextAssetId }) => {
        if (selectedCategory) {
          getNextAssetId(selectedCategory, selectedProperty || undefined).then(id => setAssetIdValue(id));
        } else {
          setAssetIdValue('');
        }
      });
    } else {
      setAssetIdValue(asset.assetId || '');
    }
  }, [selectedCategory, selectedProperty, asset]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      name: formData.get('name'),
      assetId: formData.get('assetId') || undefined,
      ipAddress: formData.get('ipAddress') || null,
      department: formData.get('department') || null,
      owner: formData.get('owner') || null,
      os: formData.get('os') || null,
      location: formData.get('location') || null,
      categoryId: formData.get('categoryId'),
      propertyId: formData.get('propertyId') || null,
      parentId: formData.get('parentId') || null,
      status: formData.get('status'),
      customData: JSON.stringify(customData),
    };

    await updateAsset(asset.id, data);
    router.push(`/assets/${asset.id}`);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Device Name *</label>
          <input type="text" name="name" required defaultValue={asset.name} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Asset ID (Optional)</label>
          <input 
            type="text" 
            name="assetId" 
            value={assetIdValue}
            onChange={(e) => setAssetIdValue(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50" 
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
          <select 
            name="propertyId" 
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a property (optional)</option>
            {properties.map(prop => (
              <option key={prop.id} value={prop.id}>{prop.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Connected To (Parent Asset)</label>
          <select 
            name="parentId" 
            defaultValue={asset.parentId || ''}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">None</option>
            {allAssets.map(a => (
              <option key={a.id} value={a.id}>{a.assetId} - {a.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
          <select 
            name="categoryId" 
            required 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a category</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <input type="text" name="location" defaultValue={asset.location || ''} placeholder="e.g. Building A - Room 101" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
          <input type="text" name="ipAddress" defaultValue={asset.ipAddress || ''} placeholder="e.g. 192.168.1.100" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
          <input type="text" name="department" defaultValue={asset.department || ''} placeholder="e.g. IT, HR, Sales" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Owner Inventory</label>
          <input type="text" name="owner" defaultValue={asset.owner || ''} placeholder="Name of person responsible" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">OS</label>
          <input type="text" name="os" defaultValue={asset.os || ''} placeholder="e.g. Windows 11, macOS" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select name="status" defaultValue={asset.status} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value="Available">Available</option>
            <option value="In-use">In-use</option>
            <option value="Repairing">Repairing</option>
            <option value="Disposed">Disposed</option>
          </select>
        </div>
      </div>

      {customFields.length > 0 && (
        <div className="pt-6 border-t border-gray-100">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Custom Fields ({activeCategory?.name})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {customFields.map((field: any) => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{field.name}</label>
                <input 
                  type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                  value={customData[field.id] || ''}
                  onChange={(e) => setCustomData({...customData, [field.id]: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pt-6 flex justify-end gap-4">
        <button type="button" onClick={() => router.back()} className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50">
          Cancel
        </button>
        <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">
          Update Asset
        </button>
      </div>
    </form>
  );
}
