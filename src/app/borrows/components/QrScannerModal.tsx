'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, RefreshCw, Keyboard, AlertCircle } from 'lucide-react';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (assetId: string) => void;
}

export default function QrScannerModal({ isOpen, onClose, onScanSuccess }: QrScannerModalProps) {
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const qrContainerId = 'qr-reader-container';

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    startScanner(facingMode);

    return () => {
      stopScanner();
    };
  }, [isOpen, facingMode]);

  const startScanner = async (mode: 'environment' | 'user') => {
    try {
      setCameraError(null);
      await stopScanner();

      const html5Qrcode = new Html5Qrcode(qrContainerId);
      html5QrcodeRef.current = html5Qrcode;

      setIsScanning(true);

      await html5Qrcode.start(
        { facingMode: mode },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Success callback
          stopScanner();
          onScanSuccess(decodedText.trim());
          onClose();
        },
        () => {
          // Ignore parse errors per frame
        }
      );
    } catch (err: any) {
      console.error('Camera error:', err);
      setIsScanning(false);
      setCameraError('ไม่สามารถเข้าถึงกล้องได้ โปรดตรวจสอบการอนุญาตกล้อง หรือใช้ช่องกรอกรหัสด้วยมือด้านล่าง');
    }
  };

  const stopScanner = async () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      try {
        await html5QrcodeRef.current.stop();
        html5QrcodeRef.current.clear();
      } catch (err) {
        console.error('Failed to stop scanner:', err);
      }
    }
    setIsScanning(false);
  };

  const handleToggleCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      stopScanner();
      onScanSuccess(manualCode.trim());
      setManualCode('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-semibold text-lg">
            <Camera className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>สแกน QR Code / Barcode</span>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Camera Viewport */}
          <div className="relative bg-slate-950 rounded-xl overflow-hidden min-h-[260px] flex items-center justify-center border border-slate-800">
            <div id={qrContainerId} className="w-full h-full" />
            
            {cameraError && (
              <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center text-center p-4">
                <AlertCircle className="w-10 h-10 text-amber-500 mb-2" />
                <p className="text-sm text-slate-200">{cameraError}</p>
              </div>
            )}

            {isScanning && !cameraError && (
              <div className="absolute top-3 right-3">
                <button
                  type="button"
                  onClick={handleToggleCamera}
                  className="bg-slate-800/80 hover:bg-slate-700 text-white p-2 rounded-full backdrop-blur-xs transition flex items-center gap-1 text-xs px-3"
                  title="สลับกล้อง"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>สลับกล้อง</span>
                </button>
              </div>
            )}
          </div>

          <p className="text-xs text-center text-slate-500 dark:text-slate-400">
            ส่องกล้องไปที่ป้าย QR Code หรือ Barcode รหัสทรัพย์สิน
          </p>

          {/* Manual Input Fallback */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              กรอกรหัส Asset ID ด้วยมือ (Manual Fallback):
            </label>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Keyboard className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="เช่น IT-2026-0001"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:text-slate-100"
                />
              </div>
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
              >
                ตกลง
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
