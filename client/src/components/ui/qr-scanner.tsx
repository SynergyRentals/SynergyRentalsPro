import React, { useCallback, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';

interface QrReaderProps {
  onResult: (result: string) => void;
  constraints?: MediaTrackConstraints;
}

// Initialize Html5Qrcode outside of component to avoid re-initialization
let html5QrCode: Html5Qrcode | null = null;

export function QrReader({ onResult, constraints = { facingMode: "environment" } }: QrReaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const qrReaderRef = useCallback((node: HTMLDivElement | null) => {
    // Exit if null (component unmounting)
    if (!node) {
      if (html5QrCode && html5QrCode.getState() === Html5QrcodeScannerState.SCANNING) {
        html5QrCode.stop().catch(error => console.error("Failed to stop camera:", error));
      }
      return;
    }

    const qrboxFunction = (viewfinderWidth: number, viewfinderHeight: number) => {
      const minEdgePercentage = 0.7; // 70% of the viewfinder
      const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
      const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
      return {
        width: qrboxSize,
        height: qrboxSize
      };
    };

    // Only initialize once
    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode(node.id);
    }

    // Start scanning
    setIsScanning(true);
    html5QrCode
      .start(
        { facingMode: constraints.facingMode },
        {
          fps: 10, 
          qrbox: qrboxFunction,
          aspectRatio: 1.0,
          disableFlip: false,
        },
        (decodedText) => {
          // When a QR code is detected, call the onResult callback
          onResult(decodedText);
          
          // Stop scanning after a successful scan
          html5QrCode?.stop().catch(error => console.error("Failed to stop camera:", error));
        },
        (errorMessage) => {
          // Ignore these ongoing "errors" which are normal during scanning
          if (errorMessage.includes("No QR code found")) {
            return;
          }
          setError(errorMessage);
        }
      )
      .catch((err) => {
        setError(`Failed to start scanner: ${err}`);
        setIsScanning(false);
      });

    // Cleanup function - will be called when component unmounts
    return () => {
      if (html5QrCode && html5QrCode.getState() === Html5QrcodeScannerState.SCANNING) {
        html5QrCode.stop().catch(error => console.error("Failed to stop camera:", error));
      }
    };
  }, [onResult, constraints]);

  return (
    <div className="qr-reader-container">
      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md mb-4">
          {error}
        </div>
      )}
      <div 
        ref={qrReaderRef} 
        id="qr-reader" 
        style={{ 
          width: '100%', 
          aspectRatio: '1/1', 
          position: 'relative', 
          overflow: 'hidden', 
          borderRadius: '0.5rem', 
          background: '#000'
        }}
      >
        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 text-foreground">
            Initializing camera...
          </div>
        )}
      </div>
      <div className="mt-4 text-center text-sm text-muted-foreground">
        Position the QR code within the frame to scan
      </div>
    </div>
  );
}