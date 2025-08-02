import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Users, Edit, Trash2, Plus, Activity, Pause } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// Enhanced animated counter with spring effect
function AnimatedCounter({ target, duration = 2500 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for spring-like effect
      const easeOutBack = (t: number) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      };
      
      const easedProgress = easeOutBack(progress);
      const currentCount = Math.floor(easedProgress * target);
      setCount(Math.min(currentCount, target));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    const timer = setTimeout(() => {
      requestAnimationFrame(animate);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [target, duration]);
  
  return (
    <motion.span
      key={target}
      initial={{ scale: 1.2, opacity: 0.8 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ 
        type: "spring",
        damping: 20,
        stiffness: 300,
        duration: 0.6
      }}
    >
      {count}
    </motion.span>
  );
}

interface EventFormData {
  name: string;
  eventType: string;
  description: string;
  location: string;
  organizer: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export function EventsTab() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [formData, setFormData] = useState<EventFormData>({
    name: "",
    eventType: "sunday_service",
    description: "",
    location: "",
    organizer: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    isActive: true,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        duration: 0.6
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const eventCardVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: "backOut"
      }
    }
  };

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['/api/events'],
  });

  // Get event attendance counts
  const { data: attendanceCounts = [] } = useQuery({
    queryKey: ['/api/events/attendance-counts'],
  });

  const createEventMutation = useMutation({
    mutationFn: (data: EventFormData) => apiRequest(`/api/events`, { 
      method: "POST", 
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setDialogOpen(false);
      setEditingEvent(null);
      resetForm();
      toast({ 
        title: "Success!",
        description: "Event created successfully" 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error",
        description: error.message || "Failed to create event",
        variant: "destructive"
      });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EventFormData }) =>
      apiRequest(`/api/events/${id}`, { 
        method: "PUT", 
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setDialogOpen(false);
      setEditingEvent(null);
      resetForm();
      toast({ 
        title: "Success!",
        description: "Event updated successfully" 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error",
        description: error.message || "Failed to update event",
        variant: "destructive"
      });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/events/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ 
        title: "Success!",
        description: "Event deleted successfully" 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error",
        description: error.message || "Failed to delete event",
        variant: "destructive"
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      eventType: "sunday_service",
      description: "",
      location: "",
      organizer: "",
      startDate: "",
      endDate: "",
      startTime: "",
      endTime: "",
      isActive: true,
    });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEvent) {
      updateEventMutation.mutate({ id: editingEvent.id, data: formData });
    } else {
      createEventMutation.mutate(formData);
    }
  };

  const openDialog = (event?: any) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        name: event.name || "",
        eventType: event.eventType || "sunday_service",
        description: event.description || "",
        location: event.location || "",
        organizer: event.organizer || "",
        startDate: event.startDate || "",
        endDate: event.endDate || "",
        startTime: event.startTime || "",
        endTime: event.endTime || "",
        isActive: event.isActive !== false,
      });
    } else {
      setEditingEvent(null);
      resetForm();
    }
    setDialogOpen(true);
  };

  const filteredEvents = events.filter((event: any) => {
    if (filterActive === null) return true;
    return event.isActive === filterActive;
  });

  // Helper function to get attendance count for an event
  const getEventAttendanceCount = (eventId: string) => {
    const attendanceData = attendanceCounts.find((count: any) => count.eventId === eventId);
    return attendanceData ? Number(attendanceData.totalAttendees) : 0;
  };

  // Helper function to get attendance details for an event
  const getEventAttendanceDetails = (eventId: string) => {
    const attendanceData = attendanceCounts.find((count: any) => count.eventId === eventId);
    if (!attendanceData) return null;
    return {
      total: Number(attendanceData.totalAttendees),
      members: Number(attendanceData.members),
      visitors: Number(attendanceData.visitors),
      male: Number(attendanceData.maleCount),
      female: Number(attendanceData.femaleCount),
      children: Number(attendanceData.childCount),
      adolescents: Number(attendanceData.adolescentCount),
      adults: Number(attendanceData.adultCount),
    };
  };

  const getEventTypeLabel = (type: string) => {
    const types = {
      sunday_service: "Sunday Service",
      prayer_meeting: "Prayer Meeting",
      bible_study: "Bible Study",
      youth_group: "Youth Group",
      special_event: "Special Event",
      other: "Other",
    };
    return types[type as keyof typeof types] || type;
  };

  const getEventTypeBadgeColor = (type: string) => {
    const colors = {
      sunday_service: "bg-blue-500",
      prayer_meeting: "bg-purple-500",
      bible_study: "bg-green-500",
      youth_group: "bg-orange-500",
      special_event: "bg-red-500",
      other: "bg-gray-500",
    };
    return colors[type as keyof typeof colors] || "bg-gray-500";
  };

  return (
    <motion.div 
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Event Management</h2>
          <p className="text-muted-foreground">Create and manage church events for attendance tracking</p>
        </div>
        <Button onClick={() => openDialog()} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Event
        </Button>
      </div>

      <Tabs defaultValue="all-events" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all-events">All Events</TabsTrigger>
          <TabsTrigger value="active-events">Active Events</TabsTrigger>
          <TabsTrigger value="statistics">Event Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="all-events" className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={filterActive === null ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterActive(null)}
            >
              All
            </Button>
            <Button
              variant={filterActive === true ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterActive(true)}
            >
              Active
            </Button>
            <Button
              variant={filterActive === false ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterActive(false)}
            >
              Inactive
            </Button>
          </div>

          {isLoading ? (
            <div>Loading events...</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.map((event: any) => (
                <Card key={event.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{event.name}</CardTitle>
                        <Badge
                          className={`${getEventTypeBadgeColor(event.eventType)} text-white text-xs mt-1`}
                        >
                          {getEventTypeLabel(event.eventType)}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDialog(event)}
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteEventMutation.mutate(event.id)}
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {event.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {event.startDate ? format(new Date(event.startDate), "MMM dd, yyyy") : "No date set"}
                    </div>
                    
                    {event.startTime && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {event.startTime} {event.endTime && `- ${event.endTime}`}
                      </div>
                    )}
                    
                    {event.location && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {event.location}
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center pt-2">
                      <Badge variant={event.isActive ? "default" : "secondary"}>
                        {event.isActive ? "Active" : "Inactive"}
                      </Badge>
                      
                      {getEventAttendanceCount(event.id) > 0 && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <Users className="h-3 w-3 mr-1" />
                          {getEventAttendanceCount(event.id)} attendees
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active-events">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredEvents
              .filter((event: any) => event.isActive)
              .map((event: any) => (
                <Card key={event.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{event.name}</CardTitle>
                    <Badge className={`${getEventTypeBadgeColor(event.eventType)} text-white w-fit`}>
                      {getEventTypeLabel(event.eventType)}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Ready for attendance tracking
                    </p>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="statistics">
          <Card>
            <CardHeader>
              <CardTitle>Event Attendance Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              {attendanceCounts.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No attendance data available yet</p>
                  <p className="text-sm">Attendance will appear here after check-ins</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {attendanceCounts.map((eventData: any) => {
                    const details = getEventAttendanceDetails(eventData.eventId);
                    if (!details || details.total === 0) return null;
                    
                    return (
                      <div key={eventData.eventId} className="p-4 border rounded-lg bg-slate-50">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium">{eventData.eventName}</h4>
                            <Badge className={`${getEventTypeBadgeColor(eventData.eventType)} text-white text-xs mt-1`}>
                              {getEventTypeLabel(eventData.eventType)}
                            </Badge>
                          </div>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <Users className="h-3 w-3 mr-1" />
                            {details.total} Total
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="bg-white p-2 rounded border">
                            <p className="text-muted-foreground">Members</p>
                            <p className="font-medium text-blue-600">{details.members}</p>
                          </div>
                          <div className="bg-white p-2 rounded border">
                            <p className="text-muted-foreground">Visitors</p>
                            <p className="font-medium text-purple-600">{details.visitors}</p>
                          </div>
                          <div className="bg-white p-2 rounded border">
                            <p className="text-muted-foreground">Male / Female</p>
                            <p className="font-medium">{details.male} / {details.female}</p>
                          </div>
                          <div className="bg-white p-2 rounded border">
                            <p className="text-muted-foreground">C / A / Ad</p>
                            <p className="font-medium">{details.children} / {details.adolescents} / {details.adults}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
            <CardContent>
              <motion.div 
                className="grid gap-4 md:grid-cols-3"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.1
                    }
                  }
                }}
              >
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 }
                  }}
                >
                  <Card className="stat-card-hover cursor-pointer overflow-hidden relative h-[140px]">
                    <CardContent className="p-6 h-full flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600">Total Events</p>
                          <motion.p 
                            className="text-3xl font-bold text-slate-900"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.5, duration: 0.6 }}
                          >
                            <AnimatedCounter target={(events as any[]).length} />
                          </motion.p>
                        </div>
                        <motion.div 
                          className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                        >
                          <Calendar className="text-blue-500 text-xl pulse-icon" />
                        </motion.div>
                      </div>
                      <motion.p 
                        className="text-sm text-blue-600 mt-2"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 }}
                      >
                        <Calendar className="inline h-3 w-3 mr-1" />
                        All created events
                      </motion.p>
                      <motion.div
                        className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600"
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ delay: 1, duration: 1.2 }}
                      />
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 }
                  }}
                >
                  <Card className="stat-card-hover cursor-pointer overflow-hidden relative h-[140px]">
                    <CardContent className="p-6 h-full flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600">Active Events</p>
                          <motion.p 
                            className="text-3xl font-bold text-slate-900"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.6, duration: 0.6 }}
                          >
                            <AnimatedCounter target={(events as any[]).filter((e: any) => e.isActive).length} />
                          </motion.p>
                        </div>
                        <motion.div 
                          className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
                        >
                          <Activity className="text-green-500 text-xl pulse-icon" />
                        </motion.div>
                      </div>
                      <motion.p 
                        className="text-sm text-green-600 mt-2"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.9 }}
                      >
                        <Activity className="inline h-3 w-3 mr-1" />
                        Currently running
                      </motion.p>
                      <motion.div
                        className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-green-500 to-green-600"
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ delay: 1.1, duration: 1.2 }}
                      />
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 }
                  }}
                >
                  <Card className="stat-card-hover cursor-pointer overflow-hidden relative h-[140px]">
                    <CardContent className="p-6 h-full flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600">Inactive Events</p>
                          <motion.p 
                            className="text-3xl font-bold text-slate-900"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.7, duration: 0.6 }}
                          >
                            <AnimatedCounter target={(events as any[]).filter((e: any) => !e.isActive).length} />
                          </motion.p>
                        </div>
                        <motion.div 
                          className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
                        >
                          <Pause className="text-orange-500 text-xl pulse-icon" />
                        </motion.div>
                      </div>
                      <motion.p 
                        className="text-sm text-orange-600 mt-2"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.0 }}
                      >
                        <Pause className="inline h-3 w-3 mr-1" />
                        Not currently active
                      </motion.p>
                      <motion.div
                        className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-orange-500 to-orange-600"
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ delay: 1.2, duration: 1.2 }}
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "Create New Event"}</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Event Name</label>
              <Input
                placeholder="Sunday Morning Service"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Event Type</label>
              <select
                value={formData.eventType}
                onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                className="w-full p-2 border rounded-md"
                required
              >
                <option value="sunday_service">Sunday Service</option>
                <option value="prayer_meeting">Prayer Meeting</option>
                <option value="bible_study">Bible Study</option>
                <option value="youth_group">Youth Group</option>
                <option value="special_event">Special Event</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                placeholder="Event description..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Start Date</label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">End Date</label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Start Time</label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">End Time</label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Location</label>
              <Input
                placeholder="Main sanctuary"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Organizer</label>
              <Input
                placeholder="Pastor John"
                value={formData.organizer}
                onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">Active Event</div>
                <div className="text-sm text-muted-foreground">
                  Event is available for attendance tracking
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="ml-2"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createEventMutation.isPending || updateEventMutation.isPending}
              >
                {editingEvent ? "Update Event" : "Create Event"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}