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
import { FingerprintScanner } from "@/components/ui/fingerprint-scanner";
import { useToast } from "@/hooks/use-toast";
import { Save, X, Link, Unlink } from "lucide-react";

export default function RegisterTab() {
  const [showFingerprintEnroll, setShowFingerprintEnroll] = useState(false);
  const [enrolledFingerprintId, setEnrolledFingerprintId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertMember>({
    resolver: zodResolver(insertMemberSchema),
    defaultValues: {
      firstName: "",
      surname: "",
      group: "male",
      phone: "",
      dateOfBirth: "",
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
    (m.group === 'male' || m.group === 'female') && !m.parentId
  );

  // Create member mutation
  const createMemberMutation = useMutation({
    mutationFn: async (data: InsertMember) => {
      const response = await apiRequest('POST', '/api/members', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/members'] });
      toast({
        title: "Success",
        description: "Member registered successfully!",
      });
      form.reset();
      setEnrolledFingerprintId(null);
      setShowFingerprintEnroll(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to register member",
        variant: "destructive",
      });
    },
  });

  // Fingerprint enrollment mutation
  const enrollFingerprintMutation = useMutation({
    mutationFn: async (data: { memberId: string; fingerprintId: string }) => {
      const response = await apiRequest('POST', '/api/fingerprint/enroll', data);
      return response.json();
    },
  });

  const onSubmit = (data: InsertMember) => {
    const memberData = {
      ...data,
      fingerprintId: enrolledFingerprintId || undefined,
    };
    createMemberMutation.mutate(memberData);
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Registration Form */}
      <Card className="church-card">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-slate-900">Member Registration</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="church-form-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
              {(form.watch("group") === "child" || form.watch("group") === "adolescent") && (
                <FormField
                  control={form.control}
                  name="parentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link to Parent</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="church-form-input">
                            <SelectValue placeholder="Select parent (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">No parent link</SelectItem>
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

              {/* Fingerprint Enrollment */}
              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-lg font-medium text-slate-900 mb-4">Fingerprint Enrollment</h3>
                {!showFingerprintEnroll && !enrolledFingerprintId && (
                  <div className="bg-slate-50 rounded-lg p-6 text-center">
                    <div className="w-24 h-24 bg-[hsl(258,90%,66%)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-fingerprint text-[hsl(258,90%,66%)] text-3xl"></i>
                    </div>
                    <p className="text-slate-600 mb-4">Place finger on scanner to enroll</p>
                    <Button 
                      type="button" 
                      onClick={() => setShowFingerprintEnroll(true)}
                      className="church-button-primary"
                    >
                      Start Enrollment
                    </Button>
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
                    }}
                  />
                )}

                {enrolledFingerprintId && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <div className="text-green-600 mb-2">
                      <i className="fas fa-check-circle text-2xl"></i>
                    </div>
                    <p className="text-green-800 font-medium">Fingerprint Successfully Enrolled!</p>
                    <p className="text-sm text-green-600">ID: {enrolledFingerprintId}</p>
                  </div>
                )}
              </div>

              <div className="flex space-x-4">
                <Button 
                  type="submit" 
                  disabled={createMemberMutation.isPending}
                  className="church-button-primary flex-1"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {createMemberMutation.isPending ? "Registering..." : "Register Member"}
                </Button>
                <Button 
                  type="button" 
                  onClick={clearForm}
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
                          {child.group === 'child' ? 'Child' : 'Adolescent'} - {child.dateOfBirth}
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
  );
}
