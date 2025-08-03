import { useState, useEffect } from "react";

// Enhanced animated counter with spring effect
function AnimatedCounter({ target, duration = 2500 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for spring-like effect
      const easeOutBack = (t: number) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      };
      
      const easedProgress = easeOutBack(progress);
      const currentCount = Math.floor(easedProgress * target);
      setCount(Math.min(currentCount, target));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    const timer = setTimeout(() => {
      requestAnimationFrame(animate);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [target, duration]);
  
  return (
    <motion.span
      key={target}
      initial={{ scale: 1.2, opacity: 0.8 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ 
        type: "spring",
        damping: 20,
        stiffness: 300,
        duration: 0.6
      }}
    >
      {count}
    </motion.span>
  );
}
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FingerprintScanner } from "@/components/fingerprint-scanner";
import { KioskMode } from "@/components/kiosk-mode";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AttendanceStats, CheckInResult, MemberWithChildren } from "@/lib/types";
import { Search, Users, Check, UserPlus, Baby, UserCheck, X, AlertCircle, Fingerprint, Download, Trash2, Monitor, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function CheckInTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [selectedParent, setSelectedParent] = useState<MemberWithChildren | null>(null);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [isFamilyDialogOpen, setIsFamilyDialogOpen] = useState(false);
  const [parentChildren, setParentChildren] = useState<MemberWithChildren[]>([]);
  const [attendanceFilter, setAttendanceFilter] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [kioskSessionStart, setKioskSessionStart] = useState<Date | null>(null);
  const { toast } = useToast();

  // Get church data for kiosk settings
  const { data: churchData } = useQuery({
    queryKey: ["/api/churches/current"],
  });

  // Get active events for event selection
  const { data: activeEvents = [] } = useQuery({
    queryKey: ['/api/events/active'],
  });

  // Get attendance stats
  const { data: attendanceStats } = useQuery<AttendanceStats>({
    queryKey: ['/api/attendance/stats'],
    refetchInterval: 30000,
  });

  // Get event-specific attendance stats when an event is selected
  const { data: eventStats } = useQuery<AttendanceStats>({
    queryKey: ['/api/events', selectedEventId, 'attendance-stats'],
    enabled: !!selectedEventId,
    refetchInterval: 30000,
  });

  // Get today's attendance records (filtered by selected event)
  const { data: todayAttendance = [] } = useQuery<any[]>({
    queryKey: ['/api/attendance/today', selectedEventId],
    queryFn: () => apiRequest(`/api/attendance/today${selectedEventId ? `?eventId=${selectedEventId}` : ''}`),
    refetchInterval: 10000,
  });

  // Delete attendance record mutation
  const deleteRecordMutation = useMutation({
    mutationFn: (recordId: string) => apiRequest(`/api/attendance/${recordId}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Attendance record deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/stats'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete attendance record",
        variant: "destructive",
      });
    },
  });

  // Export attendance data
  const handleExportAttendance = () => {
    const today = new Date().toISOString().split('T')[0];
    const url = `/api/export/attendance?startDate=${today}&endDate=${today}`;
    window.open(url, '_blank');
  };

  // Search members
  const { data: searchResults = [] } = useQuery<MemberWithChildren[]>({
    queryKey: ['/api/members', searchQuery],
    enabled: searchQuery.length > 0,
    queryFn: () => apiRequest(`/api/members?search=${encodeURIComponent(searchQuery)}`),
  });

  // Manual check-in mutation
  const manualCheckInMutation = useMutation({
    mutationFn: async (memberId: string) => {
      if (!selectedEventId) {
        throw new Error("Please select an event for check-in");
      }
      const today = new Date().toISOString().split('T')[0];
      const response = await apiRequest('/api/attendance', {
        method: 'POST',
        body: JSON.stringify({
          memberId,
          eventId: selectedEventId,
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

  const handleManualCheckIn = (memberId: string) => {
    manualCheckInMutation.mutate(memberId);
  };

  // Family check-in functions
  const handleFamilyCheckIn = (parent: MemberWithChildren) => {
    setSelectedParent(parent);
    setSelectedChildren([]);
    setIsFamilyDialogOpen(true);
  };

  const handleFamilyCheckInSubmit = async () => {
    if (!selectedParent || !selectedEventId) return;
    
    const results: { success: string[], failed: string[] } = { success: [], failed: [] };
    
    try {
      // Check in parent
      try {
        await manualCheckInMutation.mutateAsync(selectedParent.id);
        results.success.push(selectedParent.firstName + ' ' + selectedParent.surname);
      } catch (error: any) {
        if (error?.isDuplicate || error?.message?.includes('already checked in')) {
          results.failed.push(`${selectedParent.firstName} ${selectedParent.surname} (already checked in)`);
        } else {
          results.failed.push(`${selectedParent.firstName} ${selectedParent.surname} (error)`);
        }
      }
      
      // Check in selected children
      for (const childId of selectedChildren) {
        const child = selectedParent.children?.find(c => c.id === childId);
        if (child) {
          try {
            await manualCheckInMutation.mutateAsync(childId);
            results.success.push(child.firstName + ' ' + child.surname);
          } catch (error: any) {
            if (error?.isDuplicate || error?.message?.includes('already checked in')) {
              results.failed.push(`${child.firstName} ${child.surname} (already checked in)`);
            } else {
              results.failed.push(`${child.firstName} ${child.surname} (error)`);
            }
          }
        }
      }
      
      // Show appropriate message based on results
      if (results.success.length > 0 && results.failed.length === 0) {
        toast({
          title: "Family Check-in Successful!",
          description: `Successfully checked in: ${results.success.join(', ')}`,
        });
      } else if (results.success.length > 0 && results.failed.length > 0) {
        toast({
          title: "Partial Family Check-in",
          description: `✓ Checked in: ${results.success.join(', ')}\n✗ Failed: ${results.failed.join(', ')}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Family Check-in Failed",
          description: `All members failed: ${results.failed.join(', ')}`,
          variant: "destructive",
        });
      }
      
      setIsFamilyDialogOpen(false);
      setSelectedParent(null);
      setSelectedChildren([]);
    } catch (error) {
      toast({
        title: "Family Check-in Error",
        description: "An unexpected error occurred during family check-in",
        variant: "destructive",
      });
    }
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

  // Kiosk mode functions
  const handleStartKiosk = () => {
    if (!selectedEventId) {
      toast({
        title: "Event Required",
        description: "Please select an event before starting kiosk mode",
        variant: "destructive",
      });
      return;
    }
    
    setIsKioskMode(true);
    setKioskSessionStart(new Date());
    
    toast({
      title: "Kiosk Mode Started",
      description: "Members can now check themselves in",
    });
  };

  const handleExitKiosk = () => {
    setIsKioskMode(false);
    setKioskSessionStart(null);
    
    toast({
      title: "Kiosk Mode Ended",
      description: "Session has been terminated",
    });
  };

  const handleExtendSession = () => {
    setKioskSessionStart(new Date());
    
    toast({
      title: "Session Extended",
      description: "Kiosk session timer has been reset",
    });
  };

  // Check if kiosk mode is enabled and available
  const isKioskAvailable = churchData?.kioskModeEnabled && selectedEventId;
  const kioskTimeoutMinutes = churchData?.kioskSessionTimeout || 60;

  // Show kiosk mode if active
  if (isKioskMode && selectedEventId) {
    const selectedEvent = activeEvents.find(e => e.id === selectedEventId);
    
    return (
      <KioskMode
        isActive={isKioskMode}
        sessionTimeoutMinutes={kioskTimeoutMinutes}
        selectedEventId={selectedEventId}
        selectedEventName={selectedEvent?.name || "Unknown Event"}
        onExitKiosk={handleExitKiosk}
        onExtendSession={handleExtendSession}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Event Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Event Check-in
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Event</label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full p-2 border rounded-md"
                required
              >
                <option value="">Choose an event...</option>
                {activeEvents.map((event: any) => (
                  <option key={event.id} value={event.id}>
                    {event.name} ({event.eventType.replace(/_/g, ' ')})
                  </option>
                ))}
              </select>
              {!selectedEventId && (
                <p className="text-sm text-red-600 mt-1">Please select an event before checking in members</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header with stats */}
      <motion.div 
        className="grid gap-4 md:grid-cols-3"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1
            }
          }
        }}
      >
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 }
          }}
        >
          <Card className="stat-card-hover cursor-pointer overflow-hidden relative h-[140px]">
            <CardContent className="p-6 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">
                    {selectedEventId ? 'Event Total' : "Today's Total"}
                  </p>
                  <motion.p 
                    className="text-3xl font-bold text-slate-900"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                  >
                    <AnimatedCounter target={selectedEventId ? (eventStats?.total || 0) : (attendanceStats?.total || 0)} />
                  </motion.p>
                </div>
                <motion.div 
                  className="w-12 h-12 bg-[hsl(258,90%,66%)]/10 rounded-lg flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                >
                  <Users className="text-[hsl(258,90%,66%)] text-xl pulse-icon" />
                </motion.div>
              </div>
              <motion.p 
                className="text-sm text-[hsl(142,76%,36%)] mt-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
              >
                <Users className="inline h-3 w-3 mr-1" />
                {selectedEventId ? 'Event attendees' : 'Members checked in today'}
              </motion.p>
              <motion.div
                className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-[hsl(258,90%,66%)] to-[hsl(271,91%,65%)]"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 1, duration: 1.2 }}
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 }
          }}
        >
          <Card className="stat-card-hover cursor-pointer overflow-hidden relative h-[140px]">
            <CardContent className="p-6 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">By Gender</p>
                  <motion.p 
                    className="text-2xl font-bold text-slate-900"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.6 }}
                  >
                    <AnimatedCounter target={selectedEventId ? (eventStats?.male || 0) : (attendanceStats?.male || 0)} />M / <AnimatedCounter target={selectedEventId ? (eventStats?.female || 0) : (attendanceStats?.female || 0)} />F
                  </motion.p>
                </div>
                <motion.div 
                  className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
                >
                  <UserCheck className="text-blue-500 text-xl pulse-icon" />
                </motion.div>
              </div>
              <motion.p 
                className="text-sm text-slate-500 mt-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 }}
              >
                <UserCheck className="inline h-3 w-3 mr-1" />
                Male: {selectedEventId ? (eventStats?.male || 0) : (attendanceStats?.male || 0)} | Female: {selectedEventId ? (eventStats?.female || 0) : (attendanceStats?.female || 0)}
              </motion.p>
              <motion.div
                className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 1.1, duration: 1.2 }}
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 }
          }}
        >
          <Card className="stat-card-hover cursor-pointer overflow-hidden relative h-[140px]">
            <CardContent className="p-6 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">By Age Group</p>
                  <motion.p 
                    className="text-lg font-bold text-slate-900"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.7, duration: 0.6 }}
                  >
                    <AnimatedCounter target={selectedEventId ? (eventStats?.adult || 0) : (attendanceStats?.adult || 0)} />A / <AnimatedCounter target={selectedEventId ? (eventStats?.child || 0) : (attendanceStats?.child || 0)} />C / <AnimatedCounter target={selectedEventId ? (eventStats?.adolescent || 0) : (attendanceStats?.adolescent || 0)} />T
                  </motion.p>
                </div>
                <motion.div 
                  className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
                >
                  <Baby className="text-orange-500 text-xl pulse-icon" />
                </motion.div>
              </div>
              <motion.p 
                className="text-sm text-slate-500 mt-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.0 }}
              >
                <Baby className="inline h-3 w-3 mr-1" />
                Adult / Child / Teen
              </motion.p>
              <motion.div
                className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-orange-500 to-orange-600"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 1.2, duration: 1.2 }}
              />
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Biometric Authentication */}
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 }
        }}
        whileHover={{ 
          scale: 1.01, 
          y: -4,
          transition: { duration: 0.2 }
        }}
      >
        <Card className="transition-all duration-300 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-slate-900">
              Biometric Authentication
            </CardTitle>
            <p className="text-sm text-slate-600">
              Use your device biometric authentication to check in
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
          {!selectedEventId && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">
              Please select an event above before using biometric check-in.
            </div>
          )}
          
          <div className="flex flex-col items-center space-y-4">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
              <Fingerprint className="h-12 w-12 text-white" />
            </div>
            
            <div className="flex gap-2">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  variant="default" 
                  className="bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 hover:shadow-md transition-shadow"
                  disabled={!selectedEventId}
                >
                  Device
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  variant="outline"
                  disabled={!selectedEventId}
                  className="hover:shadow-md transition-shadow"
                >
                  Simulate
                </Button>
              </motion.div>
            </div>
            
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                variant="secondary" 
                size="sm"
                disabled={!selectedEventId}
                className="hover:shadow-md transition-shadow"
              >
                ⚙️ Setup External Scanner
              </Button>
            </motion.div>
            
            <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
              <Button 
                className="bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white px-8 py-2 hover:shadow-lg transition-all"
                disabled={!selectedEventId}
              >
                Start Biometric Scan
              </Button>
            </motion.div>
            
            <p className="text-xs text-gray-500 text-center">
              Supported: Fingerprint, Face Recognition, PIN, or Pattern
            </p>
          </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Kiosk Mode Controls */}
      {isKioskAvailable && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-900">
              <Monitor className="h-5 w-5" />
              Member Self Check-in
            </CardTitle>
            <p className="text-purple-700 text-sm">
              Allow members to check themselves in without admin supervision
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Button 
                onClick={handleStartKiosk}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                disabled={!selectedEventId}
              >
                <Monitor className="h-4 w-4 mr-2" />
                Start Kiosk Mode
              </Button>
              <div className="flex items-center gap-2 text-sm text-purple-700">
                <Clock className="h-4 w-4" />
                Session timeout: {kioskTimeoutMinutes} minutes
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Check-in */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-900">
            Manual Check-In
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selectedEventId && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">
              Please select an event above before checking in members manually.
            </div>
          )}
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by name, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              disabled={!selectedEventId}
            />
          </div>

          {searchQuery && searchResults.length > 0 && selectedEventId && (
            <div className="border rounded-lg max-h-60 overflow-y-auto">
              {searchResults.map((member) => (
                <div
                  key={member.id}
                  className="p-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">
                        {member.firstName} {member.surname}
                      </p>
                      <p className="text-sm text-slate-500">
                        {member.ageGroup} • {member.phone}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleManualCheckIn(member.id)}
                        disabled={manualCheckInMutation.isPending}
                        className="text-xs px-3 py-1"
                      >
                        Check In
                      </Button>
                      {member.children && member.children.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFamilyCheckIn(member)}
                          disabled={manualCheckInMutation.isPending}
                          className="text-xs px-2 py-1"
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

          {searchQuery && searchResults.length === 0 && (
            <div className="text-center py-4 text-slate-500">
              No members found matching "{searchQuery}"
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Attendance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {selectedEventId ? 
              `${activeEvents.find(e => e.id === selectedEventId)?.name || 'Event'} Attendance` : 
              "Today's Attendance"
            } ({formatTodayDate()})
          </CardTitle>
          {todayAttendance.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExportAttendance}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {todayAttendance.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <UserCheck className="h-16 w-16 mx-auto mb-4 text-slate-300" />
              <p>{selectedEventId ? 'No attendees for this event yet' : 'No check-ins yet today'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayAttendance.map((record: any, index: number) => {
                const memberName = record.member ? 
                  `${record.member.firstName} ${record.member.surname}` : 
                  record.visitorName || 'Unknown';
                const initials = memberName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                
                return (
                  <motion.div 
                    key={record.id} 
                    className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg transition-all duration-300 hover:bg-green-100 dark:hover:bg-green-900/30 hover:shadow-md hover:scale-[1.02] cursor-pointer"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ 
                      scale: 1.02, 
                      y: -2,
                      transition: { duration: 0.2 }
                    }}
                  >
                    <motion.div 
                      className="w-10 h-10 bg-green-600 dark:bg-green-700 rounded-full flex items-center justify-center text-white font-medium text-sm"
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.2 }}
                    >
                      {initials}
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {memberName}
                        </p>
                        <Badge 
                          variant={record.visitorId ? "destructive" : "default"} 
                          className="text-xs"
                        >
                          {record.visitorId ? 'Visitor' : 'Member'}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {record.member?.ageGroup || 'N/A'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatTime(record.checkInTime)} • {record.checkInMethod} • {record.member?.phone || 'No phone'}
                      </p>
                      {record.event && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Event: {record.event.name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatTodayDate()}
                      </span>
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRecordMutation.mutate(record.id)}
                          disabled={deleteRecordMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Family Check-in Dialog */}
      <Dialog open={isFamilyDialogOpen} onOpenChange={setIsFamilyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Family Check-in</DialogTitle>
          </DialogHeader>
          
          {selectedParent && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="font-medium text-blue-900">
                  {selectedParent.firstName} {selectedParent.surname}
                </p>
                <p className="text-sm text-blue-700">Parent will be checked in</p>
              </div>
              
              {selectedParent.children && selectedParent.children.length > 0 && (
                <div>
                  <p className="font-medium mb-2">Select children to check in:</p>
                  <div className="space-y-2">
                    {selectedParent.children.map((child) => (
                      <div key={child.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={child.id}
                          checked={selectedChildren.includes(child.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedChildren([...selectedChildren, child.id]);
                            } else {
                              setSelectedChildren(selectedChildren.filter(id => id !== child.id));
                            }
                          }}
                        />
                        <label htmlFor={child.id} className="text-sm">
                          {child.firstName} {child.surname} ({child.ageGroup})
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleFamilyCheckInSubmit}
                  disabled={manualCheckInMutation.isPending}
                  className="flex-1"
                >
                  Check In Family
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsFamilyDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}