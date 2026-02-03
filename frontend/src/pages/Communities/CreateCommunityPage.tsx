import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { communitiesApi } from '../../features/communities/api/communitiesApi';
import type { CommunityCategory, CommunityCreate } from '../../types/community';
import styles from './CreateCommunityPage.module.css';

const CATEGORIES: { value: CommunityCategory; label: string; description: string }[] = [
  { value: 'technology', label: 'Technology', description: 'Software, hardware, and tech discussions' },
  { value: 'business', label: 'Business', description: 'Strategy, marketing, and business development' },
  { value: 'design', label: 'Design', description: 'UI/UX, graphic design, and visual arts' },
  { value: 'data_science', label: 'Data Science', description: 'Analytics, statistics, and data engineering' },
  { value: 'ai_ml', label: 'AI & ML', description: 'Artificial intelligence and machine learning' },
  { value: 'entrepreneurship', label: 'Entrepreneurship', description: 'Startups, funding, and founders' },
  { value: 'career', label: 'Career', description: 'Job hunting, interviews, and career growth' },
  { value: 'project', label: 'Projects', description: 'Collaborative project spaces' },
  { value: 'general', label: 'General', description: 'Open discussions on various topics' },
];

export const CreateCommunityPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<CommunityCreate>({
    name: '',
    description: '',
    category: 'general',
    image_url: '',
    banner_url: '',
    is_private: false,
  });

  const handleChange = (
    field: keyof CommunityCreate,
    value: string | boolean | CommunityCategory
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Community name is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const community = await communitiesApi.createCommunity({
        ...formData,
        image_url: formData.image_url || undefined,
        banner_url: formData.banner_url || undefined,
      });
      navigate(`/communities/${community.id}`);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to create community');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>Create a Community</h1>
            <p className={styles.subtitle}>
              Build a space for people to connect, discuss, and collaborate
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.formGroup}>
              <label className={styles.label}>Community Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., AI Builders, React Developers"
                maxLength={100}
              />
              <span className={styles.hint}>
                Choose a name that reflects your community's purpose
              </span>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="What is this community about? What kind of discussions happen here?"
                rows={4}
                maxLength={1000}
                className={styles.textarea}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Category *</label>
              <div className={styles.categoryGrid}>
                {CATEGORIES.map((cat) => (
                  <label
                    key={cat.value}
                    className={`${styles.categoryOption} ${
                      formData.category === cat.value ? styles.selected : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={cat.value}
                      checked={formData.category === cat.value}
                      onChange={() => handleChange('category', cat.value)}
                      className={styles.radioInput}
                    />
                    <div className={styles.categoryContent}>
                      <span className={styles.categoryLabel}>{cat.label}</span>
                      <span className={styles.categoryDescription}>{cat.description}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Community Image URL (Optional)</label>
              <Input
                type="url"
                value={formData.image_url}
                onChange={(e) => handleChange('image_url', e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
              <span className={styles.hint}>Square image works best (200x200 or larger)</span>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Banner Image URL (Optional)</label>
              <Input
                type="url"
                value={formData.banner_url}
                onChange={(e) => handleChange('banner_url', e.target.value)}
                placeholder="https://example.com/banner.jpg"
              />
              <span className={styles.hint}>Wide image recommended (1200x300 or similar)</span>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.is_private}
                  onChange={(e) => handleChange('is_private', e.target.checked)}
                />
                <div>
                  <span className={styles.checkboxTitle}>Make this community private</span>
                  <span className={styles.checkboxDescription}>
                    Only members can see posts. New members must request to join.
                  </span>
                </div>
              </label>
            </div>

            <div className={styles.actions}>
              <Button type="button" variant="secondary" onClick={() => navigate('/communities')}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !formData.name.trim()}>
                {isSubmitting ? 'Creating...' : 'Create Community'}
              </Button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CreateCommunityPage;
