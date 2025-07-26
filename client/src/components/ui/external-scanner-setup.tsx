import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { externalScannerManager, type ExternalScannerCapability } from "@/lib/external-scanner";
import { Usb, Bluetooth, Settings, Scan, CheckCircle, AlertCircle, Smartphone } from "lucide-react";

interface ExternalScannerSetupProps {
  onScannerConnected?: (scanner: ExternalScannerCapability) => void;
  onScanComplete?: (fingerprintData: string) => void;
}

export function ExternalScannerSetup({ onScannerConnected, onScanComplete }: ExternalScannerSetupProps) {
  const [scanners, setScanners] = useState<ExternalScannerCapability[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerStatus, setScannerStatus] = useState(externalScannerManager.getScannerStatus());
  const { toast } = useToast();

  useEffect(() => {
    detectExistingScanners();
  }, []);

  const detectExistingScanners = async () => {
    try {
      const [usbScanners, bluetoothScanners] = await Promise.all([
        externalScannerManager.detectUSBScanners(),
        externalScannerManager.detectBluetoothScanners(),
      ]);

      const allScanners = [...usbScanners, ...bluetoothScanners];
      setScanners(allScanners);
      setScannerStatus(externalScannerManager.getScannerStatus());
    } catch (error) {
      console.warn('Error detecting scanners:', error);
    }
  };

  const connectUSBScanner = async () => {
    try {
      const scanner = await externalScannerManager.requestUSBScanner();
      if (scanner) {
        setScanners(prev => [...prev, scanner]);
        setScannerStatus(externalScannerManager.getScannerStatus());
        onScannerConnected?.(scanner);
        toast({
          title: "USB Scanner Connected",
          description: `${scanner.deviceName} is now ready for fingerprint scanning`,
        });
      }
    } catch (error: any) {
      toast({
        title: "USB Connection Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const connectBluetoothScanner = async () => {
    try {
      const scanner = await externalScannerManager.requestBluetoothScanner();
      if (scanner) {
        setScanners(prev => [...prev, scanner]);
        setScannerStatus(externalScannerManager.getScannerStatus());
        onScannerConnected?.(scanner);
        toast({
          title: "Bluetooth Scanner Connected",
          description: `${scanner.deviceName} is now ready for fingerprint scanning`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Bluetooth Connection Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const captureFingerprint = async (scannerType: 'usb' | 'bluetooth') => {
    setIsScanning(true);
    try {
      const result = await externalScannerManager.captureFingerprint(scannerType);
      
      toast({
        title: "Fingerprint Captured",
        description: `Quality: ${result.quality}% - Scanner: ${result.deviceInfo.model}`,
      });

      onScanComplete?.(result.fingerprintData);
    } catch (error: any) {
      toast({
        title: "Scan Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const connectedScanners = scanners.filter(s => s.isConnected);
  const hasConnectedScanners = connectedScanners.length > 0;

  return (
    <div className="space-y-4">
      {/* Scanner Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>External Scanner Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* USB Support */}
            <div className="flex items-center space-x-3">
              <Usb className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium">USB Support</p>
                <Badge variant={scannerStatus.hasUSBSupport ? "default" : "secondary"}>
                  {scannerStatus.hasUSBSupport ? "Available" : "Not Supported"}
                </Badge>
              </div>
            </div>

            {/* Bluetooth Support */}
            <div className="flex items-center space-x-3">
              <Bluetooth className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium">Bluetooth Support</p>
                <Badge variant={scannerStatus.hasBluetoothSupport ? "default" : "secondary"}>
                  {scannerStatus.hasBluetoothSupport ? "Available" : "Not Supported"}
                </Badge>
              </div>
            </div>

            {/* Connected Count */}
            <div className="flex items-center space-x-3">
              <Smartphone className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">Connected Scanners</p>
                <Badge variant={hasConnectedScanners ? "default" : "secondary"}>
                  {scannerStatus.connectedCount} Connected
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Connect External Scanner</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* USB Scanner Connection */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Usb className="h-4 w-4" />
                <span className="font-medium">USB Fingerprint Scanner</span>
              </div>
              <p className="text-sm text-slate-600">
                Connect USB fingerprint scanners (SecuGen, Futronic, etc.)
              </p>
              <Button 
                onClick={connectUSBScanner}
                disabled={!scannerStatus.hasUSBSupport}
                className="w-full"
                variant="outline"
              >
                <Usb className="h-4 w-4 mr-2" />
                Connect USB Scanner
              </Button>
            </div>

            {/* Bluetooth Scanner Connection */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Bluetooth className="h-4 w-4" />
                <span className="font-medium">Bluetooth Scanner</span>
              </div>
              <p className="text-sm text-slate-600">
                Connect Bluetooth fingerprint scanners (SecuGen Unity, etc.)
              </p>
              <Button 
                onClick={connectBluetoothScanner}
                disabled={!scannerStatus.hasBluetoothSupport}
                className="w-full"
                variant="outline"
              >
                <Bluetooth className="h-4 w-4 mr-2" />
                Connect Bluetooth Scanner
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connected Scanners */}
      {hasConnectedScanners && (
        <Card>
          <CardHeader>
            <CardTitle>Connected Scanners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {connectedScanners.map((scanner, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {scanner.type === 'usb' ? (
                      <Usb className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Bluetooth className="h-5 w-5 text-blue-600" />
                    )}
                    <div>
                      <p className="font-medium">{scanner.deviceName}</p>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span className="text-xs text-green-600">Connected</span>
                        <Badge variant="outline" className="text-xs">
                          {scanner.type.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => captureFingerprint(scanner.type as 'usb' | 'bluetooth')}
                    disabled={isScanning}
                    size="sm"
                  >
                    <Scan className="h-4 w-4 mr-2" />
                    {isScanning ? 'Scanning...' : 'Scan'}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">For USB Scanners:</h4>
              <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                <li>Connect your USB fingerprint scanner to your device</li>
                <li>Click "Connect USB Scanner" and select your device</li>
                <li>Grant USB device permissions when prompted</li>
                <li>Scanner will appear in the connected devices list</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">For Bluetooth Scanners:</h4>
              <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                <li>Turn on your Bluetooth fingerprint scanner</li>
                <li>Make sure it's in pairing mode</li>
                <li>Click "Connect Bluetooth Scanner" and select your device</li>
                <li>Wait for connection to establish</li>
              </ul>
            </div>
            <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">Browser Compatibility</p>
                <p className="text-blue-700">
                  External scanner support requires a modern browser with WebUSB/WebBluetooth APIs. 
                  Works best with Chrome/Edge on desktop and Android devices.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Quick scanner status component for other parts of the app
export function ScannerStatusIndicator() {
  const [status, setStatus] = useState(externalScannerManager.getScannerStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(externalScannerManager.getScannerStatus());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (status.connectedCount === 0) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="fixed bottom-4 right-4">
          <Settings className="h-4 w-4 mr-2" />
          {status.connectedCount} Scanner{status.connectedCount !== 1 ? 's' : ''}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>External Scanner Management</DialogTitle>
        </DialogHeader>
        <ExternalScannerSetup />
      </DialogContent>
    </Dialog>
  );
}