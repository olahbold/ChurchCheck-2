import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { insertMemberSchema, type InsertMember, type Member } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FingerprintScanner } from "@/components/ui/fingerprint-scanner";
import { useToast } from "@/hooks/use-toast";
import { Save, X, Link, Unlink, Fingerprint, Search, RotateCcw, AlertTriangle, CheckCircle, UserPlus, ChevronRight, Download } from "lucide-react";

export default function RegisterTab() {
  const [showFingerprintEnroll, setShowFingerprintEnroll] = useState(false);
  const [enrolledFingerprintId, setEnrolledFingerprintId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [showUpdateConfirmation, setShowUpdateConfirmation] = useState(false);
  const [showFingerprintDialog, setShowFingerprintDialog] = useState(false);
  const [showParentContactDialog, setShowParentContactDialog] = useState(false);
  const [pendingParentId, setPendingParentId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Export function
  const handleExportMembers = async () => {
    try {
      const response = await fetch('/api/export/members');
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const date = new Date().toISOString().split('T')[0];
      a.download = `members_export_${date}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "Members data exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export members data",
        variant: "destructive",
      });
    }
  };

  const form = useForm<InsertMember>({
    resolver: zodResolver(insertMemberSchema),
    defaultValues: {
      title: "",
      firstName: "",
      surname: "",
      gender: "male",
      ageGroup: "adult",
      phone: "",
      email: "",
      whatsappNumber: "",
      address: "",
      dateOfBirth: "",
      weddingAnniversary: "",
      isCurrentMember: true,
      fingerprintId: "",
      parentId: "",
    },
  });

  // Fetch all members for family linking
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ['/api/members'],
  });

  // Get potential parents (adults without parentId)
  const potentialParents = members.filter(m => 
    m.ageGroup === 'adult' && !m.parentId
  );

  // Helper functions
  const handleClearForm = () => {
    form.reset();
    setEnrolledFingerprintId(null);
    setShowFingerprintEnroll(false);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedMember(null);
    setIsUpdateMode(false);
    setShowUpdateConfirmation(false);
    setShowFingerprintDialog(false);
    setShowParentContactDialog(false);
    setPendingParentId(null);
  };

  const handleSearchMembers = () => {
    if (searchQuery.trim().length >= 2) {
      searchMembersMutation.mutate(searchQuery.trim());
    } else {
      toast({
        title: "Search Query Too Short",
        description: "Please enter at least 2 characters to search.",
        variant: "destructive",
      });
    }
  };

  const handleSelectMember = (member: Member) => {
    setSelectedMember(member);
    setIsUpdateMode(true);
    setSearchResults([]);
    
    // Populate form with existing member data
    form.reset({
      title: member.title || "",
      firstName: member.firstName,
      surname: member.surname,
      gender: member.gender as "male" | "female",
      ageGroup: member.ageGroup as "child" | "adolescent" | "adult",
      phone: member.phone,
      email: member.email || "",
      whatsappNumber: member.whatsappNumber || "",
      address: member.address || "",
      dateOfBirth: member.dateOfBirth || "",
      weddingAnniversary: member.weddingAnniversary || "",
      isCurrentMember: member.isCurrentMember,
      fingerprintId: member.fingerprintId || undefined,
      parentId: member.parentId || "",
    });
    
    // Set existing fingerprint if available
    if (member.fingerprintId) {
      setEnrolledFingerprintId(member.fingerprintId);
    }
  };

  // Handle parent selection with contact info prompt
  const handleParentSelection = (parentId: string) => {
    const currentAgeGroup = form.getValues("ageGroup");
    if ((currentAgeGroup === "child" || currentAgeGroup === "adolescent") && parentId && parentId !== "none") {
      const parent = potentialParents.find(p => p.id === parentId);
      if (parent && (parent.phone || parent.address)) {
        setPendingParentId(parentId);
        setShowParentContactDialog(true);
      } else {
        form.setValue("parentId", parentId);
      }
    } else {
      form.setValue("parentId", parentId === "none" ? "" : parentId);
    }
  };

  const handleCopyParentContact = (copyContact: boolean) => {
    if (pendingParentId && copyContact) {
      const parent = potentialParents.find(p => p.id === pendingParentId);
      if (parent) {
        if (parent.phone && !form.getValues("phone")) {
          form.setValue("phone", parent.phone);
        }
        if (parent.whatsappNumber && !form.getValues("whatsappNumber")) {
          form.setValue("whatsappNumber", parent.whatsappNumber);
        }
        if (parent.address && !form.getValues("address")) {
          form.setValue("address", parent.address);
        }
        toast({
          title: "Contact Information Copied",
          description: "Parent's contact details have been copied to this member's profile.",
        });
      }
    }
    
    form.setValue("parentId", pendingParentId || "");
    setShowParentContactDialog(false);
    setPendingParentId(null);
  };

  // Search members mutation
  const searchMembersMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest(`/api/members?search=${encodeURIComponent(query)}`);
      return response as Member[];
    },
    onSuccess: (results) => {
      setSearchResults(results);
    },
    onError: () => {
      toast({
        title: "Search Failed",
        description: "Unable to search members. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create member mutation
  const createMemberMutation = useMutation({
    mutationFn: async (data: InsertMember) => {
      const response = await apiRequest('/api/members', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: (result) => {
      console.log('Member created successfully:', result);
      queryClient.invalidateQueries({ queryKey: ['/api/members'] });
      toast({
        title: "Success",
        description: "Member registered successfully!",
      });
      handleClearForm();
    },
    onError: (error) => {
      console.log('Member creation error:', error);
      toast({
        title: "Registration Failed",
        description: error.message || "Please check your information and try again.",
        variant: "destructive",
      });
    },
  });

  // Update member mutation
  const updateMemberMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<InsertMember> }) => {
      const response = await apiRequest(`/api/members/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify(data.updates),
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/members'] });
      toast({
        title: "Success",
        description: "Member updated successfully!",
      });
      handleClearForm();
      setShowUpdateConfirmation(false);
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Please check your information and try again.",
        variant: "destructive",
      });
    },
  });

  // Fingerprint enrollment mutation
  const enrollFingerprintMutation = useMutation({
    mutationFn: async (data: { memberId: string; fingerprintId: string }) => {
      const response = await apiRequest('/api/fingerprint/enroll', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response;
    },
  });

  const onSubmit = (data: InsertMember) => {
    console.log('Form submitted with data:', data);
    const memberData = {
      ...data,
      fingerprintId: enrolledFingerprintId || undefined,
    };
    console.log('Processed member data:', memberData);
    console.log('Is update mode?', isUpdateMode, 'Has selected member?', !!selectedMember);
    
    if (isUpdateMode && selectedMember) {
      setShowUpdateConfirmation(true);
    } else {
      console.log('Creating member via mutation...');
      createMemberMutation.mutate(memberData);
    }
  };

  const handleConfirmUpdate = () => {
    if (selectedMember) {
      const formData = form.getValues();
      const memberData = {
        ...formData,
        fingerprintId: enrolledFingerprintId || selectedMember.fingerprintId || undefined,
      };
      
      updateMemberMutation.mutate({
        id: selectedMember.id,
        updates: memberData
      });
    }
  };

  const handleFingerprintEnroll = (fingerprintId: string) => {
    setEnrolledFingerprintId(fingerprintId);
    setShowFingerprintEnroll(false);
    toast({
      title: "Fingerprint Enrolled",
      description: "Fingerprint has been successfully enrolled!",
    });
  };

  const clearForm = () => {
    form.reset();
    setEnrolledFingerprintId(null);
    setShowFingerprintEnroll(false);
  };

  // Get children for the selected parent (for display purposes)
  const selectedParentId = form.watch("parentId");
  const parentChildren = members.filter(m => m.parentId === selectedParentId);

  return (
    <div className="space-y-6">
      {/* Member Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Existing Members
          </CardTitle>
          <p className="text-sm text-slate-600">
            Search before registering to prevent duplicates. If found, you can update their information instead.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Input
              placeholder="Search by name (partial match supported)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchMembers()}
              className="flex-1"
            />
            <Button 
              onClick={handleSearchMembers}
              disabled={searchMembersMutation.isPending || searchQuery.trim().length < 2}
              className="bg-[hsl(258,90%,66%)] hover:bg-[hsl(258,90%,60%)] text-white"
            >
              <Search className="h-4 w-4 mr-2" />
              {searchMembersMutation.isPending ? "Searching..." : "Search"}
            </Button>
            <Button 
              onClick={handleExportMembers}
              variant="outline"
              className="border-[hsl(258,90%,66%)] text-[hsl(258,90%,66%)] hover:bg-[hsl(258,90%,66%)] hover:text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            {(isUpdateMode || searchResults.length > 0) && (
              <Button 
                variant="outline"
                onClick={handleClearForm}
                className="border-slate-300"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-slate-700">Found {searchResults.length} members:</p>
              <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                {searchResults.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => handleSelectMember(member)}
                    className="w-full p-3 text-left hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {member.title && `${member.title} `}{member.firstName} {member.surname}
                      </p>
                      <p className="text-sm text-slate-500">
                        {member.gender} • {member.ageGroup} • {member.phone}
                        {member.email && ` • ${member.email}`}
                      </p>
                    </div>
                    <div className="flex items-center text-slate-400">
                      {member.fingerprintId && <Fingerprint className="h-4 w-4 mr-2" />}
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Update Mode Indicator */}
          {isUpdateMode && selectedMember && (
            <Alert className="mt-4 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <strong>Update Mode:</strong> Editing {selectedMember.firstName} {selectedMember.surname}'s information.
                {selectedMember.fingerprintId && " (Fingerprint enrolled)"}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Registration Form */}
        <Card className="church-card">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-slate-900">
              {isUpdateMode ? 'Update Member Information' : 'Member Registration'}
            </CardTitle>
          </CardHeader>
          <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="church-form-input">
                            <SelectValue placeholder="Select title" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No title</SelectItem>
                          <SelectItem value="Mr">Mr</SelectItem>
                          <SelectItem value="Mrs">Mrs</SelectItem>
                          <SelectItem value="Ms">Ms</SelectItem>
                          <SelectItem value="Dr">Dr</SelectItem>
                          <SelectItem value="Pastor">Pastor</SelectItem>
                          <SelectItem value="Rev">Rev</SelectItem>
                          <SelectItem value="Elder">Elder</SelectItem>
                          <SelectItem value="Deacon">Deacon</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter first name" {...field} className="church-form-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="surname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Surname</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter surname" {...field} className="church-form-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="church-form-input">
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
                <FormField
                  control={form.control}
                  name="ageGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age Group</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="church-form-input">
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 123-4567" {...field} className="church-form-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="whatsappNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 123-4567" {...field} value={field.value || ""} className="church-form-input" />
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
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john.doe@example.com" {...field} value={field.value || ""} className="church-form-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main Street, City, State, ZIP" {...field} value={field.value || ""} className="church-form-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} className="church-form-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.watch("ageGroup") === "adult" && (
                  <FormField
                    control={form.control}
                    name="weddingAnniversary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wedding Anniversary</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value || ""} className="church-form-input" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <FormField
                control={form.control}
                name="isCurrentMember"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Member</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => field.onChange(value === "true")}
                        defaultValue={field.value ? "true" : "false"}
                        className="flex space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="true" id="current-yes" />
                          <Label htmlFor="current-yes">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="false" id="current-no" />
                          <Label htmlFor="current-no">No</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Parent Selection for Children */}
              {(form.watch("ageGroup") === "child" || form.watch("ageGroup") === "adolescent") && (
                <FormField
                  control={form.control}
                  name="parentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link to Parent</FormLabel>
                      <Select onValueChange={handleParentSelection} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="church-form-input">
                            <SelectValue placeholder="Select parent (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No parent link</SelectItem>
                          {potentialParents.map((parent) => (
                            <SelectItem key={parent.id} value={parent.id}>
                              {parent.firstName} {parent.surname}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Biometric Enrollment Section */}
              <div className="border-t border-slate-200 pt-6">
                {!showFingerprintEnroll && !enrolledFingerprintId && (
                  <div className="bg-slate-50 rounded-lg p-8 text-center">
                    {/* Device Biometrics Status */}
                    <div className="flex justify-center mb-6">
                      <div className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        🟢 Device Biometrics
                      </div>
                    </div>

                    {/* Biometric Scanner Circle */}
                    <div className="flex justify-center mb-8">
                      <div className="w-40 h-40 bg-white rounded-full shadow-lg flex items-center justify-center">
                        <Fingerprint className="h-16 w-16 text-[hsl(258,90%,66%)]" />
                      </div>
                    </div>

                    {/* Title and Description */}
                    <div className="mb-8">
                      <h3 className="text-2xl font-semibold text-slate-900 mb-3">Biometric Authentication</h3>
                      <p className="text-slate-600">Use your device biometric authentication to enroll fingerprint</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-4 max-w-sm mx-auto">
                      <div className="grid grid-cols-2 gap-3">
                        <Button 
                          type="button" 
                          onClick={() => setShowFingerprintEnroll(true)}
                          className="bg-[hsl(258,90%,66%)] hover:bg-[hsl(258,90%,60%)] text-white py-3 px-6"
                        >
                          <Fingerprint className="h-4 w-4 mr-2" />
                          Device
                        </Button>
                        <Button 
                          type="button" 
                          onClick={() => {
                            // Simulate enrollment for testing
                            const simulatedId = `sim_${Date.now()}`;
                            setEnrolledFingerprintId(simulatedId);
                            form.setValue('fingerprintId', simulatedId);
                            toast({
                              title: "Simulation Complete",
                              description: "Fingerprint simulation enrolled successfully",
                            });
                          }}
                          variant="outline"
                          className="py-3 px-6 border-slate-300"
                        >
                          <Fingerprint className="h-4 w-4 mr-2" />
                          Simulate
                        </Button>
                      </div>
                      
                      <Button 
                        type="button" 
                        variant="outline"
                        className="w-full py-3 border-slate-300"
                        onClick={() => {
                          toast({
                            title: "External Scanner Setup",
                            description: "External scanner configuration not yet implemented",
                          });
                        }}
                      >
                        ⚙️ Setup External Scanner
                      </Button>

                      <Button 
                        type="button" 
                        onClick={() => setShowFingerprintEnroll(true)}
                        className="w-full bg-[hsl(258,90%,66%)] hover:bg-[hsl(258,90%,60%)] text-white py-4 text-lg font-medium"
                      >
                        Start Biometric Scan
                      </Button>
                    </div>

                    {/* Supported Methods */}
                    <p className="text-sm text-slate-500 mt-6">
                      Supported: Fingerprint, Face Recognition, PIN, or Pattern
                    </p>
                  </div>
                )}

                {showFingerprintEnroll && (
                  <FingerprintScanner
                    mode="enroll"
                    userId={`temp_${Date.now()}`}
                    userName={`${form.getValues('firstName')} ${form.getValues('surname')}`.trim() || 'New Member'}
                    onScanComplete={handleFingerprintEnroll}
                    onError={(error) => {
                      toast({
                        title: "Biometric Enrollment Error",
                        description: error,
                        variant: "destructive",
                      });
                      setShowFingerprintEnroll(false);
                    }}
                  />
                )}

                {enrolledFingerprintId && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <div className="text-green-600 mb-2 text-2xl">✅</div>
                    <p className="text-green-800 font-medium">Fingerprint Successfully Enrolled!</p>
                    <p className="text-sm text-green-600 mt-1">ID: {enrolledFingerprintId}</p>
                    <Button 
                      type="button" 
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEnrolledFingerprintId(null);
                        form.setValue('fingerprintId', '');
                      }}
                      className="mt-3"
                    >
                      Re-enroll
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex space-x-4">
                <Button 
                  type="submit" 
                  disabled={createMemberMutation.isPending || updateMemberMutation.isPending}
                  className="church-button-primary flex-1"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isUpdateMode
                    ? (updateMemberMutation.isPending ? "Updating..." : "Update Member")
                    : (createMemberMutation.isPending ? "Registering..." : "Register Member")
                  }
                </Button>
                <Button 
                  type="button" 
                  onClick={handleClearForm}
                  variant="outline"
                  className="church-button-secondary"
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Family Linking Panel */}
      <Card className="church-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">Family Linking</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600 mb-6">Link children to parent accounts for quick family check-ins.</p>
          
          {selectedParentId && potentialParents.find(p => p.id === selectedParentId) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">
                    {potentialParents.find(p => p.id === selectedParentId)?.firstName}{' '}
                    {potentialParents.find(p => p.id === selectedParentId)?.surname}
                  </p>
                  <p className="text-sm text-slate-500">Parent</p>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-600 text-sm rounded-full">Selected</span>
              </div>

              {parentChildren.length > 0 && (
                <div className="ml-6 space-y-2">
                  {parentChildren.map((child) => (
                    <div key={child.id} className="flex items-center justify-between p-3 bg-blue-50 border-l-4 border-[hsl(258,90%,66%)] rounded-r-lg">
                      <div>
                        <p className="font-medium text-slate-900">{child.firstName} {child.surname}</p>
                        <p className="text-sm text-slate-500">
                          {child.ageGroup === 'child' ? 'Child' : 'Adolescent'} - {child.dateOfBirth}
                        </p>
                      </div>
                      <Unlink className="h-4 w-4 text-red-500 cursor-pointer hover:text-red-600" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!selectedParentId && (
            <div className="text-center py-8">
              <Link className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500">Select a parent when registering a child to see family links</p>
            </div>
          )}

          <Button className="church-button-outline mt-6 w-full">
            <Link className="mr-2 h-4 w-4" />
            Manage Family Links
          </Button>
        </CardContent>
      </Card>
      </div>

      {/* Update Confirmation Dialog */}
      <Dialog open={showUpdateConfirmation} onOpenChange={setShowUpdateConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Confirm Member Update
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Are you sure you want to update <strong>{selectedMember?.firstName} {selectedMember?.surname}</strong>'s information?
            </p>
            {selectedMember?.fingerprintId && !enrolledFingerprintId && (
              <Alert className="border-blue-200 bg-blue-50">
                <AlertDescription>
                  <strong>Fingerprint Preserved:</strong> The existing fingerprint enrollment will be kept.
                </AlertDescription>
              </Alert>
            )}
            {enrolledFingerprintId && enrolledFingerprintId !== selectedMember?.fingerprintId && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertDescription>
                  <strong>Fingerprint Updated:</strong> A new fingerprint has been enrolled and will replace the existing one.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateConfirmation(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmUpdate} disabled={updateMemberMutation.isPending}>
              {updateMemberMutation.isPending ? "Updating..." : "Confirm Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fingerprint Re-enrollment Dialog */}
      <Dialog open={showFingerprintDialog} onOpenChange={setShowFingerprintDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-blue-500" />
              Fingerprint Options
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              <strong>{selectedMember?.firstName} {selectedMember?.surname}</strong> already has a fingerprint enrolled.
            </p>
            <div className="space-y-2">
              <Button
                onClick={() => {
                  setShowFingerprintDialog(false);
                  setShowFingerprintEnroll(true);
                }}
                className="w-full justify-start"
                variant="outline"
              >
                <Fingerprint className="h-4 w-4 mr-2" />
                Re-enroll New Fingerprint
              </Button>
              <Button
                onClick={() => setShowFingerprintDialog(false)}
                className="w-full justify-start"
                variant="outline"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Keep Existing Fingerprint
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Parent Contact Information Dialog */}
      <Dialog open={showParentContactDialog} onOpenChange={setShowParentContactDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-500" />
              Copy Parent's Contact Information?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {pendingParentId && (
              <>
                <p>
                  Would you like to copy <strong>{potentialParents.find(p => p.id === pendingParentId)?.firstName} {potentialParents.find(p => p.id === pendingParentId)?.surname}</strong>'s contact information to this {form.getValues("ageGroup")}?
                </p>
                <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                  <p className="text-sm text-slate-700 font-medium">Parent's Contact Details:</p>
                  {potentialParents.find(p => p.id === pendingParentId)?.phone && (
                    <p className="text-sm">📞 {potentialParents.find(p => p.id === pendingParentId)?.phone}</p>
                  )}
                  {potentialParents.find(p => p.id === pendingParentId)?.whatsappNumber && (
                    <p className="text-sm">📱 {potentialParents.find(p => p.id === pendingParentId)?.whatsappNumber}</p>
                  )}
                  {potentialParents.find(p => p.id === pendingParentId)?.address && (
                    <p className="text-sm">🏠 {potentialParents.find(p => p.id === pendingParentId)?.address}</p>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  This will only copy information to empty fields and won't overwrite existing data.
                </p>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleCopyParentContact(false)}>
              Skip - Keep Empty
            </Button>
            <Button onClick={() => handleCopyParentContact(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
              Yes, Copy Contact Info
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
