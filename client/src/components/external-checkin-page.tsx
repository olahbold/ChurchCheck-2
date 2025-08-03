import React, { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, CheckCircle2, XCircle, User, Search, Users, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { MemberWithChildren } from '@/lib/types';

interface EventInfo {
  eventId: string;
  eventName: string;
  eventType: string;
  location: string;
  churchName: string;
  churchBrandColor: string;
  requiresPin: boolean;
}

interface Member {
  id: string;
  firstName: string;
  surname: string;
  fullName: string;
  ageGroup: string;
  phone?: string;
  email?: string;
}

const ExternalCheckInPage: React.FC = () => {
  const [match, params] = useRoute('/external-checkin/:eventUrl');
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [pin, setPin] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [members, setMembers] = useState<Member[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Family check-in state
  const [selectedParent, setSelectedParent] = useState<MemberWithChildren | null>(null);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [isFamilyDialogOpen, setIsFamilyDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Load event info and members
  useEffect(() => {
    if (!match || !params?.eventUrl) return;

    const loadEventInfo = async () => {
      try {
        setLoading(true);
        
        // Get event information
        const eventResponse = await fetch(`/api/external-checkin/event/${params.eventUrl}`);
        if (!eventResponse.ok) {
          throw new Error('External check-in not found or disabled');
        }
        
        const eventData = await eventResponse.json();
        setEventInfo(eventData);

        // Note: We don't pre-load members for security reasons
        // Users need to authenticate with PIN first
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load check-in page');
      } finally {
        setLoading(false);
      }
    };

    loadEventInfo();
  }, [match, params?.eventUrl]);

  // Search members query
  const { data: searchResults = [] } = useQuery<MemberWithChildren[]>({
    queryKey: ['/api/external-checkin/search', searchQuery, params?.eventUrl],
    enabled: searchQuery.length > 0 && !!eventInfo,
    queryFn: async () => {
      const response = await fetch('/api/external-checkin/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventUrl: params?.eventUrl,
          search: searchQuery,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to search members');
      }
      
      return response.json();
    },
  });

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async ({ memberId, pin }: { memberId: string; pin: string }) => {
      const response = await fetch(`/api/external-checkin/checkin/${params?.eventUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pin: pin,
          memberId: memberId,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Check-in failed');
      }
      
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "Check-in Successful!",
        description: data.message || 'Member has been checked in successfully',
      });
      setPin('');
      setSelectedMember('');
      setSearchQuery('');
    },
    onError: (error: any) => {
      toast({
        title: "Check-in Failed",
        description: error.message || 'Failed to check in member',
        variant: "destructive",
      });
    }
  });

  // Individual check-in handler
  const handleCheckIn = async (memberId: string) => {
    if (!pin || pin.length !== 6) {
      toast({
        title: "PIN Required",
        description: "Please enter the 6-digit PIN to check in",
        variant: "destructive",
      });
      return;
    }

    checkInMutation.mutate({ memberId, pin });
  };

  // Family check-in functions
  const handleFamilyCheckIn = (parent: MemberWithChildren) => {
    setSelectedParent(parent);
    setSelectedChildren([]);
    setIsFamilyDialogOpen(true);
  };

  const handleFamilyCheckInSubmit = async () => {
    if (!selectedParent || !pin || pin.length !== 6) {
      toast({
        title: "PIN Required",
        description: "Please enter the 6-digit PIN to proceed with family check-in",
        variant: "destructive",
      });
      return;
    }
    
    const results: { success: string[], failed: string[] } = { success: [], failed: [] };
    
    try {
      // Check in parent
      try {
        await checkInMutation.mutateAsync({ memberId: selectedParent.id, pin });
        results.success.push(`${selectedParent.firstName} ${selectedParent.surname}`);
      } catch (error: any) {
        if (error?.message?.includes('already checked in')) {
          results.failed.push(`${selectedParent.firstName} ${selectedParent.surname} (already checked in)`);
        } else {
          results.failed.push(`${selectedParent.firstName} ${selectedParent.surname} (error)`);
        }
      }
      
      // Check in selected children
      for (const childId of selectedChildren) {
        const child = selectedParent.children?.find(c => c.id === childId);
        if (child) {
          try {
            await checkInMutation.mutateAsync({ memberId: childId, pin });
            results.success.push(child.firstName + ' ' + child.surname);
          } catch (error: any) {
            if (error?.message?.includes('already checked in')) {
              results.failed.push(`${child.firstName} ${child.surname} (already checked in)`);
            } else {
              results.failed.push(`${child.firstName} ${child.surname} (error)`);
            }
          }
        }
      }
      
      // Show appropriate message based on results
      if (results.success.length > 0 && results.failed.length === 0) {
        toast({
          title: "Family Check-in Successful!",
          description: `Successfully checked in: ${results.success.join(', ')}`,
        });
      } else if (results.success.length > 0 && results.failed.length > 0) {
        toast({
          title: "Partial Family Check-in",
          description: `✓ Checked in: ${results.success.join(', ')}\n✗ Failed: ${results.failed.join(', ')}`,
        });
      } else {
        toast({
          title: "Family Check-in Failed",
          description: `All members failed: ${results.failed.join(', ')}`,
          variant: "destructive",
        });
      }
      
      setIsFamilyDialogOpen(false);
      setSelectedParent(null);
      setSelectedChildren([]);
      setPin('');
      setSearchQuery('');
    } catch (error) {
      toast({
        title: "Family Check-in Error",
        description: "An unexpected error occurred during family check-in",
        variant: "destructive",
      });
    }
  };

  if (!match) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading check-in page...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">{error}</p>
            <Button 
              className="mt-4" 
              variant="outline"
              onClick={() => window.location.href = '/'}
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!eventInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">Event information not available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: `linear-gradient(135deg, ${eventInfo.churchBrandColor}15, ${eventInfo.churchBrandColor}05)`
      }}
    >
      <Card className="w-full max-w-lg shadow-xl">
        <CardContent className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {eventInfo.churchName}
            </h1>
            
            {/* Current Time */}
            <div className="flex items-center justify-center gap-2 text-gray-600 mb-4">
              <Clock className="h-4 w-4" />
              <span className="font-mono text-lg">
                {currentTime.toLocaleTimeString()}
              </span>
            </div>

            <div 
              className="inline-block px-4 py-2 rounded-full text-white font-medium"
              style={{ backgroundColor: eventInfo.churchBrandColor }}
            >
              {eventInfo.eventName}
            </div>
            
            {eventInfo.location && (
              <p className="text-sm text-gray-500 mt-2">{eventInfo.location}</p>
            )}
          </div>

          {/* Search & Check-in Form */}
          <div className="space-y-6">
            {/* PIN Input */}
            <div>
              <Label htmlFor="pin" className="text-base font-medium">
                Enter PIN
              </Label>
              <Input
                id="pin"
                type="password"
                placeholder="6-digit PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={6}
                className="mt-2 text-center text-lg font-mono tracking-widest"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ask your church administrator for the PIN
              </p>
            </div>

            {/* Search Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Search className="h-5 w-5" />
                  Manual Search & Check-in
                </CardTitle>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-800">
                    💡 <strong>Search tips:</strong> Type any part of their name, phone number, or email. Family members can check in their children with the family button. Perfect for first-time visitors or when biometrics aren't available!
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by name, phone, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {searchQuery && searchResults.length > 0 && (
                  <div className="border rounded-lg max-h-60 overflow-y-auto">
                    {searchResults.map((member) => (
                      <div
                        key={member.id}
                        className="p-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">
                              {member.firstName} {member.surname}
                            </p>
                            <p className="text-sm text-slate-500">
                              {member.ageGroup} • {member.phone}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleCheckIn(member.id)}
                              disabled={!pin || pin.length !== 6 || checkInMutation.isPending}
                              style={{ backgroundColor: eventInfo.churchBrandColor }}
                              className="text-white"
                            >
                              {checkInMutation.isPending ? 'Checking...' : 'Check In'}
                            </Button>
                            {member.children && member.children.length > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleFamilyCheckIn(member)}
                                disabled={!pin || pin.length !== 6}
                                className="flex items-center gap-1"
                              >
                                <Users className="h-3 w-3" />
                                Family
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {searchQuery && searchResults.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No members found matching "{searchQuery}"</p>
                    <p className="text-xs mt-1">Try a different search term</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              Secure external check-in • PIN required
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Family Check-in Dialog */}
      <Dialog open={isFamilyDialogOpen} onOpenChange={setIsFamilyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Family Check-in
            </DialogTitle>
          </DialogHeader>
          
          {selectedParent && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Parent:</strong> {selectedParent.firstName} {selectedParent.surname}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  The parent will be automatically checked in along with selected children.
                </p>
              </div>
              
              {selectedParent.children && selectedParent.children.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Select Children to Check In:</Label>
                  <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                    {selectedParent.children.map((child) => (
                      <div key={child.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={child.id}
                          checked={selectedChildren.includes(child.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedChildren([...selectedChildren, child.id]);
                            } else {
                              setSelectedChildren(selectedChildren.filter(id => id !== child.id));
                            }
                          }}
                        />
                        <Label 
                          htmlFor={child.id}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {child.firstName} {child.surname} ({child.ageGroup})
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {(!selectedParent.children || selectedParent.children.length === 0) && (
                <div className="text-center py-4 text-gray-500">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No children found for this member</p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsFamilyDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleFamilyCheckInSubmit}
              disabled={checkInMutation.isPending || !pin || pin.length !== 6}
              style={{ backgroundColor: eventInfo?.churchBrandColor }}
              className="text-white"
            >
              {checkInMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full"></div>
                  Checking in...
                </div>
              ) : (
                `Check In Family (${1 + selectedChildren.length})`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExternalCheckInPage;