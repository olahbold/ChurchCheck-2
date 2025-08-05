import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Settings, Trash2, TestTube, Star, Mail, MessageSquare, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Provider configuration schemas
const providerConfigSchema = z.object({
  providerType: z.enum(['sms', 'email']),
  providerName: z.string().min(1, 'Provider name is required'),
  displayName: z.string().min(1, 'Display name is required'),
  credentials: z.object({}).passthrough(),
  isActive: z.boolean().default(true),
});

const testProviderSchema = z.object({
  testRecipient: z.string().min(1, 'Test recipient is required'),
});

type ProviderConfig = z.infer<typeof providerConfigSchema>;
type TestProvider = z.infer<typeof testProviderSchema>;

interface CommunicationProvider {
  id: string;
  churchId: string;
  providerType: 'sms' | 'email';
  providerName: string;
  displayName: string;
  credentials: string;
  isActive: boolean;
  isPrimary: boolean;
  testStatus: 'connected' | 'failed' | 'untested';
  testMessage?: string;
  lastTestedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Provider templates with required fields
const providerTemplates = {
  email: {
    sendgrid: {
      name: 'SendGrid',
      fields: [
        { key: 'apiKey', label: 'API Key', type: 'password', required: true },
        { key: 'fromEmail', label: 'From Email', type: 'email', required: true },
        { key: 'fromName', label: 'From Name', type: 'text', required: false },
      ]
    },
    mailgun: {
      name: 'Mailgun',
      fields: [
        { key: 'domain', label: 'Domain', type: 'text', required: true },
        { key: 'apiKey', label: 'API Key', type: 'password', required: true },
        { key: 'fromEmail', label: 'From Email', type: 'email', required: true },
      ]
    },
    smtp: {
      name: 'SMTP',
      fields: [
        { key: 'host', label: 'SMTP Host', type: 'text', required: true },
        { key: 'port', label: 'Port', type: 'number', required: true },
        { key: 'username', label: 'Username', type: 'text', required: true },
        { key: 'password', label: 'Password', type: 'password', required: true },
        { key: 'fromEmail', label: 'From Email', type: 'email', required: true },
      ]
    }
  },
  sms: {
    twilio: {
      name: 'Twilio',
      fields: [
        { key: 'accountSid', label: 'Account SID', type: 'text', required: true },
        { key: 'authToken', label: 'Auth Token', type: 'password', required: true },
        { key: 'fromNumber', label: 'From Phone Number', type: 'tel', required: true },
      ]
    },
    aws_sns: {
      name: 'AWS SNS',
      fields: [
        { key: 'accessKeyId', label: 'Access Key ID', type: 'text', required: true },
        { key: 'secretAccessKey', label: 'Secret Access Key', type: 'password', required: true },
        { key: 'region', label: 'Region', type: 'text', required: true },
      ]
    },
    messagebird: {
      name: 'MessageBird',
      fields: [
        { key: 'apiKey', label: 'API Key', type: 'password', required: true },
        { key: 'originator', label: 'Originator', type: 'text', required: true },
      ]
    }
  }
};

export function CommunicationProvidersTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isProviderDialogOpen, setIsProviderDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<CommunicationProvider | null>(null);
  const [activeTab, setActiveTab] = useState<'sms' | 'email'>('email');

