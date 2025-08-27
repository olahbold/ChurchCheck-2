import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import FirstTimerCheckInFlow from "@/components/first-timer-checkin-flow";
import type { InsertVisitor } from "@shared/schema";

export default function FirstTimerPage() {
  const [isComplete, setIsComplete] = useState(false);

  const handleComplete = (action: "registered" | "cancelled") => {
    if (action === "registered") {
      setIsComplete(true);
    }
  };

  const handleRegisterMember = (visitorData: InsertVisitor) => {
    // This could convert visitor to member if they want to register biometrics
    console.log("Registering member from visitor data:", visitorData);
  };

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">First-Timer Check-in Complete</h1>
              <p className="text-slate-600 mt-1">Welcome to our church family!</p>
            </div>
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>

          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Thank You for Visiting!</h2>
            <p className="text-slate-600 max-w-md mx-auto mb-8">
              Your information has been recorded and someone from our pastoral team will reach out to you soon. 
              We're excited to get to know you better!
            </p>
            <Link href="/">
              <Button className="bg-gradient-to-r from-[hsl(258,90%,66%)] to-[hsl(271,91%,65%)] hover:from-[hsl(258,85%,61%)] hover:to-[hsl(271,86%,60%)]">
                Return to Check-in
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">First-Timer Check-in</h1>
            <p className="text-slate-600 mt-1">Welcome! Let's get you checked in for today's service.</p>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        <FirstTimerCheckInFlow
          onComplete={handleComplete}
          onRegisterMember={handleRegisterMember}
        />
      </div>
    </div>
  );
}