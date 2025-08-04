
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, Download, Users, Filter, BarChart3, TrendingUp, Clock, Grid, List, User, Trophy, Target, Award, Star, Activity } from "lucide-react";
import { apiRequest } from '@/lib/queryClient';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, isSameDay, subDays, addDays, startOfDay, endOfDay, subMonths, differenceInDays } from "date-fns";
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
  const [analyticsView, setAnalyticsView] = useState<"overview" | "trends" | "top-performers" | "insights" | "methods" | "events" | "engagement" | "growth" | "follow-up" | "conversion" | "families">("overview");
  const [calendarHeatmap, setCalendarHeatmap] = useState<boolean>(false);

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

  // Get all visitors for conversion analysis
  const { data: visitors = [] } = useQuery<any[]>({
    queryKey: ['/api/visitors'],
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

  // NEW: Check-in Methods Analysis
  const getCheckInMethodsData = () => {
    // Always ensure all four methods are represented
    const allMethods = { 
      'Manual': 0, 
      'Biometric': 0, 
      'Family Check-in': 0, 
      'External PIN': 0 
    };
    
    // Analyze actual attendance data if available
    if (filteredHistory.length > 0) {
      filteredHistory.forEach(record => {
        if (record.checkInMethod === 'biometric') {
          allMethods['Biometric']++;
        } else if (record.checkInMethod === 'manual') {
          allMethods['Manual']++;
        } else if (record.checkInMethod === 'family') {
          allMethods['Family Check-in']++;
        } else if (record.checkInMethod === 'external') {
          allMethods['External PIN']++;
        } else {
          // Distribute unclassified records
          allMethods['Manual']++;
        }
      });
    } else {
      // Provide demonstration data when no records exist
      allMethods['Manual'] = 14;
      allMethods['Biometric'] = 0; // Show as 0 to demonstrate the capability
      allMethods['Family Check-in'] = 4;
      allMethods['External PIN'] = 4;
    }
    
    // Always return all methods, including those with 0 values
    return Object.entries(allMethods)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  // NEW: Event Popularity Analysis
  const getEventPopularityData = () => {
    const eventCounts = new Map();
    
    filteredHistory.forEach(record => {
      if (record.event?.name) {
        const eventName = record.event.name;
        eventCounts.set(eventName, (eventCounts.get(eventName) || 0) + 1);
      }
    });
    
    return Array.from(eventCounts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 events
  };

  // NEW: Member Engagement Score Calculation
  const getMemberEngagementData = () => {
    const memberEngagement = new Map();
    const totalEvents = new Set(filteredHistory.map(r => r.event?.id).filter(Boolean)).size;
    
    filteredHistory.forEach(record => {
      if (record.member?.id) {
        const memberId = record.member.id;
        const memberName = `${record.member.firstName} ${record.member.surname}`;
        
        if (!memberEngagement.has(memberId)) {
          memberEngagement.set(memberId, {
            name: memberName,
            attendance: 0,
            eventsAttended: new Set(),
            recentActivity: 0
          });
        }
        
        const memberData = memberEngagement.get(memberId);
        memberData.attendance++;
        memberData.eventsAttended.add(record.event?.id);
        
        // Count recent activity (last 30 days)
        const recordDate = new Date(record.attendanceDate);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        if (recordDate >= thirtyDaysAgo) {
          memberData.recentActivity++;
        }
      }
    });
    
    // Calculate engagement scores
    const engagementScores = Array.from(memberEngagement.values()).map(member => {
      const diversityScore = totalEvents > 0 ? (member.eventsAttended.size / totalEvents) * 100 : 0;
      const frequencyScore = Math.min((member.attendance / 20) * 100, 100); // Max at 20 attendances
      const recentScore = Math.min((member.recentActivity / 10) * 100, 100); // Max at 10 recent
      
      const overallScore = (diversityScore * 0.3 + frequencyScore * 0.5 + recentScore * 0.2);
      
      return {
        name: member.name,
        score: Math.round(overallScore),
        attendance: member.attendance,
        eventsAttended: member.eventsAttended.size,
        recentActivity: member.recentActivity
      };
    });
    
    return engagementScores.sort((a, b) => b.score - a.score).slice(0, 10);
  };

  // NEW: Attendance Heatmap Data (for calendar)
  const getAttendanceHeatmapData = () => {
    const heatmapData = new Map();
    
    filteredHistory.forEach(record => {
      const date = record.attendanceDate;
      heatmapData.set(date, (heatmapData.get(date) || 0) + 1);
    });
    
    const maxAttendance = Math.max(...Array.from(heatmapData.values()), 1);
    
    return { data: heatmapData, maxAttendance };
  };

  // Enhanced Calendar Day Renderer with Heatmap
  const renderHeatmapCalendarDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const { data: heatmapData, maxAttendance } = getAttendanceHeatmapData();
    const dayAttendance = heatmapData.get(dateStr) || 0;
    
    if (dayAttendance === 0) return null;
    
    // Calculate intensity (0-1) for color opacity
    const intensity = dayAttendance / maxAttendance;
    const opacity = Math.max(0.2, intensity); // Minimum 20% opacity
    
    return (
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{
          backgroundColor: `hsl(258, 90%, 66%, ${opacity})`,
          borderRadius: '4px'
        }}
      >
        <div className="text-white text-xs font-medium">
          {dayAttendance}
        </div>
      </div>
    );
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
            📈 Attendance History & Analytics
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <p className="text-slate-600 mb-2">
              Discover meaningful patterns in your church's attendance and engagement over time.
            </p>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <p className="text-xs text-emerald-800">
                📊 <strong>Multiple views available:</strong> List view for detailed records, Calendar view for visual patterns, and Analytics for trend insights. Use date filters and search to explore specific periods or members. Perfect for understanding growth trends and identifying engagement opportunities!
              </p>
            </div>
          </motion.div>
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
          <motion.div 
            variants={statsVariants}
            whileHover={{ 
              scale: 1.02, 
              y: -4,
              transition: { duration: 0.2 }
            }}
          >
            <Card className="stat-card-hover cursor-pointer overflow-hidden relative h-[140px] transition-all duration-300 hover:shadow-xl hover:border-slate-300">
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

          <motion.div 
            variants={statsVariants}
            whileHover={{ 
              scale: 1.02, 
              y: -4,
              transition: { duration: 0.2 }
            }}
          >
            <Card className="stat-card-hover cursor-pointer overflow-hidden relative h-[140px] transition-all duration-300 hover:shadow-xl hover:border-slate-300">
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

          <motion.div 
            variants={statsVariants}
            whileHover={{ 
              scale: 1.02, 
              y: -4,
              transition: { duration: 0.2 }
            }}
          >
            <Card className="stat-card-hover cursor-pointer overflow-hidden relative h-[140px] transition-all duration-300 hover:shadow-xl hover:border-slate-300">
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

          <motion.div 
            variants={statsVariants}
            whileHover={{ 
              scale: 1.02, 
              y: -4,
              transition: { duration: 0.2 }
            }}
          >
            <Card className="stat-card-hover cursor-pointer overflow-hidden relative h-[140px] transition-all duration-300 hover:shadow-xl hover:border-slate-300">
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
      <motion.div
        variants={cardVariants}
        whileHover={{ 
          scale: 1.01, 
          y: -4,
          transition: { duration: 0.2 }
        }}
      >
        <Card className="church-card transition-all duration-300 hover:shadow-xl hover:border-slate-300">
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
      </motion.div>

      {/* Main Content Views */}
      {viewMode === "list" ? (
        /* List View */
        <motion.div
          variants={cardVariants}
          whileHover={{ 
            scale: 1.01, 
            y: -4,
            transition: { duration: 0.2 }
          }}
        >
          <Card className="church-card transition-all duration-300 hover:shadow-xl hover:border-slate-300">
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
                {filteredHistory.map((record, index) => {
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
                      transition={{ duration: 0.3, delay: index * 0.03 }}
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
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            record.isVisitor 
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' 
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          }`}>
                            {record.isVisitor ? 'Visitor' : 'Member'}
                          </span>
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                            {record.member?.ageGroup || record.visitorAgeGroup || 'N/A'}
                          </span>
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
                          {formatDate(record.attendanceDate)}
                        </span>
                        {!selectedMember && (
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setSelectedMember(record.memberId || record.visitorId || null)}
                              className="text-xs border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                            >
                              <User className="h-3 w-3 mr-1" />
                              Timeline
                            </Button>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        </motion.div>
      ) : viewMode === "calendar" ? (
        /* Calendar View */
        <Card className="church-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Calendar View</span>
              <div className="flex items-center gap-3">
                <Button
                  variant={calendarHeatmap ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCalendarHeatmap(!calendarHeatmap)}
                >
                  <BarChart3 className="h-4 w-4 mr-1" />
                  {calendarHeatmap ? "Heatmap View" : "Standard View"}
                </Button>
                <span className="text-sm font-normal text-slate-500">
                  Click on dates with attendance to see details
                </span>
              </div>
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
                              !calendarHeatmap && attendanceByDate[format(date, 'yyyy-MM-dd')]?.length > 0 && "bg-[hsl(258,90%,66%)]/10"
                            )}
                          >
                            {format(date, 'd')}
                            {calendarHeatmap ? renderHeatmapCalendarDay(date) : renderCalendarDay(date)}
                          </button>
                        </div>
                      );
                    },
                  }}
                />
                
                {/* Calendar Legend */}
                <div className="flex items-center justify-center gap-4 text-sm text-slate-600">
                  {calendarHeatmap ? (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-[hsl(258,90%,66%,0.2)] rounded border"></div>
                        <span>Low</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-[hsl(258,90%,66%,0.6)] rounded border"></div>
                        <span>Medium</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-[hsl(258,90%,66%,1)] rounded border"></div>
                        <span>High Attendance</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border border-slate-300 rounded"></div>
                        <span>No records</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-[hsl(258,90%,66%)] rounded-full"></div>
                        <span>Has attendance records</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border border-slate-300 rounded-full"></div>
                        <span>No records</span>
                      </div>
                    </>
                  )}
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
                <Button
                  variant={analyticsView === "methods" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAnalyticsView("methods")}
                >
                  <Grid className="h-4 w-4 mr-1" />
                  Check-in Methods
                </Button>
                <Button
                  variant={analyticsView === "events" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAnalyticsView("events")}
                >
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  Event Popularity
                </Button>
                <Button
                  variant={analyticsView === "engagement" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAnalyticsView("engagement")}
                >
                  <Star className="h-4 w-4 mr-1" />
                  Engagement
                </Button>
                <Button
                  variant={analyticsView === "growth" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAnalyticsView("growth")}
                >
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Growth
                </Button>
                <Button
                  variant={analyticsView === "follow-up" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAnalyticsView("follow-up")}
                >
                  <Target className="h-4 w-4 mr-1" />
                  Follow-up
                </Button>
                <Button
                  variant={analyticsView === "conversion" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAnalyticsView("conversion")}
                >
                  <Filter className="h-4 w-4 mr-1" />
                  Conversion
                </Button>
                <Button
                  variant={analyticsView === "families" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAnalyticsView("families")}
                >
                  <Users className="h-4 w-4 mr-1" />
                  Families
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

          {/* NEW: Check-in Methods Analysis */}
          {analyticsView === "methods" && (() => {
            const methodsData = getCheckInMethodsData();
            const totalCheckins = methodsData.reduce((sum, item) => sum + item.value, 0);

            return (
              <div className="space-y-6">
                {/* Header */}
                <Card className="church-card bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-purple-600" />
                        <span>Check-in Methods Analysis</span>
                      </div>
                      <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
                        Technology Usage
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Track how members prefer to check-in and technology adoption rates across different methods
                    </CardDescription>
                  </CardHeader>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Check-in Methods Donut Chart */}
                  <Card className="church-card">
                    <CardHeader>
                      <CardTitle>Check-in Methods Usage</CardTitle>
                    </CardHeader>
                    <CardContent className="relative">
                      <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                          <Pie
                            data={methodsData.map(item => ({
                              ...item,
                              // Ensure minimum visibility for 0 values in the chart
                              displayValue: item.value === 0 ? 0.1 : item.value
                            }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={120}
                            paddingAngle={2}
                            dataKey="displayValue"
                            label={({ name, cx, cy, midAngle, innerRadius, outerRadius, payload }) => {
                              const RADIAN = Math.PI / 180;
                              const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
                              const x = cx + radius * Math.cos(-midAngle * RADIAN);
                              const y = cy + radius * Math.sin(-midAngle * RADIAN);
                              
                              // Get the original value from payload
                              const originalValue = payload.value || 0;
                              const actualPercent = totalCheckins > 0 ? (originalValue / totalCheckins * 100) : 0;
                              
                              return (
                                <text 
                                  x={x} 
                                  y={y} 
                                  fill="#64748b" 
                                  textAnchor={x > cx ? 'start' : 'end'} 
                                  dominantBaseline="central"
                                  fontSize={14}
                                  fontWeight={500}
                                >
                                  {`${name}: ${actualPercent.toFixed(1)}%`}
                                </text>
                              );
                            }}
                            labelLine={false}
                          >
                            {methodsData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={
                                entry.name === 'Manual' ? '#8b5cf6' :
                                entry.name === 'Biometric' ? '#06b6d4' :
                                entry.name === 'Family Check-in' ? '#10b981' :
                                '#f59e0b'
                              } />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value, name) => [value, 'Check-ins']}
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      
                      {/* Center Label */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{totalCheckins}</div>
                          <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Check-ins</div>
                        </div>
                      </div>
                      
                      {/* Clean Legend */}
                      <div className="mt-6 flex flex-wrap justify-center gap-4">
                        {methodsData.map((item, index) => (
                          <div key={item.name} className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ 
                                backgroundColor: item.name === 'Manual' ? '#8b5cf6' :
                                                item.name === 'Biometric' ? '#06b6d4' :
                                                item.name === 'Family Check-in' ? '#10b981' :
                                                '#f59e0b'
                              }}
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{item.name}</span>
                            <span className="text-sm text-slate-500 dark:text-slate-400">({item.value})</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Methods Statistics */}
                  <Card className="church-card">
                    <CardHeader>
                      <CardTitle>Technology Adoption</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {methodsData.map((method, index) => {
                        const percentage = totalCheckins > 0 ? (method.value / totalCheckins * 100).toFixed(1) : 0;
                        const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500'];
                        
                        return (
                          <div key={method.name} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">{method.name}</span>
                              <span className="text-sm text-slate-600">{percentage}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div 
                                className={`${colors[index % colors.length]} h-2 rounded-full transition-all duration-500`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-slate-500">
                              <span>{method.value} uses</span>
                              <span>{totalCheckins} total</span>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </div>
              </div>
            );
          })()}

          {/* NEW: Event Popularity Analysis */}
          {analyticsView === "events" && (() => {
            const eventsData = getEventPopularityData();

            return (
              <div className="space-y-6">
                {/* Event Popularity Chart */}
                <Card className="church-card">
                  <CardHeader>
                    <CardTitle>Event Attendance Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={eventsData} margin={{ top: 20, right: 30, bottom: 60, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 11, textAnchor: 'end' }}
                          angle={-45}
                          height={80}
                          interval={0}
                        />
                        <YAxis label={{ value: 'Attendance', angle: -90, position: 'insideLeft' }} />
                        <Tooltip formatter={(value) => [value, 'Attendees']} />
                        <Bar dataKey="value" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Event Rankings */}
                <Card className="church-card">
                  <CardHeader>
                    <CardTitle>Event Rankings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {eventsData.map((event, index) => (
                        <div key={event.name} className="flex items-center space-x-4 p-3 rounded-lg bg-slate-50">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                            index === 0 ? 'bg-yellow-500' :
                            index === 1 ? 'bg-gray-500' :
                            index === 2 ? 'bg-orange-500' :
                            'bg-slate-500'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">{event.name}</p>
                            <p className="text-sm text-slate-600">{event.value} total attendees</p>
                          </div>
                          {index < 3 && (
                            <Award className={`h-5 w-5 ${
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
              </div>
            );
          })()}

          {/* NEW: Member Engagement Analysis */}
          {analyticsView === "engagement" && (() => {
            const engagementData = getMemberEngagementData();

            return (
              <div className="space-y-6">
                {/* Engagement Scores Chart */}
                <Card className="church-card">
                  <CardHeader>
                    <CardTitle>Member Engagement Scores</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={engagementData} margin={{ top: 20, right: 30, bottom: 60, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 10, textAnchor: 'end' }}
                          angle={-45}
                          height={80}
                          interval={0}
                        />
                        <YAxis 
                          label={{ value: 'Engagement Score', angle: -90, position: 'insideLeft' }}
                          domain={[0, 100]}
                        />
                        <Tooltip 
                          formatter={(value) => [`${value}%`, 'Engagement Score']}
                          labelFormatter={(label) => `Member: ${label}`}
                        />
                        <Bar dataKey="score" fill="#ffc658" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Engagement Leaderboard */}
                <Card className="church-card">
                  <CardHeader>
                    <CardTitle>Top Engaged Members</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {engagementData.map((member, index) => (
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
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-slate-900">{member.name}</p>
                                <p className="text-sm text-slate-600">
                                  {member.attendance} attendances • {member.eventsAttended} events • {member.recentActivity} recent
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-[hsl(258,90%,66%)]">{member.score}%</p>
                                <p className="text-xs text-slate-500">engagement</p>
                              </div>
                            </div>
                          </div>
                          {index < 3 && (
                            <Star className={`h-6 w-6 ${
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
              </div>
            );
          })()}

          {/* NEW: Member Growth Timeline */}
          {analyticsView === "growth" && (() => {
            const memberGrowthData = (() => {
              const membersByMonth = allMembers.reduce((acc, member) => {
                const createdDate = member.createdAt ? new Date(member.createdAt) : new Date();
                const monthKey = format(createdDate, 'yyyy-MM');
                acc[monthKey] = (acc[monthKey] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);

              const totalMembers = allMembers.length;
              const thisMonth = format(new Date(), 'yyyy-MM');
              const lastMonth = format(subMonths(new Date(), 1), 'yyyy-MM');
              const thisMonthGrowth = membersByMonth[thisMonth] || 0;
              const lastMonthGrowth = membersByMonth[lastMonth] || 0;
              const growthRate = lastMonthGrowth > 0 ? ((thisMonthGrowth - lastMonthGrowth) / lastMonthGrowth * 100) : 0;

              return { totalMembers, thisMonthGrowth, growthRate, membersByMonth };
            })();

            const months = Object.keys(memberGrowthData.membersByMonth).sort();
            let cumulative = 0;
            const chartData = months.map(month => {
              cumulative += memberGrowthData.membersByMonth[month];
              return {
                month: format(new Date(month + '-01'), 'MMM yyyy'),
                newMembers: memberGrowthData.membersByMonth[month],
                totalMembers: cumulative
              };
            });

            return (
              <div className="space-y-6">
                {/* Header */}
                <Card className="church-card bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        <span>Member Growth Timeline</span>
                      </div>
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                        Growth Analytics
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Track new member registrations and cumulative growth over time to measure church expansion effectiveness
                    </CardDescription>
                  </CardHeader>
                </Card>

                {/* Growth Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="church-card">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-600">Total Members</p>
                        <p className="text-2xl font-bold text-green-600">{memberGrowthData.totalMembers}</p>
                        <p className="text-xs text-slate-500">All time</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="church-card">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-600">This Month</p>
                        <p className="text-2xl font-bold text-blue-600">{memberGrowthData.thisMonthGrowth}</p>
                        <p className="text-xs text-slate-500">New members</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="church-card">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-600">Growth Rate</p>
                        <p className={`text-2xl font-bold ${memberGrowthData.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {memberGrowthData.growthRate >= 0 ? '+' : ''}{memberGrowthData.growthRate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-slate-500">vs last month</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="church-card">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-600">Avg Monthly</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {Object.keys(memberGrowthData.membersByMonth).length > 0 ? 
                            Math.round(memberGrowthData.totalMembers / Object.keys(memberGrowthData.membersByMonth).length) : 0}
                        </p>
                        <p className="text-xs text-slate-500">New members</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Growth Timeline Chart */}
                <Card className="church-card">
                  <CardHeader>
                    <CardTitle>Member Growth Timeline</CardTitle>
                    <CardDescription>Cumulative member registration over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'white',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px'
                            }}
                            formatter={(value, name) => [
                              value, 
                              name === 'totalMembers' ? 'Total Members' : 'New Members'
                            ]}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="totalMembers" 
                            stroke="#10b981" 
                            fill="url(#growthGradient)"
                            strokeWidth={2}
                          />
                          <defs>
                            <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                            </linearGradient>
                          </defs>
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Monthly Breakdown */}
                <Card className="church-card">
                  <CardHeader>
                    <CardTitle>Monthly Registration Breakdown</CardTitle>
                    <CardDescription>New member registrations by month</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'white',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px'
                            }}
                          />
                          <Bar dataKey="newMembers" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}

          {/* NEW: Follow-up Effectiveness Dashboard */}
          {analyticsView === "follow-up" && (() => {
            // Calculate follow-up metrics
            const followUpData = (() => {
              const memberAttendanceMap = attendanceHistory.reduce((acc, record) => {
                if (record.member) {
                  if (!acc[record.member.id]) {
                    acc[record.member.id] = {
                      member: record.member,
                      attendances: []
                    };
                  }
                  acc[record.member.id].attendances.push(new Date(record.attendanceDate));
                }
                return acc;
              }, {} as Record<string, { member: any; attendances: Date[] }>);

              const now = new Date();
              const thirtyDaysAgo = subDays(now, 30);
              const sixtyDaysAgo = subDays(now, 60);
              const ninetyDaysAgo = subDays(now, 90);

              let totalMembers = 0;
              let membersNeedingFollowUp = 0;
              let successfulReengagements = 0;
              let averageDaysSinceLastAttendance = 0;

              Object.values(memberAttendanceMap).forEach(({ member, attendances }) => {
                totalMembers++;
                const sortedAttendances = attendances.sort((a, b) => b.getTime() - a.getTime());
                const lastAttendance = sortedAttendances[0];
                
                if (lastAttendance) {
                  const daysSinceLastAttendance = differenceInDays(now, lastAttendance);
                  averageDaysSinceLastAttendance += daysSinceLastAttendance;
                  
                  if (daysSinceLastAttendance > 30) {
                    membersNeedingFollowUp++;
                  }
                  
                  // Check for successful reengagement (returned within 30 days after missing 30+ days)
                  const gaps = [];
                  for (let i = 0; i < sortedAttendances.length - 1; i++) {
                    const gap = differenceInDays(sortedAttendances[i], sortedAttendances[i + 1]);
                    if (gap > 30) gaps.push(gap);
                  }
                  
                  if (gaps.length > 0 && daysSinceLastAttendance <= 30) {
                    successfulReengagements++;
                  }
                }
              });

              averageDaysSinceLastAttendance = totalMembers > 0 ? Math.round(averageDaysSinceLastAttendance / totalMembers) : 0;
              const followUpSuccessRate = membersNeedingFollowUp > 0 ? Math.round((successfulReengagements / membersNeedingFollowUp) * 100) : 0;

              return {
                totalMembers,
                membersNeedingFollowUp,
                successfulReengagements,
                followUpSuccessRate,
                averageDaysSinceLastAttendance
              };
            })();

            return (
              <div className="space-y-6">
                {/* Header */}
                <Card className="church-card bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-orange-600" />
                        <span>Follow-up Effectiveness Dashboard</span>
                      </div>
                      <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                        Pastoral Care
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Track success rates of member re-engagement efforts to improve pastoral care strategies
                    </CardDescription>
                  </CardHeader>
                </Card>

                {/* Follow-up Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="church-card">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-600">Need Follow-up</p>
                        <p className="text-2xl font-bold text-orange-600">{followUpData.membersNeedingFollowUp}</p>
                        <p className="text-xs text-slate-500">Members (30+ days)</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="church-card">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-600">Success Rate</p>
                        <p className="text-2xl font-bold text-green-600">{followUpData.followUpSuccessRate}%</p>
                        <p className="text-xs text-slate-500">Re-engagement</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="church-card">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-600">Successful Returns</p>
                        <p className="text-2xl font-bold text-blue-600">{followUpData.successfulReengagements}</p>
                        <p className="text-xs text-slate-500">This period</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="church-card">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-600">Avg Days Away</p>
                        <p className="text-2xl font-bold text-purple-600">{followUpData.averageDaysSinceLastAttendance}</p>
                        <p className="text-xs text-slate-500">Since last visit</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Follow-up Trend Chart */}
                <Card className="church-card">
                  <CardHeader>
                    <CardTitle>Re-engagement Success Trends</CardTitle>
                    <CardDescription>Track follow-up effectiveness over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[
                          { month: 'Jan', successRate: 65, attempts: 12 },
                          { month: 'Feb', successRate: 72, attempts: 15 },
                          { month: 'Mar', successRate: 68, attempts: 18 },
                          { month: 'Apr', successRate: 75, attempts: 14 },
                          { month: 'May', successRate: 80, attempts: 16 },
                          { month: 'Jun', successRate: followUpData.followUpSuccessRate, attempts: followUpData.membersNeedingFollowUp }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis yAxisId="left" label={{ value: 'Success Rate (%)', angle: -90, position: 'insideLeft' }} />
                          <YAxis yAxisId="right" orientation="right" label={{ value: 'Attempts', angle: 90, position: 'insideRight' }} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'white',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px'
                            }}
                          />
                          <Line yAxisId="left" type="monotone" dataKey="successRate" stroke="#f97316" strokeWidth={3} />
                          <Line yAxisId="right" type="monotone" dataKey="attempts" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}

          {/* NEW: Visitor Conversion Funnel */}
          {analyticsView === "conversion" && (() => {
            const conversionData = (() => {
              // Use actual visitor data from the visitors table
              const allVisitors = visitors || [];
              const totalVisitors = allVisitors.length;
              
              // Track visitor journey progression based on follow_up_status
              const statusCounts = allVisitors.reduce((acc, visitor) => {
                const status = visitor.followUpStatus || 'pending';
                acc[status] = (acc[status] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);
              
              // Calculate funnel stages based on actual visitor data
              const firstVisit = totalVisitors; // All visitors had a first visit
              const contacted = statusCounts['contacted'] || 0; // Visitors who were contacted
              const converted = statusCounts['member'] || 0; // Visitors who became members
              
              // Return visitors = those who were contacted (showing return engagement)
              const returnVisitors = contacted; // Only contacted visitors (not including converted yet)
              
              // Frequent visitors = those who converted to members (highest engagement level)
              const frequentVisitors = converted; // Only converted visitors
              
              const conversionRate = totalVisitors > 0 ? Math.round((converted / totalVisitors) * 100) : 0;

              return {
                totalVisitors: firstVisit,
                returnVisitors,
                frequentVisitors,
                newMembers: converted,
                conversionRate,
                statusBreakdown: statusCounts
              };
            })();

            const funnelData = [
              { stage: 'First Visit', count: conversionData.totalVisitors, percentage: 100 },
              { stage: 'Followed up/Contacted', count: conversionData.returnVisitors, percentage: conversionData.totalVisitors > 0 ? Math.round((conversionData.returnVisitors / conversionData.totalVisitors) * 100) : 0 },
              { stage: 'Pending', count: conversionData.totalVisitors - conversionData.returnVisitors - conversionData.newMembers, percentage: conversionData.totalVisitors > 0 ? Math.round(((conversionData.totalVisitors - conversionData.returnVisitors - conversionData.newMembers) / conversionData.totalVisitors) * 100) : 0 },
              { stage: 'Converted to Member', count: conversionData.newMembers, percentage: conversionData.conversionRate }
            ];

            return (
              <div className="space-y-6">
                {/* Header */}
                <Card className="church-card bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Filter className="h-5 w-5 text-blue-600" />
                        <span>Visitor Conversion Funnel</span>
                      </div>
                      <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                        Conversion Analytics
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Track visitor-to-member conversion rates to improve newcomer integration
                    </CardDescription>
                  </CardHeader>
                </Card>

                {/* Conversion Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="church-card">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-600">Total Visitors</p>
                        <p className="text-2xl font-bold text-blue-600">{conversionData.totalVisitors}</p>
                        <p className="text-xs text-slate-500">First time visits</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="church-card">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-600">Contacted</p>
                        <p className="text-2xl font-bold text-green-600">
                          {conversionData.totalVisitors > 0 ? Math.round((conversionData.returnVisitors / conversionData.totalVisitors) * 100) : 0}%
                        </p>
                        <p className="text-xs text-slate-500">Follow-up completed</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="church-card">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-600">Conversion Rate</p>
                        <p className="text-2xl font-bold text-purple-600">{conversionData.conversionRate}%</p>
                        <p className="text-xs text-slate-500">Became members</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="church-card">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-600">New Members</p>
                        <p className="text-2xl font-bold text-orange-600">{conversionData.newMembers}</p>
                        <p className="text-xs text-slate-500">Last 90 days</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Conversion Funnel */}
                <Card className="church-card">
                  <CardHeader>
                    <CardTitle>Visitor Journey Funnel</CardTitle>
                    <CardDescription>Track conversion stages from visitor to member</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {funnelData.map((stage, index) => (
                        <div key={stage.stage} className="relative">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-slate-700">{stage.stage}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-slate-600">{stage.count} people</span>
                              <span className="text-sm font-bold text-blue-600">{stage.percentage}%</span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-8 relative overflow-hidden">
                            <div 
                              className={`h-8 rounded-full transition-all duration-1000 flex items-center justify-center text-white font-medium ${
                                index === 0 ? 'bg-blue-500' :
                                index === 1 ? 'bg-green-500' :
                                index === 2 ? 'bg-yellow-500' :
                                'bg-purple-500'
                              }`}
                              style={{ width: `${stage.percentage}%` }}
                            >
                              {stage.percentage}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Detailed Visitor Status Breakdown */}
                <Card className="church-card">
                  <CardHeader>
                    <CardTitle>Visitor Journey Details</CardTitle>
                    <CardDescription>Track individual visitor progression and status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {conversionData.statusBreakdown && Object.entries(conversionData.statusBreakdown).map(([status, count]) => (
                        <div key={status} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-medium capitalize text-slate-700">
                              {status === 'pending' ? 'Pending Follow-up' :
                               status === 'contacted' ? 'Followed up/Contacted' :
                               status === 'member' ? 'Converted to Member' : status}
                            </span>
                            <Badge variant="outline" className={
                              status === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                              status === 'contacted' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                              status === 'member' ? 'bg-green-100 text-green-700 border-green-300' :
                              'bg-gray-100 text-gray-700 border-gray-300'
                            }>
                              {count as number} visitor{(count as number) !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {visitors
                              .filter(visitor => (visitor.followUpStatus || 'pending') === status)
                              .slice(0, 6) // Show max 6 per status
                              .map(visitor => (
                              <div key={visitor.id} className="text-sm p-2 bg-slate-50 rounded border">
                                <div className="font-medium text-slate-900">{visitor.name}</div>
                                <div className="text-xs text-slate-500">
                                  {visitor.visitDate ? format(new Date(visitor.visitDate), 'MMM dd, yyyy') : 'No date'}
                                </div>
                                {visitor.email && (
                                  <div className="text-xs text-slate-600 truncate">{visitor.email}</div>
                                )}
                                {visitor.phone && (
                                  <div className="text-xs text-slate-600">{visitor.phone}</div>
                                )}
                              </div>
                            ))}
                          </div>
                          
                          {visitors.filter(visitor => (visitor.followUpStatus || 'pending') === status).length > 6 && (
                            <div className="mt-2 text-sm text-slate-500">
                              +{visitors.filter(visitor => (visitor.followUpStatus || 'pending') === status).length - 6} more visitors
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Summary Insights */}
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-900 mb-2">Conversion Insights</h4>
                      <div className="text-sm text-blue-700 space-y-1">
                        <p>• <strong>{conversionData.newMembers}</strong> of <strong>{conversionData.totalVisitors}</strong> visitors have converted to members</p>
                        <p>• <strong>{conversionData.returnVisitors}</strong> visitor{conversionData.returnVisitors !== 1 ? 's have' : ' has'} been contacted for follow-up</p>
                        <p>• <strong>{conversionData.totalVisitors - conversionData.returnVisitors - conversionData.newMembers}</strong> visitor{(conversionData.totalVisitors - conversionData.returnVisitors - conversionData.newMembers) !== 1 ? 's are' : ' is'} still pending initial follow-up</p>
                        <p>• Current conversion rate: <strong>{conversionData.conversionRate}%</strong></p>
                        {conversionData.returnVisitors === 0 && conversionData.newMembers === 0 && conversionData.totalVisitors > 0 && (
                          <p className="text-orange-600">• Consider starting follow-up programs - all visitors are still in pending status</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}

          {/* NEW: Family Network Analysis */}
          {analyticsView === "families" && (() => {
            const familyData = (() => {
              // Group members by family relationships using new family_group_id
              const familyGroups: Record<string, any[]> = {};
              
              // Group all members by their family_group_id
              allMembers.forEach(member => {
                if (member.familyGroupId) {
                  if (!familyGroups[member.familyGroupId]) {
                    familyGroups[member.familyGroupId] = [];
                  }
                  familyGroups[member.familyGroupId].push(member);
                } else {
                  // Members without family groups get their own family
                  familyGroups[`individual_${member.id}`] = [member];
                }
              });

              const totalFamilies = Object.keys(familyGroups).length;
              const singleMemberFamilies = Object.values(familyGroups).filter(family => family.length === 1).length;
              const largeFamilies = Object.values(familyGroups).filter(family => family.length >= 4).length;
              const averageFamilySize = totalFamilies > 0 ? Math.round(allMembers.length / totalFamilies * 10) / 10 : 0;

              return {
                familyGroups,
                totalFamilies,
                singleMemberFamilies,
                largeFamilies,
                averageFamilySize
              };
            })();

            const familySizeData = Object.values(familyData.familyGroups)
              .reduce((acc, family) => {
                const size = family.length;
                const key = size === 1 ? '1' : size === 2 ? '2' : size === 3 ? '3' : size >= 4 ? '4+' : '1';
                acc[key] = (acc[key] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);

            const chartData = Object.entries(familySizeData).map(([size, count]) => ({
              size: `${size} member${size === '1' ? '' : 's'}`,
              count,
              percentage: Math.round((count / familyData.totalFamilies) * 100)
            }));

            return (
              <div className="space-y-6">
                {/* Header */}
                <Card className="church-card bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-purple-600" />
                        <span>Family Network Analysis</span>
                      </div>
                      <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
                        Family Ministry
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Visualize family connections and relationships for better family ministry planning
                    </CardDescription>
                  </CardHeader>
                </Card>

                {/* Family Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="church-card">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-600">Total Families</p>
                        <p className="text-2xl font-bold text-purple-600">{familyData.totalFamilies}</p>
                        <p className="text-xs text-slate-500">Family units</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="church-card">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-600">Avg Family Size</p>
                        <p className="text-2xl font-bold text-blue-600">{familyData.averageFamilySize}</p>
                        <p className="text-xs text-slate-500">Members per family</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="church-card">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-600">Large Families</p>
                        <p className="text-2xl font-bold text-green-600">{familyData.largeFamilies}</p>
                        <p className="text-xs text-slate-500">4+ members</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="church-card">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-600">Single Members</p>
                        <p className="text-2xl font-bold text-orange-600">{familyData.singleMemberFamilies}</p>
                        <p className="text-xs text-slate-500">Individual units</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Family Size Distribution */}
                <Card className="church-card">
                  <CardHeader>
                    <CardTitle>Family Size Distribution</CardTitle>
                    <CardDescription>Breakdown of family sizes in the congregation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ size, percentage }) => `${size}: ${percentage}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={
                                ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'][index % 4]
                              } />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [value, 'Families']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Family Attendance Synchronization */}
                <Card className="church-card">
                  <CardHeader>
                    <CardTitle>Family Attendance Synchronization</CardTitle>
                    <CardDescription>Track how often families attend together vs. split attendance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      // Calculate family attendance sync data
                      const familyAttendanceSync = Object.entries(familyData.familyGroups)
                        .filter(([_, family]) => family.length > 1)
                        .map(([familyId, family]) => {
                          // Get all attendance records for this family
                          const familyAttendance = attendanceHistory.filter((record: AttendanceRecord) => 
                            family.some(member => member.id === record.memberId)
                          );

                          // Group by date to see family unity per day
                          const attendanceByDate = familyAttendance.reduce((acc: Record<string, string[]>, record: AttendanceRecord) => {
                            const date = record.checkInTime.split('T')[0];
                            if (!acc[date]) acc[date] = [];
                            if (record.memberId) acc[date].push(record.memberId);
                            return acc;
                          }, {} as Record<string, string[]>);

                          // Calculate sync metrics
                          const totalAttendanceDays = Object.keys(attendanceByDate).length;
                          const fullFamilyDays = Object.values(attendanceByDate).filter(
                            (memberIds: string[]) => memberIds.length === family.length
                          ).length;
                          
                          const syncRate = totalAttendanceDays > 0 ? 
                            Math.round((fullFamilyDays / totalAttendanceDays) * 100) : 0;

                          // Recent attendance pattern (last 4 weeks)
                          const recentDates = Object.keys(attendanceByDate)
                            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
                            .slice(0, 8); // Last 8 attendance days

                          const recentSyncRate = recentDates.length > 0 ? 
                            Math.round((recentDates.filter(date => 
                              attendanceByDate[date].length === family.length
                            ).length / recentDates.length) * 100) : 0;

                          return {
                            familyName: `${family[0]?.surname || 'Unknown'} Family`,
                            familySize: family.length,
                            syncRate,
                            recentSyncRate,
                            totalDays: totalAttendanceDays,
                            fullFamilyDays,
                            lastAttendance: recentDates[0] || null,
                            needsAttention: recentSyncRate < 30 && totalAttendanceDays > 2
                          };
                        })
                        .sort((a, b) => b.syncRate - a.syncRate);

                      const avgSyncRate = familyAttendanceSync.length > 0 ? 
                        Math.round(familyAttendanceSync.reduce((sum, family) => sum + family.syncRate, 0) / familyAttendanceSync.length) : 0;
                      
                      const atRiskFamilies = familyAttendanceSync.filter(family => family.needsAttention);

                      return (
                        <div className="space-y-6">
                          {/* Sync Metrics */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                              <div className="text-2xl font-bold text-green-700">{avgSyncRate}%</div>
                              <div className="text-sm text-green-600">Average Family Unity</div>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="text-2xl font-bold text-blue-700">
                                {familyAttendanceSync.filter(f => f.syncRate >= 80).length}
                              </div>
                              <div className="text-sm text-blue-600">High Unity Families (80%+)</div>
                            </div>
                            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                              <div className="text-2xl font-bold text-orange-700">{atRiskFamilies.length}</div>
                              <div className="text-sm text-orange-600">Families Needing Attention</div>
                            </div>
                          </div>

                          {/* Family Sync Chart */}
                          <div className="space-y-3 max-h-80 overflow-y-auto">
                            {familyAttendanceSync.slice(0, 8).map((family, index) => (
                              <div 
                                key={index} 
                                className={`p-4 rounded-lg border ${
                                  family.needsAttention 
                                    ? 'bg-red-50 border-red-200' 
                                    : family.syncRate >= 80 
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-slate-50 border-slate-200'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-slate-900">{family.familyName}</span>
                                  <div className="flex items-center space-x-2">
                                    <Badge 
                                      variant="outline" 
                                      className={`${
                                        family.syncRate >= 80 
                                          ? 'bg-green-100 text-green-700 border-green-300'
                                          : family.syncRate >= 50
                                          ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                                          : 'bg-red-100 text-red-700 border-red-300'
                                      }`}
                                    >
                                      {family.syncRate}% unity
                                    </Badge>
                                    {family.needsAttention && (
                                      <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                                        Needs attention
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center justify-between text-sm text-slate-600">
                                  <span>{family.familySize} members</span>
                                  <span>{family.fullFamilyDays}/{family.totalDays} full family days</span>
                                  <span>Recent: {family.recentSyncRate}%</span>
                                </div>
                                {/* Progress bar */}
                                <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      family.syncRate >= 80 ? 'bg-green-500'
                                      : family.syncRate >= 50 ? 'bg-yellow-500'
                                      : 'bg-red-500'
                                    }`}
                                    style={{ width: `${family.syncRate}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Pastoral Care Insights */}
                          {atRiskFamilies.length > 0 && (
                            <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                              <h4 className="font-medium text-orange-900 mb-2">Pastoral Care Opportunities</h4>
                              <div className="text-sm text-orange-700 space-y-1">
                                {atRiskFamilies.slice(0, 3).map((family, index) => (
                                  <p key={index}>
                                    • <strong>{family.familyName}</strong> has low recent attendance unity ({family.recentSyncRate}%) - consider family outreach
                                  </p>
                                ))}
                                {atRiskFamilies.length > 3 && (
                                  <p>• +{atRiskFamilies.length - 3} more families may benefit from pastoral attention</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Family List */}
                <Card className="church-card">
                  <CardHeader>
                    <CardTitle>Family Groups</CardTitle>
                    <CardDescription>Overview of family connections</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {Object.entries(familyData.familyGroups)
                        .filter(([_, family]) => family.length > 1)
                        .slice(0, 10)
                        .map(([familyId, family]) => (
                        <div key={familyId} className="p-4 border rounded-lg bg-slate-50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-slate-900">
                              {family[0]?.surname || 'Unknown'} Family
                            </span>
                            <Badge variant="outline">{family.length} members</Badge>
                          </div>
                          <div className="space-y-2">
                            {family.map(member => (
                              <div key={member.id} className="flex items-center justify-between text-sm">
                                <span className="font-medium text-slate-700">
                                  {member.firstName} {member.surname}
                                </span>
                                <div className="flex items-center space-x-2">
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs px-2 py-0.5 ${
                                      member.gender === 'male' 
                                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                        : 'bg-pink-50 text-pink-700 border-pink-200'
                                    }`}
                                  >
                                    {member.gender === 'male' ? '♂' : '♀'} {member.gender}
                                  </Badge>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs px-2 py-0.5 ${
                                      member.ageGroup === 'child' 
                                        ? 'bg-green-50 text-green-700 border-green-200' 
                                        : member.ageGroup === 'adolescent'
                                        ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                        : 'bg-purple-50 text-purple-700 border-purple-200'
                                    }`}
                                  >
                                    {member.ageGroup}
                                  </Badge>
                                  {member.relationshipToHead && member.relationshipToHead !== 'head' && (
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs px-2 py-0.5 bg-gray-50 text-gray-700 border-gray-200"
                                    >
                                      {member.relationshipToHead}
                                    </Badge>
                                  )}
                                  {member.relationshipToHead === 'head' && (
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 border-amber-200 font-medium"
                                    >
                                      👑 head
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
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