// External fingerprint scanner integration for USB and Bluetooth devices
export interface ExternalScannerCapability {
  type: 'usb' | 'bluetooth' | 'hid';
  deviceName: string;
  isConnected: boolean;
  supportsCapture: boolean;
}

export interface FingerprintCaptureResult {
  fingerprintData: string; // Base64 encoded fingerprint template
  quality: number; // Quality score 0-100
  deviceInfo: {
    manufacturer: string;
    model: string;
    serialNumber?: string;
  };
}

export class ExternalScannerManager {
  private static instance: ExternalScannerManager;
  private connectedDevices: ExternalScannerCapability[] = [];
  private scannerCallbacks: ((result: FingerprintCaptureResult) => void)[] = [];

  static getInstance(): ExternalScannerManager {
    if (!ExternalScannerManager.instance) {
      ExternalScannerManager.instance = new ExternalScannerManager();
    }
    return ExternalScannerManager.instance;
  }

  // Check if external scanners are supported
  isExternalScannerSupported(): boolean {
    return !!((navigator as any).usb || (navigator as any).bluetooth || (navigator as any).hid);
  }

  // Check for USB fingerprint scanners
  async detectUSBScanners(): Promise<ExternalScannerCapability[]> {
    if (!(navigator as any).usb) {
      return [];
    }

    try {
      // Common fingerprint scanner vendor IDs
      const fingerprintVendorIds = [
        0x147e, // Upek/AuthenTec
        0x0483, // STMicroelectronics
        0x08ff, // AuthenTec
        0x27c6, // Goodix
        0x1c7a, // LighTuning Technology
        0x138a, // Validity Sensors
        0x06cb, // Synaptics
        0x0bda, // Realtek
      ];

      const devices = await (navigator as any).usb.getDevices();
      const scanners: ExternalScannerCapability[] = [];

      for (const device of devices) {
        if (fingerprintVendorIds.includes(device.vendorId)) {
          scanners.push({
            type: 'usb',
            deviceName: device.productName || `USB Scanner (${device.vendorId.toString(16)})`,
            isConnected: true,
            supportsCapture: true,
          });
        }
      }

      return scanners;
    } catch (error) {
      console.warn('Error detecting USB scanners:', error);
      return [];
    }
  }

