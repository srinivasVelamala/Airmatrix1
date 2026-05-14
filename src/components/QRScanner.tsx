import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera, X, Loader2, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [isInitializing, setIsInitializing] = useState(true);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Technical blue-themed scanning interface
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        scanner.clear();
        onScan(decodedText);
      },
      (error) => {
        // Soft fail for continuous scanning
        // console.warn(error);
      }
    );

    scannerRef.current = scanner;
    setIsInitializing(false);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => console.error("Failed to clear scanner", error));
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-[200]">
      {/* HUD Header */}
      <div className="w-full max-w-md p-6 flex justify-between items-center bg-blue-900/10 border-b border-blue-500/20 absolute top-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <h2 className="text-blue-100 font-mono text-xs uppercase tracking-[0.2em] font-bold">AIRMATRIX // Asset Scanner</h2>
        </div>
        <button 
          onClick={onClose}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-blue-100"
        >
          <X size={20} />
        </button>
      </div>

      {/* Main Scanner Viewport */}
      <div className="relative w-full max-w-sm aspect-square p-4">
        {/* Decorative Corners for high-tech feel */}
        <div className="absolute top-0 left-0 w-12 h-12 border-l-2 border-t-2 border-blue-500 rounded-tl-3xl z-10" />
        <div className="absolute top-0 right-0 w-12 h-12 border-r-2 border-t-2 border-blue-500 rounded-tr-3xl z-10" />
        <div className="absolute bottom-0 left-0 w-12 h-12 border-l-2 border-b-2 border-blue-500 rounded-bl-3xl z-10" />
        <div className="absolute bottom-0 right-0 w-12 h-12 border-r-2 border-b-2 border-blue-500 rounded-br-3xl z-10" />

        {/* Scanning Animation Line */}
        <motion.div 
          animate={{ top: ['10%', '90%', '10%'] }} 
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute left-4 right-4 h-0.5 bg-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.8)] z-20" 
        />

        <div id="qr-reader" className="w-full h-full rounded-2xl overflow-hidden bg-slate-900" />
        
        {isInitializing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-30">
            <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
            <p className="font-mono text-xs text-blue-400 uppercase tracking-widest">Initializing Optics...</p>
          </div>
        )}
      </div>

      {/* HUD Info Panel */}
      <div className="w-full max-w-xs mt-12 space-y-4">
        <div className="bg-blue-900/20 border border-blue-500/20 p-4 rounded-2xl backdrop-blur-md">
          <div className="flex items-start gap-3">
            <Info className="text-blue-400 mt-1" size={16} />
            <p className="text-blue-100/60 text-[10px] leading-relaxed uppercase tracking-wider font-mono">
              Align the asset QR code within the frame to automatically synchronized equipment data with the current ticket.
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mt-4 opacity-50">
           <div className="h-1 bg-blue-500/20 rounded-full overflow-hidden">
             <motion.div animate={{ width: '100%' }} transition={{ duration: 1, repeat: Infinity }} className="h-full bg-blue-500" />
           </div>
           <div className="h-1 bg-blue-500/20 rounded-full overflow-hidden">
             <motion.div animate={{ width: '100%' }} transition={{ duration: 1.5, repeat: Infinity }} className="h-full bg-blue-500" />
           </div>
        </div>

        <button 
          onClick={() => {
            // Demo fallback if camera not available
            toast.success("Manual Input Mode Enabled");
            onScan("ASSET-DX-2024-XJF90");
          }}
          className="w-full border border-blue-500/20 text-blue-400 py-3 rounded-xl font-mono text-[10px] uppercase tracking-widest hover:bg-blue-500/10 transition-colors"
        >
          Cant Scan? Enter Serial Number
        </button>
      </div>
    </div>
  );
}
