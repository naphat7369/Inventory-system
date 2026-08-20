'use client';

import { useState, useRef } from 'react';
import { Upload, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { importAssets } from '@/app/actions';

export function ImportExportButtons({ assets }: { assets: any[] }) {
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    // Map assets to a flat format for Excel
    const data = assets.map(asset => {
      const customData = asset.customData ? JSON.parse(asset.customData) : {};
      return {
        'Asset ID': asset.assetId,
        'Asset Name': asset.name,
        'Category': asset.category?.name || '',
        'Property': asset.property?.name || '',
        'Usage Status': asset.status,
        'Location': asset.location || '',
        'IP Address': asset.ipAddress || '',
        'Department': asset.department || '',
        'Owner': asset.owner || '',
        'OS': asset.os || '',
        'Purchase Date': asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : '',
        ...customData
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Assets');
    XLSX.writeFile(workbook, 'assets_export.xlsx');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = event.target?.result;
          const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          const rows = XLSX.utils.sheet_to_json(worksheet);
          
          if (rows.length === 0) {
            alert('The Excel file is empty.');
            setIsImporting(false);
            return;
          }

          const result = await importAssets(JSON.parse(JSON.stringify(rows)));
          if (result.success) {
            alert(`Successfully imported ${result.count} assets!`);
          } else if (result.error) {
            alert(`Import Error:\n${result.error}`);
          }
        } catch (err) {
          console.error(err);
          alert('Failed to parse the Excel file. Please ensure it is a valid .xlsx format.');
        } finally {
          setIsImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.onerror = () => {
        alert('Failed to read file.');
        setIsImporting(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error(error);
      alert('Failed to process import.');
      setIsImporting(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 w-full md:w-auto">
      <input 
        type="file" 
        accept=".xlsx, .xls" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleImport}
      />
      <button 
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
      >
        <Upload size={20} /> {isImporting ? 'Importing...' : 'Import Excel'}
      </button>
      
      <button 
        onClick={handleExport}
        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
      >
        <Download size={20} /> Export Excel
      </button>
    </div>
  );
}
