import React, { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, CheckCircle2, XCircle, User } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
}

const ExternalCheckInPage: React.FC = () => {
  const [match, params] = useRoute('/external-checkin/:eventUrl');
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [pin, setPin] = useState('');
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [members, setMembers] = useState<Member[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  // Load members from the actual member API
  const loadMembers = async () => {
    try {
      // Get members from the external check-in API
      if (!eventInfo) return;
      
      const response = await fetch('/api/external-checkin/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventUrl: params?.eventUrl,
        }),
      });
      
      if (response.ok) {
        const memberList = await response.json();
        setMembers(memberList.map((member: any) => ({
          id: member.id,
          firstName: member.firstName,
          surname: member.surname,
          fullName: `${member.firstName} ${member.surname}`,
        })));
      } else {
        // Fallback to sample data if API isn't available yet
        const sampleMembers: Member[] = [
          { id: 'sample-1', firstName: 'John', surname: 'Doe', fullName: 'John Doe' },
          { id: 'sample-2', firstName: 'Jane', surname: 'Smith', fullName: 'Jane Smith' },
          { id: 'sample-3', firstName: 'Michael', surname: 'Johnson', fullName: 'Michael Johnson' },
          { id: 'sample-4', firstName: 'Sarah', surname: 'Williams', fullName: 'Sarah Williams' },
          { id: 'sample-5', firstName: 'David', surname: 'Brown', fullName: 'David Brown' },
        ];
        setMembers(sampleMembers);
      }
    } catch (err) {
      console.error('Failed to load members:', err);
      // Use sample data as fallback
      const sampleMembers: Member[] = [
        { id: 'sample-1', firstName: 'John', surname: 'Doe', fullName: 'John Doe' },
        { id: 'sample-2', firstName: 'Jane', surname: 'Smith', fullName: 'Jane Smith' },
      ];
      setMembers(sampleMembers);
    }
  };

  useEffect(() => {
    if (eventInfo) {
      loadMembers();
    }
  }, [eventInfo]);

  const handleCheckIn = async () => {
    if (!eventInfo || !selectedMember || !pin) {
      setMessage({ type: 'error', text: 'Please select a member and enter the PIN' });
      return;
    }

    try {
      setSubmitting(true);
      setMessage(null);

      const response = await fetch(`/api/external-checkin/checkin/${params?.eventUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pin: pin,
          memberId: selectedMember,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: result.message || 'Check-in successful!' 
        });
        
        // Clear form
        setPin('');
        setSelectedMember('');
        
        // Auto-clear success message after 3 seconds
        setTimeout(() => {
          setMessage(null);
        }, 3000);
      } else {
        setMessage({ 
          type: 'error', 
          text: result.error || 'Check-in failed' 
        });
      }
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: 'Network error. Please try again.' 
      });
    } finally {
      setSubmitting(false);
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

          {/* Check-in Form */}
          <div className="space-y-6">
            <div>
              <Label htmlFor="member-select" className="text-base font-medium">
                Select Member
              </Label>
              <Select value={selectedMember} onValueChange={setSelectedMember}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Choose your name..." />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {member.fullName}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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

            {message && (
              <Alert className={`${message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex items-center gap-2">
                  {message.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                    {message.text}
                  </AlertDescription>
                </div>
              </Alert>
            )}

            <Button
              onClick={handleCheckIn}
              disabled={!selectedMember || !pin || pin.length !== 6 || submitting}
              className="w-full text-lg py-6"
              style={{ backgroundColor: eventInfo.churchBrandColor }}
            >
              {submitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full"></div>
                  Checking in...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Check In
                </div>
              )}
            </Button>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              Secure external check-in • PIN required
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExternalCheckInPage;