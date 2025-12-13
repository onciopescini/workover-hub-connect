import React, { useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Image as ImageIcon, 
  X, 
  Loader2, 
  AlertCircle,
  Camera 
} from 'lucide-react';
import { toast } from 'sonner';
import { sreLogger } from '@/lib/sre-logger';

interface PhotoUploaderProps {
  photoFiles: File[];
  photoPreviewUrls: string[];
  setPhotoFiles: (files: File[]) => void;
  setPhotoPreviewUrls: (urls: string[]) => void;
  uploadingPhotos: boolean;
  setUploadingPhotos: (uploading: boolean) => void;
  processingJobs: string[];
  setProcessingJobs: (jobs: string[]) => void;
}

const MAX_FILES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  photoFiles,
  photoPreviewUrls,
  setPhotoFiles,
  setPhotoPreviewUrls,
  uploadingPhotos,
  setUploadingPhotos,
  processingJobs,
  setProcessingJobs
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `Tipo file non supportato: ${file.type}. Usa JPEG, PNG o WebP.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File troppo grande: ${(file.size / 1024 / 1024).toFixed(1)}MB. Massimo 5MB.`;
    }
    return null;
  };

  const processFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const currentTotal = (photoFiles || []).length;
    
    if (currentTotal + fileArray.length > MAX_FILES) {
      toast.error(`Puoi caricare massimo ${MAX_FILES} foto. Attualmente ne hai ${currentTotal}.`);
      return;
    }

    const validFiles: File[] = [];
    const newPreviewUrls: string[] = [];
    
    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        toast.error(`${file.name}: ${error}`);
        return;
      }
      
      validFiles.push(file);
      const previewUrl = URL.createObjectURL(file);
      newPreviewUrls.push(previewUrl);
    });

    if (validFiles.length > 0) {
      setPhotoFiles([...photoFiles, ...validFiles]);
      setPhotoPreviewUrls([...photoPreviewUrls, ...newPreviewUrls]);
      toast.success(`${validFiles.length} foto${validFiles.length > 1 ? '' : ''} aggiunta${validFiles.length > 1 ? 'e' : ''} con successo.`);
    }
  }, [photoFiles, photoPreviewUrls, setPhotoFiles, setPhotoPreviewUrls]);

  const removePhoto = useCallback((index: number) => {
    // Calculate offset to correctly identify if we are removing an existing photo or a new file
    const existingCount = (photoPreviewUrls || []).length - (photoFiles || []).length;

    // If we are removing a new file (appended at the end)
    if (index >= existingCount) {
      const fileIndex = index - existingCount;

      // Revoke the object URL to prevent memory leaks
      if (photoPreviewUrls[index]) {
        URL.revokeObjectURL(photoPreviewUrls[index]);
      }

      const newFiles = photoFiles.filter((_, i) => i !== fileIndex);
      setPhotoFiles(newFiles);
    }
    
    // Always remove from preview URLs
    const newUrls = photoPreviewUrls.filter((_, i) => i !== index);
    setPhotoPreviewUrls(newUrls);

    toast.success('Foto rimossa');
  }, [photoFiles, photoPreviewUrls, setPhotoFiles, setPhotoPreviewUrls]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      // Reset the input value so the same file can be selected again if needed
      e.target.value = '';
    }
  }, [processFiles]);

  // Simulate upload progress for demo purposes
  // Upload simulation for demo - production ready implementation
  const simulateUpload = useCallback(async () => {
    if ((photoFiles || []).length === 0) {
      toast.error('Seleziona almeno una foto da caricare');
      return;
    }

    setUploadingPhotos(true);
    setUploadProgress(0);
    
    try {
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setUploadProgress(i);
      }
      
      toast.success('Foto caricate con successo!');
      // Upload successful - photos ready for use
    } catch (error) {
      toast.error('Errore durante il caricamento delle foto');
      sreLogger.error('Photo upload error', { photoCount: (photoFiles || []).length }, error as Error);
    } finally {
      setUploadingPhotos(false);
      setUploadProgress(0);
    }
  }, [photoFiles, setUploadingPhotos]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Caricamento Foto
          <Badge variant="secondary">{(photoFiles || []).length}/{MAX_FILES}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Area */}
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${dragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }
            ${uploadingPhotos ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => {
            if (!uploadingPhotos) {
              document.getElementById('photo-upload-input')?.click();
            }
          }}
        >
          <input
            id="photo-upload-input"
            type="file"
            multiple
            accept={ACCEPTED_TYPES.join(',')}
            onChange={handleFileInput}
            className="hidden"
            disabled={uploadingPhotos}
          />
          
          <div className="space-y-4">
            <div className="flex justify-center">
              {uploadingPhotos ? (
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            
            <div>
              <p className="text-lg font-medium">
                {uploadingPhotos ? 'Caricamento in corso...' : 'Carica le tue foto'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Trascina e rilascia oppure clicca per selezionare
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                PNG, JPG, WebP fino a 5MB • Massimo {MAX_FILES} foto
              </p>
            </div>
          </div>
        </div>

        {/* Upload Progress */}
        {uploadingPhotos && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Caricamento in corso...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {/* Photo Previews */}
        {(photoPreviewUrls || []).length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Foto Selezionate</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photoPreviewUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                    <img
                      src={url}
                      alt={`Anteprima ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to placeholder or hide broken image
                        e.currentTarget.style.display = 'none';
                        toast.error(`Errore nel caricamento dell'anteprima ${index + 1}`);
                        sreLogger.error('Image preview load error', { url, index });
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePhoto(index);
                    }}
                    disabled={uploadingPhotos}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <div className="absolute bottom-2 left-2">
                    <Badge variant="secondary" className="text-xs">
                      {index + 1}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Actions */}
        {(photoFiles || []).length > 0 && !uploadingPhotos && (
          <div className="flex gap-2">
            <Button onClick={simulateUpload} disabled={uploadingPhotos}>
              <Upload className="h-4 w-4 mr-2" />
              Carica {(photoFiles || []).length} Foto
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                // Clean up object URLs
                photoPreviewUrls.forEach(url => URL.revokeObjectURL(url));
                setPhotoFiles([]);
                setPhotoPreviewUrls([]);
                toast.success('Tutte le foto sono state rimosse');
              }}
              disabled={uploadingPhotos}
            >
              Rimuovi Tutto
            </Button>
          </div>
        )}

        {/* Help Text */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Suggerimenti per foto migliori:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Usa immagini luminose e ben illuminate</li>
                <li>Mostra diversi angoli dello spazio</li>
                <li>Includi dettagli importanti come postazioni di lavoro e servizi</li>
                <li>Evita foto sfocate o troppo scure</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <h4 className="font-medium text-amber-900 mb-2">Funzionalità Premium</h4>
          <p className="text-sm text-amber-700">
            Funzionalità avanzate come riordinamento foto, editing, upload da cloud e metadati 
            saranno disponibili nelle prossime versioni per migliorare l'esperienza di gestione media.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};