  // Queries
  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['/api/communication-providers'],
    queryFn: () => apiRequest('/api/communication-providers'),
  });

  const { data: messageDeliveries = [] } = useQuery({
    queryKey: ['/api/message-deliveries'],
    queryFn: () => apiRequest('/api/message-deliveries'),
  });

  // Mutations
  const createProviderMutation = useMutation({
    mutationFn: (data: ProviderConfig) => apiRequest('/api/communication-providers', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/communication-providers'] });
      setIsProviderDialogOpen(false);
      toast({ title: 'Success', description: 'Communication provider added successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to add provider',
        variant: 'destructive'
      });
    }
  });

  const testProviderMutation = useMutation({
    mutationFn: ({ providerId, testRecipient }: { providerId: string; testRecipient: string }) => 
      apiRequest(`/api/communication-providers/${providerId}/test`, {
        method: 'POST',
        body: JSON.stringify({ testRecipient })
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/communication-providers'] });
      setIsTestDialogOpen(false);
      toast({ 
        title: result.success ? 'Success' : 'Test Failed',
        description: result.message,
        variant: result.success ? 'default' : 'destructive'
      });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Test failed',
        variant: 'destructive'
      });
    }
  });

  const setPrimaryMutation = useMutation({
    mutationFn: (providerId: string) => apiRequest(`/api/communication-providers/${providerId}/set-primary`, {
      method: 'POST'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/communication-providers'] });
      toast({ title: 'Success', description: 'Primary provider updated' });
    }
  });

  const deleteProviderMutation = useMutation({
    mutationFn: (providerId: string) => apiRequest(`/api/communication-providers/${providerId}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/communication-providers'] });
      toast({ title: 'Success', description: 'Provider deleted successfully' });
    }
  });

  // Forms
  const providerForm = useForm<ProviderConfig>({
    resolver: zodResolver(providerConfigSchema),
    defaultValues: {
      providerType: 'email',
      providerName: '',
      displayName: '',
      credentials: {},
      isActive: true,
    }
  });

  const testForm = useForm<TestProvider>({
    resolver: zodResolver(testProviderSchema),
    defaultValues: {
      testRecipient: '',
    }
  });

  const selectedProviderType = providerForm.watch('providerType');
  const selectedProviderName = providerForm.watch('providerName');

  const onSubmitProvider = (data: ProviderConfig) => {
    createProviderMutation.mutate(data);
  };

  const onTestProvider = (data: TestProvider) => {
    if (selectedProvider) {
      testProviderMutation.mutate({
        providerId: selectedProvider.id,
        testRecipient: data.testRecipient
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const renderProviderCard = (provider: CommunicationProvider) => (
    <Card key={provider.id} className="relative">
      {provider.isPrimary && (
        <Badge className="absolute -top-2 -right-2 bg-yellow-100 text-yellow-800">
          <Star className="h-3 w-3 mr-1" />
          Primary
        </Badge>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            {provider.providerType === 'email' ? (
              <Mail className="h-5 w-5 mr-2" />
            ) : (
              <MessageSquare className="h-5 w-5 mr-2" />
            )}
            {provider.displayName}
          </CardTitle>
          <div className="flex items-center space-x-2">
            {getStatusIcon(provider.testStatus)}
            <Badge variant={provider.isActive ? 'default' : 'secondary'}>
              {provider.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
        <CardDescription>
          {providerTemplates[provider.providerType]?.[provider.providerName as keyof typeof providerTemplates[typeof provider.providerType]]?.name || provider.providerName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {provider.lastTestedAt ? (
              <>Last tested: {new Date(provider.lastTestedAt).toLocaleDateString()}</>
            ) : (
              'Never tested'
            )}
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedProvider(provider);
                setIsTestDialogOpen(true);
              }}
            >
              <TestTube className="h-4 w-4 mr-1" />
              Test
            </Button>
            {!provider.isPrimary && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPrimaryMutation.mutate(provider.id)}
              >
                <Star className="h-4 w-4 mr-1" />
                Set Primary
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => deleteProviderMutation.mutate(provider.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderCredentialFields = () => {
    if (!selectedProviderType || !selectedProviderName) return null;

    const template = providerTemplates[selectedProviderType]?.[selectedProviderName as keyof typeof providerTemplates[typeof selectedProviderType]];
    if (!template) return null;

    return (
      <div className="space-y-4">
        {template.fields.map((field) => (
          <FormField
            key={field.key}
            control={providerForm.control}
            name={`credentials.${field.key}` as any}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    type={field.type}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    {...formField}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
      </div>
    );
  };

  const emailProviders = providers.filter((p: CommunicationProvider) => p.providerType === 'email');
  const smsProviders = providers.filter((p: CommunicationProvider) => p.providerType === 'sms');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Communication Providers</h2>
          <p className="text-muted-foreground">Manage SMS and email service providers for your church communications</p>
        </div>
        <Dialog open={isProviderDialogOpen} onOpenChange={setIsProviderDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Provider
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Communication Provider</DialogTitle>
              <DialogDescription>
                Configure a new SMS or email service provider for your church communications.
              </DialogDescription>
            </DialogHeader>
            <Form {...providerForm}>
              <form onSubmit={providerForm.handleSubmit(onSubmitProvider)} className="space-y-4">
                <FormField
                  control={providerForm.control}
                  name="providerType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select provider type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={providerForm.control}
                  name="providerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Provider</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select service provider" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {selectedProviderType && Object.entries(providerTemplates[selectedProviderType]).map(([key, template]) => (
                            <SelectItem key={key} value={key}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={providerForm.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Church Email Service" {...field} />
                      </FormControl>
                      <FormDescription>
                        A friendly name to identify this provider configuration.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {renderCredentialFields()}

                <FormField
                  control={providerForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active</FormLabel>
                        <FormDescription>
                          Enable this provider for sending messages.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="submit" disabled={createProviderMutation.isPending}>
                    {createProviderMutation.isPending ? 'Adding...' : 'Add Provider'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'sms' | 'email')}>
        <TabsList>
          <TabsTrigger value="email">
            <Mail className="h-4 w-4 mr-2" />
            Email Providers ({emailProviders.length})
          </TabsTrigger>
          <TabsTrigger value="sms">
            <MessageSquare className="h-4 w-4 mr-2" />
            SMS Providers ({smsProviders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-4">
          {emailProviders.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Mail className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">No Email Providers</h3>
                <p className="text-gray-500 mb-4">Add an email service provider to send email communications.</p>
                <Button onClick={() => setIsProviderDialogOpen(true)}>
                  Add Email Provider
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {emailProviders.map(renderProviderCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sms" className="space-y-4">
          {smsProviders.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">No SMS Providers</h3>
                <p className="text-gray-500 mb-4">Add an SMS service provider to send text message communications.</p>
                <Button onClick={() => setIsProviderDialogOpen(true)}>
                  Add SMS Provider
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {smsProviders.map(renderProviderCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Test Provider Dialog */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Provider</DialogTitle>
            <DialogDescription>
              Send a test message to verify your provider configuration.
            </DialogDescription>
          </DialogHeader>
          <Form {...testForm}>
            <form onSubmit={testForm.handleSubmit(onTestProvider)} className="space-y-4">
              <FormField
                control={testForm.control}
                name="testRecipient"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Test {selectedProvider?.providerType === 'email' ? 'Email' : 'Phone Number'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type={selectedProvider?.providerType === 'email' ? 'email' : 'tel'}
                        placeholder={selectedProvider?.providerType === 'email' ? 'test@example.com' : '+1234567890'}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      A test message will be sent to this {selectedProvider?.providerType === 'email' ? 'email address' : 'phone number'}.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={testProviderMutation.isPending}>
                  {testProviderMutation.isPending ? 'Testing...' : 'Send Test'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}