import { useState, useCallback } from 'react';
import { Upload, X, Music, Loader2 } from 'lucide-react';
import { projectsApi } from '../../lib/api';
import { Button } from '../ui/Button';

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
        <div
          className="p-3 rounded-md text-[13px]"
          style={{
            color: 'var(--status-failed)',
            background: 'rgba(217, 95, 88, 0.1)',
            border: '1px solid rgba(217, 95, 88, 0.3)',
          }}
        >
          {error}
        </div>
      )}

      {!file ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border border-dashed rounded-lg p-8 text-center transition-colors duration-150 ${
            dragActive ? 'border-accent bg-accent-dim' : 'border-border-strong'
          }`}
        >
          <Upload className="w-10 h-10 mx-auto mb-4 text-fg-muted" />
          <p className="text-base mb-1.5">Drag and drop your audio file</p>
          <p className="text-[13px] text-fg-muted mb-4">
            MP3, WAV, FLAC, M4A, OGG (max 50MB)
          </p>
          <label className="inline-block px-3.5 py-[7px] text-[13px] rounded-md bg-raised border border-border hover:border-border-strong cursor-pointer transition-colors duration-150">
            Browse files
            <input
              type="file"
              accept=".mp3,.wav,.flac,.m4a,.ogg,audio/*"
              onChange={handleInputChange}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <div className="p-4 rounded-lg bg-card-nested border border-border">
          <div className="flex items-center gap-3">
            <Music className="w-8 h-8 text-accent" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-[13px] text-fg-muted font-mono">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={() => setFile(null)}
              className="p-[7px] rounded-md text-fg-secondary hover:bg-raised hover:text-fg transition-colors duration-150"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {uploading && (
            <div className="mt-4">
              <div className="h-1 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={handleUpload} disabled={!file || uploading}>
          {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
          {uploading ? 'Uploading...' : 'Upload & continue'}
        </Button>
      </div>
    </div>
  );
}
