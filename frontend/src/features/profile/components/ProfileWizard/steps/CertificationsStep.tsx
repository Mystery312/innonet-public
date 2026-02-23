import React, { useState, useEffect } from 'react';
import { Input } from '../../../../../components/common/Input';
import { Button } from '../../../../../components/common/Button';
import { Modal } from '../../../../../components/common/Modal';
import { profileApi } from '../../../api/profileApi';
import type { Certification, CertificationCreate, ResumeParseResult } from '../../../../../types/profile';
import styles from '../ProfileWizard.module.css';

interface CertificationsStepProps {
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  parsedData?: ResumeParseResult | null;
}

const emptyCertification: CertificationCreate = {
  name: '',
  issuing_organization: '',
  issue_date: '',
  expiry_date: '',
  credential_id: '',
  credential_url: '',
};

export const CertificationsStep: React.FC<CertificationsStepProps> = ({ onNext, onPrevious, onSkip, parsedData: _parsedData }) => {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CertificationCreate>(emptyCertification);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadCertifications = async () => {
      try {
        const data = await profileApi.getMyCertifications();
        setCertifications(data);
      } catch (error) {
        console.error('Failed to load certifications:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadCertifications();
  }, []);

  const handleOpenModal = (cert?: Certification) => {
    if (cert) {
      setEditingId(cert.id);
      setFormData({
        name: cert.name,
        issuing_organization: cert.issuing_organization,
        issue_date: cert.issue_date || '',
        expiry_date: cert.expiry_date || '',
        credential_id: cert.credential_id || '',
        credential_url: cert.credential_url || '',
      });
    } else {
      setEditingId(null);
      setFormData(emptyCertification);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(emptyCertification);
  };

  const handleChange = (field: keyof CertificationCreate, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (editingId) {
        const updated = await profileApi.updateCertification(editingId, formData);
        setCertifications((prev) =>
          prev.map((c) => (c.id === editingId ? updated : c))
        );
      } else {
        const created = await profileApi.createCertification(formData);
        setCertifications((prev) => [...prev, created]);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save certification:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this certification?')) return;
    try {
      await profileApi.deleteCertification(id);
      setCertifications((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      console.error('Failed to delete certification:', error);
    }
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
        {certifications.map((cert) => (
          <div key={cert.id} className={styles.item}>
            <div className={styles.itemContent}>
              <div className={styles.itemTitle}>{cert.name}</div>
              <div className={styles.itemSubtitle}>{cert.issuing_organization}</div>
              <div className={styles.itemMeta}>
                Issued: {formatDate(cert.issue_date)}
                {cert.expiry_date && ` | Expires: ${formatDate(cert.expiry_date)}`}
              </div>
            </div>
            <div className={styles.itemActions}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleOpenModal(cert)}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleDelete(cert.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {certifications.length === 0 && (
        <div className={styles.emptyState}>
          <p>No certifications added yet. Professional certifications boost your credibility.</p>
        </div>
      )}

      <button type="button" className={styles.addButton} onClick={() => handleOpenModal()}>
        + Add Certification
      </button>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingId ? 'Edit Certification' : 'Add Certification'}>
        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Certification Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="AWS Solutions Architect"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Issuing Organization *</label>
            <Input
              value={formData.issuing_organization}
              onChange={(e) => handleChange('issuing_organization', e.target.value)}
              placeholder="Amazon Web Services"
              required
            />
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Issue Date</label>
              <Input
                type="date"
                value={formData.issue_date || ''}
                onChange={(e) => handleChange('issue_date', e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Expiry Date</label>
              <Input
                type="date"
                value={formData.expiry_date || ''}
                onChange={(e) => handleChange('expiry_date', e.target.value)}
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Credential ID</label>
            <Input
              value={formData.credential_id || ''}
              onChange={(e) => handleChange('credential_id', e.target.value)}
              placeholder="ABC123XYZ"
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Credential URL</label>
            <Input
              type="url"
              value={formData.credential_url || ''}
              onChange={(e) => handleChange('credential_url', e.target.value)}
              placeholder="https://www.credly.com/badges/..."
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !formData.name || !formData.issuing_organization}
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

export default CertificationsStep;
