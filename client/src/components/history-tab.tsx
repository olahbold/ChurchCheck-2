import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Download, Users, Filter, BarChart3, TrendingUp, Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AttendanceRecord {
  id: string;
  memberId: string | null;
  visitorId: string | null;
  attendanceDate: string;
  checkInTime: string;
  checkInMethod: string;
  isGuest: boolean;
  isVisitor: boolean;
  member: {
    id: string;
    firstName: string;
    surname: string;
    gender: string;
    ageGroup: string;
    phone: string | null;
    email: string | null;
    isCurrentMember: boolean | null;
  };
}

interface AttendanceStats {
  totalDays: number;
  totalAttendance: number;
  averagePerDay: number;
  memberAttendance: number;
  visitorAttendance: number;
  genderBreakdown: { male: number; female: number };
  ageGroupBreakdown: { child: number; adolescent: number; adult: number };
}

export default function HistoryTab() {
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(new Date().setDate(new Date().getDate() - 30)) // Default to last 30 days
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [genderFilter, setGenderFilter] = useState<string>("");
  const [ageGroupFilter, setAgeGroupFilter] = useState<string>("");
  const [memberTypeFilter, setMemberTypeFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Format dates for API calls
  const formatDateForAPI = (date: Date | undefined) => {
    return date ? format(date, 'yyyy-MM-dd') : '';
  };

  const startDateStr = formatDateForAPI(startDate);
  const endDateStr = formatDateForAPI(endDate);

  // Get available date range from database
  const { data: dateRange } = useQuery<{ earliest: string; latest: string }>({
    queryKey: ['/api/attendance/date-range'],
  });

  // Get attendance history with filters
  const { data: attendanceHistory = [], isLoading: historyLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ['/api/attendance/history', startDateStr, endDateStr, genderFilter, ageGroupFilter, memberTypeFilter],
    enabled: !!(startDateStr && endDateStr),
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDateStr,
        endDate: endDateStr,
      });
      
      if (genderFilter) params.append('gender', genderFilter);
      if (ageGroupFilter) params.append('ageGroup', ageGroupFilter);
      if (memberTypeFilter) params.append('isCurrentMember', memberTypeFilter);

      const response = await fetch(`/api/attendance/history?${params}`);
      if (!response.ok) throw new Error('Failed to fetch attendance history');
      return response.json();
    },
  });

  // Get statistics for the selected date range
  const { data: rangeStats } = useQuery<AttendanceStats>({
    queryKey: ['/api/attendance/stats-range', startDateStr, endDateStr],
    enabled: !!(startDateStr && endDateStr),
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDateStr,
        endDate: endDateStr,
      });

      const response = await fetch(`/api/attendance/stats-range?${params}`);
      if (!response.ok) throw new Error('Failed to fetch range statistics');
      return response.json();
    },
  });

  // Filter records by search query
  const filteredHistory = attendanceHistory.filter(record => {
    if (!searchQuery) return true;
    const fullName = `${record.member?.firstName || ''} ${record.member?.surname || ''}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  // Export filtered data as CSV
  const handleExport = () => {
    if (filteredHistory.length === 0) return;

    const csvHeaders = ['Date', 'Name', 'Gender', 'Age Group', 'Check-in Time', 'Method', 'Type', 'Phone', 'Email'];
    const csvData = filteredHistory.map(record => [
      record.attendanceDate,
      `${record.member?.firstName || ''} ${record.member?.surname || ''}`.trim(),
      record.member?.gender || '',
      record.member?.ageGroup || '',
      new Date(record.checkInTime).toLocaleString(),
      record.checkInMethod,
      record.isVisitor ? 'Visitor' : 'Member',
      record.member?.phone || '',
      record.member?.email || ''
    ]);

    const csvContent = [
      [`Church Attendance History - ${startDateStr} to ${endDateStr}`],
      [`Total Records: ${filteredHistory.length}`],
      [''], // Empty row
      csvHeaders,
      ...csvData
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance-history-${startDateStr}-to-${endDateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (dateTimeString: string) => {
    return new Date(dateTimeString).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setGenderFilter("");
    setAgeGroupFilter("");
    setMemberTypeFilter("");
    setSearchQuery("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Attendance History</h2>
          <p className="text-slate-600">View and analyze attendance patterns over time</p>
        </div>
        {filteredHistory.length > 0 && (
          <Button onClick={handleExport} className="church-button-primary">
            <Download className="h-4 w-4 mr-2" />
            Export CSV ({filteredHistory.length})
          </Button>
        )}
      </div>

      {/* Date Range and Filters */}
      <Card className="church-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Date Range
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Range Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick end date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Search Name</label>
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="church-form-input"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Gender</label>
              <Select value={genderFilter} onValueChange={setGenderFilter}>
                <SelectTrigger className="church-form-input">
                  <SelectValue placeholder="All Genders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Genders</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Age Group</label>
              <Select value={ageGroupFilter} onValueChange={setAgeGroupFilter}>
                <SelectTrigger className="church-form-input">
                  <SelectValue placeholder="All Ages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Ages</SelectItem>
                  <SelectItem value="child">Child</SelectItem>
                  <SelectItem value="adolescent">Adolescent</SelectItem>
                  <SelectItem value="adult">Adult</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Member Type</label>
              <Select value={memberTypeFilter} onValueChange={setMemberTypeFilter}>
                <SelectTrigger className="church-form-input">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="true">Current Members</SelectItem>
                  <SelectItem value="false">New Members</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Clear Filters Button */}
          {(genderFilter || ageGroupFilter || memberTypeFilter || searchQuery) && (
            <div className="flex justify-end">
              <Button variant="outline" onClick={clearFilters} size="sm">
                Clear All Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Summary */}
      {rangeStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="church-stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Attendance</p>
                <p className="text-3xl font-bold text-slate-900">{rangeStats.totalAttendance}</p>
              </div>
              <div className="w-12 h-12 bg-[hsl(258,90%,66%)]/10 rounded-lg flex items-center justify-center">
                <Users className="text-[hsl(258,90%,66%)] text-xl" />
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-2">
              Over {rangeStats.totalDays} day{rangeStats.totalDays !== 1 ? 's' : ''}
            </p>
          </Card>

          <Card className="church-stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Daily Average</p>
                <p className="text-3xl font-bold text-slate-900">{rangeStats.averagePerDay}</p>
              </div>
              <div className="w-12 h-12 bg-[hsl(142,76%,36%)]/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-[hsl(142,76%,36%)] text-xl" />
              </div>
            </div>
            <p className="text-sm text-blue-600 mt-2">
              {rangeStats.memberAttendance} members + {rangeStats.visitorAttendance} visitors
            </p>
          </Card>

          <Card className="church-stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Gender Split</p>
                <p className="text-3xl font-bold text-slate-900">
                  {rangeStats.genderBreakdown.male}M / {rangeStats.genderBreakdown.female}F
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <BarChart3 className="text-blue-500 text-xl" />
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-2">
              {Math.round((rangeStats.genderBreakdown.male / (rangeStats.genderBreakdown.male + rangeStats.genderBreakdown.female)) * 100)}% Male
            </p>
          </Card>

          <Card className="church-stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Age Groups</p>
                <p className="text-lg font-bold text-slate-900">
                  {rangeStats.ageGroupBreakdown.adult}A / {rangeStats.ageGroupBreakdown.child}C / {rangeStats.ageGroupBreakdown.adolescent}T
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <Clock className="text-orange-500 text-xl" />
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-2">Adult / Child / Teen</p>
          </Card>
        </div>
      )}

      {/* Attendance Records */}
      <Card className="church-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Attendance Records</span>
            <span className="text-sm font-normal text-slate-500">
              {historyLoading ? "Loading..." : `${filteredHistory.length} records found`}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(258,90%,66%)] mx-auto"></div>
              <p className="text-slate-500 mt-2">Loading attendance history...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500">No attendance records found for the selected criteria</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredHistory.map((record) => (
                <div key={record.id} className="flex items-center space-x-4 p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
                  <div className="w-10 h-10 bg-[hsl(142,76%,36%)] rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {record.member?.firstName?.[0] || 'U'}{record.member?.surname?.[0] || 'M'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-slate-900">
                        {record.member?.firstName || 'Unknown'} {record.member?.surname || 'Member'}
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                          record.isVisitor 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {record.isVisitor ? 'Visitor' : 'Member'}
                        </span>
                      </p>
                      <p className="text-sm text-slate-600">
                        {formatDate(record.attendanceDate)}
                      </p>
                    </div>
                    <p className="text-sm text-slate-500">
                      {formatTime(record.checkInTime)} • {record.member?.gender} • {record.member?.ageGroup}
                      {record.member?.phone && (
                        <span className="ml-2">• {record.member.phone}</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}