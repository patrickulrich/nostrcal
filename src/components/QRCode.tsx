import { useEffect, useRef } from 'react';
import qrcode from 'qrcode-generator';

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCodeComponent({ value, size = 256, className = '' }: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create QR code
    const qr = qrcode(0, 'M');
    qr.addData(value);
    qr.make();

    // Get QR code dimensions
    const moduleCount = qr.getModuleCount();
    const cellSize = size / moduleCount;
    
    // Set canvas size
    canvas.width = size;
    canvas.height = size;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Draw QR code
    ctx.fillStyle = '#000000';
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (qr.isDark(row, col)) {
          ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
      }
    }
  }, [value, size]);

  return (
    <canvas
      ref={canvasRef}
      className={`border rounded ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  );
}