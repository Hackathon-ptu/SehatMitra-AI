import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_INTERVIEW_QUESTIONS, MOCK_ACKNOWLEDGEMENTS } from '../data/mockInterview';
import { STORAGE_KEY_LANGUAGE, AVAILABLE_LANGUAGES } from '../data/languageData';
import { InterviewAnswerItem } from '../types/health';
import { InterviewHeader } from '../components/health/InterviewHeader';
import { InterviewProgress } from '../components/health/InterviewProgress';
import { InterviewQuestion } from '../components/health/InterviewQuestion';
import { InterviewNavigation } from '../components/health/InterviewNavigation';
import { InterviewReview } from '../components/health/InterviewReview';
import { InterviewComplete } from '../components/health/InterviewComplete';

export const HealthInterviewPage: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [languageName, setLanguageName] = useState<string>('English');
  const [acknowledgement, setAcknowledgement] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const navigate = useNavigate();

  // Load language settings on mount
  useEffect(() => {
    try {
      const code = localStorage.getItem(STORAGE_KEY_LANGUAGE) || 'en';
      const found = AVAILABLE_LANGUAGES.find((l) => l.code === code);
      if (found) {
        setLanguageName(found.nativeName);
      }
    } catch {
      setLanguageName('English');
    }
  }, []);

  // Filter dynamic active questions based on showIf conditions
  const activeQuestions = MOCK_INTERVIEW_QUESTIONS.filter((q) =>
    q.showIf ? q.showIf(answers) : true
  );

  const currentQuestion = activeQuestions[currentIndex] || activeQuestions[0];
  const currentAnswer = answers[currentQuestion?.id];

  // Answer validation check
  const isAnswerValid = () => {
    if (!currentQuestion?.required) return true;
    if (currentAnswer === undefined || currentAnswer === null || currentAnswer === '') return false;
    if (Array.isArray(currentAnswer) && currentAnswer.length === 0) return false;
    return true;
  };

  const handleUpdateAnswer = (val: unknown) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: val,
    }));
  };

  const handleNext = () => {
    if (currentIndex < activeQuestions.length - 1) {
      // Occasional conversational acknowledgement
      if (currentIndex % 2 === 1) {
        const ackText = MOCK_ACKNOWLEDGEMENTS[currentIndex % MOCK_ACKNOWLEDGEMENTS.length];
        setAcknowledgement(ackText);
        setTimeout(() => setAcknowledgement(null), 3000);
      }
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handlePrevious = () => {
    if (isReviewing) {
      setIsReviewing(false);
      return;
    }
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else {
      navigate('/chat');
    }
  };

  // Convert answers map to display items for review screen
  const getFormattedAnswers = (): InterviewAnswerItem[] => {
    return activeQuestions.map((q) => {
      const rawVal = answers[q.id];
      let display = '';
      if (Array.isArray(rawVal)) {
        display = rawVal.join(', ');
      } else if (typeof rawVal === 'object' && rawVal !== null) {
        display = JSON.stringify(rawVal);
      } else {
        display = String(rawVal || 'Not answered');
      }
      return {
        questionId: q.id,
        questionText: q.question,
        value: rawVal,
        displayText: display,
      };
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg text-content-primary">
      <InterviewHeader
        onBack={handlePrevious}
        selectedLanguageName={languageName}
      />

      <main className="flex-1 w-full max-w-content-container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col">
        {isReviewing ? (
          <InterviewReview
            answers={getFormattedAnswers()}
            onEditQuestion={(id) => {
              const idx = activeQuestions.findIndex((q) => q.id === id);
              if (idx !== -1) {
                setCurrentIndex(idx);
                setIsReviewing(false);
                setIsCompleted(false);
              }
            }}
            onFinishReview={() => {
              setIsReviewing(false);
              setIsCompleted(true);
            }}
          />
        ) : isCompleted ? (
          <InterviewComplete
            onContinueToAssessment={() => navigate('/risk-assessment')}
            onReviewAnswers={() => setIsReviewing(true)}
          />
        ) : (
          <div className="flex-1 flex flex-col w-full max-w-2xl mx-auto my-auto">
            <InterviewProgress
              currentStep={currentIndex + 1}
              totalSteps={activeQuestions.length}
            />

            <InterviewQuestion
              question={currentQuestion}
              value={currentAnswer}
              onChange={handleUpdateAnswer}
              acknowledgement={acknowledgement}
            />

            <InterviewNavigation
              onPrevious={handlePrevious}
              onContinue={handleNext}
              canPrevious={true}
              canContinue={isAnswerValid()}
              isLastStep={currentIndex === activeQuestions.length - 1}
            />
          </div>
        )}
      </main>
    </div>
  );
};
