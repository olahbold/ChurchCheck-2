import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { FingerprintScanner } from "@/components/ui/fingerprint-scanner";
import { useToast } from "@/hooks/use-toast";
import { AttendanceStats, CheckInResult, MemberWithChildren } from "@/lib/types";
import { Search, Users, Check, UserPlus, Baby, UserCheck, X, AlertCircle, Fingerprint, Download, Trash2 } from "lucide-react";

export default function CheckInTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [selectedParent, setSelectedParent] = useState<MemberWithChildren | null>(null);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [isFamilyDialogOpen, setIsFamilyDialogOpen] = useState(false);
  const [parentChildren, setParentChildren] = useState<MemberWithChildren[]>([]);
  const [attendanceFilter, setAttendanceFilter] = useState<string | null>(null); // For filtering recent check-ins
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null); // Record ID to delete
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]); // For bulk operations
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
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
    queryFn: () => apiRequest(`/api/members?search=${encodeURIComponent(searchQuery)}`),
  });

  // States for enrollment flow
  const [showEnrollmentDialog, setShowEnrollmentDialog] = useState(false);
  const [scannedFingerprintId, setScannedFingerprintId] = useState<string | null>(null);
  const [memberToEnroll, setMemberToEnroll] = useState<MemberWithChildren | null>(null);

  // Biometric scan mutation for check-in
  const biometricScanMutation = useMutation({
    mutationFn: async (fingerprintId: string) => {
      const response = await apiRequest('/api/fingerprint/scan', {
        method: 'POST',
        body: JSON.stringify({ 
          fingerprintId,
          deviceId: navigator.userAgent + navigator.language + screen.width 
        }),
      });
      return response as CheckInResult;
    },
    onSuccess: (result) => {
      setIsScanning(false);
      if (result.checkInSuccess && result.member) {
        toast({
          title: "Check-in Successful!",
          description: `Welcome, ${result.member.firstName} ${result.member.surname}`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      } else if (result.isDuplicate && result.member) {
        // Member already checked in today
        toast({
          title: "Already Checked In",
          description: `${result.member.firstName} ${result.member.surname} has already checked in today`,
          variant: "destructive",
        });
      } else {
        // Fingerprint not recognized - offer enrollment opportunity
        setScannedFingerprintId(result.scannedFingerprintId || null);
        setShowEnrollmentDialog(true);
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
      const response = await apiRequest('/api/attendance', {
        method: 'POST',
        body: JSON.stringify({
          memberId,
          attendanceDate: today,
          checkInMethod: "manual",
          isGuest: false,
        }),
      });
      return response;
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
    onError: (error: any) => {
      console.log('Check-in error:', error);
      // Check if this is a duplicate check-in error
      if (error?.isDuplicate) {
        toast({
          title: "Already Checked In",
          description: error.message || "This person has already checked in today",
          variant: "destructive",
        });
      } else {
        const errorMessage = error?.message || error?.error || "Please try again";
        toast({
          title: "Check-in Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
  });

  // Get children for a parent
  const { data: childrenData } = useQuery<MemberWithChildren[]>({
    queryKey: ['/api/members/children', selectedParent?.id],
    enabled: !!selectedParent?.id,
    staleTime: 0,
  });

  // Quick enrollment mutation for unrecognized fingerprints
  const quickEnrollMutation = useMutation({
    mutationFn: async (data: { memberId: string; fingerprintId: string }) => {
      const response = await apiRequest('/api/fingerprint/enroll', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: (_, variables) => {
      // After enrollment, automatically check in the member
      const today = new Date().toISOString().split('T')[0];
      return apiRequest('/api/attendance', {
        method: 'POST',
        body: JSON.stringify({
          memberId: variables.memberId,
          attendanceDate: today,
          checkInMethod: "fingerprint",
          isGuest: false,
        }),
      }).then(() => {
        toast({
          title: "Enrollment & Check-in Complete!",
          description: `${memberToEnroll?.firstName} ${memberToEnroll?.surname} enrolled and checked in successfully`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
        setShowEnrollmentDialog(false);
        setMemberToEnroll(null);
        setScannedFingerprintId(null);
      }).catch((error: any) => {
        // Handle duplicate check-in after enrollment
        if (error?.isDuplicate) {
          toast({
            title: "Enrollment Complete - Already Checked In",
            description: `${memberToEnroll?.firstName} ${memberToEnroll?.surname} was enrolled but has already checked in today`,
            variant: "destructive",
          });
        } else {
          throw error; // Re-throw for the main error handler
        }
        setShowEnrollmentDialog(false);
        setMemberToEnroll(null);
        setScannedFingerprintId(null);
      });
    },
    onError: () => {
      toast({
        title: "Enrollment Failed",
        description: "Please try again or use manual check-in",
        variant: "destructive",
      });
    },
  });

  // Family check-in mutation
  const familyCheckInMutation = useMutation({
    mutationFn: async (data: { parentId: string; childrenIds: string[] }) => {
      const response = await apiRequest('/api/attendance/selective-family-checkin', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response;
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
    console.log('Manual check-in initiated for member ID:', memberId);
    const authToken = localStorage.getItem('auth_token');
    console.log('Auth token present:', !!authToken);
    if (!authToken) {
      toast({
        title: "Authentication Required",
        description: "Please log in to check in members",
        variant: "destructive",
      });
      return;
    }
    manualCheckInMutation.mutate(memberId);
  };

  const handleFamilyCheckIn = async (parentId: string) => {
    // Find the parent member
    const parent = searchResults.find(m => m.id === parentId);
    if (!parent) return;

    // Fetch children for this parent
    try {
      const children = await apiRequest(`/api/members/children/${parentId}`);
      
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

  const formatTodayDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Delete attendance record mutation
  const deleteAttendanceMutation = useMutation({
    mutationFn: async (recordId: string) => {
      const response = await apiRequest(`/api/attendance/${recordId}`, {
        method: 'DELETE',
      });
      return response;
    },
    onSuccess: (result, recordId) => {
      // Find the record to get member name for toast
      const deletedRecord = todayAttendance.find(r => r.id === recordId);
      const memberName = deletedRecord?.member ? 
        `${deletedRecord.member.firstName} ${deletedRecord.member.surname}` : 
        'Member';
        
      toast({
        title: "Check-in Deleted",
        description: `${memberName}'s check-in record has been removed`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      setShowDeleteConfirm(null);
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Could not delete the check-in record. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (recordIds: string[]) => {
      const deletePromises = recordIds.map(id => 
        apiRequest(`/api/attendance/${id}`, { method: 'DELETE' })
      );
      return Promise.all(deletePromises);
    },
    onSuccess: (results, recordIds) => {
      toast({
        title: "Records Deleted",
        description: `${recordIds.length} check-in records have been removed`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      setSelectedRecords([]);
      setShowBulkDeleteConfirm(false);
    },
    onError: () => {
      toast({
        title: "Bulk Delete Failed",
        description: "Could not delete all selected records. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle bulk selection
  const toggleRecordSelection = (recordId: string) => {
    setSelectedRecords(prev => 
      prev.includes(recordId) 
        ? prev.filter(id => id !== recordId)
        : [...prev, recordId]
    );
  };

  const selectAllRecords = () => {
    const filteredRecords = attendanceFilter 
      ? todayAttendance.filter((record: any) => {
          const member = record.member;
          if (!member) return false;
          
          if (attendanceFilter === 'male' || attendanceFilter === 'female') {
            return member.gender === attendanceFilter;
          }
          if (attendanceFilter === 'child' || attendanceFilter === 'adolescent' || attendanceFilter === 'adult') {
            return member.ageGroup === attendanceFilter;
          }
          return true;
        })
      : todayAttendance;
    
    const allIds = filteredRecords.map((record: any) => record.id);
    setSelectedRecords(allIds);
  };

  const clearSelection = () => {
    setSelectedRecords([]);
  };

  // Export today's attendance as CSV
  const exportTodayAttendance = () => {
    const today = new Date().toISOString().split('T')[0];
    const formattedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Filter data if a filter is active
    const dataToExport = attendanceFilter 
      ? todayAttendance.filter((record: any) => {
          const member = record.member;
          if (!member) return false;
          
          if (attendanceFilter === 'male' || attendanceFilter === 'female') {
            return member.gender === attendanceFilter;
          }
          if (attendanceFilter === 'child' || attendanceFilter === 'adolescent' || attendanceFilter === 'adult') {
            return member.ageGroup === attendanceFilter;
          }
          return true;
        })
      : todayAttendance;

    // Prepare CSV data
    const csvHeaders = ['Name', 'Gender', 'Age Group', 'Check-in Time', 'Method', 'Phone', 'Email'];
    const csvData = dataToExport.map((record: any) => [
      `${record.member?.firstName || ''} ${record.member?.surname || ''}`.trim(),
      record.member?.gender || '',
      record.member?.ageGroup || '',
      new Date(record.checkInTime).toLocaleString('en-US'),
      record.checkInMethod || '',
      record.member?.phone || '',
      record.member?.email || ''
    ]);

    // Create CSV content with filter info if applicable
    const filterText = attendanceFilter ? ` (${attendanceFilter.charAt(0).toUpperCase() + attendanceFilter.slice(1)} Only)` : '';
    const csvContent = [
      [`Church Attendance Report - ${formattedDate}${filterText}`],
      [`Total ${attendanceFilter ? `${attendanceFilter} ` : ''}Attendance: ${dataToExport.length}`],
      ['Summary Statistics:'],
      [`Male: ${attendanceStats?.male || 0}, Female: ${attendanceStats?.female || 0}`],
      [`Adults: ${attendanceStats?.adult || 0}, Children: ${attendanceStats?.child || 0}, Adolescents: ${attendanceStats?.adolescent || 0}`],
      [''], // Empty row
      csvHeaders,
      ...csvData
    ].map(row => row.join(',')).join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const filename = attendanceFilter 
        ? `attendance-${today}-${attendanceFilter}.csv`
        : `attendance-${today}.csv`;
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    toast({
      title: "Export Complete",
      description: `${attendanceFilter ? `${attendanceFilter.charAt(0).toUpperCase() + attendanceFilter.slice(1)} ` : ''}attendance report downloaded with ${dataToExport.length} records`,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Fingerprint Scanner */}
      <div className="lg:col-span-2">
        <Card className="church-card">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-slate-900 text-center">
              Today Check-in
              <div className="text-base font-normal text-slate-600 mt-1">
                {formatTodayDate()}
              </div>
            </CardTitle>
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-900">Today's Attendance</CardTitle>
            <div className="flex items-center gap-2">
              {attendanceFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAttendanceFilter(null)}
                  className="text-slate-500 hover:text-slate-700"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear Filter
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={exportTodayAttendance}
                disabled={todayAttendance.length === 0}
                className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-300"
              >
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
            </div>
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
                <button
                  onClick={() => setAttendanceFilter(attendanceFilter === 'male' ? null : 'male')}
                  className={`text-center p-3 bg-blue-50 rounded-lg transition-all hover:bg-blue-100 hover:shadow-md ${
                    attendanceFilter === 'male' ? 'ring-2 ring-blue-500 bg-blue-100' : ''
                  }`}
                >
                  <div className="text-lg font-semibold text-slate-900">
                    {attendanceStats?.male || 0}
                  </div>
                  <div className="text-slate-600">Male</div>
                </button>
                <button
                  onClick={() => setAttendanceFilter(attendanceFilter === 'female' ? null : 'female')}
                  className={`text-center p-3 bg-pink-50 rounded-lg transition-all hover:bg-pink-100 hover:shadow-md ${
                    attendanceFilter === 'female' ? 'ring-2 ring-pink-500 bg-pink-100' : ''
                  }`}
                >
                  <div className="text-lg font-semibold text-slate-900">
                    {attendanceStats?.female || 0}
                  </div>
                  <div className="text-slate-600">Female</div>
                </button>
                <button
                  onClick={() => setAttendanceFilter(attendanceFilter === 'child' ? null : 'child')}
                  className={`text-center p-3 bg-yellow-50 rounded-lg transition-all hover:bg-yellow-100 hover:shadow-md ${
                    attendanceFilter === 'child' ? 'ring-2 ring-yellow-500 bg-yellow-100' : ''
                  }`}
                >
                  <div className="text-lg font-semibold text-slate-900">
                    {attendanceStats?.child || 0}
                  </div>
                  <div className="text-slate-600">Children</div>
                </button>
                <button
                  onClick={() => setAttendanceFilter(attendanceFilter === 'adolescent' ? null : 'adolescent')}
                  className={`text-center p-3 bg-purple-50 rounded-lg transition-all hover:bg-purple-100 hover:shadow-md ${
                    attendanceFilter === 'adolescent' ? 'ring-2 ring-purple-500 bg-purple-100' : ''
                  }`}
                >
                  <div className="text-lg font-semibold text-slate-900">
                    {attendanceStats?.adolescent || 0}
                  </div>
                  <div className="text-slate-600">Adolescent</div>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Check-ins */}
        <Card className="church-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-900">
              Recent Check-ins
              {attendanceFilter && (
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full capitalize">
                  {attendanceFilter} only
                </span>
              )}
              {selectedRecords.length > 0 && (
                <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                  {selectedRecords.length} selected
                </span>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {selectedRecords.length > 0 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkDeleteConfirm(true)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete ({selectedRecords.length})
                  </Button>
                </>
              )}
              {todayAttendance.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exportTodayAttendance}
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              )}
            </div>
          </CardHeader>
          
          {/* Bulk Selection Controls */}
          {todayAttendance.length > 0 && (
            <div className="px-6 pb-4">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAllRecords}
                  className="text-xs px-2 py-1 h-auto"
                >
                  Select All {attendanceFilter ? `(${attendanceFilter})` : ''}
                </Button>
                <span>•</span>
                <span>Click checkboxes to select records for bulk operations</span>
              </div>
            </div>
          )}
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {/* Filter attendance records based on selected filter */}
              {todayAttendance
                .filter((record: any) => {
                  if (!attendanceFilter) return true;
                  const member = record.member;
                  if (!member) return false;
                  
                  if (attendanceFilter === 'male' || attendanceFilter === 'female') {
                    return member.gender === attendanceFilter;
                  }
                  if (attendanceFilter === 'child' || attendanceFilter === 'adolescent' || attendanceFilter === 'adult') {
                    return member.ageGroup === attendanceFilter;
                  }
                  return true;
                })
                .slice(0, 10)
                .map((record: any) => (
                  <div key={record.id} className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors group ${
                    selectedRecords.includes(record.id) 
                      ? 'bg-purple-50 border-purple-200' 
                      : 'bg-green-50 border-green-200 hover:bg-green-100'
                  }`}>
                    <Checkbox
                      checked={selectedRecords.includes(record.id)}
                      onCheckedChange={() => toggleRecordSelection(record.id)}
                      className="opacity-60 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="w-8 h-8 bg-[hsl(142,76%,36%)] rounded-full flex items-center justify-center">
                      <Check className="text-white text-sm" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">
                        {record.member?.firstName || 'Unknown'} {record.member?.surname || 'Member'}
                      </p>
                      <p className="text-sm text-slate-500">
                        {formatTime(record.checkInTime)} • {record.isVisitor ? 'visitor' : 'member'}
                        {attendanceFilter && (
                          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                            {record.member?.gender} • {record.member?.ageGroup}
                          </span>
                        )}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(record.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              
              {/* Show filtered empty state */}
              {attendanceFilter && todayAttendance.filter((record: any) => {
                const member = record.member;
                if (!member) return false;
                
                if (attendanceFilter === 'male' || attendanceFilter === 'female') {
                  return member.gender === attendanceFilter;
                }
                if (attendanceFilter === 'child' || attendanceFilter === 'adolescent' || attendanceFilter === 'adult') {
                  return member.ageGroup === attendanceFilter;
                }
                return true;
              }).length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-500">No {attendanceFilter} check-ins yet today</p>
                </div>
              )}
              
              {/* Show general empty state */}
              {!attendanceFilter && todayAttendance.length === 0 && (
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

      {/* Biometric Enrollment Dialog */}
      <Dialog open={showEnrollmentDialog} onOpenChange={setShowEnrollmentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-white" />
              </div>
            </div>
            <DialogTitle className="text-center">Fingerprint Not Found</DialogTitle>
            <p className="text-sm text-slate-600 text-center mt-2">
              Your fingerprint wasn't found in our system. Would you like to enroll it now for faster future check-ins?
            </p>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search for existing member */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Search for your name to link this fingerprint:
              </label>
              <Input
                placeholder="Type your name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            {searchResults.length > 0 && (
              <div className="border rounded-lg max-h-32 overflow-y-auto">
                {searchResults.slice(0, 5).map((member) => (
                  <button
                    key={member.id}
                    onClick={() => {
                      setMemberToEnroll(member);
                      setSearchQuery("");
                    }}
                    className="w-full p-3 text-left hover:bg-slate-50 border-b last:border-b-0 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {member.firstName} {member.surname}
                      </p>
                      <p className="text-sm text-slate-500">
                        {member.gender} • {member.ageGroup} • {member.phone}
                      </p>
                    </div>
                    <Fingerprint className="h-5 w-5 text-slate-400" />
                  </button>
                ))}
              </div>
            )}

            {memberToEnroll && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-green-800">
                      {memberToEnroll.firstName} {memberToEnroll.surname}
                    </p>
                    <p className="text-sm text-green-600">Ready to enroll fingerprint</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setMemberToEnroll(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col space-y-2">
            {memberToEnroll && scannedFingerprintId && (
              <Button
                onClick={() => quickEnrollMutation.mutate({
                  memberId: memberToEnroll.id,
                  fingerprintId: scannedFingerprintId
                })}
                disabled={quickEnrollMutation.isPending}
                className="w-full bg-[hsl(258,90%,66%)] hover:bg-[hsl(258,90%,60%)] text-white"
              >
                <Fingerprint className="h-4 w-4 mr-2" />
                {quickEnrollMutation.isPending ? "Enrolling..." : "Enroll Fingerprint & Check In"}
              </Button>
            )}
            
            <div className="flex space-x-2 w-full">
              <Button
                variant="outline"
                onClick={() => {
                  if (memberToEnroll) {
                    manualCheckInMutation.mutate(memberToEnroll.id);
                    setShowEnrollmentDialog(false);
                    setMemberToEnroll(null);
                    setScannedFingerprintId(null);
                  }
                }}
                disabled={!memberToEnroll || manualCheckInMutation.isPending}
                className="flex-1"
              >
                Skip & Manual Check-in
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => {
                  setShowEnrollmentDialog(false);
                  setMemberToEnroll(null);
                  setScannedFingerprintId(null);
                  setSearchQuery("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                <Trash2 className="h-8 w-8 text-white" />
              </div>
            </div>
            <DialogTitle className="text-center">Delete Check-in Record?</DialogTitle>
            <p className="text-sm text-slate-600 text-center mt-2">
              {showDeleteConfirm && (() => {
                const record = todayAttendance.find(r => r.id === showDeleteConfirm);
                const memberName = record?.member ? 
                  `${record.member.firstName} ${record.member.surname}` : 
                  'This member';
                return `Are you sure you want to delete ${memberName}'s check-in record? This action cannot be undone.`;
              })()}
            </p>
          </DialogHeader>
          
          <DialogFooter className="flex-col space-y-2">
            <div className="flex space-x-2 w-full">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(null)}
                disabled={deleteAttendanceMutation.isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              
              <Button
                onClick={() => showDeleteConfirm && deleteAttendanceMutation.mutate(showDeleteConfirm)}
                disabled={deleteAttendanceMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteAttendanceMutation.isPending ? "Deleting..." : "Delete Record"}
              </Button>
            </div>
            
            <p className="text-xs text-slate-500 text-center">
              Note: This will remove the check-in record but won't affect the member's profile.
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                <Trash2 className="h-8 w-8 text-white" />
              </div>
            </div>
            <DialogTitle className="text-center">Delete {selectedRecords.length} Check-in Records?</DialogTitle>
            <p className="text-sm text-slate-600 text-center mt-2">
              Are you sure you want to delete {selectedRecords.length} selected check-in records? 
              This will remove the records for the following members:
            </p>
          </DialogHeader>
          
          <div className="max-h-32 overflow-y-auto bg-slate-50 rounded-lg p-3 space-y-1">
            {selectedRecords.slice(0, 10).map(recordId => {
              const record = todayAttendance.find((r: any) => r.id === recordId);
              const memberName = record?.member ? 
                `${record.member.firstName} ${record.member.surname}` : 
                'Unknown Member';
              return (
                <div key={recordId} className="text-sm text-slate-700">
                  • {memberName} ({formatTime(record?.checkInTime || '')})
                </div>
              );
            })}
            {selectedRecords.length > 10 && (
              <div className="text-sm text-slate-500 italic">
                ...and {selectedRecords.length - 10} more
              </div>
            )}
          </div>
          
          <DialogFooter className="flex-col space-y-2">
            <div className="flex space-x-2 w-full">
              <Button
                variant="outline"
                onClick={() => setShowBulkDeleteConfirm(false)}
                disabled={bulkDeleteMutation.isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              
              <Button
                onClick={() => bulkDeleteMutation.mutate(selectedRecords)}
                disabled={bulkDeleteMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {bulkDeleteMutation.isPending ? "Deleting..." : `Delete ${selectedRecords.length} Records`}
              </Button>
            </div>
            
            <p className="text-xs text-slate-500 text-center">
              Warning: This action cannot be undone and will permanently remove all selected records.
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
