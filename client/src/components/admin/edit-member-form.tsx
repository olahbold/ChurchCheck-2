import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface Member {
  id: string;
  firstName: string;
  surname: string;
  title?: string;
  gender: 'male' | 'female';
  ageGroup: 'child' | 'adolescent' | 'adult';
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  address?: string;
  dateOfBirth?: string;
  weddingAnniversary?: string;
  fingerprintId?: string;
  parentId?: string;
  isCurrentMember: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EditMemberFormProps {
  member: Member;
  onSave: () => void;
  onCancel: () => void;
}

export function EditMemberForm({ member, onSave, onCancel }: EditMemberFormProps) {
  const [formData, setFormData] = useState({
    title: member.title || 'none',
    firstName: member.firstName,
    surname: member.surname,
    gender: member.gender,
    ageGroup: member.ageGroup,
    email: member.email || '',
    phone: member.phone || '',
    whatsappNumber: member.whatsappNumber || '',
    address: member.address || '',
    dateOfBirth: member.dateOfBirth || '',
    weddingAnniversary: member.weddingAnniversary || '',
    isCurrentMember: member.isCurrentMember,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Clean up empty strings to undefined for optional fields
      const cleanedData = { ...formData };
      Object.keys(cleanedData).forEach(key => {
        if (cleanedData[key as keyof typeof cleanedData] === "" || cleanedData[key as keyof typeof cleanedData] === "none") {
          if (key === 'dateOfBirth' || key === 'weddingAnniversary') {
            delete cleanedData[key as keyof typeof cleanedData];
          } else if (key === 'title' && cleanedData[key as keyof typeof cleanedData] === "none") {
            (cleanedData as any)[key] = undefined;
          } else {
            (cleanedData as any)[key] = undefined;
          }
        }
      });

      await apiRequest(`/api/members/${member.id}`, {
        method: 'PUT',
        body: cleanedData,
      });

      toast({
        title: "Success",
        description: "Member updated successfully.",
      });

      onSave();
    } catch (error) {
      console.error('Failed to update member:', error);
      toast({
        title: "Error",
        description: "Failed to update member. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title (Optional)</Label>
          <Select value={formData.title} onValueChange={(value) => handleInputChange('title', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select title" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Title</SelectItem>
              <SelectItem value="Mr">Mr</SelectItem>
              <SelectItem value="Mrs">Mrs</SelectItem>
              <SelectItem value="Miss">Miss</SelectItem>
              <SelectItem value="Ms">Ms</SelectItem>
              <SelectItem value="Dr">Dr</SelectItem>
              <SelectItem value="Prof">Prof</SelectItem>
              <SelectItem value="Rev">Rev</SelectItem>
              <SelectItem value="Pastor">Pastor</SelectItem>
              <SelectItem value="Elder">Elder</SelectItem>
              <SelectItem value="Deacon">Deacon</SelectItem>
              <SelectItem value="Deaconess">Deaconess</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="surname">Surname *</Label>
          <Input
            id="surname"
            value={formData.surname}
            onChange={(e) => handleInputChange('surname', e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender">Gender *</Label>
          <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ageGroup">Age Group *</Label>
          <Select value={formData.ageGroup} onValueChange={(value) => handleInputChange('ageGroup', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select age group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="child">Child</SelectItem>
              <SelectItem value="adolescent">Adolescent</SelectItem>
              <SelectItem value="adult">Adult</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder="e.g. +1234567890"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="member@example.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
          <Input
            id="whatsappNumber"
            type="tel"
            value={formData.whatsappNumber}
            onChange={(e) => handleInputChange('whatsappNumber', e.target.value)}
            placeholder="e.g. +1234567890"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <textarea
          id="address"
          value={formData.address}
          onChange={(e) => handleInputChange('address', e.target.value)}
          placeholder="Full residential address"
          rows={3}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <Input
            id="dateOfBirth"
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="weddingAnniversary">Wedding Anniversary</Label>
          <Input
            id="weddingAnniversary"
            type="date"
            value={formData.weddingAnniversary}
            onChange={(e) => handleInputChange('weddingAnniversary', e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isCurrentMember"
          checked={formData.isCurrentMember}
          onCheckedChange={(checked) => handleInputChange('isCurrentMember', checked)}
        />
        <Label htmlFor="isCurrentMember">Current Member</Label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            'Update Member'
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}