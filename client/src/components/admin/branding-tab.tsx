import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, Palette, Image as ImageIcon, FileImage, Eye, Church, RotateCcw } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { motion } from 'framer-motion';

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
        description: `${type === 'logo' ? 'Logo' : 'Banner'} uploaded successfully! Changes are now live.`,
      });

      // Trigger a page reload to refresh header branding
      setTimeout(() => {
        window.location.reload();
      }, 1000);

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

  const handleRemoveBranding = async (type: 'logo' | 'banner') => {
    setIsUploading(true);
    try {
      const response = await apiRequest('/api/churches/branding', {
        method: 'PUT',
        body: JSON.stringify({ 
          [type === 'logo' ? 'logoUrl' : 'bannerUrl']: "" 
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Update local state
      setBranding(prev => ({ 
        ...prev, 
        [type === 'logo' ? 'logoUrl' : 'bannerUrl']: undefined 
      }));
      
      toast({
        title: `${type === 'logo' ? 'Logo' : 'Banner'} Removed`,
        description: `Your church ${type} has been removed successfully!`,
      });

      // Trigger a page reload to refresh header branding
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error(`${type} removal error:`, error);
      toast({
        title: "Removal Failed",
        description: `Failed to remove ${type}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
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
        description: "Your church's brand color has been updated successfully! Changes are now live.",
      });

      // Trigger a page reload to refresh header branding
      setTimeout(() => {
        window.location.reload();
      }, 1000);

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
    <motion.div 
      className="space-y-6"
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
          hidden: { opacity: 0, y: -20 },
          visible: { opacity: 1, y: 0 }
        }}
      >
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Church Branding</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Customize your church's visual identity across the platform
        </p>
      </motion.div>

      {/* Live Preview */}
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 }
        }}
        whileHover={{ 
          scale: 1.01, 
          y: -4,
          transition: { duration: 0.2 }
        }}
      >
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border-blue-200 dark:border-gray-600 transition-all duration-300 hover:shadow-lg hover:border-blue-300 dark:hover:border-gray-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <Eye className="h-5 w-5" />
            Live Preview
          </CardTitle>
          <CardDescription className="text-blue-700 dark:text-blue-200">
            See how your branding will appear in the application header
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-700 dark:text-green-400 font-medium">
              ✓ Your branding is automatically saved and applied when you upload files or change colors!
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 overflow-hidden">
            {/* Banner Preview */}
            {branding.bannerUrl && (
              <div 
                className="h-16 bg-cover bg-center relative"
                style={{ backgroundImage: `url(${branding.bannerUrl})` }}
              >
                <div className="absolute inset-0 bg-black bg-opacity-20"></div>
              </div>
            )}
            
            {/* Header Preview */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {branding.logoUrl ? (
                  <img 
                    src={branding.logoUrl} 
                    alt="Preview Logo" 
                    className="h-8 w-auto object-contain"
                  />
                ) : (
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: branding.brandColor || '#6366f1' }}
                  >
                    <Church className="text-white text-sm" />
                  </div>
                )}
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                    ChurchConnect | Your Church
                  </h4>
                  <p className="text-xs text-gray-500">Biometric Attendance System</p>
                </div>
              </div>
            </div>
            
            {/* Navigation Preview */}
            <div className="border-t border-gray-200 dark:border-gray-600 px-4">
              <div className="flex space-x-6">
                {['Register', 'Check-In', 'Dashboard'].map((tab, index) => (
                  <div
                    key={tab}
                    className={`py-3 px-1 border-b-2 text-sm font-medium ${
                      index === 0 ? '' : 'border-transparent text-gray-500'
                    }`}
                    style={index === 0 ? { 
                      borderBottomColor: branding.brandColor || '#6366f1',
                      color: branding.brandColor || '#6366f1'
                    } : {}}
                  >
                    {tab}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
        </Card>
      </motion.div>

      {/* Logo Upload */}
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 }
        }}
        whileHover={{ 
          scale: 1.01, 
          y: -4,
          transition: { duration: 0.2 }
        }}
      >
        <Card className="transition-all duration-300 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600">
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
            <input
              type="file"
              id="logo-upload"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={(e) => handleFileUpload(e, 'logo')}
              disabled={isUploading}
              className="hidden"
            />
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                onClick={() => document.getElementById('logo-upload')?.click()}
                disabled={isUploading}
                className="relative hover:shadow-md transition-shadow"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? 'Uploading...' : branding.logoUrl ? 'Replace Logo' : 'Upload Logo'}
              </Button>
            </motion.div>
            {branding.logoUrl && (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleRemoveBranding('logo')}
                  disabled={isUploading}
                  className="text-red-600 hover:text-red-700 hover:shadow-md transition-shadow"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Remove
                </Button>
              </motion.div>
            )}
          </div>
        </CardContent>
        </Card>
      </motion.div>

      {/* Banner Upload */}
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 }
        }}
        whileHover={{ 
          scale: 1.01, 
          y: -4,
          transition: { duration: 0.2 }
        }}
      >
        <Card className="transition-all duration-300 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600">
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
              <input
                type="file"
                id="banner-upload"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={(e) => handleFileUpload(e, 'banner')}
                disabled={isUploading}
                className="hidden"
              />
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  onClick={() => document.getElementById('banner-upload')?.click()}
                  disabled={isUploading}
                  className="relative hover:shadow-md transition-shadow"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? 'Uploading...' : branding.bannerUrl ? 'Replace Banner' : 'Upload Banner'}
                </Button>
              </motion.div>
              {branding.bannerUrl && (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleRemoveBranding('banner')}
                    disabled={isUploading}
                    className="text-red-600 hover:text-red-700 hover:shadow-md transition-shadow"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Remove
                  </Button>
                </motion.div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Brand Color */}
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 }
        }}
        whileHover={{ 
          scale: 1.01, 
          y: -4,
          transition: { duration: 0.2 }
        }}
      >
        <Card className="transition-all duration-300 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={branding.brandColor || '#6366f1'}
                  onChange={(e) => handleBrandColorChange(e.target.value)}
                  disabled={isUpdating}
                  className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
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
              
              {/* Quick Color Presets */}
              <div>
                <Label className="text-xs text-gray-500">Quick presets:</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'].map((color) => (
                    <button
                      key={color}
                      onClick={() => handleBrandColorChange(color)}
                      className="w-6 h-6 rounded border-2 border-gray-300 hover:border-gray-400 transition-colors"
                      style={{ backgroundColor: color }}
                      disabled={isUpdating}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <Label>Preview Elements:</Label>
              <div className="space-y-2">
                <button
                  className="px-4 py-2 rounded-lg text-white font-medium text-sm w-full"
                  style={{ backgroundColor: branding.brandColor || '#6366f1' }}
                  disabled
                >
                  Sample Button
                </button>
                <div 
                  className="w-full h-1 rounded"
                  style={{ backgroundColor: branding.brandColor || '#6366f1' }}
                ></div>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: branding.brandColor || '#6366f1' }}
                  ></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">User Avatar</span>
                </div>
              </div>
            </div>
          </div>
          
          {isUpdating && (
            <div className="text-sm text-blue-600 dark:text-blue-400 flex items-center">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
              Updating brand color...
            </div>
          )}
          
          <div className="pt-2 border-t border-gray-200 dark:border-gray-600 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBrandColorChange('#6366f1')}
              disabled={isUpdating}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset to Default
            </Button>
          </div>
        </CardContent>
        </Card>
      </motion.div>

      {/* Branding Tips */}
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 }
        }}
        whileHover={{ 
          scale: 1.01, 
          y: -4,
          transition: { duration: 0.2 }
        }}
      >
        <Card className="transition-all duration-300 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600">
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
      </motion.div>
    </motion.div>
  );
}