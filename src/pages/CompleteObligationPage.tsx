import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle, 
  ArrowLeft, 
  ClipboardList, 
  Camera, 
  FileText, 
  AlertCircle,
  Loader2,
  CheckSquare,
  Square,
  Clock,
  User,
  MapPin,
  X,
  PenTool,
  Image as ImageIcon,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { ObligationService } from '@/services/ObligationService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import type { ContractObligation, ObligationCompletion, ChecklistItem } from '@/types/database';
import { format } from 'date-fns';

const CompleteObligationPage = () => {
  const { obligationId } = useParams<{ obligationId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [obligation, setObligation] = useState<ContractObligation | null>(null);
  const [existingCompletion, setExistingCompletion] = useState<ObligationCompletion | null>(null);
  const [notes, setNotes] = useState('');
  const [checklistResponses, setChecklistResponses] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  
  // Photo states
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Signature states
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [isDrawingSignature, setIsDrawingSignature] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    if (!authLoading && !user) {
      // Redirect to login with return URL
      const returnUrl = encodeURIComponent(window.location.pathname);
      navigate(`/?returnUrl=${returnUrl}`);
      return;
    }

    if (user && obligationId) {
      loadObligation();
    }
  }, [user, authLoading, obligationId]);

  const loadObligation = async () => {
    if (!obligationId) return;

    try {
      setLoading(true);
      setError(null);

      const result = await ObligationService.validateObligationQR(obligationId);
      
      setObligation(result.obligation);
      setExistingCompletion(result.existingCompletion);

      // Initialize checklist responses
      if (result.obligation.checklist_items) {
        const initialResponses: Record<string, boolean> = {};
        result.obligation.checklist_items.forEach((item: ChecklistItem) => {
          initialResponses[item.id] = result.existingCompletion?.checklist_responses?.[item.id] || false;
        });
        setChecklistResponses(initialResponses);
      }

      // Load existing notes
      if (result.existingCompletion?.notes) {
        setNotes(result.existingCompletion.notes);
      }

    } catch (err: any) {
      console.error('Error loading obligation:', err);
      setError(err.message || 'Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  const handleChecklistChange = (itemId: string, checked: boolean) => {
    setChecklistResponses(prev => ({
      ...prev,
      [itemId]: checked
    }));
  };

  // Photo handling
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos = Array.from(files);
    setPhotos(prev => [...prev, ...newPhotos]);

    // Create preview URLs
    newPhotos.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviewUrls(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (): Promise<string[]> => {
    if (photos.length === 0) return [];

    setUploadingPhotos(true);
    const uploadedUrls: string[] = [];

    try {
      for (const photo of photos) {
        const fileName = `obligation_${obligationId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
        const filePath = `obligation-photos/${fileName}`;

        const { data, error } = await supabase.storage
          .from('uploads')
          .upload(filePath, photo, {
            contentType: photo.type,
            upsert: false
          });

        if (error) {
          console.error('Error uploading photo:', error);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('uploads')
          .getPublicUrl(filePath);

        if (urlData?.publicUrl) {
          uploadedUrls.push(urlData.publicUrl);
        }
      }
    } finally {
      setUploadingPhotos(false);
    }

    return uploadedUrls;
  };

  // Signature handling
  const initSignatureCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = 200;

    // Set drawing style
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Fill with white background
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      e.preventDefault();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setSignatureDataUrl(null);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    setSignatureDataUrl(dataUrl);
    setIsDrawingSignature(false);
  };

  const uploadSignature = async (): Promise<string | null> => {
    if (!signatureDataUrl) return null;

    try {
      // Convert data URL to blob
      const response = await fetch(signatureDataUrl);
      const blob = await response.blob();

      const fileName = `signature_${obligationId}_${Date.now()}.png`;
      const filePath = `obligation-signatures/${fileName}`;

      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(filePath, blob, {
          contentType: 'image/png',
          upsert: false
        });

      if (error) {
        console.error('Error uploading signature:', error);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      return urlData?.publicUrl || null;
    } catch (err) {
      console.error('Error uploading signature:', err);
      return null;
    }
  };

  const validateRequirements = (): boolean => {
    // Validate checklist
    if (obligation?.requires_checklist && obligation.checklist_items) {
      const requiredItems = obligation.checklist_items.filter((item: ChecklistItem) => item.required);
      const allRequiredChecked = requiredItems.every((item: ChecklistItem) => checklistResponses[item.id]);

      if (!allRequiredChecked) {
        toast({
          title: "Required Items",
          description: "Please complete all required checklist items before submitting.",
          variant: "destructive",
        });
        return false;
      }
    }

    // Validate photo
    if (obligation?.requires_photo_proof && photos.length === 0) {
      toast({
        title: "Photo Required",
        description: "Please add at least one photo before submitting.",
        variant: "destructive",
      });
      return false;
    }

    // Validate signature
    if (obligation?.requires_signature && !signatureDataUrl) {
      toast({
        title: "Signature Required",
        description: "Please add your signature before submitting.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!user || !obligation) return;

    if (!validateRequirements()) return;

    try {
      setSubmitting(true);

      // Upload photos if required
      let photoUrls: string[] = [];
      if (obligation.requires_photo_proof && photos.length > 0) {
        photoUrls = await uploadPhotos();
      }

      // Upload signature if required
      let signatureUrl: string | null = null;
      if (obligation.requires_signature && signatureDataUrl) {
        signatureUrl = await uploadSignature();
      }

      const obligationData = obligation as any;
      await ObligationService.completeObligation(
        obligation.id, 
        user.id, 
        {
          notes: notes.trim() || undefined,
          checklist_responses: obligation.requires_checklist ? checklistResponses : undefined,
          photo_urls: photoUrls.length > 0 ? photoUrls : undefined,
          signature_url: signatureUrl || undefined,
        },
        {
          title: obligation.title,
          description: obligation.description,
          category: obligationData.category,
          priority: obligationData.priority,
          contractName: obligationData.service_contracts?.contract_name,
          clientName: obligationData.service_contracts?.client_name,
          notificationEmails: obligationData.notification_emails || [],
        }
      );

      toast({
        title: "Task Completed! ✓",
        description: `"${obligation.title}" has been marked as completed.`,
      });

      // Reload to show updated status
      await loadObligation();

    } catch (err: any) {
      console.error('Error completing obligation:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to complete task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-muted-foreground">Loading task details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200 dark:border-red-800">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold mb-2 text-red-700 dark:text-red-400">Error</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!obligation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-xl font-semibold mb-2">Task Not Found</h2>
            <p className="text-muted-foreground mb-6">This task may have been deleted or is no longer active.</p>
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isCompleted = existingCompletion?.status === 'completed';
  const siteName = obligation.service_contracts?.guardian_sites?.name || 'Unknown Site';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold truncate">{obligation.title}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {siteName}
            </p>
          </div>
          {isCompleted && (
            <div className="flex items-center gap-1 text-green-600 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Done</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Status Card */}
        {isCompleted && existingCompletion && (
          <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-green-800 dark:text-green-200">
                    Completed Today
                  </h3>
                  <div className="text-sm text-green-700 dark:text-green-300 space-y-1 mt-2">
                    <p className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {existingCompletion.completed_at 
                        ? format(new Date(existingCompletion.completed_at), 'HH:mm')
                        : 'Unknown time'}
                    </p>
                    <p className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Completed by you
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Task Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              Task Details
            </CardTitle>
            {obligation.description && (
              <CardDescription>{obligation.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Frequency:</span>
                <p className="font-medium capitalize">{obligation.frequency}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Date:</span>
                <p className="font-medium">{format(new Date(), 'dd MMM yyyy')}</p>
              </div>
            </div>

            {/* Requirements */}
            <div className="flex flex-wrap gap-2">
              {obligation.requires_checklist && (
                <span className="inline-flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                  <CheckSquare className="h-3 w-3" />
                  Checklist Required
                </span>
              )}
              {obligation.requires_photo_proof && (
                <span className="inline-flex items-center gap-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full">
                  <Camera className="h-3 w-3" />
                  Photo Required
                </span>
              )}
              {obligation.requires_signature && (
                <span className="inline-flex items-center gap-1 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded-full">
                  <FileText className="h-3 w-3" />
                  Signature Required
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Checklist */}
        {obligation.requires_checklist && obligation.checklist_items && obligation.checklist_items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckSquare className="h-5 w-5 text-blue-600" />
                Checklist
              </CardTitle>
              <CardDescription>
                Complete all required items before submitting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {obligation.checklist_items.map((item: ChecklistItem) => (
                <div 
                  key={item.id} 
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    checklistResponses[item.id] 
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <Checkbox
                    id={item.id}
                    checked={checklistResponses[item.id] || false}
                    onCheckedChange={(checked) => handleChecklistChange(item.id, checked as boolean)}
                    disabled={isCompleted}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <Label 
                      htmlFor={item.id} 
                      className={`cursor-pointer ${checklistResponses[item.id] ? 'line-through text-muted-foreground' : ''}`}
                    >
                      {item.label}
                      {item.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </Label>
                  </div>
                  {checklistResponses[item.id] && (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Photo Upload */}
        {obligation.requires_photo_proof && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Camera className="h-5 w-5 text-purple-600" />
                Photo Proof
                <span className="text-red-500 text-sm">*</span>
              </CardTitle>
              <CardDescription>
                Take or upload photos as proof of completion
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Photo previews */}
              {photoPreviewUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photoPreviewUrls.map((url, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                      <img src={url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                      {!isCompleted && (
                        <button
                          onClick={() => removePhoto(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Existing photos from completion */}
              {existingCompletion?.photo_urls && existingCompletion.photo_urls.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {existingCompletion.photo_urls.map((url, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-green-200">
                      <img src={url} alt={`Completed photo ${index + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute bottom-1 right-1 bg-green-500 text-white rounded-full p-1">
                        <CheckCircle className="h-3 w-3" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload button */}
              {!isCompleted && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-20 border-dashed border-2 flex flex-col gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="h-6 w-6 text-purple-600" />
                    <span>Take Photo or Upload</span>
                  </Button>
                </>
              )}

              {photos.length > 0 && (
                <p className="text-sm text-muted-foreground text-center">
                  {photos.length} photo(s) ready to upload
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Signature */}
        {obligation.requires_signature && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <PenTool className="h-5 w-5 text-orange-600" />
                Signature
                <span className="text-red-500 text-sm">*</span>
              </CardTitle>
              <CardDescription>
                Sign to confirm task completion
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing signature from completion */}
              {existingCompletion?.signature_url && (
                <div className="border rounded-lg p-2 bg-gray-50 dark:bg-gray-800">
                  <img 
                    src={existingCompletion.signature_url} 
                    alt="Signature" 
                    className="max-h-32 mx-auto"
                  />
                  <p className="text-xs text-center text-green-600 mt-2 flex items-center justify-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Signature saved
                  </p>
                </div>
              )}

              {/* Signature preview */}
              {signatureDataUrl && !existingCompletion?.signature_url && (
                <div className="border rounded-lg p-2 bg-gray-50 dark:bg-gray-800">
                  <img src={signatureDataUrl} alt="Your signature" className="max-h-32 mx-auto" />
                  {!isCompleted && (
                    <div className="flex justify-center mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSignatureDataUrl(null);
                          setIsDrawingSignature(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Clear & Redo
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Signature canvas */}
              {isDrawingSignature && !isCompleted && (
                <div className="space-y-3">
                  <div className="border-2 border-dashed rounded-lg bg-white">
                    <canvas
                      ref={canvasRef}
                      className="w-full touch-none cursor-crosshair"
                      style={{ height: '200px' }}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={clearSignature}
                    >
                      Clear
                    </Button>
                    <Button
                      type="button"
                      className="flex-1 bg-orange-600 hover:bg-orange-700"
                      onClick={saveSignature}
                    >
                      Save Signature
                    </Button>
                  </div>
                </div>
              )}

              {/* Start signature button */}
              {!isDrawingSignature && !signatureDataUrl && !existingCompletion?.signature_url && !isCompleted && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-20 border-dashed border-2 flex flex-col gap-2"
                  onClick={() => {
                    setIsDrawingSignature(true);
                    setTimeout(initSignatureCanvas, 100);
                  }}
                >
                  <PenTool className="h-6 w-6 text-orange-600" />
                  <span>Tap to Sign</span>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-blue-600" />
              Notes
            </CardTitle>
            <CardDescription>
              Add any observations or comments (optional)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Enter any notes about this task..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isCompleted}
              rows={4}
              className="resize-none"
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        {!isCompleted && (
          <Button 
            onClick={handleSubmit} 
            disabled={submitting}
            className="w-full h-14 text-lg font-semibold bg-green-600 hover:bg-green-700"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Completing...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Mark as Completed
              </>
            )}
          </Button>
        )}

        {/* Already completed message */}
        {isCompleted && (
          <Card className="bg-gray-100 dark:bg-gray-800">
            <CardContent className="p-4 text-center">
              <p className="text-muted-foreground">
                This task has already been completed today. You can view the details above.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CompleteObligationPage;
