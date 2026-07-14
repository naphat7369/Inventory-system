'use client';

import { Printer } from 'lucide-react';

export default function PrintAllButton() {
  return (
    <button 
      onClick={() => window.print()}
      className="flex items-center gap-2 bg-gray-800 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-900 transition-colors text-lg"
    >
      <Printer size={24} /> Print All Labels
    </button>
  );
}
