import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  UserPlus, 
  Edit, 
  Trash2, 
  Shield, 
  Users, 
  Eye,
  CheckCircle,
  XCircle 
} from "lucide-react";

// Demo data to show the interface
const demoUsers = [
  {
    id: "1",
    username: "admin",
    fullName: "Church Administrator",
    email: "admin@church.com",
    role: "admin",
    region: "Main Campus",
    isActive: true,
    lastLogin: "2025-01-30T14:30:00Z",
    createdAt: "2025-01-01T10:00:00Z"
  },
  {
    id: "2", 
    username: "volunteer1",
    fullName: "Sarah Johnson",
    email: "sarah@church.com",
    role: "volunteer",
    region: "Youth Center",
    isActive: true,
    lastLogin: "2025-01-30T09:15:00Z",
    createdAt: "2025-01-15T14:20:00Z"
  },
  {
    id: "3",
    username: "dataviewer1", 
    fullName: "Pastor Michael",
    email: "pastor@church.com",
    role: "data_viewer",
    region: "Main Campus",
    isActive: true,
    lastLogin: "2025-01-29T16:45:00Z",
    createdAt: "2025-01-10T11:30:00Z"
  }
];

export default function UserManagementDemo() {
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

  const formatLastLogin = (lastLogin: string) => {
    const date = new Date(lastLogin);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card className="church-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-[hsl(0,84%,60%)]/10 rounded-lg flex items-center justify-center">
                  <Shield className="text-[hsl(0,84%,60%)] text-xl" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-semibold text-slate-900">User Management Demo</CardTitle>
                  <p className="text-slate-600">This is how the admin user management interface looks</p>
                </div>
              </div>
              <Button className="bg-[hsl(258,90%,66%)] hover:bg-[hsl(258,90%,56%)] text-white">
                <UserPlus className="h-4 w-4 mr-2" />
                Add New User
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Users List */}
        <div className="grid gap-4">
          {demoUsers.map((user) => (
            <Card key={user.id} className="church-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                      <span className="text-slate-600 font-medium text-lg">
                        {user.fullName.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-slate-900">{user.fullName}</h3>
                        {getRoleBadge(user.role)}
                        {user.isActive ? (
                          <CheckCircle className="h-4 w-4 text-[hsl(142,76%,36%)]" />
                        ) : (
                          <XCircle className="h-4 w-4 text-[hsl(0,84%,60%)]" />
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-slate-600">
                        <span>@{user.username}</span>
                        <span>•</span>
                        <span>{user.email}</span>
                        {user.region && (
                          <>
                            <span>•</span>
                            <span>{user.region}</span>
                          </>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        Last login: {formatLastLogin(user.lastLogin)} • Created: {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-[hsl(0,84%,60%)] border-[hsl(0,84%,60%)]/20 hover:bg-[hsl(0,84%,60%)]/10">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Role Descriptions */}
        <Card className="church-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">User Role Permissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 border border-[hsl(0,84%,60%)]/20 rounded-lg bg-[hsl(0,84%,60%)]/5">
                <div className="flex items-center space-x-2 mb-2">
                  <Shield className="h-5 w-5 text-[hsl(0,84%,60%)]" />
                  <h4 className="font-medium text-slate-900">Administrator</h4>
                </div>
                <p className="text-sm text-slate-600">
                  Full access to all features including user management, settings, reports, and system administration.
                </p>
              </div>
              <div className="p-4 border border-[hsl(142,76%,36%)]/20 rounded-lg bg-[hsl(142,76%,36%)]/5">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="h-5 w-5 text-[hsl(142,76%,36%)]" />
                  <h4 className="font-medium text-slate-900">Volunteer</h4>
                </div>
                <p className="text-sm text-slate-600">
                  Limited access for check-in operations. Perfect for service helpers and ushers during church services.
                </p>
              </div>
              <div className="p-4 border border-[hsl(45,93%,47%)]/20 rounded-lg bg-[hsl(45,93%,47%)]/5">
                <div className="flex items-center space-x-2 mb-2">
                  <Eye className="h-5 w-5 text-[hsl(45,93%,47%)]" />
                  <h4 className="font-medium text-slate-900">Data Viewer</h4>
                </div>
                <p className="text-sm text-slate-600">
                  Read-only access to reports and analytics. Ideal for pastors and leadership who need insights but not admin access.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}