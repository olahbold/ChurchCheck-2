import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Church, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

const registrationSchema = z.object({
  churchName: z.string().min(1, "Church name is required"),
  adminFirstName: z.string().min(1, "First name is required"),
  adminLastName: z.string().min(1, "Last name is required"),
  adminEmail: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  subdomain: z.string().min(3, "Subdomain must be at least 3 characters").regex(/^[a-z0-9-]+$/, "Subdomain can only contain lowercase letters, numbers, and hyphens").optional().or(z.literal("")),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegistrationForm = z.infer<typeof registrationSchema>;

const RegisterPage = () => {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
  });

  const churchName = watch('churchName');

  // Auto-generate subdomain from church name
  React.useEffect(() => {
    if (churchName && !watch('subdomain')) {
      const generatedSubdomain = churchName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50);
      
      setValue('subdomain', generatedSubdomain);
    }
  }, [churchName, setValue, watch]);

  const onSubmit = async (data: RegistrationForm) => {
    setIsLoading(true);
    setError(null);
    

    try {
      const response = await apiRequest('/api/churches/register', {
        method: 'POST',
        body: JSON.stringify({
          churchName: data.churchName,
          adminFirstName: data.adminFirstName,
          adminLastName: data.adminLastName,
          adminEmail: data.adminEmail,
          password: data.password,
          subdomain: data.subdomain || undefined,
        }),
      });

      if (response.success) {
        // Store authentication token
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('church_data', JSON.stringify(response.church));
        localStorage.setItem('user_data', JSON.stringify(response.user));
        
        setSuccess(true);
        
        // Redirect to main app after short delay
        setTimeout(() => {
          setLocation('/dashboard');
        }, 2000);
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl text-green-800 dark:text-green-200">Welcome to ChurchConnect!</CardTitle>
            <CardDescription>
              Your church has been successfully registered and your 30-day free trial has started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Redirecting you to your dashboard...
            </p>
            <div className="flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/">
            <div className="inline-flex items-center space-x-2 mb-4 hover:opacity-80 transition-opacity">
              <Church className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">ChurchConnect</span>
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Start Your Free Trial
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Get full access to all features for 30 days. No credit card required.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Register Your Church</CardTitle>
            <CardDescription>
              Create your church account and start managing your congregation today.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Church Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white border-b pb-2">
                  Church Information
                </h3>
                
                <div>
                  <Label htmlFor="churchName">Church Name *</Label>
                  <Input
                    id="churchName"
                    {...register('churchName')}
                    placeholder="Grace Community Church"
                    className={errors.churchName ? 'border-red-500' : ''}
                  />
                  {errors.churchName && (
                    <p className="text-sm text-red-500 mt-1">{errors.churchName.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="subdomain">Church Subdomain (Optional)</Label>
                  <div className="flex">
                    <Input
                      id="subdomain"
                      {...register('subdomain')}
                      placeholder="grace-community"
                      className={`rounded-r-none ${errors.subdomain ? 'border-red-500' : ''}`}
                    />
                    <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-l-0 rounded-r-md text-sm text-gray-600 dark:text-gray-300">
                      .churchconnect.app
                    </div>
                  </div>
                  {errors.subdomain && (
                    <p className="text-sm text-red-500 mt-1">{errors.subdomain.message}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    This will be your church's unique web address
                  </p>
                </div>
              </div>

              {/* Admin User Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white border-b pb-2">
                  Admin Account
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="adminFirstName">First Name *</Label>
                    <Input
                      id="adminFirstName"
                      {...register('adminFirstName')}
                      placeholder="John"
                      className={errors.adminFirstName ? 'border-red-500' : ''}
                    />
                    {errors.adminFirstName && (
                      <p className="text-sm text-red-500 mt-1">{errors.adminFirstName.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="adminLastName">Last Name *</Label>
                    <Input
                      id="adminLastName"
                      {...register('adminLastName')}
                      placeholder="Smith"
                      className={errors.adminLastName ? 'border-red-500' : ''}
                    />
                    {errors.adminLastName && (
                      <p className="text-sm text-red-500 mt-1">{errors.adminLastName.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="adminEmail">Email Address *</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    {...register('adminEmail')}
                    placeholder="pastor@gracechurch.org"
                    className={errors.adminEmail ? 'border-red-500' : ''}
                  />
                  {errors.adminEmail && (
                    <p className="text-sm text-red-500 mt-1">{errors.adminEmail.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    {...register('password')}
                    placeholder="Minimum 8 characters"
                    className={errors.password ? 'border-red-500' : ''}
                  />
                  {errors.password && (
                    <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    {...register('confirmPassword')}
                    placeholder="Confirm your password"
                    className={errors.confirmPassword ? 'border-red-500' : ''}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-500 mt-1">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Your Church...
                  </>
                ) : (
                  <>
                    Start 30-Day Free Trial
                    <CheckCircle className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>

              <div className="text-center text-sm text-gray-600 dark:text-gray-300">
                Already have an account?{' '}
                <Link href="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                  Sign in here
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Trial Benefits */}
        <Card className="mt-6 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800">
          <CardContent className="pt-6">
            <h3 className="font-medium text-indigo-900 dark:text-indigo-100 mb-3">
              Your 30-Day Trial Includes:
            </h3>
            <ul className="space-y-2 text-sm text-indigo-800 dark:text-indigo-200">
              <li className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-2 text-indigo-600" />
                Unlimited members and features
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-2 text-indigo-600" />
                Biometric fingerprint check-in
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-2 text-indigo-600" />
                Advanced analytics and reporting
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-2 text-indigo-600" />
                Email and SMS notifications
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-2 text-indigo-600" />
                Priority support and setup assistance
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;