import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { projectsApi } from '../lib/api';
import { AudioUploader } from '../components/audio/AudioUploader';

interface Project {
  _id: string;
  name: string;
  status: string;
  createdAt: string;
  settings?: { style?: string };
}

const statusIcons: Record<string, React.ReactNode> = {
  uploaded: <Clock className="w-4 h-4 text-yellow-500" />,
  analyzing: <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
  ready: <CheckCircle className="w-4 h-4 text-green-500" />,
  rendering: <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />,
  complete: <CheckCircle className="w-4 h-4 text-green-500" />,
  failed: <AlertCircle className="w-4 h-4 text-red-500" />,
};

export function Projects() {
  const [showUploader, setShowUploader] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const projects: Project[] = data?.data?.projects || [];

  const handleUploadSuccess = (projectId: string) => {
    setShowUploader(false);
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    navigate(`/editor/${projectId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Your Projects</h1>
        <button
          onClick={() => setShowUploader(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Project
        </button>
      </div>

      {showUploader && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-xl p-8 max-w-lg w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Upload Audio</h2>
            <AudioUploader
              onSuccess={handleUploadSuccess}
              onCancel={() => setShowUploader(false)}
            />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg mb-4">No projects yet</p>
          <button
            onClick={() => setShowUploader(true)}
            className="text-primary hover:underline"
          >
            Create your first project
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project._id}
              className="p-4 rounded-xl bg-secondary/50 border border-border hover:border-primary/50 transition-colors cursor-pointer group"
              onClick={() => navigate(`/editor/${project._id}`)}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold truncate flex-1">{project.name}</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this project?')) {
                      deleteMutation.mutate(project._id);
                    }
                  }}
                  className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {statusIcons[project.status]}
                <span className="capitalize">{project.status}</span>
                {project.settings?.style && project.settings.style !== 'particles' && (
                  <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary capitalize">
                    {project.settings.style}
                  </span>
                )}
                <span className="ml-auto">
                  {new Date(project.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
