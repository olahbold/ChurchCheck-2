import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Fingerprint, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FingerprintScannerProps {
  onScanResult?: (fingerprintId: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  mode?: 'scan' | 'enroll';
  className?: string;
}

export function FingerprintScanner({ 
  onScanResult, 
  onError, 
  disabled = false, 
  mode = 'scan',
  className = '' 
}: FingerprintScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<'success' | 'error' | null>(null);
  const { toast } = useToast();

  const handleScan = async () => {
    if (disabled || isScanning) return;

    setIsScanning(true);
    setScanResult(null);

    try {
      // Simulate fingerprint scanning - In a real implementation, this would interface with actual hardware
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For demo purposes, generate a mock fingerprint ID
      const mockFingerprintId = `fp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      setScanResult('success');
      onScanResult?.(mockFingerprintId);
      
      toast({
        title: "Fingerprint Captured",
        description: mode === 'enroll' ? "Fingerprint enrolled successfully" : "Fingerprint recognized",
      });
    } catch (error) {
      setScanResult('error');
      const errorMessage = "Fingerprint scan failed. Please try again.";
      onError?.(errorMessage);
      
      toast({
        title: "Scan Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
      // Reset scan result after 3 seconds
      setTimeout(() => setScanResult(null), 3000);
    }
  };

  const getButtonContent = () => {
    if (isScanning) {
      return (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Scanning...
        </>
      );
    }

    if (scanResult === 'success') {
      return (
        <>
          <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
          Success
        </>
      );
    }

    if (scanResult === 'error') {
      return (
        <>
          <XCircle className="h-4 w-4 mr-2 text-red-600" />
          Failed
        </>
      );
    }

    return (
      <>
        <Fingerprint className="h-4 w-4 mr-2" />
        {mode === 'enroll' ? 'Enroll Fingerprint' : 'Scan Fingerprint'}
      </>
    );
  };

  const getButtonVariant = () => {
    if (scanResult === 'success') return 'default';
    if (scanResult === 'error') return 'destructive';
    return 'outline';
  };

  return (
    <Card className={`w-full max-w-sm ${className}`}>
      <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
        <div className="text-center">
          <Fingerprint className="h-12 w-12 mx-auto mb-2 text-blue-600" />
          <h3 className="text-lg font-semibold">
            {mode === 'enroll' ? 'Fingerprint Enrollment' : 'Fingerprint Scanner'}
          </h3>
          <p className="text-sm text-gray-500">
            {mode === 'enroll' 
              ? 'Place your finger on the scanner to enroll'
              : 'Place your finger on the scanner to check in'
            }
          </p>
        </div>

        <Button
          onClick={handleScan}
          disabled={disabled || isScanning}
          variant={getButtonVariant()}
          size="lg"
          className="w-full"
        >
          {getButtonContent()}
        </Button>

        {mode === 'scan' && (
          <p className="text-xs text-gray-400 text-center">
            Note: This is a demo scanner. In production, this would connect to actual fingerprint hardware.
          </p>
        )}
      </CardContent>
    </Card>
  );
}