import { useState, useCallback } from 'react';
import { Upload, X, Music, Loader2 } from 'lucide-react';
import { projectsApi } from '../../lib/api';

interface AudioUploaderProps {
  onSuccess: (projectId: string) => void;
  onCancel: () => void;
}

const ALLOWED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/mp4', 'audio/ogg'];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export function AudioUploader({ onSuccess, onCancel }: AudioUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Allowed: MP3, WAV, FLAC, M4A, OGG';
    }
    if (file.size > MAX_SIZE) {
      return 'File too large. Maximum size: 50MB';
    }
    return null;
  };

  const handleFile = (file: File) => {
    const errorMsg = validateFile(file);
    if (errorMsg) {
      setError(errorMsg);
      return;
    }
    setError('');
    setFile(file);
  };

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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('name', file.name.replace(/\.[^/.]+$/, ''));

      const response = await projectsApi.create(formData);
      onSuccess(response.data.project._id);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {!file ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragActive
              ? 'border-primary bg-primary/10'
              : 'border-border hover:border-primary/50'
            }`}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg mb-2">Drag and drop your audio file</p>
          <p className="text-sm text-muted-foreground mb-4">
            MP3, WAV, FLAC, M4A, OGG (max 50MB)
          </p>
          <label className="inline-block px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 cursor-pointer transition-colors">
            Browse Files
            <input
              type="file"
              accept=".mp3,.wav,.flac,.m4a,.ogg,audio/*"
              onChange={handleInputChange}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-secondary border border-border">
          <div className="flex items-center gap-3">
            <Music className="w-10 h-10 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={() => setFile(null)}
              className="p-2 rounded hover:bg-accent transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {uploading && (
            <div className="mt-4">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg hover:bg-accent transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
          {uploading ? 'Uploading...' : 'Upload & Continue'}
        </button>
      </div>
    </div>
  );
}
