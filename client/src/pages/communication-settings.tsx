import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CommunicationProvidersTab } from '@/components/communication-providers-tab';
import { MessageSquare, Mail, Settings } from 'lucide-react';

export default function CommunicationSettingsPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="space-y-6">
        {/* Header */}
        <Card className="bg-slate-50 border-slate-200">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-slate-900 flex items-center">
              <MessageSquare className="mr-3 h-6 w-6" />
              Communication Settings
            </CardTitle>
            <CardDescription>
              <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
                <p className="text-sm text-cyan-800">
                  <strong>📱 Communication Management:</strong> Configure SMS and email service providers for your church communications. Set up Twilio for SMS, SendGrid for emails, or other providers. Test connections, manage credentials securely, and send bulk messages, birthday reminders, and event announcements to your members.
                </p>
              </div>
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Communication Providers Section */}
        <Card>
          <CardContent className="p-6">
            <CommunicationProvidersTab />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}