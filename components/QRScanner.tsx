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
    let cancelled = false;
    let started = false;

    const handleError = (err: unknown) => {
      const msg = String(err);
      if (
        msg.includes('NotAllowedError') ||
        msg.includes('NotReadableError') ||
        msg.includes('NotFoundError') ||
        msg.includes('OverconstrainedError') ||
        msg.includes('Camera streaming not supported') ||
        msg.includes('insecure context') ||
        msg.includes('getUserMedia') ||
        msg.includes('https')
      ) {
        setCameraError('Impossibile accedere alla fotocamera. Verifica i permessi del browser.');
      } else if (msg.length > 0 && !msg.includes('No MultiFormat Readers')) {
        // Generic fallback — not a per-frame "no QR found" message
        setCameraError('Errore fotocamera. Ricarica la pagina e riprova.');
      }
    };

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (cancelled) return;

      scannerRef.current = new Html5Qrcode('qr-reader');

      const startScanner = () => {
        if (cancelled) return;
        const container = document.getElementById('qr-reader');
        if (!container || container.clientWidth === 0) {
          requestAnimationFrame(startScanner);
          return;
        }
        scannerRef.current!
          .start(
            { facingMode: { ideal: 'environment' } },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
              onScanRef.current(decodedText);
              started = false;
              scannerRef.current?.stop().catch(() => {});
            },
            () => {
              // Per-frame "no QR code found" — not a real error, ignore
            }
          )
          .then(() => { started = true; })
          .catch(handleError);
      };
      startScanner();
    });

    return () => {
      cancelled = true;
      if (started) {
        started = false;
        scannerRef.current?.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
        aria-label="Chiudi scanner"
      >
        <X size={28} />
      </button>

      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-black">
        <div id="qr-reader" className="w-full min-h-[300px]" />
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
