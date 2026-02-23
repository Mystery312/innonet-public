import React, { useState, useEffect } from 'react';
import { Input } from '../../../../../components/common/Input';
import { Button } from '../../../../../components/common/Button';
import { Modal } from '../../../../../components/common/Modal';
import { profileApi } from '../../../api/profileApi';
import type { Education, EducationCreate, ResumeParseResult } from '../../../../../types/profile';
import styles from '../ProfileWizard.module.css';

interface EducationStepProps {
  onNext: () => void;
  onPrevious: () => void;
  parsedData?: ResumeParseResult | null;
}

const emptyEducation: EducationCreate = {
  institution_name: '',
  degree_type: '',
  field_of_study: '',
  start_date: '',
  end_date: '',
  gpa: undefined,
};

const degreeTypes = [
  { value: 'high_school', label: 'High School' },
  { value: 'associate', label: "Associate's Degree" },
  { value: 'bachelor', label: "Bachelor's Degree" },
  { value: 'master', label: "Master's Degree" },
  { value: 'phd', label: 'PhD' },
  { value: 'bootcamp', label: 'Bootcamp' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'other', label: 'Other' },
];

export const EducationStep: React.FC<EducationStepProps> = ({ onNext, onPrevious, parsedData: _parsedData }) => {
  const [educations, setEducations] = useState<Education[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EducationCreate>(emptyEducation);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadEducation = async () => {
      try {
        const data = await profileApi.getMyEducation();
        setEducations(data);
      } catch (error) {
        console.error('Failed to load education:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadEducation();
  }, []);

  const handleOpenModal = (education?: Education) => {
    if (education) {
      setEditingId(education.id);
      setFormData({
        institution_name: education.institution_name,
        degree_type: education.degree_type || '',
        field_of_study: education.field_of_study || '',
        start_date: education.start_date || '',
        end_date: education.end_date || '',
        gpa: education.gpa || undefined,
      });
    } else {
      setEditingId(null);
      setFormData(emptyEducation);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(emptyEducation);
  };

  const handleChange = (field: keyof EducationCreate, value: string | number | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (editingId) {
        const updated = await profileApi.updateEducation(editingId, formData);
        setEducations((prev) =>
          prev.map((e) => (e.id === editingId ? updated : e))
        );
      } else {
        const created = await profileApi.createEducation(formData);
        setEducations((prev) => [...prev, created]);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save education:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this education?')) return;
    try {
      await profileApi.deleteEducation(id);
      setEducations((prev) => prev.filter((e) => e.id !== id));
    } catch (error) {
      console.error('Failed to delete education:', error);
    }
  };

  const getDegreeLabel = (type: string | null) => {
    return degreeTypes.find((d) => d.value === type)?.label || type || '';
  };

  const formatDate = (date: string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.form}>
      <div className={styles.itemList}>
        {educations.map((edu) => (
          <div key={edu.id} className={styles.item}>
            <div className={styles.itemContent}>
              <div className={styles.itemTitle}>{edu.institution_name}</div>
              <div className={styles.itemSubtitle}>
                {getDegreeLabel(edu.degree_type)}
                {edu.field_of_study && ` in ${edu.field_of_study}`}
              </div>
              <div className={styles.itemMeta}>
                {formatDate(edu.start_date)} - {formatDate(edu.end_date) || 'Present'}
                {edu.gpa && ` | GPA: ${edu.gpa}`}
              </div>
            </div>
            <div className={styles.itemActions}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleOpenModal(edu)}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleDelete(edu.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      <button type="button" className={styles.addButton} onClick={() => handleOpenModal()}>
        + Add Education
      </button>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingId ? 'Edit Education' : 'Add Education'}>
        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Institution *</label>
            <Input
              value={formData.institution_name}
              onChange={(e) => handleChange('institution_name', e.target.value)}
              placeholder="Stanford University"
              required
            />
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Degree Type</label>
              <select
                value={formData.degree_type || ''}
                onChange={(e) => handleChange('degree_type', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border, #d0d7de)',
                  fontSize: '0.875rem',
                }}
              >
                <option value="">Select degree type</option>
                {degreeTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Field of Study</label>
              <Input
                value={formData.field_of_study || ''}
                onChange={(e) => handleChange('field_of_study', e.target.value)}
                placeholder="Computer Science"
              />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Start Date</label>
              <Input
                type="date"
                value={formData.start_date || ''}
                onChange={(e) => handleChange('start_date', e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>End Date</label>
              <Input
                type="date"
                value={formData.end_date || ''}
                onChange={(e) => handleChange('end_date', e.target.value)}
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>GPA</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="4"
              value={formData.gpa || ''}
              onChange={(e) => handleChange('gpa', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="3.8"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !formData.institution_name}
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
          <Button type="button" onClick={onNext} disabled={educations.length === 0}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EducationStep;
