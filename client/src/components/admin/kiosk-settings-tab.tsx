import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Clock, Shield, Users, Info } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface KioskSettings {
  kioskModeEnabled: boolean;
  kioskSessionTimeout: number;
}

export function KioskSettingsTab() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<KioskSettings>({
    kioskModeEnabled: false,
    kioskSessionTimeout: 60,
  });

  const { data: church, isLoading } = useQuery({
    queryKey: ["/api/churches/current"],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data: KioskSettings) =>
      apiRequest("/api/churches/kiosk-settings", "PATCH", data),
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Kiosk settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/churches/current"] });
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
    if (church) {
      setSettings({
        kioskModeEnabled: church.kioskModeEnabled || false,
        kioskSessionTimeout: church.kioskSessionTimeout || 60,
      });
    }
  }, [church]);

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

  if (isLoading) {
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