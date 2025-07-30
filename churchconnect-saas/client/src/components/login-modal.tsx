import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { AdminUser } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Shield, Lock, User, AlertCircle } from "lucide-react";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: AdminUser) => void;
}

interface LoginCredentials {
  username: string;
  password: string;
}

export default function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  const [error, setError] = useState<string>("");
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors }, reset } = useForm<LoginCredentials>();

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      // Simulate authentication by checking against our demo users
      const demoUsers = [
        { 
          id: "efa94252-630b-4db7-b06e-ed9bb23646cb",
          username: "admin", 
          password: "admin123", 
          fullName: "Church Administrator",
          email: "admin@church.com",
          role: "admin" as const,
          region: "Main Campus",
          isActive: true,
          lastLogin: undefined,
          createdAt: "2025-07-26T22:05:43.317Z",
          updatedAt: "2025-07-26T22:05:42.800Z"
        },
        { 
          id: "e5e6bd8a-d3cb-48b2-adb8-8f563bccbd8d",
          username: "volunteer1", 
          password: "vol123", 
          fullName: "Sarah Johnson",
          email: "sarah@church.com",
          role: "volunteer" as const,
          region: "Children Ministry",
          isActive: true,
          lastLogin: undefined,
          createdAt: "2025-07-26T22:05:44.031Z",
          updatedAt: "2025-07-26T22:05:43.960Z"
        },
        { 
          id: "f2094948-d278-4663-b56e-e7344a071f99",
          username: "dataviewer", 
          password: "data123", 
          fullName: "Mark Thompson",
          email: "mark@church.com",
          role: "data_viewer" as const,
          region: "Youth Center",
          isActive: true,
          lastLogin: undefined,
          createdAt: "2025-07-26T22:05:45.815Z",
          updatedAt: "2025-07-26T22:05:45.742Z"
        }
      ];

      const user = demoUsers.find(u => 
        u.username === credentials.username && u.password === credentials.password
      );

      if (!user) {
        throw new Error("Invalid username or password");
      }

      if (!user.isActive) {
        throw new Error("Account is inactive. Please contact an administrator.");
      }

      return user;
    },
    onSuccess: (user) => {
      toast({
        title: "Login Successful",
        description: `Welcome back, ${user.fullName}!`,
      });
      onLogin(user);
      reset();
      setError("");
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  const onSubmit = (data: LoginCredentials) => {
    setError("");
    loginMutation.mutate(data);
  };

  const handleClose = () => {
    reset();
    setError("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-[hsl(258,90%,66%)]/10 rounded-lg flex items-center justify-center">
              <Shield className="text-[hsl(258,90%,66%)] text-xl" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-slate-900">Admin Login</DialogTitle>
              <DialogDescription className="text-slate-600">
                Enter your credentials to access the admin section
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                className="pl-10 church-form-input"
                {...register("username", { required: "Username is required" })}
              />
            </div>
            {errors.username && (
              <p className="text-sm text-red-600">{errors.username.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                className="pl-10 church-form-input"
                {...register("password", { required: "Password is required" })}
              />
            </div>
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div className="flex justify-between items-center pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loginMutation.isPending}
              className="church-button-primary"
            >
              {loginMutation.isPending ? "Signing in..." : "Sign In"}
            </Button>
          </div>
        </form>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-slate-50 rounded-lg border">
          <h4 className="text-sm font-medium text-slate-900 mb-3">Demo Credentials</h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="font-medium">Admin:</span>
              <span className="text-slate-600">admin / admin123</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Volunteer:</span>
              <span className="text-slate-600">volunteer1 / vol123</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Data Viewer:</span>
              <span className="text-slate-600">dataviewer / data123</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}