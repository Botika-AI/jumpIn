'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { Html5QrcodeScanner as Html5QrcodeScannerType } from 'html5-qrcode';

interface QrScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export default function QrScanner({ onScan, onClose }: QrScannerProps) {
  const scannerRef = useRef<Html5QrcodeScannerType | null>(null);
  const onScanRef = useRef(onScan);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Keep ref in sync with latest onScan prop
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  // Initialize scanner once on mount — empty dep array avoids re-initialization bug
  useEffect(() => {
    import('html5-qrcode').then(({ Html5QrcodeScanner }) => {
      scannerRef.current = new Html5QrcodeScanner(
        'qr-reader',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scannerRef.current.render(
        (decodedText) => {
          onScanRef.current(decodedText);
          scannerRef.current?.clear();
        },
        (errorMsg: unknown) => {
          // Per-frame "no QR found" errors come as plain strings — ignore them
          // Hardware/permission errors come as Error objects with a .name property
          if (errorMsg && typeof errorMsg !== 'string' && (errorMsg as Error).name) {
            setCameraError('Impossibile accedere alla fotocamera. Verifica i permessi del browser.');
          }
        }
      );
    });

    return () => {
      setCameraError(null);
      scannerRef.current?.clear().catch(console.error);
    };
  }, []); // empty — initialize once

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        aria-label="Chiudi scanner"
      >
        <X size={28} />
      </button>

      <div className="w-full max-w-lg overflow-hidden rounded-2xl liquid-glass">
        <div id="qr-reader" className="w-full" />
      </div>

      <p className="mt-8 text-center text-gray-400 animate-pulse font-medium">
        Inquadra il QR Code JumpIn per effettuare il Check-in
      </p>
      {cameraError && (
        <p className="text-red-400 text-sm text-center mt-2 px-4">{cameraError}</p>
      )}
    </div>
  );
}