  // Request permission and connect to USB scanner
  async requestUSBScanner(): Promise<ExternalScannerCapability | null> {
    if (!(navigator as any).usb) {
      throw new Error('USB is not supported in this browser');
    }

    try {
      const device = await (navigator as any).usb.requestDevice({
        filters: [
          { vendorId: 0x147e }, // Upek/AuthenTec
          { vendorId: 0x0483 }, // STMicroelectronics
          { vendorId: 0x08ff }, // AuthenTec
          { vendorId: 0x27c6 }, // Goodix
          { vendorId: 0x1c7a }, // LighTuning Technology
          { vendorId: 0x138a }, // Validity Sensors
          { vendorId: 0x06cb }, // Synaptics
          { vendorId: 0x0bda }, // Realtek
        ]
      });

      if (device) {
        const scanner: ExternalScannerCapability = {
          type: 'usb',
          deviceName: device.productName || `USB Scanner (${device.vendorId.toString(16)})`,
          isConnected: true,
          supportsCapture: true,
        };

        this.connectedDevices.push(scanner);
        return scanner;
      }

      return null;
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        throw new Error('No compatible USB fingerprint scanner found');
      } else if (error.name === 'SecurityError') {
        throw new Error('USB access denied. Please allow USB device access.');
      } else {
        throw new Error(`USB scanner connection failed: ${error.message}`);
      }
    }
  }

  // Check for Bluetooth fingerprint scanners
  async detectBluetoothScanners(): Promise<ExternalScannerCapability[]> {
    if (!(navigator as any).bluetooth) {
      return [];
    }

    try {
      const devices = await (navigator as any).bluetooth.getDevices();
      const scanners: ExternalScannerCapability[] = [];

      for (const device of devices) {
        // Check for known fingerprint scanner Bluetooth services
        if (device.name && (device.name.toLowerCase().includes('scanner') || 
            device.name.toLowerCase().includes('fingerprint') ||
            device.name.toLowerCase().includes('secugen') ||
            device.name.toLowerCase().includes('futronic'))) {
          scanners.push({
            type: 'bluetooth',
            deviceName: device.name || 'Bluetooth Scanner',
            isConnected: (device as any).gatt?.connected || false,
            supportsCapture: true,
          });
        }
      }

      return scanners;
    } catch (error) {
      console.warn('Error detecting Bluetooth scanners:', error);
      return [];
    }
  }

  // Request permission and connect to Bluetooth scanner
  async requestBluetoothScanner(): Promise<ExternalScannerCapability | null> {
    if (!(navigator as any).bluetooth) {
      throw new Error('Bluetooth is not supported in this browser');
    }

    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { namePrefix: 'SecuGen' },
          { namePrefix: 'Futronic' },
          { namePrefix: 'Scanner' },
          { namePrefix: 'Fingerprint' },
        ],
        optionalServices: [
          '12345678-1234-1234-1234-123456789abc', // Generic fingerprint service
          '0000180f-0000-1000-8000-00805f9b34fb', // Battery service
        ]
      });

      if (device) {
        const scanner: ExternalScannerCapability = {
          type: 'bluetooth',
          deviceName: device.name || 'Bluetooth Scanner',
          isConnected: false,
          supportsCapture: true,
        };

        // Connect to the device
        const server = await (device as any).gatt?.connect();
        if (server) {
          scanner.isConnected = true;
          this.connectedDevices.push(scanner);
        }

        return scanner;
      }

      return null;
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        throw new Error('No compatible Bluetooth fingerprint scanner found');
      } else if (error.name === 'SecurityError') {
        throw new Error('Bluetooth access denied. Please allow Bluetooth access.');
      } else {
        throw new Error(`Bluetooth scanner connection failed: ${error.message}`);
      }
    }
  }

  // Get all connected scanners
  getConnectedScanners(): ExternalScannerCapability[] {
    return [...this.connectedDevices];
  }

  // Simulate fingerprint capture from external scanner
  async captureFingerprint(scannerType: 'usb' | 'bluetooth' = 'usb'): Promise<FingerprintCaptureResult> {
    const scanner = this.connectedDevices.find(s => s.type === scannerType && s.isConnected);
    
    if (!scanner) {
      throw new Error(`No connected ${scannerType} scanner found`);
    }

    // Simulate the scanning process
    return new Promise((resolve, reject) => {
      // Simulate scanning delay
      setTimeout(() => {
        try {
          // Generate a simulated fingerprint template based on device characteristics
          const deviceInfo = {
            manufacturer: scannerType === 'usb' ? 'Generic USB' : 'Bluetooth Scanner',
            model: scanner.deviceName,
            serialNumber: Math.random().toString(36).substring(2, 15),
          };

          // Create a more realistic fingerprint template simulation
          const fingerprintData = this.generateSimulatedTemplate(deviceInfo);

          const result: FingerprintCaptureResult = {
            fingerprintData,
            quality: Math.floor(Math.random() * 20) + 80, // 80-100% quality
            deviceInfo,
          };

          resolve(result);
        } catch (error) {
          reject(new Error(`Fingerprint capture failed: ${error}`));
        }
      }, 2000); // 2 second scan time
    });
  }

  // Generate a simulated fingerprint template
  private generateSimulatedTemplate(deviceInfo: any): string {
    // Create a more sophisticated template simulation
    const baseTemplate = {
      version: '1.0',
      scanner: deviceInfo.model,
      timestamp: Date.now(),
      features: Array.from({ length: 20 }, () => ({
        x: Math.floor(Math.random() * 256),
        y: Math.floor(Math.random() * 256),
        angle: Math.floor(Math.random() * 360),
        type: ['ridge_ending', 'bifurcation'][Math.floor(Math.random() * 2)],
      })),
      quality_metrics: {
        clarity: Math.floor(Math.random() * 20) + 80,
        completeness: Math.floor(Math.random() * 15) + 85,
        uniqueness: Math.floor(Math.random() * 10) + 90,
      }
    };

    return btoa(JSON.stringify(baseTemplate));
  }

  // Subscribe to scanner events
  onScannerCapture(callback: (result: FingerprintCaptureResult) => void): void {
    this.scannerCallbacks.push(callback);
  }

  // Remove scanner event subscription
  offScannerCapture(callback: (result: FingerprintCaptureResult) => void): void {
    const index = this.scannerCallbacks.indexOf(callback);
    if (index > -1) {
      this.scannerCallbacks.splice(index, 1);
    }
  }

  // Disconnect all scanners
  async disconnectAll(): Promise<void> {
    for (const scanner of this.connectedDevices) {
      scanner.isConnected = false;
    }
    this.connectedDevices = [];
  }

  // Get scanner status summary
  getScannerStatus(): {
    hasUSBSupport: boolean;
    hasBluetoothSupport: boolean;
    connectedCount: number;
    availableScanners: ExternalScannerCapability[];
  } {
    return {
      hasUSBSupport: !!(navigator as any).usb,
      hasBluetoothSupport: !!(navigator as any).bluetooth,
      connectedCount: this.connectedDevices.filter(s => s.isConnected).length,
      availableScanners: this.getConnectedScanners(),
    };
  }
}

export const externalScannerManager = ExternalScannerManager.getInstance();