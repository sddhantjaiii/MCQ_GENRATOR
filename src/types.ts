export interface MCQQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswers: number[];
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  multipleCorrect: boolean;
}

export interface GenerationOptions {
  questionCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
  multipleCorrect: boolean;
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswers: number[];
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  multipleCorrect: boolean;
}

export interface GenerationResponse {
  questions: Question[];
  metadata: {
    totalQuestions: number;
    difficulty: string;
    generatedAt: string;
    hasMoreChunks: boolean;
    currentChunk: number;
    totalChunks: number;
  };
}