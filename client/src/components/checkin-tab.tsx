import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { FingerprintScanner } from "@/components/ui/fingerprint-scanner";
import { useToast } from "@/hooks/use-toast";
import { AttendanceStats, CheckInResult, MemberWithChildren } from "@/lib/types";
import { Search, Users, Check, UserPlus, Baby, UserCheck, X } from "lucide-react";

export default function CheckInTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [selectedParent, setSelectedParent] = useState<MemberWithChildren | null>(null);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [isFamilyDialogOpen, setIsFamilyDialogOpen] = useState(false);
  const [parentChildren, setParentChildren] = useState<MemberWithChildren[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get today's attendance stats
  const { data: attendanceStats } = useQuery<AttendanceStats>({
    queryKey: ['/api/attendance/stats'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get today's attendance records with member details
  const { data: todayAttendance = [] } = useQuery<any[]>({
    queryKey: ['/api/attendance/today'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Search members
  const { data: searchResults = [] } = useQuery<MemberWithChildren[]>({
    queryKey: ['/api/members', searchQuery],
    enabled: searchQuery.length > 0,
    queryFn: () => apiRequest('GET', `/api/members?search=${encodeURIComponent(searchQuery)}`).then(res => res.json()),
  });

  // Biometric scan mutation for check-in
  const biometricScanMutation = useMutation({
    mutationFn: async (fingerprintId: string) => {
      const response = await apiRequest('POST', '/api/fingerprint/scan', { 
        fingerprintId,
        deviceId: navigator.userAgent + navigator.language + screen.width 
      });
      return response.json() as Promise<CheckInResult>;
    },
    onSuccess: (result) => {
      setIsScanning(false);
      if (result.checkInSuccess && result.member) {
        toast({
          title: "Check-in Successful!",
          description: `Welcome, ${result.member.firstName} ${result.member.surname}`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      } else {
        toast({
          title: "Biometric Not Recognized",
          description: "Please use manual check-in or register your biometric",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      setIsScanning(false);
      toast({
        title: "Scan Failed",
        description: "Please try again or use manual check-in",
        variant: "destructive",
      });
    },
  });

  // Manual check-in mutation
  const manualCheckInMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiRequest('POST', '/api/attendance', {
        memberId,
        attendanceDate: today,
        checkInMethod: "manual",
        isGuest: false,
      });
      return response.json();
    },
    onSuccess: (_, memberId) => {
      const member = searchResults.find(m => m.id === memberId);
      toast({
        title: "Check-in Successful!",
        description: `${member?.firstName} ${member?.surname} has been checked in`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      setSearchQuery("");
    },
    onError: () => {
      toast({
        title: "Check-in Failed",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  // Get children for a parent
  const { data: childrenData } = useQuery<MemberWithChildren[]>({
    queryKey: ['/api/members/children', selectedParent?.id],
    enabled: !!selectedParent?.id,
    staleTime: 0,
  });

  // Family check-in mutation
  const familyCheckInMutation = useMutation({
    mutationFn: async (data: { parentId: string; childrenIds: string[] }) => {
      const response = await apiRequest('POST', '/api/attendance/selective-family-checkin', data);
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Family Check-in Successful!",
        description: `${result.parent.firstName} ${result.parent.surname} and ${result.children.length} children checked in`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      setSearchQuery("");
      setIsFamilyDialogOpen(false);
      setSelectedParent(null);
      setSelectedChildren([]);
    },
    onError: () => {
      toast({
        title: "Family Check-in Failed",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleBiometricScan = (fingerprintId: string) => {
    setIsScanning(true);
    biometricScanMutation.mutate(fingerprintId);
  };

  const handleBiometricError = (error: string) => {
    setIsScanning(false);
    toast({
      title: "Biometric Scan Error",
      description: error,
      variant: "destructive",
    });
  };

  const handleManualCheckIn = (memberId: string) => {
    manualCheckInMutation.mutate(memberId);
  };

  const handleFamilyCheckIn = async (parentId: string) => {
    // Find the parent member
    const parent = searchResults.find(m => m.id === parentId);
    if (!parent) return;

    // Fetch children for this parent
    try {
      const response = await apiRequest('GET', `/api/members/children/${parentId}`);
      const children = await response.json();
      
      if (children.length === 0) {
        toast({
          title: "No Children Found",
          description: `${parent.firstName} ${parent.surname} has no linked children`,
          variant: "destructive",
        });
        return;
      }

      setSelectedParent(parent);
      setParentChildren(children);
      setSelectedChildren(children.map((child: MemberWithChildren) => child.id)); // Pre-select all children
      setIsFamilyDialogOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load children",
        variant: "destructive",
      });
    }
  };

  const handleConfirmFamilyCheckIn = () => {
    if (!selectedParent) return;
    
    familyCheckInMutation.mutate({
      parentId: selectedParent.id,
      childrenIds: selectedChildren,
    });
  };

  const toggleChildSelection = (childId: string) => {
    setSelectedChildren(prev => 
      prev.includes(childId) 
        ? prev.filter(id => id !== childId)
        : [...prev, childId]
    );
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Fingerprint Scanner */}
      <div className="lg:col-span-2">
        <Card className="church-card">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-slate-900 text-center">Sunday Check-In</CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <FingerprintScanner
              mode="scan"
              onScanComplete={handleBiometricScan}
              onScanStart={() => setIsScanning(true)}
              onError={handleBiometricError}
              isScanning={isScanning || biometricScanMutation.isPending}
            />

            {/* Manual Override */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <h4 className="text-lg font-medium text-slate-900 mb-4">Manual Check-In</h4>
              <div className="flex space-x-4">
                <div className="flex-1 relative">
                  <Input
                    type="text"
                    placeholder="Search member name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="church-form-input"
                  />
                  {searchQuery && searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto z-10">
                      {searchResults.map((member) => (
                        <div
                          key={member.id}
                          className="p-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-slate-900">
                                {member.firstName} {member.surname}
                              </p>
                              <p className="text-sm text-slate-500">
                                {member.ageGroup} • {member.phone}
                              </p>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => handleManualCheckIn(member.id)}
                                disabled={manualCheckInMutation.isPending}
                                className="church-button-primary text-xs px-3 py-1"
                              >
                                Check In
                              </Button>
                              {(member.gender === 'male' || member.gender === 'female') && (
                                <Button
                                  size="sm"
                                  onClick={() => handleFamilyCheckIn(member.id)}
                                  disabled={familyCheckInMutation.isPending}
                                  variant="outline"
                                  className="text-xs px-3 py-1"
                                >
                                  <Users className="h-3 w-3 mr-1" />
                                  Family
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Button className="church-button-outline">
                  <Search className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="church-button-secondary">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Guest Check-In
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Attendance */}
      <div className="space-y-6">
        <Card className="church-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">Today's Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Total Present</span>
                <span className="text-2xl font-bold text-[hsl(142,76%,36%)]">
                  {attendanceStats?.total || 0}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-lg font-semibold text-slate-900">
                    {attendanceStats?.male || 0}
                  </div>
                  <div className="text-slate-600">Male</div>
                </div>
                <div className="text-center p-3 bg-pink-50 rounded-lg">
                  <div className="text-lg font-semibold text-slate-900">
                    {attendanceStats?.female || 0}
                  </div>
                  <div className="text-slate-600">Female</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-lg font-semibold text-slate-900">
                    {attendanceStats?.children || 0}
                  </div>
                  <div className="text-slate-600">Children</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-lg font-semibold text-slate-900">
                    {attendanceStats?.adolescent || 0}
                  </div>
                  <div className="text-slate-600">Adolescent</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Check-ins */}
        <Card className="church-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">Recent Check-ins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {todayAttendance.slice(0, 10).map((record: any) => (
                <div key={record.id} className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="w-8 h-8 bg-[hsl(142,76%,36%)] rounded-full flex items-center justify-center">
                    <Check className="text-white text-sm" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">
                      {record.member?.firstName || 'Unknown'} {record.member?.surname || 'Member'}
                    </p>
                    <p className="text-sm text-slate-500">
                      {formatTime(record.checkInTime)} • {record.checkInMethod}
                    </p>
                  </div>
                </div>
              ))}
              
              {todayAttendance.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-500">No check-ins yet today</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Family Check-in Selection Dialog */}
      <Dialog open={isFamilyDialogOpen} onOpenChange={setIsFamilyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-[hsl(258,90%,66%)]" />
              <span>Family Check-in</span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedParent && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[hsl(258,90%,66%)] rounded-full flex items-center justify-center">
                    <UserCheck className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">
                      {selectedParent.firstName} {selectedParent.surname}
                    </p>
                    <p className="text-sm text-slate-500">Parent - Will be checked in</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-900">Select children who are present today:</p>
                
                {parentChildren.map((child) => (
                  <div key={child.id} className="flex items-center space-x-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                    <Checkbox
                      id={`child-${child.id}`}
                      checked={selectedChildren.includes(child.id)}
                      onCheckedChange={() => toggleChildSelection(child.id)}
                    />
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                        <Baby className="h-4 w-4 text-yellow-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {child.firstName} {child.surname}
                        </p>
                        <p className="text-xs text-slate-500 capitalize">
                          {child.ageGroup} • Born {child.dateOfBirth}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {parentChildren.length === 0 && (
                  <div className="text-center py-6">
                    <Baby className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500">No children linked to this parent</p>
                  </div>
                )}
              </div>

              <div className="flex space-x-2 pt-4">
                <Button
                  onClick={handleConfirmFamilyCheckIn}
                  disabled={familyCheckInMutation.isPending}
                  className="flex-1 bg-[hsl(258,90%,66%)] hover:bg-[hsl(258,90%,60%)] text-white"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  {familyCheckInMutation.isPending 
                    ? "Checking in..." 
                    : `Check In Family (${selectedChildren.length + 1})`
                  }
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsFamilyDialogOpen(false)}
                  disabled={familyCheckInMutation.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>

              {selectedChildren.length === 0 && (
                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                  Note: Only the parent will be checked in since no children are selected.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
