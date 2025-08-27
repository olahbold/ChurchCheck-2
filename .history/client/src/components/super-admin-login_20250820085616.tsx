import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";


interface SuperAdminLoginProps {
  onLogin: (token: string, admin: any) => void;
}

export function SuperAdminLogin({ onLogin }: SuperAdminLoginProps) {
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
 const [confirm, setConfirm] = useState("");
 const [isChecking, setIsChecking] = useState(true);
 const [isFirstSetup, setIsFirstSetup] = useState(false);
 const [showPassword, setShowPassword] = useState(false);
 const [showConfirm, setShowConfirm] = useState(false);

  const { toast } = useToast();

   // simple password rules for first setup
 const minLen = 8;
 const passwordTooShort = useMemo(
   () => password.length > 0 && password.length < minLen,
   [password]
 );
const confirmMismatch = useMemo(
  () => isFirstSetup && confirm.length > 0 && confirm !== password,
   [isFirstSetup, confirm, password]
 );

 // check if a super admin already exists
 useEffect(() => {
  let alive = true;
  (async () => {
     try {
       const res = await fetch("/api/super-admin/check");
      const data = await res.json().catch(() => ({}));
       if (!alive) return;
      setIsFirstSetup(!data?.exists);
     } catch {
      // if check fails, fall back to normal login
        setIsFirstSetup(false);     } finally {
       if (alive) setIsChecking(false);
     }
  })();
   return () => { alive = false; };
 }, []);
 const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();
    setIsLoading(true);

    try {
      // choose endpoint based on first-setup
    const endpoint = isFirstSetup ? "/api/super-admin/first-login" : "/api/super-admin/login";
    // light client-side validation for first setup
    if (isFirstSetup) {
      if (passwordTooShort) {
        toast({ title: "Password too short", description: `Use at least ${minLen} characters.`, variant: "destructive" });
         setIsLoading(false);
         return;
      }
       if (confirmMismatch) {
        toast({ title: "Passwords don’t match", description: "Confirm password must match.", variant: "destructive" });
       setIsLoading(false);
         return;
      }
    }
      const response = await fetch(endpoint, {


        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('super_admin_token', data.token);
        onLogin(data.token, data.admin);
        toast({
          title: "Login Successful",
          description: `Welcome back, ${data.admin.firstName}!`,
        });
      } else {
        toast({
          title: "Login Failed",
          description: data.error || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Super admin login error:', error);
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-bold">Super Admin Login</CardTitle>
          <p className="text-sm text-muted-foreground">
            Access the ChurchConnect platform management dashboard
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@churchconnect.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>
          <div className="mt-6 text-center text-xs text-muted-foreground">
            ChurchConnect Super Admin Portal
          </div>
        </CardContent>
      </Card>
    </div>
  );
}