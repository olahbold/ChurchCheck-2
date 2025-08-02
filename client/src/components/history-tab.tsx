
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, Download, Users, Filter, BarChart3, TrendingUp, Clock, Grid, List, User, Trophy, Target, Award, Star, Activity } from "lucide-react";
import { apiRequest } from '@/lib/queryClient';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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

interface AttendanceRecord {
  id: string;
  memberId: string | null;
  visitorId: string | null;
  attendanceDate: string;
  checkInTime: string;
  checkInMethod: string;
  isGuest: boolean;
  isVisitor: boolean;
  visitorName?: string;
  visitorAgeGroup?: string;
  event?: {
    id: string;
    name: string;
    eventType: string;
  };
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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        duration: 0.6
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const statsVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: "backOut"
      }
    }
  };

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

      return await apiRequest(`/api/attendance/history?${params}`);
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

      return await apiRequest(`/api/attendance/stats-range?${params}`);
    },
  });

  // Filter records by search query
  const filteredHistory = attendanceHistory.filter(record => {
    if (!searchQuery) return true;
    const memberName = record.member ? 
      `${record.member.firstName} ${record.member.surname}` : 
      record.visitorName || 'Unknown';
    return memberName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Export filtered data as CSV
  const handleExport = () => {
    if (filteredHistory.length === 0) return;

    const csvHeaders = ['Date', 'Name', 'Gender', 'Age Group', 'Check-in Time', 'Method', 'Type', 'Phone', 'Email'];
    const csvData = filteredHistory.map(record => {
      const memberName = record.member ? 
        `${record.member.firstName} ${record.member.surname}` : 
        record.visitorName || 'Unknown';
      return [
        record.attendanceDate,
        memberName,
        record.member?.gender || '',
        record.member?.ageGroup || '',
        new Date(record.checkInTime).toLocaleString(),
        record.checkInMethod,
        record.isVisitor ? 'Visitor' : 'Member',
        record.member?.phone || '',
        record.member?.email || ''
      ];
    });

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
    const peakDay = trendData.length > 0 
      ? trendData.reduce((max, current) => 
          current.attendance > max.attendance ? current : max, { date: 'No data', attendance: 0, fullDate: '' })
      : { date: 'No data', attendance: 0, fullDate: '' };
    
    const topPerformers = getTopPerformers();
    const consistentMembers = topPerformers.filter(member => 
      member.attendance >= Math.ceil(totalDays * 0.75)).length;
    
    const recentWeek = trendData.slice(-7);
    const earlierWeek = trendData.slice(0, 7);
    const recentAvg = recentWeek.length > 0 ? recentWeek.reduce((sum, day) => sum + (day.attendance || 0), 0) / recentWeek.length : 0;
    const earlierAvg = earlierWeek.length > 0 ? earlierWeek.reduce((sum, day) => sum + (day.attendance || 0), 0) / earlierWeek.length : 0;
    const growthRate = earlierAvg > 0 ? ((recentAvg - earlierAvg) / earlierAvg) * 100 : 0;
    
    return {
      totalDays: Math.max(0, totalDays),
      avgAttendance: Math.max(0, Math.round(avgAttendance)),
      peakDay,
      consistentMembers: Math.max(0, consistentMembers),
      growthRate: isNaN(growthRate) ? 0 : Math.round(growthRate * 10) / 10,
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
    <motion.div 
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header */}
      <motion.div 
        className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4"
        variants={cardVariants}
      >
        <div>
          <motion.h2 
            className="text-2xl font-semibold text-slate-900"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            Attendance History
          </motion.h2>
          <motion.p 
            className="text-slate-600"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            View and analyze attendance patterns over time
          </motion.p>
        </div>
        <motion.div 
          className="flex gap-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
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
        </motion.div>
      </motion.div>

      {/* Statistics Summary */}
      {rangeStats && (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={containerVariants}
        >
          <motion.div variants={statsVariants}>
            <Card className="stat-card-hover cursor-pointer overflow-hidden relative h-[140px]">
              <CardContent className="p-6 h-full flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Attendance</p>
                    <motion.p 
                      className="text-3xl font-bold text-slate-900"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.5, duration: 0.6 }}
                    >
                      <AnimatedCounter target={rangeStats.totalAttendance} />
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
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  Over {rangeStats.totalDays} day{rangeStats.totalDays !== 1 ? 's' : ''}
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

          <motion.div variants={statsVariants}>
            <Card className="stat-card-hover cursor-pointer overflow-hidden relative h-[140px]">
              <CardContent className="p-6 h-full flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Daily Average</p>
                    <motion.p 
                      className="text-3xl font-bold text-slate-900"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.6, duration: 0.6 }}
                    >
                      <AnimatedCounter target={rangeStats.averagePerDay} />
                    </motion.p>
                  </div>
                  <motion.div 
                    className="w-12 h-12 bg-[hsl(142,76%,36%)]/10 rounded-lg flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
                  >
                    <TrendingUp className="text-[hsl(142,76%,36%)] text-xl pulse-icon" />
                  </motion.div>
                </div>
                <motion.p 
                  className="text-sm text-blue-600 mt-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 }}
                >
                  <Users className="inline h-3 w-3 mr-1" />
                  {rangeStats.memberAttendance} members + {rangeStats.visitorAttendance} visitors
                </motion.p>
                <motion.div
                  className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-[hsl(142,76%,36%)] to-[hsl(120,76%,36%)]"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ delay: 1.1, duration: 1.2 }}
                />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={statsVariants}>
            <Card className="stat-card-hover cursor-pointer overflow-hidden relative h-[140px]">
              <CardContent className="p-6 h-full flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Gender Split</p>
                    <motion.p 
                      className="text-3xl font-bold text-slate-900"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.7, duration: 0.6 }}
                    >
                      <AnimatedCounter target={rangeStats.genderBreakdown.male} />M / <AnimatedCounter target={rangeStats.genderBreakdown.female} />F
                    </motion.p>
                  </div>
                  <motion.div 
                    className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
                  >
                    <BarChart3 className="text-blue-500 text-xl pulse-icon" />
                  </motion.div>
                </div>
                <motion.p 
                  className="text-sm text-slate-500 mt-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.0 }}
                >
                  <BarChart3 className="inline h-3 w-3 mr-1" />
                  {Math.round((rangeStats.genderBreakdown.male / (rangeStats.genderBreakdown.male + rangeStats.genderBreakdown.female)) * 100)}% Male
                </motion.p>
                <motion.div
                  className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ delay: 1.2, duration: 1.2 }}
                />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={statsVariants}>
            <Card className="stat-card-hover cursor-pointer overflow-hidden relative h-[140px]">
              <CardContent className="p-6 h-full flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Age Groups</p>
                    <motion.p 
                      className="text-2xl font-bold text-slate-900"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.8, duration: 0.6 }}
                    >
                      <AnimatedCounter target={rangeStats.ageGroupBreakdown.adult} />A / <AnimatedCounter target={rangeStats.ageGroupBreakdown.child} />C / <AnimatedCounter target={rangeStats.ageGroupBreakdown.adolescent} />T
                    </motion.p>
                  </div>
                  <motion.div 
                    className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6, type: "spring", stiffness: 300 }}
                  >
                    <Clock className="text-orange-500 text-xl pulse-icon" />
                  </motion.div>
                </div>
                <motion.p 
                  className="text-sm text-slate-500 mt-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.1 }}
                >
                  <Clock className="inline h-3 w-3 mr-1" />
                  Adult / Child / Teen
                </motion.p>
                <motion.div
                  className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-orange-500 to-orange-600"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ delay: 1.3, duration: 1.2 }}
                />
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
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
                {filteredHistory.map((record) => {
                  const memberName = record.member ? 
                    `${record.member.firstName} ${record.member.surname}` : 
                    record.visitorName || 'Unknown';
                  const initials = memberName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                  
                  return (
                    <div key={record.id} className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-gray-900 truncate">
                            {memberName}
                          </p>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            record.isVisitor 
                              ? 'bg-red-100 text-red-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {record.isVisitor ? 'Visitor' : 'Member'}
                          </span>
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                            {record.member?.ageGroup || record.visitorAgeGroup || 'N/A'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {formatTime(record.checkInTime)} • {record.checkInMethod} • {record.member?.phone || 'No phone'}
                        </p>
                        {record.event && (
                          <p className="text-xs text-blue-600 mt-1">
                            Event: {record.event.name}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          {formatDate(record.attendanceDate)}
                        </span>
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
                    </div>
                  );
                })}
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
                    Day: ({ date, ...props }) => {
                      // Filter out any non-standard props that shouldn't be passed to DOM
                      const { displayMonth, ...buttonProps } = props;
                      return (
                        <div className="relative">
                          <button
                            {...buttonProps}
                            className={cn(
                              "h-9 w-9 p-0 font-normal aria-selected:opacity-100 relative",
                              attendanceByDate[format(date, 'yyyy-MM-dd')]?.length > 0 && "bg-[hsl(258,90%,66%)]/10"
                            )}
                          >
                            {format(date, 'd')}
                            {renderCalendarDay(date)}
                          </button>
                        </div>
                      );
                    },
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
        /* Analytics Dashboard */
        <div className="space-y-6">
          {/* Analytics Navigation */}
          <Card className="church-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Advanced Analytics Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={analyticsView === "overview" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAnalyticsView("overview")}
                >
                  <Activity className="h-4 w-4 mr-1" />
                  Overview
                </Button>
                <Button
                  variant={analyticsView === "trends" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAnalyticsView("trends")}
                >
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Trends
                </Button>
                <Button
                  variant={analyticsView === "top-performers" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAnalyticsView("top-performers")}
                >
                  <Trophy className="h-4 w-4 mr-1" />
                  Top Performers
                </Button>
                <Button
                  variant={analyticsView === "insights" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAnalyticsView("insights")}
                >
                  <Target className="h-4 w-4 mr-1" />
                  Insights
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Analytics Content */}
          {analyticsView === "overview" && (() => {
            const trendData = getAttendanceTrends();
            const demographics = getDemographicBreakdown();
            const insights = getAttendanceInsights();
            const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];

            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Attendance Trend Chart */}
                <Card className="church-card">
                  <CardHeader>
                    <CardTitle>Attendance Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="attendance" stroke="#8884d8" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Gender Demographics */}
                <Card className="church-card">
                  <CardHeader>
                    <CardTitle>Gender Demographics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={demographics.gender}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {demographics.gender.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Age Group Distribution */}
                <Card className="church-card">
                  <CardHeader>
                    <CardTitle>Age Group Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={demographics.age}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card className="church-card">
                  <CardHeader>
                    <CardTitle>Quick Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Unique Members</span>
                      <span className="text-2xl font-bold text-[hsl(258,90%,66%)]">{insights.totalUnique}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Average Daily</span>
                      <span className="text-2xl font-bold text-[hsl(142,76%,36%)]">{insights.avgAttendance}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Peak Day</span>
                      <span className="text-lg font-bold text-blue-600">{insights.peakDay.date}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Growth Rate</span>
                      <span className={`text-lg font-bold ${insights.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {insights.growthRate >= 0 ? '+' : ''}{insights.growthRate}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}

          {analyticsView === "trends" && (() => {
            const trendData = getAttendanceTrends();
            const insights = getAttendanceInsights();

            return (
              <div className="space-y-6">
                {/* Area Chart for Detailed Trends */}
                <Card className="church-card">
                  <CardHeader>
                    <CardTitle>Detailed Attendance Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <AreaChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Area type="monotone" dataKey="attendance" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Weekly vs Monthly Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="church-card">
                    <CardHeader>
                      <CardTitle>Weekly Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span>Recent Week Average</span>
                          <span className="font-bold">{(() => {
                            const recentWeek = trendData.slice(-7);
                            const divisor = Math.min(7, trendData.length);
                            return divisor > 0 ? Math.round(recentWeek.reduce((sum, day) => sum + day.attendance, 0) / divisor) : 0;
                          })()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Previous Week Average</span>
                          <span className="font-bold">{(() => {
                            const previousWeek = trendData.slice(-14, -7);
                            const divisor = Math.min(7, previousWeek.length);
                            return divisor > 0 ? Math.round(previousWeek.reduce((sum, day) => sum + day.attendance, 0) / divisor) : 0;
                          })()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Best Day</span>
                          <span className="font-bold text-green-600">{insights.peakDay.date} ({insights.peakDay.attendance})</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="church-card">
                    <CardHeader>
                      <CardTitle>Growth Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span>Growth Trend</span>
                          <span className={`font-bold ${insights.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {insights.growthRate >= 0 ? '↗' : '↘'} {Math.abs(insights.growthRate)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Consistent Attendees</span>
                          <span className="font-bold text-blue-600">{insights.consistentMembers}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Days Tracked</span>
                          <span className="font-bold">{insights.totalDays}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            );
          })()}

          {analyticsView === "top-performers" && (() => {
            const topPerformers = getTopPerformers();

            return (
              <div className="space-y-6">
                {/* Top Performers Leaderboard */}
                <Card className="church-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      Attendance Champions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {topPerformers.map((member, index) => (
                        <div key={member.name} className={`flex items-center space-x-4 p-4 rounded-lg border-2 ${
                          index === 0 ? 'bg-yellow-50 border-yellow-200' :
                          index === 1 ? 'bg-gray-50 border-gray-200' :
                          index === 2 ? 'bg-orange-50 border-orange-200' :
                          'bg-slate-50 border-slate-200'
                        }`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                            index === 0 ? 'bg-yellow-500' :
                            index === 1 ? 'bg-gray-500' :
                            index === 2 ? 'bg-orange-500' :
                            'bg-slate-500'
                          }`}>
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-slate-900">{member.name}</p>
                                <p className="text-sm text-slate-600">
                                  {member.gender} • {member.ageGroup}
                                  {member.email && ` • ${member.email}`}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-[hsl(258,90%,66%)]">{member.attendance}</p>
                                <p className="text-xs text-slate-500">attendances</p>
                              </div>
                            </div>
                          </div>
                          {index < 3 && (
                            <Award className={`h-6 w-6 ${
                              index === 0 ? 'text-yellow-500' :
                              index === 1 ? 'text-gray-500' :
                              'text-orange-500'
                            }`} />
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Performers Chart */}
                <Card className="church-card">
                  <CardHeader>
                    <CardTitle>Top 10 Attendance Chart</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart 
                        data={topPerformers.filter(p => p.attendance > 0)} 
                        margin={{ top: 20, right: 30, bottom: 60, left: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 10, textAnchor: 'end' }}
                          angle={-45}
                          height={60}
                          interval={0}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          label={{ value: 'Attendances', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip 
                          formatter={(value) => [value, 'Attendances']}
                          labelFormatter={(label) => `Member: ${label}`}
                        />
                        <Bar 
                          dataKey="attendance" 
                          fill="#8884d8" 
                          radius={[4, 4, 0, 0]}
                          minPointSize={2}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            );
          })()}

          {analyticsView === "insights" && (() => {
            const insights = getAttendanceInsights();
            const topPerformers = getTopPerformers();

            return (
              <div className="space-y-6">
                {/* Key Insights Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card className="church-card border-l-4 border-l-green-500">
                    <CardHeader>
                      <CardTitle className="text-green-700">Growth Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-2xl font-bold text-green-600">{insights.growthRate}%</p>
                        <p className="text-sm text-slate-600">
                          {insights.growthRate >= 0 ? 'Growth' : 'Decline'} compared to earlier period
                        </p>
                        <p className="text-xs text-slate-500">
                          {insights.growthRate >= 0 ? 'Positive trend indicates increasing engagement' : 'Consider outreach strategies to boost attendance'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="church-card border-l-4 border-l-blue-500">
                    <CardHeader>
                      <CardTitle className="text-blue-700">Engagement Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-2xl font-bold text-blue-600">{Math.round((insights.consistentMembers / insights.totalUnique) * 100)}%</p>
                        <p className="text-sm text-slate-600">
                          Members attending 75%+ of services
                        </p>
                        <p className="text-xs text-slate-500">
                          {insights.consistentMembers} out of {insights.totalUnique} total members
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="church-card border-l-4 border-l-purple-500">
                    <CardHeader>
                      <CardTitle className="text-purple-700">Peak Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-2xl font-bold text-purple-600">{insights.peakDay.attendance}</p>
                        <p className="text-sm text-slate-600">
                          Best attended service on {insights.peakDay.date}
                        </p>
                        <p className="text-xs text-slate-500">
                          {((insights.peakDay.attendance / insights.avgAttendance) * 100 - 100).toFixed(0)}% above average
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recommendations */}
                <Card className="church-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      Smart Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {insights.growthRate < 0 && (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <h4 className="font-semibold text-yellow-800">⚠️ Attendance Declining</h4>
                          <p className="text-yellow-700 text-sm mt-1">
                            Consider implementing member outreach programs or special events to re-engage the congregation.
                          </p>
                        </div>
                      )}
                      {insights.consistentMembers / insights.totalUnique < 0.5 && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <h4 className="font-semibold text-blue-800">📈 Engagement Opportunity</h4>
                          <p className="text-blue-700 text-sm mt-1">
                            Less than 50% of members attend regularly. Consider follow-up programs for members with low attendance.
                          </p>
                        </div>
                      )}
                      {topPerformers.length >= 5 && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <h4 className="font-semibold text-green-800">🌟 Recognition Program</h4>
                          <p className="text-green-700 text-sm mt-1">
                            You have {topPerformers.length} highly engaged members. Consider a recognition program for consistent attendees.
                          </p>
                        </div>
                      )}
                      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <h4 className="font-semibold text-purple-800">📊 Data-Driven Insights</h4>
                        <p className="text-purple-700 text-sm mt-1">
                          Your peak attendance was {insights.peakDay.attendance} on {insights.peakDay.date}. 
                          Analyze what made that service special to replicate success.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </div>
      ) : (
        <div>No view selected</div>
      )}
    </motion.div>
  );
}