import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, User, UserPlus, Fingerprint, ScanLine } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "wouter";

interface CheckInEnhancementProps {
  onFingerprintScan?: () => void;
  onManualSearch?: () => void;
  onFirstTimerFlow?: () => void;
}

export default function CheckInEnhancement({
  onFingerprintScan,
  onManualSearch,
  onFirstTimerFlow
}: CheckInEnhancementProps) {
  const [scanStatus, setScanStatus] = useState<"ready" | "scanning" | "not-found">("ready");

  const handleFingerprintScan = async () => {
    setScanStatus("scanning");
    onFingerprintScan?.();
    
    // Simulate fingerprint scan result (you'd integrate with real scanner here)
    setTimeout(() => {
      // Simulate "not found" result for demo - would be replaced with actual scanner integration
      setScanStatus("not-found");
    }, 2000);
  };

  const handleTryAgain = () => {
    setScanStatus("ready");
  };

  if (scanStatus === "not-found") {
    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle>Fingerprint Not Found</CardTitle>
            <p className="text-sm text-slate-600 mt-2">
              We couldn't find your fingerprint in our member database.
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Alert>
              <User className="h-4 w-4" />
              <AlertDescription>
                This could mean you're a first-time visitor or haven't registered your fingerprint yet.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 gap-3">
              <Link href="/first-timer">
                <Button 
                  className="w-full bg-gradient-to-r from-[hsl(258,90%,66%)] to-[hsl(271,91%,65%)] hover:from-[hsl(258,85%,61%)] hover:to-[hsl(271,86%,60%)]"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  I'm a First-Time Visitor
                </Button>
              </Link>
              
              <Button 
                variant="outline"
                onClick={onManualSearch}
                className="w-full"
              >
                <User className="h-4 w-4 mr-2" />
                Search for Existing Member
              </Button>
              
              <Button 
                variant="ghost"
                onClick={handleTryAgain}
                className="w-full"
              >
                <Fingerprint className="h-4 w-4 mr-2" />
                Try Fingerprint Again
              </Button>
            </div>

            <div className="text-center text-xs text-slate-500 mt-4">
              <p>Need help? Ask a volunteer for assistance.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (scanStatus === "scanning") {
    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
                <ScanLine className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle>Scanning Fingerprint...</CardTitle>
            <p className="text-sm text-slate-600 mt-2">
              Please keep your finger on the scanner until the process is complete.
            </p>
          </CardHeader>
          
          <CardContent>
            <div className="flex justify-center">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full animate-pulse" style={{ width: "60%" }}></div>
              </div>
            </div>
            <p className="text-center text-xs text-slate-500 mt-2">Scanning in progress...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default ready state
  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
              <Fingerprint className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle>Church Check-In System</CardTitle>
          <p className="text-sm text-slate-600 mt-2">
            Welcome! Please choose how you'd like to check in today.
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <Button 
              onClick={handleFingerprintScan}
              className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 py-6"
            >
              <Fingerprint className="h-5 w-5 mr-2" />
              Scan Fingerprint
            </Button>
            
            <Button 
              variant="outline"
              onClick={onManualSearch}
              className="w-full py-4"
            >
              <User className="h-4 w-4 mr-2" />
              Search by Name
            </Button>
            
            <Link href="/first-timer">
              <Button 
                variant="outline"
                className="w-full py-4 border-dashed border-2 border-[hsl(258,90%,66%)] text-[hsl(258,90%,66%)] hover:bg-[hsl(258,90%,66%)] hover:text-white"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                First-Time Visitor
              </Button>
            </Link>
          </div>

          <div className="text-center text-xs text-slate-500 mt-6">
            <p>Having trouble? Ask a volunteer for help.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}