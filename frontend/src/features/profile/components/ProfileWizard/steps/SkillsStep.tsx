import React, { useState, useEffect } from 'react';
import { Input } from '../../../../../components/common/Input';
import { Button } from '../../../../../components/common/Button';
import { Badge } from '../../../../../components/common/Badge';
import { profileApi } from '../../../api/profileApi';
import type { Skill, UserSkill, ResumeParseResult } from '../../../../../types/profile';
import styles from '../ProfileWizard.module.css';

interface SkillsStepProps {
  onNext: () => void;
  onPrevious: () => void;
  parsedData?: ResumeParseResult | null;
}

export const SkillsStep: React.FC<SkillsStepProps> = ({ onNext, onPrevious, parsedData: _parsedData }) => {
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProficiency, setSelectedProficiency] = useState<string>('intermediate');

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [skills, allSkills] = await Promise.all([
          profileApi.getMySkills(),
          profileApi.getSkills(),
        ]);
        setUserSkills(skills);
        setAvailableSkills(allSkills.skills);
      } catch (error) {
        console.error('Failed to load skills:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      try {
        const result = await profileApi.getSkills(query);
        setAvailableSkills(result.skills);
      } catch (error) {
        console.error('Failed to search skills:', error);
      }
    }
  };

  const handleAddSkill = async (skill: Skill) => {
    try {
      const newUserSkill = await profileApi.addSkill({
        skill_id: skill.id,
        proficiency_level: selectedProficiency as any,
        is_primary: userSkills.length < 3,
      });
      setUserSkills((prev) => [...prev, newUserSkill]);
      setSearchQuery('');
    } catch (error) {
      console.error('Failed to add skill:', error);
    }
  };

  const handleRemoveSkill = async (skillId: string) => {
    try {
      await profileApi.removeSkill(skillId);
      setUserSkills((prev) => prev.filter((s) => s.skill.id !== skillId));
    } catch (error) {
      console.error('Failed to remove skill:', error);
    }
  };

  const handleCreateAndAddSkill = async () => {
    if (!searchQuery.trim()) return;
    try {
      const newSkill = await profileApi.createSkill(searchQuery.trim(), 'technical');
      await handleAddSkill(newSkill);
    } catch (error) {
      console.error('Failed to create skill:', error);
    }
  };

  const filteredAvailableSkills = availableSkills.filter(
    (skill) => !userSkills.some((us) => us.skill.id === skill.id)
  );

  const proficiencyLevels = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
    { value: 'expert', label: 'Expert' },
  ];

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.form}>
      <div className={styles.formGroup}>
        <label className={styles.label}>Your Skills</label>
        {userSkills.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {userSkills.map((us) => (
              <Badge
                key={us.id}
                variant={us.is_primary ? 'primary' : 'default'}
                removable
                onRemove={() => handleRemoveSkill(us.skill.id)}
              >
                {us.skill.name}
                {us.proficiency_level && (
                  <span style={{ opacity: 0.7, marginLeft: '0.25rem' }}>
                    ({us.proficiency_level})
                  </span>
                )}
              </Badge>
            ))}
          </div>
        ) : (
          <p className={styles.hint}>No skills added yet. Add at least one skill.</p>
        )}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Add Skills</label>
        <div className={styles.formRow}>
          <Input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search for a skill..."
          />
          <select
            value={selectedProficiency}
            onChange={(e) => setSelectedProficiency(e.target.value)}
            style={{
              padding: '0.75rem',
              borderRadius: '6px',
              border: '1px solid var(--color-border, #d0d7de)',
              fontSize: '0.875rem',
            }}
          >
            {proficiencyLevels.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {searchQuery && (
        <div className={styles.formGroup}>
          <label className={styles.label}>Suggestions</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {filteredAvailableSkills.slice(0, 10).map((skill) => (
              <Badge
                key={skill.id}
                variant="default"
                size="small"
              >
                <button
                  type="button"
                  onClick={() => handleAddSkill(skill)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    font: 'inherit',
                    color: 'inherit',
                  }}
                >
                  + {skill.name}
                </button>
              </Badge>
            ))}
            {filteredAvailableSkills.length === 0 && searchQuery.length >= 2 && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCreateAndAddSkill}
              >
                Create "{searchQuery}"
              </Button>
            )}
          </div>
        </div>
      )}

      <div className={styles.actions}>
        <div className={styles.actionsLeft}>
          <Button type="button" variant="secondary" onClick={onPrevious}>
            Previous
          </Button>
        </div>
        <div className={styles.actionsRight}>
          <Button
            type="button"
            onClick={onNext}
            disabled={userSkills.length === 0}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SkillsStep;
