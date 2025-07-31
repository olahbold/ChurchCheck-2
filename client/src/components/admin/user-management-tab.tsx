import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { insertAdminUserSchema, type InsertAdminUser } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { AdminUser } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  UserPlus, 
  Edit, 
  Trash2, 
  Key, 
  Users, 
  Shield, 
  Eye, 
  Clock,
  CheckCircle,
  XCircle 
} from "lucide-react";

export default function UserManagementTab() {
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertAdminUser>({
    resolver: zodResolver(insertAdminUserSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      email: "",
      role: "volunteer",
      region: "",
      isActive: true,
    },
  });

  // Fetch admin users
  const { data: adminUsers = [] } = useQuery<AdminUser[]>({
    queryKey: ['/api/admin/users'],
  });

  // Create admin user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: InsertAdminUser) => {
      return await apiRequest('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Success",
        description: "Admin user created successfully!",
      });
      form.reset();
      setIsAddUserOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create admin user",
        variant: "destructive",
      });
    },
  });

  // Update admin user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertAdminUser> }) => {
      return await apiRequest(`/api/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Success",
        description: "Admin user updated successfully!",
      });
      setEditingUser(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update admin user",
        variant: "destructive",
      });
    },
  });

  // Delete admin user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/admin/users/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Success",
        description: "Admin user deleted successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete admin user",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertAdminUser) => {
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, data });
    } else {
      createUserMutation.mutate(data);
    }
  };

  const handleEdit = (user: AdminUser) => {
    setEditingUser(user);
    form.reset({
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      region: user.region || "",
      isActive: user.isActive,
      password: "", // Don't prefill password
    });
    setIsAddUserOpen(true);
  };

  const handleDelete = (user: AdminUser) => {
    if (window.confirm(`Are you sure you want to delete ${user.fullName}? This action cannot be undone.`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      admin: { color: "bg-[hsl(0,84%,60%)]/10 text-[hsl(0,84%,60%)]", icon: Shield },
      volunteer: { color: "bg-[hsl(142,76%,36%)]/10 text-[hsl(142,76%,36%)]", icon: Users },
      data_viewer: { color: "bg-[hsl(45,93%,47%)]/10 text-[hsl(45,93%,47%)]", icon: Eye },
    };

    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.volunteer;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} font-medium`}>
        <Icon className="h-3 w-3 mr-1" />
        {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  const roleStats = adminUsers.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* User Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="church-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Users</p>
              <p className="text-3xl font-bold text-slate-900">{adminUsers.length}</p>
            </div>
            <div className="w-12 h-12 bg-[hsl(258,90%,66%)]/10 rounded-lg flex items-center justify-center">
              <Users className="text-[hsl(258,90%,66%)] text-xl" />
            </div>
          </div>
        </Card>

        <Card className="church-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Admins</p>
              <p className="text-3xl font-bold text-slate-900">{roleStats.admin || 0}</p>
            </div>
            <div className="w-12 h-12 bg-[hsl(0,84%,60%)]/10 rounded-lg flex items-center justify-center">
              <Shield className="text-[hsl(0,84%,60%)] text-xl" />
            </div>
          </div>
        </Card>

        <Card className="church-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Volunteers</p>
              <p className="text-3xl font-bold text-slate-900">{roleStats.volunteer || 0}</p>
            </div>
            <div className="w-12 h-12 bg-[hsl(142,76%,36%)]/10 rounded-lg flex items-center justify-center">
              <Users className="text-[hsl(142,76%,36%)] text-xl" />
            </div>
          </div>
        </Card>

        <Card className="church-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Data Viewers</p>
              <p className="text-3xl font-bold text-slate-900">{roleStats.data_viewer || 0}</p>
            </div>
            <div className="w-12 h-12 bg-[hsl(45,93%,47%)]/10 rounded-lg flex items-center justify-center">
              <Eye className="text-[hsl(45,93%,47%)] text-xl" />
            </div>
          </div>
        </Card>
      </div>

      {/* User Management */}
      <Card className="church-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-900">User Access Management</CardTitle>
          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <DialogTrigger asChild>
              <Button className="church-button-primary">
                <UserPlus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? 'Edit Admin User' : 'Add New Admin User'}
                </DialogTitle>
                <DialogDescription>
                  {editingUser 
                    ? 'Update user access and permissions' 
                    : 'Create a new admin user with specific role and permissions'}
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter username" {...field} className="church-form-input" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter full name" {...field} className="church-form-input" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="Enter email address" 
                            {...field} 
                            className="church-form-input" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder={editingUser ? "Leave blank to keep current password" : "Enter password"} 
                            {...field} 
                            className="church-form-input" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="church-form-input">
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="admin">
                                <div className="flex items-center">
                                  <Shield className="h-4 w-4 mr-2 text-[hsl(0,84%,60%)]" />
                                  Admin - Full Access
                                </div>
                              </SelectItem>
                              <SelectItem value="volunteer">
                                <div className="flex items-center">
                                  <Users className="h-4 w-4 mr-2 text-[hsl(142,76%,36%)]" />
                                  Volunteer - Check-in Only
                                </div>
                              </SelectItem>
                              <SelectItem value="data_viewer">
                                <div className="flex items-center">
                                  <Eye className="h-4 w-4 mr-2 text-[hsl(45,93%,47%)]" />
                                  Data Viewer - Reports Only
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="region"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Region (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Main Campus, Youth Center" 
                              {...field} 
                              value={field.value || ""}
                              className="church-form-input" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-200 p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active User</FormLabel>
                          <div className="text-sm text-slate-600">
                            Active users can log in and access their assigned features
                          </div>
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

                  <div className="flex justify-end space-x-4 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAddUserOpen(false);
                        setEditingUser(null);
                        form.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createUserMutation.isPending || updateUserMutation.isPending}
                      className="church-button-primary"
                    >
                      {editingUser ? 'Update User' : 'Create User'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {adminUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-[hsl(258,90%,66%)] rounded-full flex items-center justify-center">
                    <span className="text-white font-medium">
                      {user.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-3">
                      <p className="font-medium text-slate-900">{user.fullName}</p>
                      {getRoleBadge(user.role)}
                      {user.isActive ? (
                        <CheckCircle className="h-4 w-4 text-[hsl(142,76%,36%)]" />
                      ) : (
                        <XCircle className="h-4 w-4 text-[hsl(0,84%,60%)]" />
                      )}
                    </div>
                    <p className="text-sm text-slate-500">
                      @{user.username} • {user.email}
                      {user.region && ` • ${user.region}`}
                    </p>
                    {user.lastLogin && (
                      <p className="text-xs text-slate-400 flex items-center mt-1">
                        <Clock className="h-3 w-3 mr-1" />
                        Last login: {new Date(user.lastLogin).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(user)}
                    className="text-xs"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    <Key className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(user)}
                    className="text-xs text-[hsl(0,84%,60%)] hover:text-[hsl(0,84%,60%)]"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}

            {adminUsers.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-500">No admin users found</p>
                <p className="text-sm text-slate-400">Click "Add User" to create your first admin user</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}