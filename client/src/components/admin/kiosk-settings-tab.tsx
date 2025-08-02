import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Clock, Shield, Users, Info, Activity, Timer } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface KioskSettings {
  kioskModeEnabled: boolean;
  kioskSessionTimeout: number;
  activeSession?: {
    eventId: string;
    eventName: string;
    timeRemaining: number;
    isActive: boolean;
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Kiosk Mode Settings</h2>
        <p className="text-muted-foreground">
          Configure self check-in options for your members
        </p>
      </div>

      <Card>
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

      {settings.kioskModeEnabled && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Info className="h-5 w-5" />
              How Kiosk Mode Works
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-700 space-y-2">
            <p>1. <strong>Admin logs in</strong> and selects an active event</p>
            <p>2. <strong>Admin enables kiosk mode</strong> on the check-in page</p>
            <p>3. <strong>Members self check-in</strong> by searching their names</p>
            <p>4. <strong>Session auto-expires</strong> after the timeout period</p>
            <p>5. <strong>Admin can extend</strong> or disable the session anytime</p>
          </CardContent>
        </Card>
      )}

      {settings.activeSession?.isActive && timeRemaining !== null && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Activity className="h-5 w-5" />
              Active Kiosk Session
            </CardTitle>
          </CardHeader>
          <CardContent className="text-green-700 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Event: {settings.activeSession.eventName}</p>
                <p className="text-sm">Members can check themselves in</p>
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
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  // Extend session
                  apiRequest("/api/churches/kiosk-session/extend", {
                    method: "POST",
                  }).then(() => {
                    queryClient.invalidateQueries({ queryKey: ["/api/churches/kiosk-settings"] });
                    toast({
                      title: "Session Extended",
                      description: "Kiosk session has been extended successfully.",
                    });
                  }).catch(() => {
                    toast({
                      title: "Extension Failed",
                      description: "Failed to extend kiosk session.",
                      variant: "destructive",
                    });
                  });
                }}
                className="bg-white text-green-700 border-green-300 hover:bg-green-100"
              >
                Extend Session
              </Button>
              
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
                className="bg-white text-red-600 border-red-300 hover:bg-red-50"
              >
                End Session
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Shield className="h-5 w-5" />
            Security Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="text-orange-700 space-y-2">
          <p>• Sessions automatically expire after the set timeout</p>
          <p>• Only active events selected by admin are available</p>
          <p>• All check-ins are still recorded under your church account</p>
          <p>• Family check-ins require admin assistance</p>
          <p>• Visitor registration still requires admin approval</p>
        </CardContent>
      </Card>
    </div>
  );
}