import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { companiesApi } from '../../features/companies/api/companiesApi';
import type { CompanyCreate, CompanySize } from '../../types/company';
import styles from './CreateCompanyPage.module.css';

export const CreateCompanyPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CompanyCreate>({
    name: '',
    description: '',
    industry: '',
    website: '',
    logo_url: '',
    size: 'startup',
    location: '',
    founded_year: undefined,
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'founded_year' && value
          ? parseInt(value, 10)
          : value || undefined,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Company name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const company = await companiesApi.createCompany(formData);
      navigate(`/companies/${company.id}`);
    } catch (err: any) {
      console.error('Failed to create company:', err);
      setError(
        err.response?.data?.detail || 'Failed to create company. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const companySizes: { value: CompanySize; label: string }[] = [
    { value: 'startup', label: 'Startup (1-10 employees)' },
    { value: 'small', label: 'Small (11-50 employees)' },
    { value: 'medium', label: 'Medium (51-200 employees)' },
    { value: 'large', label: 'Large (201-1000 employees)' },
    { value: 'enterprise', label: 'Enterprise (1000+ employees)' },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Create Your Company</h1>
        <p className={styles.subtitle}>
          Create a company profile to post challenges and connect with talent
        </p>
      </div>

      {error && (
        <div className={styles.error}>
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="name" className={styles.label}>
            Company Name <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Acme Inc."
            required
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="description" className={styles.label}>
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Tell us about your company..."
            rows={4}
            className={styles.textarea}
          />
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="industry" className={styles.label}>
              Industry
            </label>
            <input
              type="text"
              id="industry"
              name="industry"
              value={formData.industry}
              onChange={handleChange}
              placeholder="Technology, Healthcare, etc."
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="size" className={styles.label}>
              Company Size
            </label>
            <select
              id="size"
              name="size"
              value={formData.size}
              onChange={handleChange}
              className={styles.select}
            >
              {companySizes.map((size) => (
                <option key={size.value} value={size.value}>
                  {size.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="website" className={styles.label}>
              Website
            </label>
            <input
              type="url"
              id="website"
              name="website"
              value={formData.website}
              onChange={handleChange}
              placeholder="https://example.com"
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="location" className={styles.label}>
              Location
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="San Francisco, CA"
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="founded_year" className={styles.label}>
              Founded Year
            </label>
            <input
              type="number"
              id="founded_year"
              name="founded_year"
              value={formData.founded_year || ''}
              onChange={handleChange}
              placeholder="2020"
              min="1800"
              max={new Date().getFullYear()}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="logo_url" className={styles.label}>
              Logo URL
            </label>
            <input
              type="url"
              id="logo_url"
              name="logo_url"
              value={formData.logo_url}
              onChange={handleChange}
              placeholder="https://example.com/logo.png"
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className={styles.buttonSecondary}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.buttonPrimary}
            disabled={isSubmitting || !formData.name.trim()}
          >
            {isSubmitting ? 'Creating...' : 'Create Company'}
          </button>
        </div>
      </form>
    </div>
  );
};
