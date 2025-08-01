import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { insertVisitorSchema, type InsertVisitor, type Visitor } from "@shared/schema";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { User, Phone, Mail, Calendar, Heart, MessageSquare, Filter, Users, UserCheck, Clock, Search, Edit, Plus, UserPlus, Save, X, Download } from "lucide-react";

export default function VisitorsTab() {
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "contacted" | "member">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState<"pending" | "contacted" | "member">("pending");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get active events for event selection
  const { data: activeEvents = [] } = useQuery<any[]>({
    queryKey: ['/api/events/active'],
  });

  // Export function
  const handleExportVisitors = async () => {
    try {
      const response = await fetch('/api/export/visitors');
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const date = new Date().toISOString().split('T')[0];
      a.download = `visitors_export_${date}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "Visitors data exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export visitors data",
        variant: "destructive",
      });
    }
  };

  // Form for adding new visitors
  const form = useForm<InsertVisitor & { eventId?: string }>({
    resolver: zodResolver(insertVisitorSchema.extend({
      eventId: z.string().optional()
    })),
    defaultValues: {
      name: "",
      gender: undefined,
      ageGroup: undefined,
      address: "",
      email: "",
      phone: "",
      whatsappNumber: "",
      eventId: "none",
      weddingAnniversary: "",
      birthday: "",
      prayerPoints: "",
      howDidYouHearAboutUs: "",
      comments: "",
      followUpStatus: "pending",
      assignedTo: "",
    },
  });

  // Form for editing visitors
  const editForm = useForm<InsertVisitor & { eventId?: string }>({
    resolver: zodResolver(insertVisitorSchema.extend({
      eventId: z.string().optional()
    })),
    defaultValues: {
      name: "",
      gender: undefined,
      ageGroup: undefined,
      address: "",
      email: "",
      phone: "",
      whatsappNumber: "",
      weddingAnniversary: "",
      birthday: "",
      prayerPoints: "",
      howDidYouHearAboutUs: "",
      comments: "",
      followUpStatus: "pending",
      assignedTo: "",
      eventId: "none",
    },
  });

  // Fetch visitors data
  const { data: visitors = [], isLoading } = useQuery<Visitor[]>({
    queryKey: ["/api/visitors"],
  });

  // Create visitor mutation - now includes check-in
  const createVisitorMutation = useMutation({
    mutationFn: async (data: InsertVisitor & { eventId?: string }) => {
      return await apiRequest('/api/visitor-checkin', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/visitors'] });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events/attendance-counts'] });
      toast({
        title: "Success",
        description: "Visitor registered and attendance recorded! They are now included in today's attendance and event statistics.",
      });
      form.reset();
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to register visitor",
        variant: "destructive",
      });
    },
  });

  // Update visitor mutation
  const updateVisitorMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<Visitor> }) => {
      return await apiRequest(`/api/visitors/${data.id}`, {
        method: "PATCH",
        body: JSON.stringify(data.updates),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Visitor information updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/visitors"] });
      setIsEditDialogOpen(false);
      setSelectedVisitor(null);
      editForm.reset();
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
    // Pre-populate the edit form with visitor data
    editForm.reset({
      name: visitor.name || "",
      gender: visitor.gender as "male" | "female" | undefined,
      ageGroup: visitor.ageGroup as "child" | "adolescent" | "adult" | undefined,
      address: visitor.address || "",
      email: visitor.email || "",
      phone: visitor.phone || "",
      whatsappNumber: visitor.whatsappNumber || "",
      weddingAnniversary: visitor.weddingAnniversary || "",
      birthday: visitor.birthday || "",
      prayerPoints: visitor.prayerPoints || "",
      howDidYouHearAboutUs: visitor.howDidYouHearAboutUs || "",
      comments: visitor.comments || "",
      followUpStatus: visitor.followUpStatus as "pending" | "contacted" | "member" || "pending",
      assignedTo: visitor.assignedTo || "",
    });
    setIsEditDialogOpen(true);
  };

  const onSubmit = (data: InsertVisitor & { eventId?: string }) => {
    if (!data.eventId || data.eventId === "none") {
      toast({
        title: "Event Required",
        description: "Please select an event for this visitor's attendance.",
        variant: "destructive",
      });
      return;
    }

    // Ensure optional fields are handled properly
    const cleanedData = {
      ...data,
      address: data.address || "",
      email: data.email || "",
      phone: data.phone || "",
      whatsappNumber: data.whatsappNumber || "",
      prayerPoints: data.prayerPoints || "",
      howDidYouHearAboutUs: data.howDidYouHearAboutUs || "",
      comments: data.comments || "",
      assignedTo: data.assignedTo || "",
      // Only include date fields if they have values
      ...(data.weddingAnniversary && { weddingAnniversary: data.weddingAnniversary }),
      ...(data.birthday && { birthday: data.birthday }),
    };
    createVisitorMutation.mutate(cleanedData);
  };

  const onEditSubmit = (data: InsertVisitor & { eventId?: string }) => {
    if (!selectedVisitor) return;

    // Clean the data similar to create mutation
    const cleanedData = {
      ...data,
      address: data.address || "",
      email: data.email || "",
      phone: data.phone || "",
      whatsappNumber: data.whatsappNumber || "",
      prayerPoints: data.prayerPoints || "",
      howDidYouHearAboutUs: data.howDidYouHearAboutUs || "",
      comments: data.comments || "",
      assignedTo: data.assignedTo || "",
      // Only include date fields if they have values
      ...(data.weddingAnniversary && { weddingAnniversary: data.weddingAnniversary }),
      ...(data.birthday && { birthday: data.birthday }),
    };

    updateVisitorMutation.mutate({
      id: selectedVisitor.id,
      updates: cleanedData,
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

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
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

        <div className="flex gap-2">
          <Button 
            onClick={handleExportVisitors}
            variant="outline"
            className="border-[hsl(258,90%,66%)] text-[hsl(258,90%,66%)] hover:bg-[hsl(258,90%,66%)] hover:text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Visitors
          </Button>
          <Button 
            onClick={() => setIsAddDialogOpen(true)} 
            className="bg-[hsl(258,90%,66%)] hover:bg-[hsl(258,90%,60%)] text-white"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Visitor
          </Button>
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
                    <TableHead>Demographics</TableHead>
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
                        <div className="flex flex-col space-y-1">
                          {visitor.gender && (
                            <Badge variant="outline" className="capitalize">
                              {visitor.gender}
                            </Badge>
                          )}
                          {visitor.ageGroup && (
                            <Badge variant="secondary" className="capitalize">
                              {visitor.ageGroup}
                            </Badge>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Edit className="h-5 w-5 text-[hsl(258,90%,66%)]" />
              <span>Edit Visitor Information</span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedVisitor && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                {/* Event Selection for tracking attendance changes */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-green-900 mb-2">Update Event Attendance</h4>
                  <p className="text-sm text-green-700 mb-3">
                    Optionally change which event this visitor attended or add event attendance if missing.
                  </p>
                  <FormField
                    control={editForm.control}
                    name="eventId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select event (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No event selected</SelectItem>
                            {activeEvents.map((event: any) => (
                              <SelectItem key={event.id} value={event.id}>
                                {event.name} ({event.eventType.replace(/_/g, ' ')})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name Field */}
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Gender Field */}
                  <FormField
                    control={editForm.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Age Group Field */}
                  <FormField
                    control={editForm.control}
                    name="ageGroup"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Age Group</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select age group" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="child">Child</SelectItem>
                            <SelectItem value="adolescent">Adolescent</SelectItem>
                            <SelectItem value="adult">Adult</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Address Field */}
                  <FormField
                    control={editForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter home address" 
                            rows={2}
                            {...field}
                            value={field.value || ""} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Email Field */}
                  <FormField
                    control={editForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter email address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Phone Field */}
                  <FormField
                    control={editForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (Mobile)</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Wedding Anniversary */}
                  <FormField
                    control={editForm.control}
                    name="weddingAnniversary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wedding Anniversary</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            value={field.value || ""} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Birthday */}
                  <FormField
                    control={editForm.control}
                    name="birthday"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Birthday</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            value={field.value || ""} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* WhatsApp Number */}
                  <FormField
                    control={editForm.control}
                    name="whatsappNumber"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>WhatsApp Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter WhatsApp number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Prayer Points */}
                  <FormField
                    control={editForm.control}
                    name="prayerPoints"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Prayer Points</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Please share prayer requests..." 
                            rows={3}
                            {...field}
                            value={field.value || ""} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* How did you hear about us */}
                  <FormField
                    control={editForm.control}
                    name="howDidYouHearAboutUs"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>How did you hear about us?</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Please tell us how you found out about our church..." 
                            rows={2}
                            {...field}
                            value={field.value || ""} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Comments */}
                  <FormField
                    control={editForm.control}
                    name="comments"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Comments</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Any additional comments or feedback..." 
                            rows={3}
                            {...field}
                            value={field.value || ""} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Assigned To */}
                  <FormField
                    control={editForm.control}
                    name="assignedTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned Pastor/Volunteer</FormLabel>
                        <FormControl>
                          <Input placeholder="Who will follow up?" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Follow-up Status */}
                  <FormField
                    control={editForm.control}
                    name="followUpStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Follow-up Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pending">Pending Follow-up</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="member">Became Member</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex space-x-2 pt-4">
                  <Button
                    type="submit"
                    disabled={updateVisitorMutation.isPending}
                    className="flex-1 bg-[hsl(258,90%,66%)] hover:bg-[hsl(258,90%,60%)] text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateVisitorMutation.isPending ? "Updating..." : "Update Visitor Information"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                    disabled={updateVisitorMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Visitor Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-[hsl(258,90%,66%)]" />
              <span>First-Timer Information Form</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="text-sm text-slate-600 mb-4">
            <p>We sincerely want to thank you for attending today's service. We hope you enjoyed the service with us. We certainly look forward to seeing you again and share with you the benefit of fellowship.</p>
            <p className="mt-2">We would love to pray with you on your prayer points as well. Please complete the form below to enable us know you better and pray along with you. God bless you richly in Jesus' name.</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Event Selection - Required for attendance tracking */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-blue-900 mb-2">Event Attendance</h4>
                <p className="text-sm text-blue-700 mb-3">
                  Select the event this visitor is attending to automatically record their attendance.
                </p>
                <FormField
                  control={form.control}
                  name="eventId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select event for attendance tracking" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeEvents.map((event: any) => (
                            <SelectItem key={event.id} value={event.id}>
                              {event.name} ({event.eventType.replace(/_/g, ' ')})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name Field */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Gender Field */}
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Age Group Field */}
                <FormField
                  control={form.control}
                  name="ageGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age Group</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select age group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="child">Child</SelectItem>
                          <SelectItem value="adolescent">Adolescent</SelectItem>
                          <SelectItem value="adult">Adult</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Address Field */}
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter home address" 
                          rows={2}
                          {...field}
                          value={field.value || ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email Field */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phone Field */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (Mobile)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Wedding Anniversary */}
                <FormField
                  control={form.control}
                  name="weddingAnniversary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wedding Anniversary</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          value={field.value || ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Birthday */}
                <FormField
                  control={form.control}
                  name="birthday"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Birthday</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          value={field.value || ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* WhatsApp Number */}
                <FormField
                  control={form.control}
                  name="whatsappNumber"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>WhatsApp Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter WhatsApp number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Prayer Points */}
                <FormField
                  control={form.control}
                  name="prayerPoints"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Your Prayer Points</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Please share your prayer requests..." 
                          rows={3}
                          {...field}
                          value={field.value || ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* How did you hear about us */}
                <FormField
                  control={form.control}
                  name="howDidYouHearAboutUs"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>How did you hear about us?</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Please tell us how you found out about our church..." 
                          rows={2}
                          {...field}
                          value={field.value || ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Comments */}
                <FormField
                  control={form.control}
                  name="comments"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Your Comments (if any)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any additional comments or feedback..." 
                          rows={3}
                          {...field}
                          value={field.value || ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Assigned To */}
                <FormField
                  control={form.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned Pastor/Volunteer</FormLabel>
                      <FormControl>
                        <Input placeholder="Who will follow up?" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Follow-up Status */}
                <FormField
                  control={form.control}
                  name="followUpStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Follow-up Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pending Follow-up</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="member">Became Member</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex space-x-2 pt-4">
                <Button
                  type="submit"
                  disabled={createVisitorMutation.isPending}
                  className="flex-1 bg-[hsl(258,90%,66%)] hover:bg-[hsl(258,90%,60%)] text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {createVisitorMutation.isPending ? "Checking In..." : "Check In Visitor"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  disabled={createVisitorMutation.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}