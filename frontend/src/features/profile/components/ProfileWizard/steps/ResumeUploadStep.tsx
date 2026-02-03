import React, { useState, useRef, useCallback } from 'react';
import { Button } from '../../../../../components/common/Button';
import { profileApi } from '../../../api/profileApi';
import type { ResumeParseResult } from '../../../../../types/profile';
import styles from '../ProfileWizard.module.css';

interface ResumeUploadStepProps {
  onNext: () => void;
  onSkip: () => void;
  onParsedData: (data: ResumeParseResult) => void;
}

export const ResumeUploadStep: React.FC<ResumeUploadStepProps> = ({
  onNext,
  onSkip,
  onParsedData,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ResumeParseResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ];
  const allowedExtensions = ['.pdf', '.docx', '.doc'];

  const validateFile = (file: File): boolean => {
    if (!allowedTypes.includes(file.type)) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!ext || !['pdf', 'docx', 'doc'].includes(ext)) {
        setError('Please upload a PDF or Word document (.pdf, .docx, .doc)');
        return false;
      }
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Maximum size is 10MB.');
      return false;
    }
    return true;
  };

  const handleFileSelect = (selectedFile: File) => {
    setError(null);
    if (validateFile(selectedFile)) {
      setFile(selectedFile);
      setUploadStatus('idle');
      setParsedData(null);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const result = await profileApi.uploadResume(file);

      if (result.status === 'completed' && result.parsed_data) {
        setUploadStatus('success');
        setParsedData(result.parsed_data);
        onParsedData(result.parsed_data);
      } else if (result.status === 'failed') {
        setUploadStatus('error');
        setError('Failed to parse resume. Please try again or skip this step.');
      }
    } catch (err: any) {
      setUploadStatus('error');
      setError(err.response?.data?.detail || 'Failed to upload resume. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleContinue = () => {
    onNext();
  };

  const renderParsedSummary = () => {
    if (!parsedData) return null;

    return (
      <div style={{
        marginTop: '1.5rem',
        padding: '1rem',
        backgroundColor: 'var(--color-success-subtle, #dafbe1)',
        borderRadius: '8px',
        border: '1px solid var(--color-success-emphasis, #1a7f37)'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', color: 'var(--color-success-fg, #1a7f37)' }}>
          Resume Parsed Successfully
        </h3>
        <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.875rem' }}>
          {parsedData.full_name && (
            <div><strong>Name:</strong> {parsedData.full_name}</div>
          )}
          {parsedData.location && (
            <div><strong>Location:</strong> {parsedData.location}</div>
          )}
          {parsedData.skills.length > 0 && (
            <div>
              <strong>Skills found:</strong> {parsedData.skills.length} skills
            </div>
          )}
          {parsedData.work_experience.length > 0 && (
            <div>
              <strong>Work experience:</strong> {parsedData.work_experience.length} positions
            </div>
          )}
          {parsedData.education.length > 0 && (
            <div>
              <strong>Education:</strong> {parsedData.education.length} entries
            </div>
          )}
          {parsedData.projects.length > 0 && (
            <div>
              <strong>Projects:</strong> {parsedData.projects.length} projects
            </div>
          )}
          {parsedData.certifications.length > 0 && (
            <div>
              <strong>Certifications:</strong> {parsedData.certifications.length} certifications
            </div>
          )}
        </div>
        <p style={{ margin: '1rem 0 0 0', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          This information will be used to pre-fill the following steps. You can edit any details.
        </p>
      </div>
    );
  };

  return (
    <div className={styles.form}>
      <div style={{ marginBottom: '1rem' }}>
        <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
          Upload your resume and we'll use AI to extract your information automatically.
          This step is optional - you can also fill in your profile manually.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          padding: '3rem 2rem',
          border: `2px dashed ${isDragging ? 'var(--color-accent-emphasis, #0969da)' : 'var(--color-border, #d0d7de)'}`,
          borderRadius: '8px',
          backgroundColor: isDragging ? 'var(--color-accent-subtle, #ddf4ff)' : 'var(--color-bg-secondary, #f6f8fa)',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'border-color 0.2s, background-color 0.2s',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={allowedExtensions.join(',')}
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />

        <div style={{ marginBottom: '1rem' }}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14,2 14,8 20,8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        </div>

        {file ? (
          <div>
            <p style={{ margin: '0 0 0.5rem 0', fontWeight: 500 }}>{file.name}</p>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        ) : (
          <div>
            <p style={{ margin: '0 0 0.5rem 0', fontWeight: 500 }}>
              Drag and drop your resume here
            </p>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              or click to browse (PDF, DOCX - max 10MB)
            </p>
          </div>
        )}
      </div>

      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: 'var(--color-danger-subtle, #ffebe9)',
          borderRadius: '6px',
          color: 'var(--color-danger-fg, #cf222e)',
          fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}

      {file && uploadStatus !== 'success' && (
        <Button
          onClick={handleUpload}
          disabled={isUploading}
          style={{ alignSelf: 'flex-start' }}
        >
          {isUploading ? 'Analyzing Resume...' : 'Upload & Analyze'}
        </Button>
      )}

      {isUploading && (
        <div style={{
          padding: '1rem',
          backgroundColor: 'var(--color-attention-subtle, #fff8c5)',
          borderRadius: '8px',
          fontSize: '0.875rem'
        }}>
          <p style={{ margin: '0 0 0.5rem 0', fontWeight: 500 }}>Analyzing your resume...</p>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
            Our AI is extracting your skills, experience, education, and more. This may take a moment.
          </p>
        </div>
      )}

      {renderParsedSummary()}

      <div className={styles.actions}>
        <div className={styles.actionsLeft}>
          <Button variant="ghost" onClick={onSkip}>
            Skip this step
          </Button>
        </div>
        <div className={styles.actionsRight}>
          <Button
            onClick={handleContinue}
            disabled={isUploading}
          >
            {uploadStatus === 'success' ? 'Continue with Parsed Data' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResumeUploadStep;
