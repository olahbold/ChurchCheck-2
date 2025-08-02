import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Building2, 
  Calendar,
  FileText,
  Download,
  Mail,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  RefreshCw
} from "lucide-react";

// Enhanced animated counter with spring effect
function AnimatedCounter({ target, duration = 2500, prefix = "", suffix = "" }: { target: number; duration?: number; prefix?: string; suffix?: string }) {
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
      {prefix}{count}{suffix}
    </motion.span>
  );
}

interface RevenueMetrics {
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  totalRevenue: number;
  averageRevenuePerChurch: number;
  revenueGrowthRate: number;
  churnRate: number;
}

interface SubscriptionMetrics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  trialUsers: number;
  canceledSubscriptions: number;
  subscriptionsByTier: {
    starter: number;
    growth: number;
    enterprise: number;
  };
}

interface ChurnAnalysis {
  id: string;
  churchName: string;
  subscriptionTier: string;
  cancelDate: string;
  reason: string;
  totalRevenueLost: number;
  subscriptionDuration: number;
}

interface ReportData {
  id: string;
  type: 'revenue' | 'subscription' | 'churn' | 'usage';
  title: string;
  generatedAt: string;
  status: 'ready' | 'generating' | 'failed';
  downloadUrl?: string;
}

interface SuperAdminBusinessOpsProps {
  onBack: () => void;
}

