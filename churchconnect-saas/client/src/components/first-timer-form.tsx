import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar, User, Heart, MessageSquare, Phone, Mail, MapPin } from "lucide-react";
import { insertVisitorSchema, type InsertVisitor } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface FirstTimerFormProps {
  onSubmit?: (visitorData: InsertVisitor) => void;
  onCancel?: () => void;
  churchName?: string;
}

export default function FirstTimerForm({ 
  onSubmit, 
  onCancel, 
  churchName = "The Redeemed Christian Church of God"
}: FirstTimerFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertVisitor>({
    resolver: zodResolver(insertVisitorSchema),
    defaultValues: {
      name: "",
      address: "",
      email: "",
      phone: "",
      whatsappNumber: "",
      weddingAnniversary: "",
      birthday: "",
      prayerPoints: "",
      howDidYouHearAboutUs: "",
      comments: "",
      followUpStatus: "pending" as const,
      assignedTo: "",
      memberId: null,
    },
  });

  const createVisitorMutation = useMutation({
    mutationFn: async (data: InsertVisitor) => {
      const response = await fetch("/api/visitors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to submit visitor information");
      }

      return response.json();
    },
    onSuccess: (visitor) => {
      toast({
        title: "Welcome!",
        description: "Thank you for visiting us. We look forward to staying in touch!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/visitors"] });
      onSubmit?.(visitor);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit visitor information",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (data: InsertVisitor) => {
    setIsSubmitting(true);
    try {
      await createVisitorMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[hsl(258,90%,66%)] to-[hsl(271,91%,65%)] rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            {churchName}
          </CardTitle>
          <p className="text-lg font-medium text-[hsl(258,90%,66%)]">
            Overcomers' Parish, Torquay
          </p>
          
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
            <h3 className="font-semibold text-lg mb-2">Information for First Timers</h3>
            <p className="text-sm text-slate-600">
              We sincerely want to thank you for attending today's service. We hope you enjoyed the service with us. We certainly look forward to seeing you again and share with you the benefit of fellowship.
            </p>
            <p className="text-sm text-slate-600 mt-2">
              We would love to pray with you on your prayer points as well. Please complete the form below to enable us know you better and pray along with you. God bless you richly in Jesus' name.
            </p>
          </div>

          <Badge className="mt-4 bg-green-100 text-green-700">
            <Calendar className="h-3 w-3 mr-1" />
            Date: {new Date().toLocaleDateString()}
          </Badge>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>Name *</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your full name" 
                        {...field} 
                        className="text-lg p-3"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Address */}
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4" />
                      <span>Address</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter your address" 
                        {...field} 
                        value={field.value || ""}
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email and Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center space-x-2">
                        <Mail className="h-4 w-4" />
                        <span>Email</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder="your@email.com" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center space-x-2">
                        <Phone className="h-4 w-4" />
                        <span>Phone (Mobile)</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="tel"
                          placeholder="+44 123 456 7890" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Gender and Age Group */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              {/* WhatsApp Number */}
              <FormField
                control={form.control}
                name="whatsappNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp Number</FormLabel>
                    <FormControl>
                      <Input 
                        type="tel"
                        placeholder="+44 123 456 7890" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Special Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Prayer Points */}
              <FormField
                control={form.control}
                name="prayerPoints"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center space-x-2">
                      <Heart className="h-4 w-4" />
                      <span>Your Prayer Points</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Please share any prayer requests you would like us to pray for..." 
                        {...field} 
                        value={field.value || ""}
                        rows={3}
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
                  <FormItem>
                    <FormLabel>How did you hear about us?</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Friend, family, social media, search online, etc..." 
                        {...field} 
                        value={field.value || ""}
                        rows={2}
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
                  <FormItem>
                    <FormLabel className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>Your Comments (if any)</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any comments or feedback about today's service..." 
                        {...field} 
                        value={field.value || ""}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-6">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-[hsl(258,90%,66%)] to-[hsl(271,91%,65%)] hover:from-[hsl(258,85%,61%)] hover:to-[hsl(271,86%,60%)] text-white py-3 text-lg"
                >
                  {isSubmitting ? "Submitting..." : "Submit Information"}
                </Button>
                
                {onCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="px-8"
                  >
                    Cancel
                  </Button>
                )}
              </div>

              <div className="text-center mt-6 text-xs text-slate-500">
                <p>Thank you for taking the time to share this information with us.</p>
                <p>We look forward to building a relationship with you!</p>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}