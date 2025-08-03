import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Clock, Shield, Users, Info, Activity, Timer, Play } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";

interface KioskSettings {
  kioskModeEnabled: boolean;
  kioskSessionTimeout: number;
  activeSession?: {
    timeRemaining: number;
    isActive: boolean;
    availableEvents: Array<{
      id: string;
      name: string;
      eventType: string;
      location: string;
    }>;
  } | null;
}

export function KioskSettingsTab() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<KioskSettings>({
    kioskModeEnabled: false,
    kioskSessionTimeout: 60,
    activeSession: null,
  });

  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const { data: church, isLoading } = useQuery({
    queryKey: ["/api/churches/current"],
  });

  const { data: activeEvents } = useQuery({
    queryKey: ["/api/events/active"],
  });

  const { data: kioskSettings, isLoading: isLoadingKiosk } = useQuery<KioskSettings>({
    queryKey: ["/api/churches/kiosk-settings"],
    refetchOnWindowFocus: true,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data: KioskSettings) =>
      apiRequest("/api/churches/kiosk-settings", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Kiosk settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/churches/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/churches/kiosk-settings"] });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update kiosk settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (kioskSettings) {
      console.log('Kiosk Settings received:', kioskSettings);
      setSettings({
        kioskModeEnabled: kioskSettings.kioskModeEnabled || false,
        kioskSessionTimeout: kioskSettings.kioskSessionTimeout || 60,
        activeSession: kioskSettings.activeSession || null,
      });
      
      // Set initial time remaining if session is active
      if (kioskSettings.activeSession?.isActive) {
        console.log('Active session found, time remaining:', kioskSettings.activeSession.timeRemaining);
        setTimeRemaining(kioskSettings.activeSession.timeRemaining);
      } else {
        setTimeRemaining(null);
      }
    } else if (church) {
      setSettings({
        kioskModeEnabled: (church as any)?.kioskModeEnabled || false,
        kioskSessionTimeout: (church as any)?.kioskSessionTimeout || 60,
        activeSession: null,
      });
    }
  }, [kioskSettings, church]);

  // Live countdown timer
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          // Session expired, refetch data
          queryClient.invalidateQueries({ queryKey: ["/api/churches/kiosk-settings"] });
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSave = () => {
    updateSettingsMutation.mutate(settings);
  };

  const timeoutOptions = [
    { value: 15, label: "15 minutes" },
    { value: 30, label: "30 minutes" },
    { value: 60, label: "1 hour" },
    { value: 120, label: "2 hours" },
    { value: 240, label: "4 hours" },
    { value: 480, label: "8 hours" },
  ];

  if (isLoading || isLoadingKiosk) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-6"
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
          hidden: { opacity: 0, y: -20 },
          visible: { opacity: 1, y: 0 }
        }}
      >
        {/* Welcome Header */}
        <Card className="bg-gradient-to-r from-slate-50 to-orange-50 border border-slate-200">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-slate-900 mb-2">📱 Kiosk Mode Settings</CardTitle>
            <p className="text-slate-700 mb-3">
              Configure self-service check-in stations for members to register their attendance independently.
            </p>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-800">
                ⏱️ <strong>Self Check-in System:</strong> Enable kiosk mode to allow members to search for their names and check themselves into active events without requiring admin assistance. Set session timeouts to automatically secure the system after periods of inactivity. Perfect for busy service times and reducing volunteer workload.
              </p>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

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
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Member Self Check-in
          </CardTitle>
          <CardDescription>
            Allow members to check themselves in without admin supervision
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="kiosk-mode" className="font-medium">
                Enable Kiosk Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                Members can search for their names and check themselves in
              </p>
            </div>
            <Switch
              id="kiosk-mode"
              checked={settings.kioskModeEnabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, kioskModeEnabled: checked })
              }
            />
          </div>

          {settings.kioskModeEnabled && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 font-medium">
                    <Clock className="h-4 w-4" />
                    Session Timeout
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    How long the check-in session stays active after admin login
                  </p>
                  <Select
                    value={settings.kioskSessionTimeout.toString()}
                    onValueChange={(value) =>
                      setSettings({ ...settings, kioskSessionTimeout: parseInt(value) })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeoutOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          <div className="pt-4">
            <Button 
              onClick={handleSave} 
              disabled={updateSettingsMutation.isPending}
              className="w-full sm:w-auto"
            >
              {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
        </Card>
      </motion.div>

      {settings.kioskModeEnabled && (
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
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 transition-all duration-300 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                <Info className="h-5 w-5" />
                How Kiosk Mode Works
              </CardTitle>
            </CardHeader>
            <CardContent className="text-blue-700 dark:text-blue-300 space-y-2">
              <p>1. <strong>Admin logs in</strong> and selects an active event</p>
              <p>2. <strong>Admin enables kiosk mode</strong> on the check-in page</p>
              <p>3. <strong>Members self check-in</strong> by searching their names</p>
              <p>4. <strong>Session auto-expires</strong> after the timeout period</p>
              <p>5. <strong>Admin can extend</strong> or disable the session anytime</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {settings.activeSession?.isActive && timeRemaining !== null && (
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
          <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 transition-all duration-300 hover:shadow-lg hover:border-green-300 dark:hover:border-green-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <Activity className="h-5 w-5" />
                Active Kiosk Session
              </CardTitle>
            </CardHeader>
            <CardContent className="text-green-700 dark:text-green-300 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    Active for {settings.activeSession.availableEvents?.length || 0} events
                  </p>
                  <p className="text-sm">Members can check themselves into any active event</p>
                  <div className="mt-2 text-xs space-y-1">
                    {settings.activeSession.availableEvents?.map(event => (
                      <div key={event.id} className="text-green-600 dark:text-green-400">
                        • {event.name} ({event.eventType.replace('_', ' ')})
                      </div>
                    )) || []}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 text-lg font-mono">
                    <Timer className="h-4 w-4" />
                    {formatTime(timeRemaining)}
                  </div>
                  <p className="text-xs">Time remaining</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      // Extend session
                      apiRequest("/api/churches/kiosk-session/extend", {
                        method: "POST",
                      }).then((response: any) => {
                        // Update token for extended session
                        if (response.extendedToken) {
                          localStorage.setItem('auth_token', response.extendedToken);
                        }
                        queryClient.invalidateQueries({ queryKey: ["/api/churches/kiosk-settings"] });
                        toast({
                          title: "Session Extended",
                          description: "Kiosk session and admin authentication extended successfully.",
                        });
                      }).catch(() => {
                        toast({
                          title: "Extension Failed",
                          description: "Failed to extend kiosk session.",
                          variant: "destructive",
                        });
                      });
                    }}
                    className="bg-white dark:bg-green-950 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900 transition-all hover:shadow-md"
                  >
                    Extend Session
                  </Button>
                </motion.div>
                
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      // End session
                      apiRequest("/api/churches/kiosk-session/end", {
                        method: "POST",
                      }).then(() => {
                        queryClient.invalidateQueries({ queryKey: ["/api/churches/kiosk-settings"] });
                        toast({
                          title: "Session Ended",
                          description: "Kiosk session has been ended successfully.",
                        });
                      }).catch(() => {
                        toast({
                          title: "End Session Failed",
                          description: "Failed to end kiosk session.",
                          variant: "destructive",
                        });
                      });
                    }}
                    className="bg-white dark:bg-red-950 text-red-600 dark:text-red-300 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900 transition-all hover:shadow-md"
                  >
                    End Session
                  </Button>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {settings.kioskModeEnabled && !settings.activeSession?.isActive && (
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
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 transition-all duration-300 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                <Play className="h-5 w-5" />
                Start Kiosk Session
              </CardTitle>
              <CardDescription className="text-blue-600 dark:text-blue-400">
                Enable member self check-in for all active events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeEvents && activeEvents.length > 0 ? (
                <div className="space-y-4">
                  <div className="bg-white dark:bg-blue-900 rounded-lg border border-blue-200 dark:border-blue-700 p-4">
                    <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                      Available Events ({activeEvents.length})
                    </p>
                    <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                      {activeEvents.map((event: any) => (
                        <div key={event.id} className="flex items-center justify-between">
                          <span>• {event.name}</span>
                          <span className="text-blue-500 dark:text-blue-400">
                            {event.eventType.replace('_', ' ')} • {event.location}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 transition-all hover:shadow-md"
                      onClick={() => {
                        apiRequest("/api/churches/kiosk-session/start", {
                          method: "POST",
                        }).then((response: any) => {
                          // Store extended token for session persistence
                          if (response.extendedToken) {
                            localStorage.setItem('auth_token', response.extendedToken);
                          }
                          queryClient.invalidateQueries({ queryKey: ["/api/churches/kiosk-settings"] });
                          toast({
                            title: "Kiosk Session Started",
                            description: `Members can now self check-in to any of ${activeEvents.length} active events. Admin session extended for kiosk duration.`,
                          });
                    }).catch(() => {
                      toast({
                        title: "Start Failed",
                        description: "Failed to start kiosk session.",
                        variant: "destructive",
                      });
                    });
                  }}
                >
                  Start Kiosk Session for All Events
                    </Button>
                  </motion.div>
                </div>
              ) : (
                <div className="text-center py-6 text-blue-600 dark:text-blue-400">
                  <p className="mb-2">No active events available</p>
                  <p className="text-sm">Create and activate events in Event Management first</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

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
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800 transition-all duration-300 hover:shadow-lg hover:border-orange-300 dark:hover:border-orange-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <Shield className="h-5 w-5" />
              Security Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="text-orange-700 dark:text-orange-300 space-y-2">
            <p>• Sessions automatically expire after the set timeout</p>
            <p>• All active events are available for member self check-in</p>
            <p>• All check-ins are still recorded under your church account</p>
            <p>• Family check-ins work through parent member search</p>
            <p>• Visitors can register themselves during check-in</p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}