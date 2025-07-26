import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { User, Phone, Mail, Calendar, Heart, MessageSquare, Filter, Users, UserCheck, Clock, Search, Edit } from "lucide-react";
import type { Visitor } from "@shared/schema";

export default function VisitorsTab() {
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "contacted" | "member">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState<"pending" | "contacted" | "member">("pending");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch visitors data
  const { data: visitors = [], isLoading } = useQuery<Visitor[]>({
    queryKey: ["/api/visitors"],
  });

  // Update visitor mutation
  const updateVisitorMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<Visitor> }) => {
      const response = await fetch(`/api/visitors/${data.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data.updates),
      });

      if (!response.ok) {
        throw new Error("Failed to update visitor");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Visitor information updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/visitors"] });
      setIsEditDialogOpen(false);
      setSelectedVisitor(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update visitor",
        variant: "destructive",
      });
    },
  });

  // Filter visitors based on status and search
  const filteredVisitors = visitors.filter((visitor: Visitor) => {
    const matchesStatus = filterStatus === "all" || visitor.followUpStatus === filterStatus;
    const matchesSearch = searchQuery === "" || 
      visitor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (visitor.email && visitor.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (visitor.phone && visitor.phone.includes(searchQuery));
    
    return matchesStatus && matchesSearch;
  });

  const handleEditVisitor = (visitor: Visitor) => {
    setSelectedVisitor(visitor);
    setEditNotes(visitor.comments || "");
    setEditStatus(visitor.followUpStatus as "pending" | "contacted" | "member");
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedVisitor) return;

    updateVisitorMutation.mutate({
      id: selectedVisitor.id,
      updates: {
        comments: editNotes,
        followUpStatus: editStatus,
      },
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "contacted":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Contacted</Badge>;
      case "member":
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Member</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const statusCounts = visitors.reduce((acc: Record<string, number>, visitor: Visitor) => {
    const status = visitor.followUpStatus || 'pending';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(258,90%,66%)] mx-auto"></div>
          <p className="mt-2 text-sm text-slate-600">Loading visitors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-slate-500" />
              <div>
                <p className="text-sm font-medium text-slate-600">Total Visitors</p>
                <p className="text-2xl font-bold">{visitors.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-slate-600">Pending Follow-up</p>
                <p className="text-2xl font-bold">{statusCounts.pending || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Phone className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-slate-600">Contacted</p>
                <p className="text-2xl font-bold">{statusCounts.contacted || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UserCheck className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-slate-600">Became Members</p>
                <p className="text-2xl font-bold">{statusCounts.member || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search visitors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Visitors</SelectItem>
              <SelectItem value="pending">Pending Follow-up</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="member">Became Members</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Visitors Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>First-Time Visitors ({filteredVisitors.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredVisitors.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No visitors found matching your criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Visit Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prayer Points</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVisitors.map((visitor: Visitor) => (
                    <TableRow key={visitor.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{visitor.name}</p>
                          {visitor.howDidYouHearAboutUs && (
                            <p className="text-xs text-slate-500">
                              Heard about us: {visitor.howDidYouHearAboutUs}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {visitor.phone && (
                            <div className="flex items-center space-x-1 text-sm">
                              <Phone className="h-3 w-3" />
                              <span>{visitor.phone}</span>
                            </div>
                          )}
                          {visitor.email && (
                            <div className="flex items-center space-x-1 text-sm">
                              <Mail className="h-3 w-3" />
                              <span>{visitor.email}</span>
                            </div>
                          )}
                          {visitor.whatsappNumber && (
                            <div className="flex items-center space-x-1 text-sm text-green-600">
                              <MessageSquare className="h-3 w-3" />
                              <span>WhatsApp: {visitor.whatsappNumber}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(visitor.visitDate!).toLocaleDateString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(visitor.followUpStatus!)}</TableCell>
                      <TableCell>
                        {visitor.prayerPoints ? (
                          <div className="flex items-center space-x-1">
                            <Heart className="h-3 w-3 text-red-500" />
                            <span className="text-sm truncate max-w-32" title={visitor.prayerPoints}>
                              {visitor.prayerPoints}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditVisitor(visitor)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Visitor Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Visitor Status</DialogTitle>
          </DialogHeader>
          
          {selectedVisitor && (
            <div className="space-y-4">
              <div>
                <p className="font-medium">{selectedVisitor.name}</p>
                <p className="text-sm text-slate-600">
                  Visited on {new Date(selectedVisitor.visitDate!).toLocaleDateString()}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Follow-up Status</label>
                <Select value={editStatus} onValueChange={(value: any) => setEditStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending Follow-up</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="member">Became Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Follow-up Notes</label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add follow-up notes or comments..."
                  rows={3}
                />
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={handleSaveEdit}
                  disabled={updateVisitorMutation.isPending}
                  className="flex-1"
                >
                  {updateVisitorMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={updateVisitorMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}