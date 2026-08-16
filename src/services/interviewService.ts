import { InterviewQuestionData } from '../types/health';
import { MOCK_INTERVIEW_QUESTIONS } from '../data/mockInterview';

export const interviewService = {
  getQuestions(answers: Record<string, unknown> = {}): InterviewQuestionData[] {
    return MOCK_INTERVIEW_QUESTIONS.filter((q) =>
      q.showIf ? q.showIf(answers) : true
    );
  },

  isAnswerValid(question: InterviewQuestionData, answer: unknown): boolean {
    if (!question.required) return true;
    if (answer === undefined || answer === null || answer === '') return false;
    if (Array.isArray(answer) && answer.length === 0) return false;
    return true;
  },
};