export function SuperAdminBusinessOps({ onBack }: SuperAdminBusinessOpsProps) {
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics | null>(null);
  const [subscriptionMetrics, setSubscriptionMetrics] = useState<SubscriptionMetrics | null>(null);
  const [churnAnalysis, setChurnAnalysis] = useState<ChurnAnalysis[]>([]);
  const [reports, setReports] = useState<ReportData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const { toast } = useToast();

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('super_admin_token')}`,
    'Content-Type': 'application/json',
  });

  const loadBusinessData = async () => {
    try {
      setIsLoading(true);
      
      // Load revenue metrics
      const revenueResponse = await fetch('/api/super-admin/revenue-metrics', {
        headers: getAuthHeaders(),
      });
      
      if (revenueResponse.ok) {
        const revenueData = await revenueResponse.json();
        setRevenueMetrics(revenueData);
      }

      // Load subscription metrics
      const subscriptionResponse = await fetch('/api/super-admin/subscription-metrics', {
        headers: getAuthHeaders(),
      });
      
      if (subscriptionResponse.ok) {
        const subscriptionData = await subscriptionResponse.json();
        setSubscriptionMetrics(subscriptionData);
      }

      // Load churn analysis
      const churnResponse = await fetch('/api/super-admin/churn-analysis', {
        headers: getAuthHeaders(),
      });
      
      if (churnResponse.ok) {
        const churnData = await churnResponse.json();
        setChurnAnalysis(churnData);
      }

      // Load reports
      const reportsResponse = await fetch('/api/super-admin/reports', {
        headers: getAuthHeaders(),
      });
      
      if (reportsResponse.ok) {
        const reportsData = await reportsResponse.json();
        setReports(reportsData);
      }

    } catch (error) {
      console.error('Failed to load business data:', error);
      toast({
        title: "Error",
        description: "Failed to load business operations data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateReport = async (reportType: string) => {
    try {
      setGeneratingReport(reportType);
      
      const response = await fetch('/api/super-admin/generate-report', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reportType }),
      });

      if (response.ok) {
        const reportData = await response.json();
        toast({
          title: "Success", 
          description: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report generation started. It will be ready in a few seconds.`,
        });
        
        // Reload reports to show the new generating report
        await loadBusinessData();
      } else {
        throw new Error('Failed to generate report');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setGeneratingReport(null);
    }
  };

  const downloadReport = async (reportId: string) => {
    try {
      const response = await fetch(`/api/super-admin/reports/${reportId}/download`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `report-${reportId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Success",
          description: "Report downloaded successfully",
        });
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download report",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  useEffect(() => {
    loadBusinessData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p>Loading business operations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={onBack}>
                ← Back to Dashboard
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Business Operations
                </h1>
                <p className="text-sm text-gray-500">Revenue, Subscriptions & Analytics</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Revenue Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className="h-[140px] stat-card-hover bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800 hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Monthly Recurring Revenue</CardTitle>
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400 pulse-icon" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-900 dark:text-green-100 mb-2">
                  <AnimatedCounter 
                    target={revenueMetrics?.monthlyRecurringRevenue || 0} 
                    prefix="$" 
                  />
                </div>
                <div className="flex items-center text-xs">
                  {revenueMetrics && revenueMetrics.revenueGrowthRate > 0 ? (
                    <>
                      <TrendingUp className="h-3 w-3 mr-1 text-green-500 pulse-icon" />
                      <span className="text-green-600 dark:text-green-400">
                        +{formatPercentage(revenueMetrics.revenueGrowthRate)} from last month
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                      <span className="text-red-600 dark:text-red-400">
                        {revenueMetrics ? formatPercentage(revenueMetrics.revenueGrowthRate) : '0%'} from last month
                      </span>
                    </>
                  )}
                </div>
                <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-1.5 mt-3">
                  <motion.div
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-1.5 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: "90%" }}
                    transition={{ duration: 2, delay: 0.8, ease: "easeOut" }}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="h-[140px] stat-card-hover bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Annual Recurring Revenue</CardTitle>
                <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400 pulse-icon" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-2">
                  <AnimatedCounter 
                    target={revenueMetrics?.annualRecurringRevenue || 0} 
                    prefix="$" 
                  />
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Projected annual revenue
                </p>
                <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-1.5 mt-3">
                  <motion.div
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: "85%" }}
                    transition={{ duration: 2, delay: 0.8, ease: "easeOut" }}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card className="h-[140px] stat-card-hover bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Active Subscriptions</CardTitle>
                <CreditCard className="h-5 w-5 text-purple-600 dark:text-purple-400 pulse-icon" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-900 dark:text-purple-100 mb-2">
                  <AnimatedCounter target={subscriptionMetrics?.activeSubscriptions || 0} />
                </div>
                <p className="text-xs text-purple-600 dark:text-purple-400">
                  <AnimatedCounter target={subscriptionMetrics?.trialUsers || 0} /> trial users
                </p>
                <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-1.5 mt-3">
                  <motion.div
                    className="bg-gradient-to-r from-purple-500 to-violet-500 h-1.5 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: "75%" }}
                    transition={{ duration: 2, delay: 0.8, ease: "easeOut" }}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="h-[140px] stat-card-hover bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 border-red-200 dark:border-red-800 hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">Churn Rate</CardTitle>
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 pulse-icon" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-900 dark:text-red-100 mb-2">
                  <AnimatedCounter 
                    target={revenueMetrics?.churnRate || 0} 
                    suffix="%" 
                  />
                </div>
                <p className="text-xs text-red-600 dark:text-red-400">
                  Monthly customer churn
                </p>
                <div className="w-full bg-red-200 dark:bg-red-800 rounded-full h-1.5 mt-3">
                  <motion.div
                    className="bg-gradient-to-r from-red-500 to-orange-500 h-1.5 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((revenueMetrics?.churnRate || 0) * 10, 100)}%` }}
                    transition={{ duration: 2, delay: 0.8, ease: "easeOut" }}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Subscription Breakdown */}
        {subscriptionMetrics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Subscription Tier Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                    className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg border border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                      <AnimatedCounter target={subscriptionMetrics.subscriptionsByTier.starter} />
                    </div>
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Starter Plans</p>
                    <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-1.5 mt-3">
                      <motion.div
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${(subscriptionMetrics.subscriptionsByTier.starter / Math.max(subscriptionMetrics.totalSubscriptions, 1)) * 100}%` }}
                        transition={{ duration: 2, delay: 1, ease: "easeOut" }}
                      />
                    </div>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.7 }}
                    className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-lg border border-green-200 dark:border-green-800 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                      <AnimatedCounter target={subscriptionMetrics.subscriptionsByTier.growth} />
                    </div>
                    <p className="text-sm text-green-600 dark:text-green-400 font-medium">Growth Plans</p>
                    <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-1.5 mt-3">
                      <motion.div
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-1.5 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${(subscriptionMetrics.subscriptionsByTier.growth / Math.max(subscriptionMetrics.totalSubscriptions, 1)) * 100}%` }}
                        transition={{ duration: 2, delay: 1, ease: "easeOut" }}
                      />
                    </div>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.8 }}
                    className="text-center p-6 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950 rounded-lg border border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                      <AnimatedCounter target={subscriptionMetrics.subscriptionsByTier.enterprise} />
                    </div>
                    <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Enterprise Plans</p>
                    <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-1.5 mt-3">
                      <motion.div
                        className="bg-gradient-to-r from-purple-500 to-violet-500 h-1.5 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${(subscriptionMetrics.subscriptionsByTier.enterprise / Math.max(subscriptionMetrics.totalSubscriptions, 1)) * 100}%` }}
                        transition={{ duration: 2, delay: 1, ease: "easeOut" }}
                      />
                    </div>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Report Generation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Generate Business Reports</CardTitle>
              <p className="text-sm text-muted-foreground">
                Generate comprehensive reports for business analysis
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 1.0 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={() => generateReport('revenue')}
                    disabled={generatingReport === 'revenue'}
                    className="w-full h-[100px] flex flex-col items-center justify-center space-y-3 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800 hover:shadow-lg transition-all duration-300 text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200"
                    variant="outline"
                  >
                    {generatingReport === 'revenue' ? (
                      <Clock className="h-6 w-6 animate-spin text-green-600 dark:text-green-400" />
                    ) : (
                      <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400 pulse-icon" />
                    )}
                    <span className="text-sm font-medium">Revenue Report</span>
                  </Button>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 1.1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={() => generateReport('subscription')}
                    disabled={generatingReport === 'subscription'}
                    className="w-full h-[100px] flex flex-col items-center justify-center space-y-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-300 text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200"
                    variant="outline"
                  >
                    {generatingReport === 'subscription' ? (
                      <Clock className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
                    ) : (
                      <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400 pulse-icon" />
                    )}
                    <span className="text-sm font-medium">Subscription Report</span>
                  </Button>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 1.2 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={() => generateReport('churn')}
                    disabled={generatingReport === 'churn'}
                    className="w-full h-[100px] flex flex-col items-center justify-center space-y-3 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 border-red-200 dark:border-red-800 hover:shadow-lg transition-all duration-300 text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200"
                    variant="outline"
                  >
                    {generatingReport === 'churn' ? (
                      <Clock className="h-6 w-6 animate-spin text-red-600 dark:text-red-400" />
                    ) : (
                      <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 pulse-icon" />
                    )}
                    <span className="text-sm font-medium">Churn Analysis</span>
                  </Button>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 1.3 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={() => generateReport('usage')}
                    disabled={generatingReport === 'usage'}
                    className="w-full h-[100px] flex flex-col items-center justify-center space-y-3 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-300 text-purple-700 dark:text-purple-300 hover:text-purple-800 dark:hover:text-purple-200"
                    variant="outline"
                  >
                    {generatingReport === 'usage' ? (
                      <Clock className="h-6 w-6 animate-spin text-purple-600 dark:text-purple-400" />
                    ) : (
                      <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400 pulse-icon" />
                    )}
                    <span className="text-sm font-medium">Usage Report</span>
                  </Button>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Reports */}
        {reports.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Reports</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={loadBusinessData}
                disabled={isLoading}
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">Refresh</span>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{report.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Generated {new Date(report.generatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge 
                        className={
                          report.status === 'ready' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : report.status === 'generating'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }
                      >
                        {report.status === 'ready' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {report.status === 'generating' && <Clock className="h-3 w-3 mr-1" />}
                        {report.status === 'failed' && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {report.status}
                      </Badge>
                      {report.status === 'ready' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadReport(report.id)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Churn Analysis */}
        {churnAnalysis.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Churn Analysis</CardTitle>
              <p className="text-sm text-muted-foreground">
                Churches that recently canceled their subscriptions
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {churnAnalysis.slice(0, 5).map((churn) => (
                  <div key={churn.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{churn.churchName}</span>
                        <Badge variant="outline">{churn.subscriptionTier}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Canceled on {new Date(churn.cancelDate).toLocaleDateString()} • {churn.reason}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-red-600 dark:text-red-400">
                        -{formatCurrency(churn.totalRevenueLost)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {churn.subscriptionDuration} months
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}