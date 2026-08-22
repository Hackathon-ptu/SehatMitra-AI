import { InterviewQuestionData } from '../types/health';
import { interviewApi } from './api';

export const interviewService = {
  async sendAnswer(userMessage: string, language: string = 'en', sessionId?: number) {
    return await interviewApi.sendAnswer(userMessage, language, sessionId);
  },

  isAnswerValid(question: InterviewQuestionData, answer: unknown): boolean {
    if (!question.required) return true;
    if (answer === undefined || answer === null || answer === '') return false;
    if (Array.isArray(answer) && answer.length === 0) return false;
    return true;
  },
};
