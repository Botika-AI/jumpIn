'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { Html5Qrcode as Html5QrcodeType } from 'html5-qrcode';

interface QrScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export default function QrScanner({ onScan, onClose }: QrScannerProps) {
  const scannerRef = useRef<Html5QrcodeType | null>(null);
  const onScanRef = useRef(onScan);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      scannerRef.current = new Html5Qrcode('qr-reader');

      scannerRef.current
        .start(
          { facingMode: { ideal: 'environment' } },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            onScanRef.current(decodedText);
            scannerRef.current?.stop().catch(console.error);
          },
          (errorMsg: unknown) => {
            // Per-frame "no QR found" messages — ignore
            // Real errors contain known error code keywords
            const msg = typeof errorMsg === 'string' ? errorMsg : String(errorMsg);
            if (
              msg.includes('NotAllowedError') ||
              msg.includes('NotReadableError') ||
              msg.includes('NotFoundError') ||
              msg.includes('OverconstrainedError')
            ) {
              setCameraError('Impossibile accedere alla fotocamera. Verifica i permessi del browser.');
            }
          }
        )
        .catch((err: unknown) => {
          const msg = String(err);
          if (
            msg.includes('NotAllowedError') ||
            msg.includes('NotReadableError') ||
            msg.includes('NotFoundError') ||
            msg.includes('OverconstrainedError')
          ) {
            setCameraError('Impossibile accedere alla fotocamera. Verifica i permessi del browser.');
          }
        });
    });

    return () => {
      scannerRef.current?.stop().catch(console.error);
    };
  }, []);

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
