import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, Palette, Image as ImageIcon, FileImage } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface BrandingData {
  logoUrl?: string;
  bannerUrl?: string;
  brandColor?: string;
}

export function BrandingTab() {
  const [branding, setBranding] = useState<BrandingData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  // Load current branding on component mount
  useEffect(() => {
    loadBranding();
  }, []);

  const loadBranding = async () => {
    try {
      const response = await apiRequest('/api/churches/branding');
      setBranding(response);
    } catch (error) {
      console.error('Failed to load branding:', error);
      toast({
        title: "Error",
        description: "Failed to load church branding settings.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a JPEG, PNG, GIF, or WebP image.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append(type, file);

      const response = await fetch('/api/churches/upload-branding', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      // Update local state with new URLs
      setBranding(prev => ({
        ...prev,
        ...(result.logoUrl && { logoUrl: result.logoUrl }),
        ...(result.bannerUrl && { bannerUrl: result.bannerUrl }),
      }));

      toast({
        title: "Upload Successful",
        description: `${type === 'logo' ? 'Logo' : 'Banner'} uploaded successfully!`,
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset the input
      event.target.value = '';
    }
  };

  const handleBrandColorChange = async (color: string) => {
    setIsUpdating(true);
    try {
      await apiRequest('/api/churches/branding', {
        method: 'PUT',
        body: JSON.stringify({ brandColor: color }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      setBranding(prev => ({ ...prev, brandColor: color }));
      
      toast({
        title: "Brand Color Updated",
        description: "Your church's brand color has been updated successfully.",
      });

    } catch (error) {
      console.error('Brand color update error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update brand color. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading branding settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Church Branding</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Customize your church's visual identity across the platform
        </p>
      </div>

      {/* Logo Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Church Logo
          </CardTitle>
          <CardDescription>
            Upload your church logo. Recommended size: 200x80 pixels. Max file size: 5MB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {branding.logoUrl && (
            <div className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              <img 
                src={branding.logoUrl} 
                alt="Church Logo" 
                className="max-h-20 object-contain"
              />
            </div>
          )}
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="file"
                id="logo-upload"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'logo')}
                disabled={isUploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button disabled={isUploading} className="relative">
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? 'Uploading...' : branding.logoUrl ? 'Replace Logo' : 'Upload Logo'}
              </Button>
            </div>
            {branding.logoUrl && (
              <p className="text-sm text-gray-500">Current logo uploaded</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Banner Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileImage className="h-5 w-5" />
            Church Banner
          </CardTitle>
          <CardDescription>
            Upload a banner image for your church. Recommended size: 1200x400 pixels. Max file size: 5MB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {branding.bannerUrl && (
            <div className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              <img 
                src={branding.bannerUrl} 
                alt="Church Banner" 
                className="max-h-32 w-full object-cover rounded"
              />
            </div>
          )}
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="file"
                id="banner-upload"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'banner')}
                disabled={isUploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button disabled={isUploading} className="relative">
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? 'Uploading...' : branding.bannerUrl ? 'Replace Banner' : 'Upload Banner'}
              </Button>
            </div>
            {branding.bannerUrl && (
              <p className="text-sm text-gray-500">Current banner uploaded</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Brand Color */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Brand Color
          </CardTitle>
          <CardDescription>
            Choose your church's primary brand color. This will be used for buttons, highlights, and accents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={branding.brandColor || '#6366f1'}
                onChange={(e) => handleBrandColorChange(e.target.value)}
                disabled={isUpdating}
                className="w-12 h-12 rounded border-2 border-gray-300 cursor-pointer"
              />
              <div>
                <Label>Brand Color</Label>
                <Input
                  type="text"
                  value={branding.brandColor || '#6366f1'}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                      handleBrandColorChange(value);
                    }
                  }}
                  disabled={isUpdating}
                  className="w-24 font-mono text-sm"
                  placeholder="#6366f1"
                />
              </div>
            </div>
            
            {/* Color Preview */}
            <div className="flex-1 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Preview:</span>
                <div 
                  className="px-4 py-2 rounded text-white font-medium"
                  style={{ backgroundColor: branding.brandColor || '#6366f1' }}
                >
                  Sample Button
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branding Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Branding Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li>• <strong>Logo:</strong> Use a high-contrast logo that works on both light and dark backgrounds</li>
            <li>• <strong>Banner:</strong> Choose an image that represents your church's mission and values</li>
            <li>• <strong>Color:</strong> Select a color that reflects your church's personality and is accessible</li>
            <li>• <strong>Consistency:</strong> Use the same branding across all your church communications</li>
            <li>• <strong>File formats:</strong> We support JPEG, PNG, GIF, and WebP images</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}