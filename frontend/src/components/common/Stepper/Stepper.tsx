import React from 'react';
import styles from './Stepper.module.css';

interface Step {
  id: string;
  title: string;
  description?: string;
  isOptional?: boolean;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  completedSteps?: Set<number>;
  onStepClick?: (stepIndex: number) => void;
  allowClickNavigation?: boolean;
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  completedSteps = new Set(),
  onStepClick,
  allowClickNavigation = false,
}) => {
  const handleStepClick = (index: number) => {
    if (!allowClickNavigation || !onStepClick) return;

    // Allow navigation to:
    // 1. Completed steps (can go back)
    // 2. Next step after last completed (forward progress)
    // 3. Current or previous steps
    const canNavigate =
      index === 0 ||
      completedSteps.has(index - 1) ||
      index <= currentStep;

    if (canNavigate) {
      onStepClick(index);
    }
  };

  return (
    <div className={styles.stepper}>
      {steps.map((step, index) => {
        const isCompleted = completedSteps.has(index);
        const isActive = index === currentStep;
        const canNavigate =
          allowClickNavigation &&
          (index === 0 || completedSteps.has(index - 1) || index <= currentStep);
        const isClickable = canNavigate;

        return (
          <div key={step.id} className={styles.stepContainer}>
            <div
              className={`${styles.step} ${isCompleted ? styles.completed : ''} ${
                isActive ? styles.active : ''
              } ${isClickable ? styles.clickable : ''}`}
              onClick={() => handleStepClick(index)}
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : undefined}
            >
              <div className={styles.stepIndicator}>
                {isCompleted ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                  </svg>
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <div className={styles.stepContent}>
                <span className={styles.stepTitle}>
                  {step.title}
                  {step.isOptional && (
                    <span className={styles.optional}>(Optional)</span>
                  )}
                </span>
                {step.description && (
                  <span className={styles.stepDescription}>{step.description}</span>
                )}
              </div>
            </div>
            {index < steps.length - 1 && <div className={styles.connector} />}
          </div>
        );
      })}
    </div>
  );
};

export default Stepper;
