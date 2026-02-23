import React, { useState, useEffect } from 'react';
import { Input } from '../../../../../components/common/Input';
import { Button } from '../../../../../components/common/Button';
import { Modal } from '../../../../../components/common/Modal';
import { profileApi } from '../../../api/profileApi';
import type { WorkExperience, WorkExperienceCreate, ResumeParseResult } from '../../../../../types/profile';
import styles from '../ProfileWizard.module.css';

interface ExperienceStepProps {
  onNext: () => void;
  onPrevious: () => void;
  parsedData?: ResumeParseResult | null;
}

const emptyExperience: WorkExperienceCreate = {
  company_name: '',
  job_title: '',
  location: '',
  start_date: '',
  end_date: '',
  is_current: false,
  description: '',
};

export const ExperienceStep: React.FC<ExperienceStepProps> = ({ onNext, onPrevious, parsedData: _parsedData }) => {
  const [experiences, setExperiences] = useState<WorkExperience[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<WorkExperienceCreate>(emptyExperience);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadExperiences = async () => {
      try {
        const data = await profileApi.getMyExperience();
        setExperiences(data);
      } catch (error) {
        console.error('Failed to load experiences:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadExperiences();
  }, []);

  const handleOpenModal = (experience?: WorkExperience) => {
    if (experience) {
      setEditingId(experience.id);
      setFormData({
        company_name: experience.company_name,
        job_title: experience.job_title,
        location: experience.location || '',
        start_date: experience.start_date,
        end_date: experience.end_date || '',
        is_current: experience.is_current,
        description: experience.description || '',
      });
    } else {
      setEditingId(null);
      setFormData(emptyExperience);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(emptyExperience);
  };

  const handleChange = (field: keyof WorkExperienceCreate, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (editingId) {
        const updated = await profileApi.updateExperience(editingId, formData);
        setExperiences((prev) =>
          prev.map((e) => (e.id === editingId ? updated : e))
        );
      } else {
        const created = await profileApi.createExperience(formData);
        setExperiences((prev) => [...prev, created]);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save experience:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this experience?')) return;
    try {
      await profileApi.deleteExperience(id);
      setExperiences((prev) => prev.filter((e) => e.id !== id));
    } catch (error) {
      console.error('Failed to delete experience:', error);
    }
  };

  const formatDate = (date: string) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.form}>
      <div className={styles.itemList}>
        {experiences.map((exp) => (
          <div key={exp.id} className={styles.item}>
            <div className={styles.itemContent}>
              <div className={styles.itemTitle}>{exp.job_title}</div>
              <div className={styles.itemSubtitle}>{exp.company_name}</div>
              <div className={styles.itemMeta}>
                {formatDate(exp.start_date)} - {exp.is_current ? 'Present' : formatDate(exp.end_date || '')}
                {exp.location && ` | ${exp.location}`}
              </div>
            </div>
            <div className={styles.itemActions}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleOpenModal(exp)}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleDelete(exp.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      <button type="button" className={styles.addButton} onClick={() => handleOpenModal()}>
        + Add Work Experience
      </button>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingId ? 'Edit Experience' : 'Add Experience'}>
        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Job Title *</label>
            <Input
              value={formData.job_title}
              onChange={(e) => handleChange('job_title', e.target.value)}
              placeholder="Software Engineer"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Company *</label>
            <Input
              value={formData.company_name}
              onChange={(e) => handleChange('company_name', e.target.value)}
              placeholder="Google"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Location</label>
            <Input
              value={formData.location || ''}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="Mountain View, CA"
            />
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Start Date *</label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => handleChange('start_date', e.target.value)}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>End Date</label>
              <Input
                type="date"
                value={formData.end_date || ''}
                onChange={(e) => handleChange('end_date', e.target.value)}
                disabled={formData.is_current}
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.is_current}
                onChange={(e) => handleChange('is_current', e.target.checked)}
              />
              I currently work here
            </label>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe your responsibilities and achievements..."
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !formData.job_title || !formData.company_name || !formData.start_date}
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
          <Button type="button" onClick={onNext} disabled={experiences.length === 0}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExperienceStep;
