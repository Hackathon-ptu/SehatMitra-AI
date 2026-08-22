export type QuestionType =
  | 'choice'
  | 'yes_no'
  | 'number'
  | 'severity'
  | 'multi_select'
  | 'text';

export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
}

export interface InterviewQuestionData {
  id: string;
  type: QuestionType;
  question: string;
  description?: string;
  required?: boolean;
  options?: QuestionOption[];
  unit?: string;
  min?: number;
  max?: number;
  showIf?: (answers: Record<string, unknown>) => boolean;
}

export interface InterviewAnswerItem {
  questionId: string;
  questionText: string;
  value: unknown;
  displayText: string;
}
