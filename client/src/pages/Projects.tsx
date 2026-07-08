import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { projectsApi } from '../lib/api';
import { AudioUploader } from '../components/audio/AudioUploader';
import { Button } from '../components/ui/Button';
import { StatusDot, STATUS_META } from '../components/ui/StatusDot';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

interface Project {
  _id: string;
  name: string;
  status: string;
  createdAt: string;
  settings?: { style?: string };
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

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
    <div className="max-w-[1120px] mx-auto px-6 py-10 w-full">
      <div className="flex justify-between items-start mb-7">
        <div>
          <h1 className="text-2xl leading-[30px] font-semibold tracking-[-0.01em]">Projects</h1>
          <p className="text-[13px] text-fg-muted mt-1">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowUploader(true)}>
          <Plus className="w-4 h-4" />
          New project
        </Button>
      </div>

      {showUploader && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0, 0, 0, 0.6)' }}
        >
          <div className="bg-panel border border-border rounded-xl p-8 max-w-lg w-full mx-4">
            <h2 className="text-lg font-semibold mb-4">Upload audio</h2>
            <AudioUploader
              onSuccess={handleUploadSuccess}
              onCancel={() => setShowUploader(false)}
            />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 text-fg-secondary">
          <p className="text-lg mb-4">No projects yet</p>
          <button
            onClick={() => setShowUploader(true)}
            className="text-accent hover:text-accent-hover transition-colors duration-150"
          >
            Create your first project
          </button>
        </div>
      ) : (
        <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project._id}
              className="p-[18px] rounded-[10px] bg-panel border border-border hover:border-border-hover-card transition-colors duration-150 cursor-pointer group"
              onClick={() => navigate(`/editor/${project._id}`)}
            >
              <div className="flex justify-between items-start">
                <h3 className="text-[15px] font-semibold truncate flex-1">{project.name}</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this project?')) {
                      deleteMutation.mutate(project._id);
                    }
                  }}
                  className="p-1 rounded-md text-fg-muted transition-colors duration-150 opacity-0 group-hover:opacity-100 hover:text-[var(--status-failed)] hover:bg-[rgba(217,95,88,0.15)]"
                >
                  <Trash2 className="w-[15px] h-[15px]" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-3.5">
                <StatusDot status={project.status as keyof typeof STATUS_META} />
                <span className="text-[13px] text-fg-secondary capitalize">{project.status}</span>
                {project.settings?.style && project.settings.style !== 'particles' && (
                  <span className="font-mono text-[10px] uppercase px-[7px] py-0.5 rounded bg-raised border border-border text-fg-secondary">
                    {project.settings.style}
                  </span>
                )}
                <span className="ml-auto font-mono text-[11px] text-fg-muted">
                  {formatDate(project.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
