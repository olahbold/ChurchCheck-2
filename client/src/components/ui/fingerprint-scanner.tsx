import { useState, useEffect } from "react";
import { Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FingerprintScannerProps {
  onScanComplete?: (fingerprintId: string) => void;
  onScanStart?: () => void;
  mode?: 'enroll' | 'scan';
  isScanning?: boolean;
}

export function FingerprintScanner({ 
  onScanComplete, 
  onScanStart, 
  mode = 'scan',
  isScanning = false 
}: FingerprintScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  const startScan = () => {
    if (scanning) return;
    
    setScanning(true);
    setScanProgress(0);
    onScanStart?.();

    // Simulate fingerprint scanning progress
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setScanning(false);
          
          // Generate a mock fingerprint ID based on device characteristics
          const deviceId = navigator.userAgent + navigator.language + screen.width;
          const fingerprintId = `fp_mock_${btoa(deviceId).substring(0, 10)}`;
          
          onScanComplete?.(fingerprintId);
          return 0;
        }
        return prev + 10;
      });
    }, 200);
  };

  return (
    <div className="bg-gradient-to-br from-[hsl(258,90%,66%)]/5 to-[hsl(271,91%,65%)]/5 rounded-2xl p-8 text-center">
      <div className="w-32 h-32 bg-white rounded-full shadow-lg flex items-center justify-center mx-auto mb-6 relative overflow-hidden">
        <Fingerprint className="text-[hsl(258,90%,66%)] text-5xl" />
        {(scanning || isScanning) && (
          <div 
            className="absolute inset-0 bg-[hsl(258,90%,66%)]/20 transition-all duration-200"
            style={{ 
              clipPath: `inset(${100 - scanProgress}% 0 0 0)`,
              animation: scanning ? 'pulse 1s infinite' : undefined
            }}
          />
        )}
      </div>
      
      <h3 className="text-xl font-semibold text-slate-900 mb-2">
        {mode === 'enroll' ? 'Enroll Fingerprint' : 'Place Finger on Scanner'}
      </h3>
      
      <p className="text-slate-600 mb-6">
        {scanning || isScanning
          ? `${mode === 'enroll' ? 'Enrolling' : 'Scanning'}... ${scanProgress}%`
          : mode === 'enroll' 
            ? 'Place finger on sensor to enroll'
            : 'System will automatically identify and check you in'
        }
      </p>
      
      {!scanning && !isScanning && (
        <Button onClick={startScan} className="church-button-primary">
          {mode === 'enroll' ? 'Start Enrollment' : 'Start Scan'}
        </Button>
      )}
      
      {(scanning || isScanning) && (
        <div className="inline-flex items-center space-x-2 text-slate-500">
          <div className="w-2 h-2 bg-[hsl(258,90%,66%)] rounded-full animate-pulse"></div>
          <span>Processing fingerprint...</span>
        </div>
      )}
    </div>
  );
}
