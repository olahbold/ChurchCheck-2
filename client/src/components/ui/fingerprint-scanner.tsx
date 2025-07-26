import { useState, useEffect } from "react";
import { Fingerprint, Shield, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { biometricAuth } from "@/lib/biometric-auth";

interface FingerprintScannerProps {
  onScanComplete?: (fingerprintId: string) => void;
  onScanStart?: () => void;
  onError?: (error: string) => void;
  mode?: 'enroll' | 'scan';
  isScanning?: boolean;
  userId?: string;
  userName?: string;
  existingCredentialId?: string;
}

export function FingerprintScanner({ 
  onScanComplete, 
  onScanStart, 
  onError,
  mode = 'scan',
  isScanning = false,
  userId,
  userName,
  existingCredentialId
}: FingerprintScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [availableBiometrics, setAvailableBiometrics] = useState<string[]>([]);
  const [useMockMode, setUseMockMode] = useState(false);

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      const isSupported = await biometricAuth.isPlatformAuthenticatorAvailable();
      setBiometricSupported(isSupported);
      
      if (isSupported) {
        const types = await biometricAuth.getAvailableBiometricTypes();
        setAvailableBiometrics(types);
      }
    } catch (error) {
      console.warn('Error checking biometric support:', error);
      setBiometricSupported(false);
    }
  };

  const startRealBiometricScan = async () => {
    if (scanning || !biometricSupported) return;
    
    setScanning(true);
    setScanProgress(0);
    onScanStart?.();

    try {
      if (mode === 'enroll') {
        if (!userId || !userName) {
          throw new Error('User ID and name are required for enrollment');
        }
        
        setScanProgress(20);
        const credential = await biometricAuth.enrollBiometric(userId, userName);
        setScanProgress(100);
        
        setTimeout(() => {
          setScanning(false);
          setScanProgress(0);
          onScanComplete?.(credential.credentialId);
        }, 500);
        
      } else {
        if (!existingCredentialId) {
          throw new Error('Credential ID is required for authentication');
        }
        
        setScanProgress(20);
        const result = await biometricAuth.authenticateBiometric(existingCredentialId);
        setScanProgress(100);
        
        setTimeout(() => {
          setScanning(false);
          setScanProgress(0);
          if (result.success) {
            onScanComplete?.(existingCredentialId);
          } else {
            onError?.('Biometric authentication failed');
          }
        }, 500);
      }
    } catch (error: any) {
      setScanning(false);
      setScanProgress(0);
      onError?.(error.message);
    }
  };

  const startMockScan = () => {
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

  const startScan = () => {
    if (useMockMode || !biometricSupported) {
      startMockScan();
    } else {
      startRealBiometricScan();
    }
  };

  return (
    <div className="bg-gradient-to-br from-[hsl(258,90%,66%)]/5 to-[hsl(271,91%,65%)]/5 rounded-2xl p-8 text-center">
      {/* Biometric Support Status */}
      <div className="flex justify-center mb-4">
        {biometricSupported ? (
          <Badge className="bg-green-100 text-green-700 font-medium">
            <Shield className="h-3 w-3 mr-1" />
            Device Biometrics Available
          </Badge>
        ) : (
          <Badge className="bg-amber-100 text-amber-700 font-medium">
            <Smartphone className="h-3 w-3 mr-1" />
            Simulation Mode
          </Badge>
        )}
      </div>

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
        {mode === 'enroll' ? 'Enroll Biometric' : 'Biometric Authentication'}
      </h3>
      
      <p className="text-slate-600 mb-6">
        {scanning || isScanning
          ? `${mode === 'enroll' ? 'Enrolling' : 'Authenticating'}... ${scanProgress}%`
          : biometricSupported
            ? mode === 'enroll' 
              ? 'Use your device fingerprint, face, or PIN to enroll'
              : 'Use your device biometric authentication to check in'
            : mode === 'enroll'
              ? 'Device simulation mode - click to enroll'
              : 'Device simulation mode - click to authenticate'
        }
      </p>

      {/* Mode Toggle for Testing */}
      {biometricSupported && !scanning && !isScanning && (
        <div className="mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUseMockMode(!useMockMode)}
            className="text-xs"
          >
            {useMockMode ? 'Use Real Biometrics' : 'Use Simulation Mode'}
          </Button>
        </div>
      )}
      
      {!scanning && !isScanning && (
        <Button onClick={startScan} className="church-button-primary">
          {mode === 'enroll' 
            ? (biometricSupported && !useMockMode ? 'Start Biometric Enrollment' : 'Start Enrollment') 
            : (biometricSupported && !useMockMode ? 'Start Biometric Scan' : 'Start Scan')
          }
        </Button>
      )}
      
      {(scanning || isScanning) && (
        <div className="inline-flex items-center space-x-2 text-slate-500">
          <div className="w-2 h-2 bg-[hsl(258,90%,66%)] rounded-full animate-pulse"></div>
          <span>
            {biometricSupported && !useMockMode 
              ? 'Follow your device prompts...' 
              : 'Processing fingerprint...'
            }
          </span>
        </div>
      )}

      {/* Information about biometric types */}
      {biometricSupported && availableBiometrics.length > 0 && (
        <div className="mt-4 text-xs text-slate-500">
          <p>Supported: Fingerprint, Face Recognition, PIN, or Pattern</p>
        </div>
      )}
    </div>
  );
}
