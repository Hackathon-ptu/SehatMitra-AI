import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { STORAGE_KEY_LANGUAGE, AVAILABLE_LANGUAGES } from '../data/languageData';
import { InterviewAnswerItem } from '../types/health';
import { InterviewHeader } from '../components/health/InterviewHeader';
import { InterviewProgress } from '../components/health/InterviewProgress';
import { InterviewQuestion } from '../components/health/InterviewQuestion';
import { InterviewNavigation } from '../components/health/InterviewNavigation';
import { InterviewReview } from '../components/health/InterviewReview';
import { InterviewComplete } from '../components/health/InterviewComplete';
import { interviewService } from '../services/interviewService';
import { riskService } from '../services/riskService';

export const HealthInterviewPage: React.FC = () => {
  const [sessionId, setSessionId] = useState<number | undefined>(undefined);
  const [currentQuestionText, setCurrentQuestionText] = useState<string>('Please describe your symptoms to start the health interview.');
  const [userResponse, setUserResponse] = useState<string>('');
  const [languageName, setLanguageName] = useState<string>('English');
  const [isReviewing, setIsReviewing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [assessmentData, setAssessmentData] = useState<any>(null);
  const [history, setHistory] = useState<{ question: string; answer: string }[]>([]);

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

  const handleUpdateAnswer = (val: unknown) => {
    setUserResponse(val as string);
  };

  const handleNext = async () => {
    if (!userResponse.trim()) return;

    setIsThinking(true);
    try {
      const code = localStorage.getItem(STORAGE_KEY_LANGUAGE) || 'en';
      const res = await interviewService.sendAnswer(userResponse, code, sessionId);
      
      setSessionId(res.session_id);
      const newHistory = [...history, { question: currentQuestionText, answer: userResponse }];
      setHistory(newHistory);
      
      const symptoms = res.collected_symptoms || {};

      if (res.is_completed) {
        setIsCompleted(true);
        // Automatically trigger riskApi.assessRisk
        const assessment = await riskService.getAssessment(res.session_id, symptoms);
        setAssessmentData(assessment);
      } else {
        setCurrentQuestionText(res.next_question);
        setUserResponse('');
      }
    } catch (err) {
      console.error('Failed to send interview response', err);
    } finally {
      setIsThinking(false);
    }
  };

  const handlePrevious = () => {
    if (isReviewing) {
      setIsReviewing(false);
      return;
    }
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setCurrentQuestionText(prev.question);
      setUserResponse(prev.answer);
      setHistory((prevHistory) => prevHistory.slice(0, -1));
    } else {
      navigate('/chat');
    }
  };

  // Convert history answers to display items for review screen
  const getFormattedAnswers = (): InterviewAnswerItem[] => {
    return history.map((item, idx) => ({
      questionId: `q-${idx}`,
      questionText: item.question,
      value: item.answer,
      displayText: item.answer,
    }));
  };

  const currentQuestion = {
    id: 'symptom_input',
    question: currentQuestionText,
    type: 'text' as const,
    required: true,
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
            onEditQuestion={() => {
              setIsReviewing(false);
              setIsCompleted(false);
            }}
            onFinishReview={() => {
              setIsReviewing(false);
              setIsCompleted(true);
            }}
          />
        ) : isCompleted ? (
          <InterviewComplete
            onContinueToAssessment={() => {
              navigate('/risk-assessment', {
                state: { sessionId, assessment: assessmentData },
              });
            }}
            onReviewAnswers={() => setIsReviewing(true)}
          />
        ) : (
          <div className="flex-1 flex flex-col w-full max-w-2xl mx-auto my-auto justify-center">
            <InterviewProgress
              currentStep={history.length + 1}
              totalSteps={history.length + 2}
            />

            <InterviewQuestion
              question={currentQuestion}
              value={userResponse}
              onChange={handleUpdateAnswer}
              acknowledgement={isThinking ? 'Processing answer...' : null}
            />

            <div className="mt-6 flex justify-end">
              <InterviewNavigation
                onPrevious={handlePrevious}
                onContinue={handleNext}
                canPrevious={true}
                canContinue={!!userResponse.trim() && !isThinking}
                isLastStep={false}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
