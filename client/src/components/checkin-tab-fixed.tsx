import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FingerprintScanner } from "@/components/fingerprint-scanner";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AttendanceStats, CheckInResult, MemberWithChildren } from "@/lib/types";
import { Search, Users, Check, UserPlus, Baby, UserCheck, X, AlertCircle, Fingerprint, Download, Trash2 } from "lucide-react";

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
  const { toast } = useToast();

  // Get active events for event selection
  const { data: activeEvents = [] } = useQuery({
    queryKey: ['/api/events/active'],
  });

  // Get attendance stats
  const { data: attendanceStats } = useQuery<AttendanceStats>({
    queryKey: ['/api/attendance/stats'],
    refetchInterval: 30000,
  });

  // Get today's attendance records
  const { data: todayAttendance = [] } = useQuery<any[]>({
    queryKey: ['/api/attendance/today'],
    refetchInterval: 10000,
  });

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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceStats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              Members checked in today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">By Gender</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Male:</span>
                <span className="font-medium">{attendanceStats?.male || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Female:</span>
                <span className="font-medium">{attendanceStats?.female || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">By Age Group</CardTitle>
            <Baby className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Adults:</span>
                <span className="font-medium">{attendanceStats?.adult || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Teens:</span>
                <span className="font-medium">{attendanceStats?.adolescent || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Children:</span>
                <span className="font-medium">{attendanceStats?.child || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manual Check-in */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-900">
            Manual Check-in
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
                    <div>
                      <p className="font-medium text-slate-900">
                        {member.firstName} {member.surname}
                      </p>
                      <p className="text-sm text-slate-500">
                        {member.ageGroup} • {member.phone}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleManualCheckIn(member.id)}
                      disabled={manualCheckInMutation.isPending}
                      className="text-xs px-3 py-1"
                    >
                      Check In
                    </Button>
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
        <CardHeader>
          <CardTitle>Today's Attendance ({formatTodayDate()})</CardTitle>
        </CardHeader>
        <CardContent>
          {todayAttendance.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <UserCheck className="h-16 w-16 mx-auto mb-4 text-slate-300" />
              <p>No check-ins yet today</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayAttendance.map((record: any) => (
                <div key={record.id} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                  <div>
                    <p className="font-medium">
                      {record.member?.firstName} {record.member?.surname}
                    </p>
                    <p className="text-sm text-slate-500">
                      {formatTime(record.checkInTime)} • {record.checkInMethod}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {record.member?.ageGroup}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}