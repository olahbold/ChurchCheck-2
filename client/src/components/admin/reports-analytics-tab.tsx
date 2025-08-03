import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ReportData } from "@/lib/types";
import { 
  Calendar, 
  Users, 
  TrendingUp, 
  Download, 
  Play, 
  Clock,
  BarChart3,
  FileText,
  AlertTriangle,
  UserPlus,
  UserX,
  Target,
  Heart,
  Activity,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from '@/lib/queryClient';

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

const REPORT_CONFIGS = [
  {
    id: 'weekly-attendance',
    title: 'Weekly Attendance Summary',
    description: 'Total number present by group (Male, Female, Children, Adolescents)',
    frequency: 'weekly' as const,
    icon: Calendar,
    color: 'bg-[hsl(142,76%,36%)]/10 text-[hsl(142,76%,36%)]'
  },
  {
    id: 'member-attendance-log',
    title: 'Member Attendance Log',
    description: 'Individual attendance history by date',
    frequency: 'on-demand' as const,
    icon: Users,
    color: 'bg-[hsl(258,90%,66%)]/10 text-[hsl(258,90%,66%)]'
  },
  {
    id: 'missed-services',
    title: 'Missed 3+ Services Report',
    description: 'List of members who have missed 3 or more consecutive services',
    frequency: 'weekly' as const,
    icon: AlertTriangle,
    color: 'bg-[hsl(45,93%,47%)]/10 text-[hsl(45,93%,47%)]'
  },
  {
    id: 'new-members',
    title: 'New Members Report',
    description: 'Members who registered within a selected date range',
    frequency: 'monthly' as const,
    icon: UserPlus,
    color: 'bg-[hsl(271,91%,65%)]/10 text-[hsl(271,91%,65%)]'
  },
  {
    id: 'inactive-members',
    title: 'Inactive Members Report',
    description: 'Members with no check-in for the last X weeks/months',
    frequency: 'monthly' as const,
    icon: UserX,
    color: 'bg-[hsl(0,84%,60%)]/10 text-[hsl(0,84%,60%)]'
  },
  {
    id: 'group-attendance-trend',
    title: 'Group-wise Attendance Trend',
    description: 'Compare attendance trends across groups (e.g., Children vs Adults)',
    frequency: 'monthly' as const,
    icon: TrendingUp,
    color: 'bg-[hsl(142,76%,36%)]/10 text-[hsl(142,76%,36%)]'
  },
  {
    id: 'family-checkin-summary',
    title: 'Family Check-in Summary',
    description: 'Show which families checked in with children (parent-child mapping)',
    frequency: 'weekly' as const,
    icon: Heart,
    color: 'bg-pink-500/10 text-pink-600'
  },
  {
    id: 'followup-action-tracker',
    title: 'Follow-up Action Tracker',
    description: 'Shows members who were contacted after being absent',
    frequency: 'weekly' as const,
    icon: Target,
    color: 'bg-indigo-500/10 text-indigo-600'
  }
];

export default function ReportsAnalyticsTab() {
  const [selectedReport, setSelectedReport] = useState<string>('weekly-attendance');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [reportParams, setReportParams] = useState<any>({});
  const [showReportListModal, setShowReportListModal] = useState(false);
  const [filteredReportType, setFilteredReportType] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Fetch report data
  const { data: reportData, isLoading, refetch } = useQuery<ReportData>({
    queryKey: [`/api/reports/${selectedReport}`, dateRange, reportParams],
    enabled: !!selectedReport,
    queryFn: async () => {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('startDate', dateRange.startDate);
      params.append('endDate', dateRange.endDate);
      
      // Add specific report parameters
      if (reportParams.weeks) {
        params.append('weeks', reportParams.weeks.toString());
      }
      if (reportParams.memberId) {
        params.append('memberId', reportParams.memberId);
      }
      
      const url = `/api/reports/${selectedReport}?${params.toString()}`;
      return await apiRequest(url);
    },
  });

  const selectedReportConfig = REPORT_CONFIGS.find(r => r.id === selectedReport);

  const handleRunReport = () => {
    refetch();
  };

  const handleExportReport = async () => {
    if (!reportData) {
      console.error('No report data available');
      return;
    }

    try {
      setIsDownloading(true);
      console.log('Starting export with data:', reportData);
      
      // Add a small delay to show the progress indicator
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const csvContent = convertToCSV(reportData, selectedReportConfig?.title || 'Report');
      console.log('CSV content generated, length:', csvContent.length);
      
      if (!csvContent || csvContent.length < 10) {
        throw new Error('Generated CSV content is empty or too short');
      }
      
      // Create BOM for proper UTF-8 encoding in Excel
      const BOM = '\uFEFF';
      const csvWithBOM = BOM + csvContent;
      
      const blob = new Blob([csvWithBOM], { 
        type: 'text/csv;charset=utf-8' 
      });
      console.log('Blob created, size:', blob.size);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Generate unique filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const filename = `${selectedReportConfig?.title?.replace(/\s+/g, '_').toLowerCase()}_${timestamp}_${Date.now().toString().slice(-6)}.csv`;
      a.download = filename;
      a.style.display = 'none';
      
      console.log('Triggering download for file:', filename);
      
      // Force download
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        try {
          window.URL.revokeObjectURL(url);
          if (document.body.contains(a)) {
            document.body.removeChild(a);
          }
        } catch (cleanupError) {
          console.warn('Cleanup error:', cleanupError);
        }
      }, 1000);
      
      console.log('Download triggered successfully');
      
    } catch (error) {
      console.error('Export error:', error);
      alert(`Failed to download report: ${error.message}. Please try again.`);
    } finally {
      setIsDownloading(false);
    }
  };

  const convertToCSV = (data: ReportData, title: string): string => {
    if (!data) return `${title}\nNo data available`;
    
    // Handle matrix format for Member Attendance Log
    if (typeof data === 'object' && data.type === 'matrix' && title.includes('Member Attendance Log')) {
      const matrixData = data.data;
      const summary = data.summary;
      const attendanceDates = data.attendanceDates;
      
      if (!matrixData || matrixData.length === 0) {
        return `${title}\nNo attendance data available`;
      }

      // Create comprehensive header with summary statistics
      let csvContent = `"${title}"\n`;
      csvContent += `"Date Range: ${summary?.dateRange?.startDate || 'N/A'} to ${summary?.dateRange?.endDate || 'N/A'}"\n`;
      csvContent += `"Total Members: ${summary?.totalMembers || 0}"\n`;
      csvContent += `"Total Dates: ${summary?.totalDates || 0}"\n`;
      csvContent += `"Total Attendance Records: ${summary?.totalAttendanceRecords || 0}"\n\n`;

      // Build headers
      const baseHeaders = ['No.', 'Member Name', 'First Name', 'Surname', 'Gender', 'Age Group', 'Phone', 'Title'];
      const dateHeaders = attendanceDates?.map(date => {
        const formattedDate = new Date(date).toLocaleDateString('en-US', { 
          month: '2-digit', 
          day: '2-digit', 
          year: 'numeric' 
        });
        return formattedDate;
      }) || [];
      const summaryHeaders = ['Total Present', 'Total Absent', 'Attendance %'];
      
      const allHeaders = [...baseHeaders, ...dateHeaders, ...summaryHeaders];
      csvContent += allHeaders.join(',') + '\n';

      // Add data rows
      matrixData.forEach((member: any, index: number) => {
        const baseData = [
          `"${index + 1}"`,
          `"${member.memberName || ''}"`,
          `"${member.firstName || ''}"`,
          `"${member.surname || ''}"`,
          `"${member.gender || ''}"`,
          `"${member.ageGroup || ''}"`,
          `"${member.phone || ''}"`,
          `"${member.title || ''}"`
        ];

        const dateData = attendanceDates?.map(date => {
          const dateKey = `date_${date.replace(/-/g, '_')}`;
          return `"${member[dateKey] || 'NO'}"`;
        }) || [];

        const summaryData = [
          `"${member.totalPresent || 0}"`,
          `"${member.totalAbsent || 0}"`,
          `"${member.attendancePercentage || '0%'}"`
        ];

        const rowData = [...baseData, ...dateData, ...summaryData];
        csvContent += rowData.join(',') + '\n';
      });

      return csvContent;
    }
    
    // Handle array data
    if (Array.isArray(data)) {
      if (data.length === 0) return `${title}\nNo data available`;
      
      const headers = Object.keys(data[0]);
      
      // Add sequential numbering for traditional Member Attendance Log
      if (title.includes('Member Attendance Log')) {
        const csvData = data.map((row, index) => {
          const rowData = [`"${index + 1}"`]; // Sequential number
          headers.forEach(header => {
            if (header !== 'memberId' && header !== 'createdAt' && header !== 'updatedAt') { // Exclude memberId and timestamp fields
              rowData.push(`"${row[header] || ''}"`);
            }
          });
          return rowData.join(',');
        }).join('\n');
        
        const csvHeaders = ['No.', ...headers.filter(h => h !== 'memberId' && h !== 'createdAt' && h !== 'updatedAt')];
        return `${csvHeaders.join(',')}\n${csvData}`;
      }
      
      // Regular CSV generation for other reports - exclude timestamp fields
      const filteredHeaders = headers.filter(h => h !== 'createdAt' && h !== 'updatedAt');
      const csvData = data.map(row => 
        filteredHeaders.map(header => `"${row[header] || ''}"`).join(',')
      ).join('\n');
      
      return `${filteredHeaders.join(',')}\n${csvData}`;
    }
    
    // Handle object data - convert to JSON string
    return `${title}\n${JSON.stringify(data, null, 2)}`;
  };

  const getFrequencyBadge = (frequency: string) => {
    const colors = {
      weekly: 'bg-[hsl(142,76%,36%)]/10 text-[hsl(142,76%,36%)]',
      monthly: 'bg-[hsl(45,93%,47%)]/10 text-[hsl(45,93%,47%)]',
      'on-demand': 'bg-[hsl(258,90%,66%)]/10 text-[hsl(258,90%,66%)]'
    };
    
    return (
      <Badge className={colors[frequency as keyof typeof colors] || colors['on-demand']}>
        {frequency.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  const handleSummaryCardClick = (type: string) => {
    setFilteredReportType(type);
    setShowReportListModal(true);
  };

  const getFilteredReports = () => {
    if (!filteredReportType) return REPORT_CONFIGS;
    
    switch (filteredReportType) {
      case 'total':
        return REPORT_CONFIGS;
      case 'weekly':
        return REPORT_CONFIGS.filter(r => r.frequency === 'weekly');
      case 'monthly':
        return REPORT_CONFIGS.filter(r => r.frequency === 'monthly');
      case 'on-demand':
        return REPORT_CONFIGS.filter(r => r.frequency === 'on-demand');
      default:
        return REPORT_CONFIGS;
    }
  };

  const getSummaryTitle = () => {
    switch (filteredReportType) {
      case 'total':
        return 'All Reports';
      case 'weekly':
        return 'Weekly Reports';
      case 'monthly':
        return 'Monthly Reports';
      case 'on-demand':
        return 'On-Demand Reports';
      default:
        return 'Reports';
    }
  };

  const renderReportData = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Activity className="h-8 w-8 animate-spin text-[hsl(258,90%,66%)]" />
          <span className="ml-2 text-slate-600">Generating report...</span>
        </div>
      );
    }

    if (!reportData || (Array.isArray(reportData) && reportData.length === 0)) {
      return (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-500">No data available for this report</p>
          <p className="text-sm text-slate-400">Try adjusting the date range or parameters</p>
        </div>
      );
    }

    // Handle matrix format for Member Attendance Log
    if (typeof reportData === 'object' && reportData.type === 'matrix') {
      const matrixData = reportData.data;
      const summary = reportData.summary;
      const attendanceDates = reportData.attendanceDates;

      return (
        <div className="space-y-6">
          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{summary?.totalMembers || 0}</div>
                <div className="text-sm text-slate-600">Total Members</div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summary?.totalDates || 0}</div>
                <div className="text-sm text-slate-600">Attendance Dates</div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{summary?.totalAttendanceRecords || 0}</div>
                <div className="text-sm text-slate-600">Total Records</div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <div className="text-sm font-medium text-slate-700">Date Range</div>
                <div className="text-xs text-slate-500">
                  {summary?.dateRange?.startDate || 'N/A'} to {summary?.dateRange?.endDate || 'N/A'}
                </div>
              </div>
            </Card>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-200 text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-slate-200 p-2 text-left font-medium text-slate-900 sticky left-0 bg-slate-50">No.</th>
                  <th className="border border-slate-200 p-2 text-left font-medium text-slate-900 sticky left-8 bg-slate-50">Member Name</th>
                  <th className="border border-slate-200 p-2 text-left font-medium text-slate-900">Gender</th>
                  <th className="border border-slate-200 p-2 text-left font-medium text-slate-900">Age Group</th>
                  <th className="border border-slate-200 p-2 text-left font-medium text-slate-900">Phone</th>
                  {attendanceDates?.map((date, index) => (
                    <th key={index} className="border border-slate-200 p-2 text-center font-medium text-slate-900 min-w-[80px]">
                      {new Date(date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}
                    </th>
                  ))}
                  <th className="border border-slate-200 p-2 text-center font-medium text-slate-900">Present</th>
                  <th className="border border-slate-200 p-2 text-center font-medium text-slate-900">Absent</th>
                  <th className="border border-slate-200 p-2 text-center font-medium text-slate-900">%</th>
                </tr>
              </thead>
              <tbody>
                {matrixData?.slice(0, 100).map((member: any, index: number) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="border border-slate-200 p-2 text-slate-700 sticky left-0 bg-white">{index + 1}</td>
                    <td className="border border-slate-200 p-2 text-slate-700 sticky left-8 bg-white font-medium">{member.memberName}</td>
                    <td className="border border-slate-200 p-2 text-slate-700">{member.gender}</td>
                    <td className="border border-slate-200 p-2 text-slate-700">{member.ageGroup}</td>
                    <td className="border border-slate-200 p-2 text-slate-700">{member.phone}</td>
                    {attendanceDates?.map((date, dateIndex) => {
                      const dateKey = `date_${date.replace(/-/g, '_')}`;
                      const status = member[dateKey];
                      const isPresent = status === 'YES';
                      return (
                        <td key={dateIndex} className="border border-slate-200 p-2 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            isPresent 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {status || 'NO'}
                          </span>
                        </td>
                      );
                    })}
                    <td className="border border-slate-200 p-2 text-center text-green-600 font-medium">{member.totalPresent}</td>
                    <td className="border border-slate-200 p-2 text-center text-red-600 font-medium">{member.totalAbsent}</td>
                    <td className="border border-slate-200 p-2 text-center text-blue-600 font-medium">{member.attendancePercentage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {matrixData && matrixData.length > 100 && (
            <p className="text-sm text-slate-500 text-center">
              Showing first 100 rows of {matrixData.length} total records
            </p>
          )}
        </div>
      );
    }

    // Render data based on report type
    if (Array.isArray(reportData)) {
      return (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-50">
                  {Object.keys(reportData[0]).map((key) => (
                    <th key={key} className="border border-slate-200 p-3 text-left font-medium text-slate-900">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData.slice(0, 100).map((row, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    {Object.values(row).map((value, i) => (
                      <td key={i} className="border border-slate-200 p-3 text-slate-700">
                        {typeof value === 'string' && value.includes('T') && value.includes('Z') 
                          ? new Date(value).toLocaleDateString()
                          : String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {reportData.length > 100 && (
            <p className="text-sm text-slate-500 text-center">
              Showing first 100 rows of {reportData.length} total records
            </p>
          )}
        </div>
      );
    }

    return <pre className="bg-slate-50 p-4 rounded-lg text-sm overflow-x-auto">{JSON.stringify(reportData, null, 2)}</pre>;
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <Card className="bg-gradient-to-r from-slate-50 to-emerald-50 border border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-900 mb-2">📊 Reports & Analytics Hub</CardTitle>
          <p className="text-slate-700 mb-3">
            Generate comprehensive attendance reports and analyze church engagement patterns with powerful analytics tools.
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p className="text-sm text-emerald-800">
              📈 <strong>Data Intelligence:</strong> Access 8+ specialized reports including weekly attendance summaries, member attendance logs, missed services tracking, and demographic analytics. Generate custom reports with date ranges, export data to CSV for further analysis, and gain insights into member engagement patterns for pastoral care and church growth planning.
            </p>
          </div>
        </CardHeader>
      </Card>
      
      {/* Analytics Overview */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
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
          <Card 
            className="stat-card-hover cursor-pointer overflow-hidden relative h-[140px]" 
            onClick={() => handleSummaryCardClick('total')}
          >
            <CardContent className="p-6 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Reports</p>
                  <motion.p 
                    className="text-3xl font-bold text-slate-900"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                  >
                    <AnimatedCounter target={REPORT_CONFIGS.length} />
                  </motion.p>
                </div>
                <motion.div 
                  className="w-12 h-12 bg-[hsl(258,90%,66%)]/10 rounded-lg flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                >
                  <BarChart3 className="text-[hsl(258,90%,66%)] text-xl pulse-icon" />
                </motion.div>
              </div>
              <motion.p 
                className="text-sm text-[hsl(258,90%,66%)] mt-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
              >
                <BarChart3 className="inline h-3 w-3 mr-1" />
                Available analytics
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
          <Card 
            className="stat-card-hover cursor-pointer overflow-hidden relative h-[140px]" 
            onClick={() => handleSummaryCardClick('weekly')}
          >
            <CardContent className="p-6 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Weekly Reports</p>
                  <motion.p 
                    className="text-3xl font-bold text-slate-900"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.6 }}
                  >
                    <AnimatedCounter target={REPORT_CONFIGS.filter(r => r.frequency === 'weekly').length} />
                  </motion.p>
                </div>
                <motion.div 
                  className="w-12 h-12 bg-[hsl(142,76%,36%)]/10 rounded-lg flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
                >
                  <Calendar className="text-[hsl(142,76%,36%)] text-xl pulse-icon" />
                </motion.div>
              </div>
              <motion.p 
                className="text-sm text-[hsl(142,76%,36%)] mt-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 }}
              >
                <Calendar className="inline h-3 w-3 mr-1" />
                Weekly frequency
              </motion.p>
              <motion.div
                className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-[hsl(142,76%,36%)] to-[hsl(142,76%,46%)]"
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
          <Card 
            className="stat-card-hover cursor-pointer overflow-hidden relative h-[140px]" 
            onClick={() => handleSummaryCardClick('monthly')}
          >
            <CardContent className="p-6 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Monthly Reports</p>
                  <motion.p 
                    className="text-3xl font-bold text-slate-900"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.7, duration: 0.6 }}
                  >
                    <AnimatedCounter target={REPORT_CONFIGS.filter(r => r.frequency === 'monthly').length} />
                  </motion.p>
                </div>
                <motion.div 
                  className="w-12 h-12 bg-[hsl(45,93%,47%)]/10 rounded-lg flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
                >
                  <Clock className="text-[hsl(45,93%,47%)] text-xl pulse-icon" />
                </motion.div>
              </div>
              <motion.p 
                className="text-sm text-[hsl(45,93%,47%)] mt-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.0 }}
              >
                <Clock className="inline h-3 w-3 mr-1" />
                Monthly schedule
              </motion.p>
              <motion.div
                className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-[hsl(45,93%,47%)] to-[hsl(45,93%,57%)]"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 1.2, duration: 1.2 }}
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
          <Card 
            className="stat-card-hover cursor-pointer overflow-hidden relative h-[140px]" 
            onClick={() => handleSummaryCardClick('on-demand')}
          >
            <CardContent className="p-6 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">On-Demand</p>
                  <motion.p 
                    className="text-3xl font-bold text-slate-900"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                  >
                    <AnimatedCounter target={REPORT_CONFIGS.filter(r => r.frequency === 'on-demand').length} />
                  </motion.p>
                </div>
                <motion.div 
                  className="w-12 h-12 bg-[hsl(271,91%,65%)]/10 rounded-lg flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.6, type: "spring", stiffness: 300 }}
                >
                  <Play className="text-[hsl(271,91%,65%)] text-xl pulse-icon" />
                </motion.div>
              </div>
              <motion.p 
                className="text-sm text-[hsl(271,91%,65%)] mt-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.1 }}
              >
                <Play className="inline h-3 w-3 mr-1" />
                Generate anytime
              </motion.p>
              <motion.div
                className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-[hsl(271,91%,65%)] to-[hsl(271,91%,75%)]"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 1.3, duration: 1.2 }}
              />
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <Tabs defaultValue="reports" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 h-12">
          <TabsTrigger value="reports">Report Generator</TabsTrigger>
          <TabsTrigger value="library">Report Library</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Report Selection */}
            <Card className="church-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900">Select Report</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {REPORT_CONFIGS.map((report) => {
                    const Icon = report.icon;
                    return (
                      <div
                        key={report.id}
                        onClick={() => setSelectedReport(report.id)}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedReport === report.id 
                            ? 'border-[hsl(258,90%,66%)] bg-[hsl(258,90%,66%)]/5' 
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${report.color}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-slate-900">{report.title}</h4>
                              {getFrequencyBadge(report.frequency)}
                            </div>
                            <p className="text-sm text-slate-600">{report.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Report Parameters */}
            <Card className="church-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900">Parameters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Start Date</label>
                    <Input
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => setDateRange((prev: any) => ({ ...prev, startDate: e.target.value }))}
                      className="church-form-input"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">End Date</label>
                    <Input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange((prev: any) => ({ ...prev, endDate: e.target.value }))}
                      className="church-form-input"
                    />
                  </div>

                  {selectedReport === 'missed-services' && (
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Weeks Absent</label>
                      <Select 
                        value={reportParams.weeks?.toString() || '3'} 
                        onValueChange={(value) => setReportParams((prev: any) => ({ ...prev, weeks: parseInt(value) }))}
                      >
                        <SelectTrigger className="church-form-input">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 weeks</SelectItem>
                          <SelectItem value="3">3 weeks</SelectItem>
                          <SelectItem value="4">4 weeks</SelectItem>
                          <SelectItem value="6">6 weeks</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {selectedReport === 'inactive-members' && (
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Inactive Period</label>
                      <Select 
                        value={reportParams.weeks?.toString() || '4'} 
                        onValueChange={(value) => setReportParams((prev: any) => ({ ...prev, weeks: parseInt(value) }))}
                      >
                        <SelectTrigger className="church-form-input">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="4">4 weeks</SelectItem>
                          <SelectItem value="8">8 weeks</SelectItem>
                          <SelectItem value="12">12 weeks</SelectItem>
                          <SelectItem value="24">6 months</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="pt-4 space-y-3">
                    <Button 
                      onClick={handleRunReport}
                      disabled={isLoading}
                      className="church-button-primary w-full"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      {isLoading ? 'Generating...' : 'Generate Report'}
                    </Button>

                    {reportData && (
                      <Button 
                        onClick={handleExportReport}
                        variant="outline"
                        disabled={isDownloading}
                        className="w-full"
                      >
                        {isDownloading ? (
                          <>
                            <Activity className="mr-2 h-4 w-4 animate-spin" />
                            Exporting...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Export CSV
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Report Preview */}
            <Card className="church-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900">
                  {selectedReportConfig?.title || 'Report Preview'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedReportConfig && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedReportConfig.color}`}>
                        <selectedReportConfig.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{selectedReportConfig.title}</p>
                        <p className="text-sm text-slate-600">{selectedReportConfig.description}</p>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-slate-200">
                      <p className="text-sm font-medium text-slate-700 mb-2">Frequency</p>
                      {getFrequencyBadge(selectedReportConfig.frequency)}
                    </div>

                    <div className="pt-4 border-t border-slate-200">
                      <p className="text-sm font-medium text-slate-700 mb-2">Date Range</p>
                      <p className="text-sm text-slate-600">
                        {new Date(dateRange.startDate).toLocaleDateString()} - {new Date(dateRange.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Report Status */}
          {reportData && (
            <Card className="church-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900">Report Generated</CardTitle>
              </CardHeader>
              <CardContent className="text-center py-8">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <Download className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      {selectedReportConfig?.title} Ready
                    </h3>
                    <p className="text-slate-600 mb-4">
                      Your report has been generated successfully with {
                        Array.isArray(reportData) 
                          ? reportData.length 
                          : (reportData?.type === 'matrix' && reportData?.data) 
                            ? reportData.data.length 
                            : 1
                      } record(s).
                    </p>
                    <Button 
                      onClick={handleExportReport}
                      disabled={isDownloading}
                      className="church-button-primary"
                    >
                      {isDownloading ? (
                        <>
                          <Activity className="mr-2 h-4 w-4 animate-spin" />
                          Preparing Download...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Download CSV Report
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="library" className="space-y-6">
          <Card className="church-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900">Available Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {REPORT_CONFIGS.map((report) => {
                  const Icon = report.icon;
                  return (
                    <Card key={report.id} className="church-card hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${report.color}`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-slate-900">{report.title}</h4>
                              {getFrequencyBadge(report.frequency)}
                            </div>
                            <p className="text-sm text-slate-600 mb-4">{report.description}</p>
                            <Button 
                              size="sm"
                              onClick={() => {
                                setSelectedReport(report.id);
                                // Switch to reports tab
                                const tabsTrigger = document.querySelector('[value="reports"]') as HTMLElement;
                                tabsTrigger?.click();
                              }}
                              className="church-button-primary"
                            >
                              <Play className="mr-2 h-3 w-3" />
                              Run Report
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Report List Modal */}
      <Dialog open={showReportListModal} onOpenChange={setShowReportListModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{getSummaryTitle()} ({getFilteredReports().length})</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowReportListModal(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
            <DialogDescription>
              Click any report below to run it directly in the Report Generator tab.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {getFilteredReports().map((report) => {
              const Icon = report.icon;
              return (
                <Card key={report.id} className="church-card hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${report.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-slate-900">{report.title}</h4>
                          {getFrequencyBadge(report.frequency)}
                        </div>
                        <p className="text-sm text-slate-600 mb-3">{report.description}</p>
                        <Button 
                          size="sm"
                          onClick={() => {
                            setSelectedReport(report.id);
                            setShowReportListModal(false);
                            // Switch to reports tab
                            const tabsTrigger = document.querySelector('[value="reports"]') as HTMLElement;
                            tabsTrigger?.click();
                          }}
                          className="church-button-primary"
                        >
                          <Play className="mr-1 h-3 w-3" />
                          Run Report
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowReportListModal(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}