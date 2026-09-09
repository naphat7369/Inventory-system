'use client';

import { useState } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCcw, Maximize, ExternalLink } from 'lucide-react';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachment: {
    id: string;
    fileName: string;
    fileType?: string | null;
    fileSize?: number | null;
    attachmentCategory?: string | null;
  } | null;
}

export function DocumentPreviewModal({ isOpen, onClose, attachment }: DocumentPreviewModalProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  if (!isOpen || !attachment) return null;

  const previewUrl = `/api/renewals/files/${attachment.id}?inline=true`;
  const downloadUrl = `/api/renewals/files/${attachment.id}?download=true`;

  const isImage = attachment.fileType?.startsWith('image/') || /\.(jpg|jpeg|png)$/i.test(attachment.fileName);
  const isPdf = attachment.fileType === 'application/pdf' || /\.pdf$/i.test(attachment.fileName);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 250));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 50));
  const handleResetZoom = () => setZoomLevel(100);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-sm animate-fade-in">
      <div
        className={`bg-gray-900 text-white rounded-xl shadow-2xl flex flex-col w-full transition-all duration-300 ${
          isFullscreen ? 'h-full max-w-full rounded-none' : 'max-w-5xl h-[85vh]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-950/80 rounded-t-xl">
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="text-xs px-2 py-1 bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-md font-medium shrink-0">
              {attachment.attachmentCategory || 'Document'}
            </span>
            <h3 className="font-semibold text-gray-100 truncate text-sm sm:text-base" title={attachment.fileName}>
              {attachment.fileName}
            </h3>
            {attachment.fileSize && (
              <span className="text-xs text-gray-400 hidden sm:inline">
                ({(attachment.fileSize / 1024).toFixed(1)} KB)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isImage && (
              <div className="flex items-center bg-gray-800 rounded-lg p-1 text-gray-300">
                <button
                  onClick={handleZoomOut}
                  className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut size={16} />
                </button>
                <span className="text-xs px-2 min-w-[45px] text-center font-mono">{zoomLevel}%</span>
                <button
                  onClick={handleZoomIn}
                  className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  onClick={handleResetZoom}
                  className="p-1.5 hover:bg-gray-700 rounded transition-colors border-l border-gray-700 ml-1"
                  title="Reset Zoom"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            )}

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors hidden sm:flex"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              <Maximize size={18} />
            </button>

            <a
              href={downloadUrl}
              download={attachment.fileName}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors"
            >
              <Download size={16} />
              <span className="hidden sm:inline">ดาวน์โหลด</span>
            </a>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 bg-gray-950 flex items-center justify-center overflow-auto p-4 relative">
          {isPdf ? (
            <iframe
              src={previewUrl}
              className="w-full h-full rounded-md border border-gray-800 bg-white"
              title={attachment.fileName}
            />
          ) : isImage ? (
            <div className="overflow-auto max-w-full max-h-full flex items-center justify-center">
              <img
                src={previewUrl}
                alt={attachment.fileName}
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center center' }}
                className="max-w-full max-h-[70vh] object-contain transition-transform duration-150 rounded shadow-lg"
              />
            </div>
          ) : (
            <div className="text-center p-8 bg-gray-900 rounded-xl border border-gray-800 max-w-md">
              <p className="text-gray-300 font-medium mb-2">ไม่สามารถพรีวิวไฟล์ประเภทนี้ได้โดยตรง</p>
              <p className="text-xs text-gray-400 mb-6">กรุณากดปุ่มดาวน์โหลดด้านบนเพื่อเปิดดูเอกสาร</p>
              <a
                href={downloadUrl}
                download={attachment.fileName}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
              >
                <Download size={18} />
                ดาวน์โหลดเอกสาร
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
