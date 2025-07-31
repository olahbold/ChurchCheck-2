import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
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
  BarChart3
} from "lucide-react";

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
          description: `${reportType} report generation started`,
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {revenueMetrics ? formatCurrency(revenueMetrics.monthlyRecurringRevenue) : '$0'}
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                {revenueMetrics && revenueMetrics.revenueGrowthRate > 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                    <span className="text-green-500">
                      +{formatPercentage(revenueMetrics.revenueGrowthRate)} from last month
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                    <span className="text-red-500">
                      {revenueMetrics ? formatPercentage(revenueMetrics.revenueGrowthRate) : '0%'} from last month
                    </span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Annual Recurring Revenue</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {revenueMetrics ? formatCurrency(revenueMetrics.annualRecurringRevenue) : '$0'}
              </div>
              <p className="text-xs text-muted-foreground">
                Projected annual revenue
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {subscriptionMetrics ? subscriptionMetrics.activeSubscriptions : 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {subscriptionMetrics ? subscriptionMetrics.trialUsers : 0} trial users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {revenueMetrics ? formatPercentage(revenueMetrics.churnRate) : '0%'}
              </div>
              <p className="text-xs text-muted-foreground">
                Monthly customer churn
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Breakdown */}
        {subscriptionMetrics && (
          <Card>
            <CardHeader>
              <CardTitle>Subscription Tier Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {subscriptionMetrics.subscriptionsByTier.starter}
                  </div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Starter Plans</p>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {subscriptionMetrics.subscriptionsByTier.growth}
                  </div>
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">Growth Plans</p>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {subscriptionMetrics.subscriptionsByTier.enterprise}
                  </div>
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Enterprise Plans</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Report Generation */}
        <Card>
          <CardHeader>
            <CardTitle>Generate Business Reports</CardTitle>
            <p className="text-sm text-muted-foreground">
              Generate comprehensive reports for business analysis
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                onClick={() => generateReport('revenue')}
                disabled={generatingReport === 'revenue'}
                className="h-20 flex flex-col items-center justify-center space-y-2"
                variant="outline"
              >
                {generatingReport === 'revenue' ? (
                  <Clock className="h-5 w-5 animate-spin" />
                ) : (
                  <DollarSign className="h-5 w-5" />
                )}
                <span className="text-sm">Revenue Report</span>
              </Button>

              <Button
                onClick={() => generateReport('subscription')}
                disabled={generatingReport === 'subscription'}
                className="h-20 flex flex-col items-center justify-center space-y-2"
                variant="outline"
              >
                {generatingReport === 'subscription' ? (
                  <Clock className="h-5 w-5 animate-spin" />
                ) : (
                  <CreditCard className="h-5 w-5" />
                )}
                <span className="text-sm">Subscription Report</span>
              </Button>

              <Button
                onClick={() => generateReport('churn')}
                disabled={generatingReport === 'churn'}
                className="h-20 flex flex-col items-center justify-center space-y-2"
                variant="outline"
              >
                {generatingReport === 'churn' ? (
                  <Clock className="h-5 w-5 animate-spin" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
                <span className="text-sm">Churn Analysis</span>
              </Button>

              <Button
                onClick={() => generateReport('usage')}
                disabled={generatingReport === 'usage'}
                className="h-20 flex flex-col items-center justify-center space-y-2"
                variant="outline"
              >
                {generatingReport === 'usage' ? (
                  <Clock className="h-5 w-5 animate-spin" />
                ) : (
                  <BarChart3 className="h-5 w-5" />
                )}
                <span className="text-sm">Usage Report</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Reports */}
        {reports.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Reports</CardTitle>
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