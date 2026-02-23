import React, { useState, useEffect } from 'react';
import { Input } from '../../../../../components/common/Input';
import { Button } from '../../../../../components/common/Button';
import { Modal } from '../../../../../components/common/Modal';
import { Badge } from '../../../../../components/common/Badge';
import { profileApi } from '../../../api/profileApi';
import type { Project, ProjectCreate, ResumeParseResult } from '../../../../../types/profile';
import styles from '../ProfileWizard.module.css';

interface ProjectsStepProps {
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  parsedData?: ResumeParseResult | null;
}

const emptyProject: ProjectCreate = {
  title: '',
  description: '',
  role: '',
  url: '',
  start_date: '',
  end_date: '',
  is_current: false,
  technologies: [],
};

export const ProjectsStep: React.FC<ProjectsStepProps> = ({ onNext, onPrevious, onSkip, parsedData: _parsedData }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProjectCreate>(emptyProject);
  const [techInput, setTechInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await profileApi.getMyProjects();
        setProjects(data);
      } catch (error) {
        console.error('Failed to load projects:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadProjects();
  }, []);

  const handleOpenModal = (project?: Project) => {
    if (project) {
      setEditingId(project.id);
      setFormData({
        title: project.title,
        description: project.description || '',
        role: project.role || '',
        url: project.url || '',
        start_date: project.start_date || '',
        end_date: project.end_date || '',
        is_current: project.is_current,
        technologies: project.technologies || [],
      });
    } else {
      setEditingId(null);
      setFormData(emptyProject);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(emptyProject);
    setTechInput('');
  };

  const handleChange = (field: keyof ProjectCreate, value: string | boolean | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddTech = () => {
    if (techInput.trim() && !formData.technologies?.includes(techInput.trim())) {
      handleChange('technologies', [...(formData.technologies || []), techInput.trim()]);
      setTechInput('');
    }
  };

  const handleRemoveTech = (tech: string) => {
    handleChange('technologies', (formData.technologies || []).filter((t) => t !== tech));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (editingId) {
        const updated = await profileApi.updateProject(editingId, formData);
        setProjects((prev) =>
          prev.map((p) => (p.id === editingId ? updated : p))
        );
      } else {
        const created = await profileApi.createProject(formData);
        setProjects((prev) => [...prev, created]);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save project:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await profileApi.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.form}>
      <div className={styles.itemList}>
        {projects.map((project) => (
          <div key={project.id} className={styles.item}>
            <div className={styles.itemContent}>
              <div className={styles.itemTitle}>{project.title}</div>
              {project.role && <div className={styles.itemSubtitle}>{project.role}</div>}
              {project.technologies && project.technologies.length > 0 && (
                <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  {project.technologies.slice(0, 5).map((tech) => (
                    <Badge key={tech} size="small" variant="default">
                      {tech}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className={styles.itemActions}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleOpenModal(project)}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleDelete(project.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {projects.length === 0 && (
        <div className={styles.emptyState}>
          <p>No projects added yet. Projects help showcase your work.</p>
        </div>
      )}

      <button type="button" className={styles.addButton} onClick={() => handleOpenModal()}>
        + Add Project
      </button>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingId ? 'Edit Project' : 'Add Project'} size="large">
        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Project Title *</label>
            <Input
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="E-commerce Platform"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Your Role</label>
            <Input
              value={formData.role || ''}
              onChange={(e) => handleChange('role', e.target.value)}
              placeholder="Lead Developer"
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe the project, your contributions, and outcomes..."
              rows={4}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--color-border, #d0d7de)',
                fontSize: '0.875rem',
                resize: 'vertical',
              }}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Project URL</label>
            <Input
              type="url"
              value={formData.url || ''}
              onChange={(e) => handleChange('url', e.target.value)}
              placeholder="https://github.com/username/project"
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Technologies</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Input
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                placeholder="React, Node.js, etc."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTech();
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={handleAddTech}>
                Add
              </Button>
            </div>
            {formData.technologies && formData.technologies.length > 0 && (
              <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {formData.technologies.map((tech) => (
                  <Badge key={tech} removable onRemove={() => handleRemoveTech(tech)}>
                    {tech}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !formData.title}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      <div className={styles.actions}>
        <div className={styles.actionsLeft}>
          <Button type="button" variant="secondary" onClick={onPrevious}>
            Previous
          </Button>
        </div>
        <div className={styles.actionsRight}>
          <Button type="button" variant="secondary" onClick={onSkip}>
            Skip
          </Button>
          <Button type="button" onClick={onNext}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProjectsStep;
