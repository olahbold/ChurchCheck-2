import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Clock, User, Shield, LogOut } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface KioskModeProps {
  isActive: boolean;
  sessionTimeoutMinutes: number;
  selectedEventId: string;
  selectedEventName: string;
  onExitKiosk: () => void;
  onExtendSession: () => void;
}

export function KioskMode({ 
  isActive, 
  sessionTimeoutMinutes, 
  selectedEventId, 
  selectedEventName,
  onExitKiosk,
  onExtendSession 
}: KioskModeProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(sessionTimeoutMinutes * 60); // in seconds
  const [selectedMember, setSelectedMember] = useState<any>(null);

  // Search members
  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ["/api/members", { search: searchQuery }],
    enabled: searchQuery.length >= 2,
  });

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: (memberId: string) =>
      apiRequest(`/api/attendance/check-in/${memberId}`, "POST", { eventId: selectedEventId }),
    onSuccess: (data) => {
      toast({
        title: "Check-in Successful!",
        description: `${data.member.firstName} ${data.member.surname} has been checked in`,
      });
      setSearchQuery("");
      setSelectedMember(null);
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
    },
    onError: (error: any) => {
      if (error?.isDuplicate || error?.message?.includes('already checked in')) {
        toast({
          title: "Already Checked In",
          description: "You have already been checked into this event today",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Check-in Failed",
          description: "Please try again or ask for assistance",
          variant: "destructive",
        });
      }
    },
  });

  // Timer countdown
  useEffect(() => {
    if (!isActive) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          onExitKiosk();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, onExitKiosk]);

  // Reset timer when session timeout changes
  useEffect(() => {
    setTimeRemaining(sessionTimeoutMinutes * 60);
  }, [sessionTimeoutMinutes]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMemberSelect = (member: any) => {
    setSelectedMember(member);
  };

  const handleCheckIn = () => {
    if (selectedMember) {
      checkInMutation.mutate(selectedMember.id);
    }
  };

  const filteredResults = searchResults.filter((member: any) =>
    member.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.surname.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isActive) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between bg-white rounded-lg shadow-lg p-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Self Check-in</h1>
            <p className="text-gray-600 mt-1">Search for your name and check yourself in</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Session Timer */}
            <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg">
              <Clock className="h-4 w-4" />
              <span className="font-mono text-sm">{formatTime(timeRemaining)}</span>
            </div>
            
            {/* Admin Controls */}
            <Button variant="outline" onClick={onExtendSession} size="sm">
              Extend Session
            </Button>
            <Button variant="outline" onClick={onExitKiosk} size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Exit Kiosk
            </Button>
          </div>
        </div>
      </div>

      {/* Event Info */}
      <div className="max-w-4xl mx-auto mb-8">
        <Card className="bg-white shadow-lg border-blue-200">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-blue-900">{selectedEventName}</CardTitle>
            <CardDescription className="text-lg">
              Select your name below to check in
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Search Section */}
      <div className="max-w-4xl mx-auto">
        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Find Your Name
            </CardTitle>
            <CardDescription>
              Type your first or last name to search
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Start typing your name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-lg py-6 text-center"
                autoFocus
              />
            </div>

            {/* Search Results */}
            {searchQuery.length >= 2 && (
              <div className="space-y-3">
                {searchLoading && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Searching...</p>
                  </div>
                )}

                {!searchLoading && filteredResults.length === 0 && (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">No members found</p>
                    <p className="text-gray-500">Try a different spelling or ask for assistance</p>
                  </div>
                )}

                {!searchLoading && filteredResults.length > 0 && (
                  <div className="grid gap-3">
                    {filteredResults.slice(0, 8).map((member: any) => (
                      <Card 
                        key={member.id} 
                        className={`cursor-pointer transition-all hover:shadow-md border-2 ${
                          selectedMember?.id === member.id 
                            ? 'border-purple-500 bg-purple-50' 
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                        onClick={() => handleMemberSelect(member)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-semibold">
                                {member.firstName} {member.surname}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary">
                                  {member.ageGroup}
                                </Badge>
                                {member.phone && (
                                  <span className="text-sm text-gray-500">
                                    {member.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                            {selectedMember?.id === member.id && (
                              <Badge className="bg-purple-600">Selected</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Check-in Button */}
            {selectedMember && (
              <div className="text-center pt-6 border-t">
                <Button 
                  size="lg" 
                  className="bg-green-600 hover:bg-green-700 text-white px-12 py-6 text-xl"
                  onClick={handleCheckIn}
                  disabled={checkInMutation.isPending}
                >
                  {checkInMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Checking In...
                    </>
                  ) : (
                    <>
                      <User className="h-6 w-6 mr-3" />
                      Check In {selectedMember.firstName}
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Help Section */}
      <div className="max-w-4xl mx-auto mt-8">
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-6 text-center">
            <Shield className="h-8 w-8 text-orange-600 mx-auto mb-3" />
            <p className="text-orange-800 font-medium">Need Help?</p>
            <p className="text-orange-700 text-sm mt-1">
              Can't find your name? Ask a volunteer or admin for assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}