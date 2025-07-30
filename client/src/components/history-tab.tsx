import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, Download, Users, Filter, BarChart3, TrendingUp, Clock, Grid, List, User, Trophy, Target, Award, Star, Activity } from "lucide-react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, isSameDay } from "date-fns";
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
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [ageGroupFilter, setAgeGroupFilter] = useState<string>("all");
  const [memberTypeFilter, setMemberTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"list" | "calendar" | "analytics">("list");
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [analyticsView, setAnalyticsView] = useState<"overview" | "trends" | "top-performers" | "insights">("overview");

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
    queryKey: ['/api/attendance/history', startDateStr, endDateStr, genderFilter, ageGroupFilter, memberTypeFilter, selectedMember],
    enabled: !!(startDateStr && endDateStr),
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDateStr,
        endDate: endDateStr,
      });
      
      if (genderFilter && genderFilter !== 'all') params.append('gender', genderFilter);
      if (ageGroupFilter && ageGroupFilter !== 'all') params.append('ageGroup', ageGroupFilter);
      if (memberTypeFilter && memberTypeFilter !== 'all') params.append('isCurrentMember', memberTypeFilter);
      if (selectedMember) params.append('memberId', selectedMember);

      const response = await fetch(`/api/attendance/history?${params}`);
      if (!response.ok) throw new Error('Failed to fetch attendance history');
      return response.json();
    },
  });

  // Get all members for the member selector
  const { data: allMembers = [] } = useQuery<any[]>({
    queryKey: ['/api/members'],
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

  // Analytics Data Processing
  const getTopPerformers = () => {
    const attendanceCounts = new Map();
    filteredHistory.forEach(record => {
      if (record.member) {
        const key = `${record.member.firstName} ${record.member.surname}`;
        const memberData = {
          name: key,
          gender: record.member.gender,
          ageGroup: record.member.ageGroup,
          email: record.member.email,
          phone: record.member.phone
        };
        if (attendanceCounts.has(key)) {
          attendanceCounts.get(key).attendance++;
        } else {
          attendanceCounts.set(key, { ...memberData, attendance: 1 });
        }
      }
    });
    
    return Array.from(attendanceCounts.values())
      .sort((a, b) => b.attendance - a.attendance)
      .slice(0, 10);
  };

  const getAttendanceTrends = () => {
    const dailyAttendance = new Map();
    filteredHistory.forEach(record => {
      const date = record.attendanceDate;
      dailyAttendance.set(date, (dailyAttendance.get(date) || 0) + 1);
    });
    
    return Array.from(dailyAttendance.entries())
      .map(([date, count]) => ({ date: format(parseISO(date), 'MMM dd'), fullDate: date, attendance: count }))
      .sort((a, b) => a.fullDate.localeCompare(b.fullDate));
  };

  const getDemographicBreakdown = () => {
    const genderData = { Male: 0, Female: 0 };
    const ageData = { Child: 0, Adolescent: 0, Adult: 0 };
    
    filteredHistory.forEach(record => {
      if (record.member?.gender) {
        const gender = record.member.gender.charAt(0).toUpperCase() + record.member.gender.slice(1);
        if (genderData[gender as keyof typeof genderData] !== undefined) {
          genderData[gender as keyof typeof genderData]++;
        }
      }
      if (record.member?.ageGroup) {
        const age = record.member.ageGroup.charAt(0).toUpperCase() + record.member.ageGroup.slice(1);
        if (ageData[age as keyof typeof ageData] !== undefined) {
          ageData[age as keyof typeof ageData]++;
        }
      }
    });
    
    return {
      gender: Object.entries(genderData).map(([name, value]) => ({ name, value })),
      age: Object.entries(ageData).map(([name, value]) => ({ name, value }))
    };
  };

  const getAttendanceInsights = () => {
    const totalDays = rangeStats?.totalDays || 0;
    const avgAttendance = rangeStats?.averagePerDay || 0;
    const trendData = getAttendanceTrends();
    const peakDay = trendData.reduce((max, current) => 
      current.attendance > max.attendance ? current : max, { date: '', attendance: 0, fullDate: '' });
    
    const consistentMembers = getTopPerformers().filter(member => 
      member.attendance >= Math.ceil(totalDays * 0.75)).length;
    
    const recentWeek = trendData.slice(-7);
    const earlierWeek = trendData.slice(0, 7);
    const recentAvg = recentWeek.length > 0 ? recentWeek.reduce((sum, day) => sum + day.attendance, 0) / recentWeek.length : 0;
    const earlierAvg = earlierWeek.length > 0 ? earlierWeek.reduce((sum, day) => sum + day.attendance, 0) / earlierWeek.length : 0;
    const growthRate = earlierAvg > 0 ? ((recentAvg - earlierAvg) / earlierAvg) * 100 : 0;
    
    return {
      totalDays,
      avgAttendance: Math.round(avgAttendance),
      peakDay,
      consistentMembers,
      growthRate: Math.round(growthRate * 10) / 10,
      totalUnique: new Set(filteredHistory.map(r => r.member?.id).filter(Boolean)).size
    };
  };

  const topPerformers = getTopPerformers();
  const trendData = getAttendanceTrends();
  const demographics = getDemographicBreakdown();
  const insights = getAttendanceInsights();

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

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
    setGenderFilter("all");
    setAgeGroupFilter("all");
    setMemberTypeFilter("all");
    setSearchQuery("");
    setSelectedMember(null);
  };

  // Group attendance by date for calendar view
  const attendanceByDate = attendanceHistory.reduce((acc, record) => {
    const date = record.attendanceDate;
    if (!acc[date]) acc[date] = [];
    acc[date].push(record);
    return acc;
  }, {} as Record<string, AttendanceRecord[]>);

  // Calendar day renderer
  const renderCalendarDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayAttendance = attendanceByDate[dateStr] || [];
    
    if (dayAttendance.length === 0) return null;
    
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-6 h-6 bg-[hsl(258,90%,66%)] text-white text-xs rounded-full flex items-center justify-center font-medium">
          {dayAttendance.length}
        </div>
      </div>
    );
  };

  // Individual member timeline
  const getMemberTimeline = (memberId: string) => {
    return attendanceHistory
      .filter(record => record.memberId === memberId || record.visitorId === memberId)
      .sort((a, b) => new Date(b.attendanceDate).getTime() - new Date(a.attendanceDate).getTime());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Attendance History</h2>
          <p className="text-slate-600">View and analyze attendance patterns over time</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-slate-100 rounded-lg p-1">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-8"
            >
              <List className="h-4 w-4 mr-1" />
              List
            </Button>
            <Button
              variant={viewMode === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("calendar")}
              className="h-8"
            >
              <Grid className="h-4 w-4 mr-1" />
              Calendar
            </Button>
            <Button
              variant={viewMode === "analytics" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("analytics")}
              className="h-8"
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              Analytics
            </Button>
          </div>
          {filteredHistory.length > 0 && (
            <Button onClick={handleExport} className="church-button-primary">
              <Download className="h-4 w-4 mr-2" />
              Export CSV ({filteredHistory.length})
            </Button>
          )}
        </div>
      </div>

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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              <label className="text-sm font-medium text-slate-700">Specific Member</label>
              <Select value={selectedMember || "all"} onValueChange={(value) => setSelectedMember(value === "all" ? null : value)}>
                <SelectTrigger className="church-form-input">
                  <SelectValue placeholder="All Members" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  {allMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.firstName} {member.surname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Gender</label>
              <Select value={genderFilter} onValueChange={setGenderFilter}>
                <SelectTrigger className="church-form-input">
                  <SelectValue placeholder="All Genders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
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
                  <SelectItem value="all">All Ages</SelectItem>
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
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="true">Current Members</SelectItem>
                  <SelectItem value="false">New Members</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Clear Filters Button */}
          {(genderFilter !== "all" || ageGroupFilter !== "all" || memberTypeFilter !== "all" || searchQuery || selectedMember) && (
            <div className="flex justify-end">
              <Button variant="outline" onClick={clearFilters} size="sm">
                Clear All Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content Views */}
      {viewMode === "list" ? (
        /* List View */
        <Card className="church-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                {selectedMember 
                  ? `${allMembers.find(m => m.id === selectedMember)?.firstName || ''} ${allMembers.find(m => m.id === selectedMember)?.surname || ''} Timeline`
                  : 'Attendance Records'
                }
              </span>
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
                    {!selectedMember && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSelectedMember(record.memberId || record.visitorId || null)}
                        className="text-xs"
                      >
                        <User className="h-3 w-3 mr-1" />
                        Timeline
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "calendar" ? (
        /* Calendar View */
        <Card className="church-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Calendar View</span>
              <span className="text-sm font-normal text-slate-500">
                Click on dates with attendance to see details
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(258,90%,66%)] mx-auto"></div>
                <p className="text-slate-500 mt-2">Loading calendar...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <Calendar
                  mode="single"
                  selected={undefined}
                  onSelect={(date) => {
                    if (date) {
                      const dateStr = format(date, 'yyyy-MM-dd');
                      const dayAttendance = attendanceByDate[dateStr];
                      if (dayAttendance && dayAttendance.length > 0) {
                        // Could add modal or expand details here
                        console.log(`Selected date: ${dateStr} with ${dayAttendance.length} attendance records`);
                      }
                    }
                  }}
                  className="rounded-md border mx-auto"
                  components={{
                    Day: ({ date, ...props }) => (
                      <div className="relative">
                        <button
                          {...props}
                          className={cn(
                            "h-9 w-9 p-0 font-normal aria-selected:opacity-100 relative",
                            attendanceByDate[format(date, 'yyyy-MM-dd')]?.length > 0 && "bg-[hsl(258,90%,66%)]/10"
                          )}
                        >
                          {format(date, 'd')}
                          {renderCalendarDay(date)}
                        </button>
                      </div>
                    ),
                  }}
                />
                
                {/* Calendar Legend */}
                <div className="flex items-center justify-center gap-4 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[hsl(258,90%,66%)] rounded-full"></div>
                    <span>Has attendance records</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border border-slate-300 rounded-full"></div>
                    <span>No records</span>
                  </div>
                </div>

                {/* Daily Details */}
                {Object.keys(attendanceByDate).length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium text-slate-900 mb-3">Daily Attendance Summary</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-64 overflow-y-auto">
                      {Object.entries(attendanceByDate)
                        .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                        .map(([date, records]) => (
                          <div key={date} className="bg-slate-50 p-3 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-medium text-sm">{formatDate(date)}</p>
                              <span className="bg-[hsl(258,90%,66%)] text-white text-xs px-2 py-1 rounded-full">
                                {records.length}
                              </span>
                            </div>
                            <div className="space-y-1">
                              {records.slice(0, 3).map((record) => (
                                <p key={record.id} className="text-xs text-slate-600 truncate">
                                  {record.member?.firstName} {record.member?.surname}
                                </p>
                              ))}
                              {records.length > 3 && (
                                <p className="text-xs text-slate-500">
                                  +{records.length - 3} more
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "analytics" ? (
        /* Analytics View - Coming Soon */
        <Card className="church-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Advanced Analytics Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-[hsl(258,90%,66%)]/10 rounded-full flex items-center justify-center mx-auto">
                <Trophy className="h-8 w-8 text-[hsl(258,90%,66%)]" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900">Comprehensive Analytics Coming Soon!</h3>
              <div className="max-w-md mx-auto space-y-2 text-slate-600">
                <p className="font-medium">🏆 Top Performing Members</p>
                <p className="font-medium">📈 Attendance Trend Analysis</p>
                <p className="font-medium">📊 Demographic Insights</p>
                <p className="font-medium">⭐ Smart Recommendations</p>
                <p className="font-medium">📋 Growth Metrics & Predictions</p>
              </div>
              <div className="pt-4">
                <p className="text-sm text-slate-500">
                  Advanced analytics with charts, leaderboards, and actionable insights to help you understand congregation patterns and engagement levels.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div>No view selected</div>
      )}
    </div>
  );
}