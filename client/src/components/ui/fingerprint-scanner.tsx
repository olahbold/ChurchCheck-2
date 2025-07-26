import { useState, useEffect } from "react";
import { Fingerprint, Shield, Smartphone, Usb, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { biometricAuth } from "@/lib/biometric-auth";
import { externalScannerManager, type ExternalScannerCapability } from "@/lib/external-scanner";
import { ExternalScannerSetup } from "@/components/ui/external-scanner-setup";

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
  const [externalScanners, setExternalScanners] = useState<ExternalScannerCapability[]>([]);
  const [scannerDialogOpen, setScannerDialogOpen] = useState(false);
  const [selectedScanMethod, setSelectedScanMethod] = useState<'biometric' | 'external' | 'mock'>('biometric');

  useEffect(() => {
    checkBiometricSupport();
    checkExternalScanners();
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

  const checkExternalScanners = async () => {
    try {
      const [usbScanners, bluetoothScanners] = await Promise.all([
        externalScannerManager.detectUSBScanners(),
        externalScannerManager.detectBluetoothScanners(),
      ]);
      const allScanners = [...usbScanners, ...bluetoothScanners];
      setExternalScanners(allScanners);
    } catch (error) {
      console.warn('Error checking external scanners:', error);
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

  const startExternalScan = async () => {
    if (scanning) return;
    
    setScanning(true);
    setScanProgress(0);
    onScanStart?.();

    try {
      const connectedScanners = externalScanners.filter(s => s.isConnected);
      if (connectedScanners.length > 0) {
        const scanner = connectedScanners[0];
        setScanProgress(20);
        const result = await externalScannerManager.captureFingerprint(scanner.type as 'usb' | 'bluetooth');
        setScanProgress(100);
        
        setTimeout(() => {
          setScanning(false);
          setScanProgress(0);
          onScanComplete?.(result.fingerprintData);
        }, 500);
      } else {
        throw new Error('No external scanner connected');
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
    if (selectedScanMethod === 'biometric' && biometricSupported && !useMockMode) {
      startRealBiometricScan();
    } else if (selectedScanMethod === 'external' && externalScanners.some(s => s.isConnected)) {
      startExternalScan();
    } else {
      startMockScan();
    }
  };

  // Determine the best available scan method
  const getAvailableScanMethods = () => {
    const methods = [];
    if (biometricSupported) methods.push('biometric');
    if (externalScanners.some(s => s.isConnected)) methods.push('external');
    methods.push('mock');
    return methods;
  };

  const availableMethods = getAvailableScanMethods();
  const hasExternalScanners = externalScanners.some(s => s.isConnected);



  return (
    <div className="bg-gradient-to-br from-[hsl(258,90%,66%)]/5 to-[hsl(271,91%,65%)]/5 rounded-2xl p-8 text-center">
      {/* Scanner Support Status */}
      <div className="flex justify-center mb-4 space-x-2">
        {biometricSupported && (
          <Badge className="bg-green-100 text-green-700 font-medium">
            <Shield className="h-3 w-3 mr-1" />
            Device Biometrics
          </Badge>
        )}
        {hasExternalScanners && (
          <Badge className="bg-blue-100 text-blue-700 font-medium">
            <Usb className="h-3 w-3 mr-1" />
            External Scanner
          </Badge>
        )}
        {!biometricSupported && !hasExternalScanners && (
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
          : selectedScanMethod === 'biometric' && biometricSupported
            ? mode === 'enroll' 
              ? 'Use your device fingerprint, face, or PIN to enroll'
              : 'Use your device biometric authentication to check in'
            : selectedScanMethod === 'external' && hasExternalScanners
              ? mode === 'enroll'
                ? 'Use connected external fingerprint scanner to enroll'
                : 'Use connected external fingerprint scanner to check in'
              : mode === 'enroll'
                ? 'Simulation mode - click to enroll'
                : 'Simulation mode - click to authenticate'
        }
      </p>

      {/* Scan Method Selection */}
      {availableMethods.length > 1 && !scanning && !isScanning && (
        <div className="mb-4 space-y-2">
          <div className="flex justify-center space-x-2">
            {biometricSupported && (
              <Button
                variant={selectedScanMethod === 'biometric' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedScanMethod('biometric')}
                className="text-xs"
              >
                <Shield className="h-3 w-3 mr-1" />
                Device
              </Button>
            )}
            {hasExternalScanners && (
              <Button
                variant={selectedScanMethod === 'external' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedScanMethod('external')}
                className="text-xs"
              >
                <Usb className="h-3 w-3 mr-1" />
                External
              </Button>
            )}
            <Button
              variant={selectedScanMethod === 'mock' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedScanMethod('mock')}
              className="text-xs"
            >
              <Smartphone className="h-3 w-3 mr-1" />
              Simulate
            </Button>
          </div>
        </div>
      )}

      {/* External Scanner Setup */}
      {!hasExternalScanners && !scanning && !isScanning && (
        <div className="mb-4">
          <Dialog open={scannerDialogOpen} onOpenChange={setScannerDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs">
                <Settings className="h-3 w-3 mr-1" />
                Setup External Scanner
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>External Scanner Setup</DialogTitle>
              </DialogHeader>
              <ExternalScannerSetup 
                onScannerConnected={(scanner) => {
                  setExternalScanners(prev => [...prev, scanner]);
                  setScannerDialogOpen(false);
                }}
                onScanComplete={(fingerprintData) => {
                  onScanComplete?.(fingerprintData);
                  setScannerDialogOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      )}
      
      {!scanning && !isScanning && (
        <Button onClick={startScan} className="church-button-primary">
          {mode === 'enroll' 
            ? selectedScanMethod === 'biometric' 
              ? 'Start Biometric Enrollment'
              : selectedScanMethod === 'external'
                ? 'Start External Scan Enrollment'
                : 'Start Enrollment'
            : selectedScanMethod === 'biometric'
              ? 'Start Biometric Scan'
              : selectedScanMethod === 'external'
                ? 'Start External Scan'
                : 'Start Scan'
          }
        </Button>
      )}
      
      {(scanning || isScanning) && (
        <div className="inline-flex items-center space-x-2 text-slate-500">
          <div className="w-2 h-2 bg-[hsl(258,90%,66%)] rounded-full animate-pulse"></div>
          <span>
            {selectedScanMethod === 'biometric' && biometricSupported
              ? 'Follow your device prompts...'
              : selectedScanMethod === 'external' && hasExternalScanners
                ? 'Place finger on external scanner...'
                : 'Processing fingerprint...'
            }
          </span>
        </div>
      )}

      {/* Information about available methods */}
      <div className="mt-4 text-xs text-slate-500">
        {selectedScanMethod === 'biometric' && biometricSupported && (
          <p>Supported: Fingerprint, Face Recognition, PIN, or Pattern</p>
        )}
        {selectedScanMethod === 'external' && hasExternalScanners && (
          <p>Using: {externalScanners.filter(s => s.isConnected).map(s => s.deviceName).join(', ')}</p>
        )}
        {selectedScanMethod === 'mock' && (
          <p>Simulation mode for testing purposes</p>
        )}
      </div>
    </div>
  );
}
