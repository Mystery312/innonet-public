import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stepper } from '../../../../components/common/Stepper';
import { ResumeUploadStep } from './steps/ResumeUploadStep';
import { BasicInfoStep } from './steps/BasicInfoStep';
import { SkillsStep } from './steps/SkillsStep';
import { ExperienceStep } from './steps/ExperienceStep';
import { EducationStep } from './steps/EducationStep';
import { ProjectsStep } from './steps/ProjectsStep';
import { CertificationsStep } from './steps/CertificationsStep';
import { ReviewStep } from './steps/ReviewStep';
import { WIZARD_STEPS } from '../../../../types/profile';
import type { ResumeParseResult } from '../../../../types/profile';
import styles from './ProfileWizard.module.css';

interface ProfileWizardProps {
  onComplete?: () => void;
}

export const ProfileWizard: React.FC<ProfileWizardProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [parsedResumeData, setParsedResumeData] = useState<ResumeParseResult | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const currentStep = WIZARD_STEPS[currentStepIndex];

  const handleNext = useCallback(() => {
    // Mark current step as completed when moving forward
    setCompletedSteps((prev) => new Set(prev).add(currentStepIndex));

    if (currentStepIndex < WIZARD_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [currentStepIndex]);

  const handlePrevious = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const handleSkip = useCallback(() => {
    if (currentStep.isOptional && currentStepIndex < WIZARD_STEPS.length - 1) {
      // Mark optional step as completed when skipping
      setCompletedSteps((prev) => new Set(prev).add(currentStepIndex));
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [currentStepIndex, currentStep.isOptional]);

  const handleStepClick = useCallback((stepIndex: number) => {
    // Only allow navigation to:
    // 1. Completed steps (can go back to review/edit)
    // 2. Next immediate step after last completed step
    // 3. Current or previous steps
    const canNavigate =
      stepIndex === 0 || // Always allow going to first step
      completedSteps.has(stepIndex - 1) || // Previous step is completed
      stepIndex <= currentStepIndex; // Already visited this step or earlier

    if (canNavigate) {
      setCurrentStepIndex(stepIndex);
    }
  }, [completedSteps, currentStepIndex]);

  const handleComplete = useCallback(() => {
    if (onComplete) {
      onComplete();
    } else {
      navigate('/profile');
    }
  }, [onComplete, navigate]);

  const handleParsedResumeData = useCallback((data: ResumeParseResult) => {
    setParsedResumeData(data);
  }, []);

  const renderStepContent = () => {
    switch (currentStep.id) {
      case 'resume':
        return (
          <ResumeUploadStep
            onNext={handleNext}
            onSkip={handleSkip}
            onParsedData={handleParsedResumeData}
          />
        );
      case 'basic':
        return <BasicInfoStep onNext={handleNext} parsedData={parsedResumeData} />;
      case 'skills':
        return <SkillsStep onNext={handleNext} onPrevious={handlePrevious} parsedData={parsedResumeData} />;
      case 'experience':
        return <ExperienceStep onNext={handleNext} onPrevious={handlePrevious} parsedData={parsedResumeData} />;
      case 'education':
        return <EducationStep onNext={handleNext} onPrevious={handlePrevious} parsedData={parsedResumeData} />;
      case 'projects':
        return (
          <ProjectsStep
            onNext={handleNext}
            onPrevious={handlePrevious}
            onSkip={handleSkip}
            parsedData={parsedResumeData}
          />
        );
      case 'certifications':
        return (
          <CertificationsStep
            onNext={handleNext}
            onPrevious={handlePrevious}
            onSkip={handleSkip}
            parsedData={parsedResumeData}
          />
        );
      case 'review':
        return <ReviewStep onPrevious={handlePrevious} onComplete={handleComplete} />;
      default:
        return null;
    }
  };

  return (
    <div className={styles.wizard}>
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2>Complete Your Profile</h2>
          <p>Help others discover and connect with you</p>
        </div>
        <Stepper
          steps={WIZARD_STEPS.map((step) => ({
            id: step.id,
            title: step.title,
            description: step.description,
            isOptional: step.isOptional,
          }))}
          currentStep={currentStepIndex}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
          allowClickNavigation={true}
        />
      </div>
      <div className={styles.content}>
        <div className={styles.stepHeader}>
          <h1>{currentStep.title}</h1>
          <p>{currentStep.description}</p>
        </div>
        <div className={styles.stepContent}>{renderStepContent()}</div>
      </div>
    </div>
  );
};

export default ProfileWizard;
