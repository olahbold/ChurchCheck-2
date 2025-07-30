import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, User, UserPlus, Fingerprint } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import FirstTimerForm from "./first-timer-form";
import type { InsertVisitor } from "@shared/schema";

interface FirstTimerCheckInFlowProps {
  onComplete?: (action: "registered" | "cancelled") => void;
  onRegisterMember?: (visitorData: InsertVisitor) => void;
  scannerType?: "device" | "external" | "simulation";
}

export default function FirstTimerCheckInFlow({ 
  onComplete, 
  onRegisterMember,
  scannerType = "device"
}: FirstTimerCheckInFlowProps) {
  const [currentStep, setCurrentStep] = useState<"detection" | "form" | "biometric" | "complete">("detection");
  const [visitorData, setVisitorData] = useState<InsertVisitor | null>(null);

  const handleVisitorFormSubmit = (data: InsertVisitor) => {
    setVisitorData(data);
    setCurrentStep("biometric");
  };

  const handleBiometricEnrollment = () => {
    // After biometric enrollment (optional), we can register as member
    if (visitorData) {
      onRegisterMember?.(visitorData);
    }
    setCurrentStep("complete");
  };

  const handleSkipEnrollment = () => {
    setCurrentStep("complete");
    onComplete?.("registered");
  };

  const handleCancel = () => {
    onComplete?.("cancelled");
  };

  if (currentStep === "form") {
    return (
      <FirstTimerForm 
        onSubmit={handleVisitorFormSubmit}
        onCancel={handleCancel}
      />
    );
  }

  if (currentStep === "biometric") {
    return (
      <div className="max-w-md mx-auto p-6">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                <Fingerprint className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle>Optional Biometric Registration</CardTitle>
            <p className="text-sm text-slate-600 mt-2">
              Thank you for filling out the visitor form! Would you like to register your fingerprint for faster check-ins in the future?
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This step is completely optional. You can always register your fingerprint later when you visit again.
              </AlertDescription>
            </Alert>

            <div className="flex space-x-3">
              <Button
                onClick={handleBiometricEnrollment}
                className="flex-1 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
              >
                <Fingerprint className="h-4 w-4 mr-2" />
                Register Fingerprint
              </Button>
              
              <Button
                variant="outline"
                onClick={handleSkipEnrollment}
                className="flex-1"
              >
                Skip for Now
              </Button>
            </div>

            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="text-slate-500"
              >
                Cancel Check-in
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStep === "complete") {
    return (
      <div className="max-w-md mx-auto p-6">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-green-700">Welcome to Church!</CardTitle>
            <p className="text-sm text-slate-600 mt-2">
              Thank you for visiting us today. Your information has been recorded and someone from our team will follow up with you soon.
            </p>
          </CardHeader>
          
          <CardContent>
            <Button
              onClick={() => onComplete?.("registered")}
              className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
            >
              Complete Check-in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default detection step
  return (
    <div className="max-w-md mx-auto p-6">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle>Fingerprint Not Recognized</CardTitle>
          <Badge variant="secondary" className="mt-2">
            First-time Visitor Detection
          </Badge>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert>
            <User className="h-4 w-4" />
            <AlertDescription>
              We couldn't find your fingerprint in our system. This usually means you're visiting us for the first time. Welcome!
            </AlertDescription>
          </Alert>

          <div className="text-sm text-slate-600 bg-blue-50 p-3 rounded-lg">
            <p className="font-medium mb-1">What happens next?</p>
            <ul className="space-y-1 text-xs">
              <li>• Fill out a quick visitor form</li>
              <li>• Share your contact details (optional)</li>
              <li>• Tell us about prayer requests</li>
              <li>• Optionally register your fingerprint</li>
            </ul>
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={() => setCurrentStep("form")}
              className="flex-1 bg-gradient-to-r from-[hsl(258,90%,66%)] to-[hsl(271,91%,65%)] hover:from-[hsl(258,85%,61%)] hover:to-[hsl(271,86%,60%)]"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Fill Visitor Form
            </Button>
            
            <Button
              variant="outline"
              onClick={handleCancel}
              className="px-6"
            >
              Cancel
            </Button>
          </div>

          <div className="text-center text-xs text-slate-500">
            <p>Already a member? Try scanning your fingerprint again or ask for assistance.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}