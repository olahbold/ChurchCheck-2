import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription, // ⬅️ add this
} from '@/components/ui/dialog';
import { Copy, ExternalLink, Shield, Clock, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface ExternalCheckInSettingsProps {
  eventId: string;
  eventName: string;
}

interface ExternalCheckInData {
  enabled: boolean;
  url?: string | null;
  pin?: string | null;
  fullUrl?: string | null;
}

const ExternalCheckInSettings: React.FC<ExternalCheckInSettingsProps> = ({ eventId, eventName }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query only when dialog is open
  const {
    data: externalCheckIn,
    isLoading,
    isError,
    error,
  } = useQuery<ExternalCheckInData>({
    queryKey: ['/api/external-checkin/events', eventId, 'external-checkin'],
    enabled: dialogOpen,
  });

  // Toggle mutation
  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) =>
      apiRequest(`/api/external-checkin/events/${eventId}/external-checkin/toggle`, {
        method: 'POST',
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({
        queryKey: ['/api/external-checkin/events', eventId, 'external-checkin'],
      });

      if (data?.event?.externalCheckInEnabled) {
        toast({
          title: 'External Check-in Enabled',
          description: 'Members can now check in using the external URL and PIN.',
        });
      } else {
        toast({
          title: 'External Check-in Disabled',
          description: 'External check-in has been turned off for this event.',
        });
      }
    },
    onError: (err: any) => {
      toast({
        title: 'Failed to toggle',
        description: err?.detail || err?.error || err?.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied!', description: `${label} copied to clipboard.` });
    } catch {
      toast({
        title: 'Copy Failed',
        description: 'Please copy the text manually.',
        variant: 'destructive',
      });
    }
  };

  const handleToggle = (enabled: boolean) => {
    toggleMutation.mutate(enabled);
  };

  const fullUrl = externalCheckIn?.fullUrl || '';
  const pin = externalCheckIn?.pin || '';

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ExternalLink className="h-4 w-4 mr-2" />
          External Check-in
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            External Check-in Settings
          </DialogTitle>
          {/* ✅ Fixes Radix warning */}
          <DialogDescription>
            Configure the external check-in settings for this event. You can enable or disable
            external check-in and view the generated URL and PIN.
          </DialogDescription>
        </DialogHeader>

        {/* Loading state */}
        {isLoading && (
          <Card className="border-gray-200">
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">Loading external check-in settings…</p>
            </CardContent>
          </Card>
        )}

        {/* Error state from GET */}
        {isError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              {(error as any)?.detail ||
                (error as any)?.error ||
                (error as any)?.message ||
                'Failed to load external check-in settings.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Content when loaded or if not enabled */}
        {!isLoading && (
          <div className="space-y-6">
            {/* Event Info */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-1">{eventName}</h3>
              <p className="text-sm text-blue-700">
                Enable external check-in to allow members to check in from their personal devices using a secure PIN.
              </p>
            </div>

            {/* Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">Enable External Check-in</Label>
                <p className="text-sm text-gray-500">Members can check in remotely with a PIN verification</p>
              </div>
              <Switch
                checked={!!externalCheckIn?.enabled}
                onCheckedChange={handleToggle}
                disabled={toggleMutation.isPending || isLoading}
              />
            </div>

            {/* Enabled state */}
            {externalCheckIn?.enabled && !!fullUrl && (
              <div className="space-y-4">
                <Alert className="border-green-200 bg-green-50">
                  <Shield className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    External check-in is active. Share the URL and PIN only with members physically present at the event.
                  </AlertDescription>
                </Alert>

                {/* URL */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ExternalLink className="h-5 w-5" />
                      Check-in URL
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Input value={fullUrl} readOnly className="font-mono text-sm" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(fullUrl, 'URL')}
                        disabled={!fullUrl}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fullUrl && window.open(fullUrl, '_blank')}
                        disabled={!fullUrl}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(fullUrl, 'URL')}
                        disabled={!fullUrl}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy URL
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* PIN */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Security PIN
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        value={pin}
                        readOnly
                        className="font-mono text-2xl text-center tracking-widest max-w-32"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(pin, 'PIN')}
                        disabled={!pin}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600">
                      Share this PIN only with members who are physically present at the church/event.
                    </p>
                  </CardContent>
                </Card>

                {/* Usage */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Instructions for Members
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                      <li>Open the check-in URL on your phone or device</li>
                      <li>Select your name from the member list</li>
                      <li>Enter the 6-digit PIN provided by church staff</li>
                      <li>Tap &quot;Check In&quot; to complete attendance</li>
                    </ol>

                    <Alert className="mt-4 border-amber-200 bg-amber-50">
                      <Clock className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800">
                        The PIN prevents remote check-ins. Only share it with members physically present at the event.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>

                {/* Security */}
                <Card className="border-gray-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Security Features</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <Shield className="h-3 w-3 mr-1" />
                          PIN Protection
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          <Users className="h-3 w-3 mr-1" />
                          Member Verification
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          <Clock className="h-3 w-3 mr-1" />
                          Duplicate Prevention
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Unique URLs
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Disabled state (only when we know it’s disabled) */}
            {externalCheckIn && !externalCheckIn.enabled && (
              <Card className="border-gray-200">
                <CardContent className="pt-6">
                  <div className="text-center text-gray-500">
                    <ExternalLink className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">External Check-in Disabled</p>
                    <p className="text-sm">
                      Enable external check-in to generate a secure URL and PIN for member self-service.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ExternalCheckInSettings;
