import React, { useState } from 'react';
import { MCQQuestion } from '../types';

interface QuestionPreviewProps {
  questions: MCQQuestion[];
}

export function QuestionPreview({ questions }: QuestionPreviewProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: number[] }>({});
  const [showResults, setShowResults] = useState<{ [key: string]: boolean }>({});
  const [showAllResults, setShowAllResults] = useState(false);

  const handleAnswerSelect = (questionId: string, optionIndex: number) => {
    if (showResults[questionId]) return; // Don't allow changes after showing results
    
    setSelectedAnswers(prev => {
      const current = prev[questionId] || [];
      const question = questions.find(q => q.id === questionId);
      if (!question) return prev;

      if (question.multipleCorrect) {
        // Toggle selection for multiple correct answers
        const newSelection = current.includes(optionIndex)
          ? current.filter(i => i !== optionIndex)
          : [...current, optionIndex];
        return { ...prev, [questionId]: newSelection };
      } else {
        // Single selection for single correct answer
        return { ...prev, [questionId]: [optionIndex] };
      }
    });
  };

  const handleCheckAnswer = (questionId: string) => {
    setShowResults(prev => ({ ...prev, [questionId]: true }));
  };

  const handleShowAllResults = () => {
    setShowAllResults(true);
    const allResults = questions.reduce((acc, q) => ({ ...acc, [q.id]: true }), {});
    setShowResults(allResults);
  };

  return (
    <div className="space-y-6">
      {questions.map((question, index) => {
        const selectedAnswer = selectedAnswers[question.id] || [];
        const showResult = showResults[question.id];
        const isAnswerCorrect = selectedAnswer.length === question.correctAnswers.length &&
          selectedAnswer.every(answer => question.correctAnswers.includes(answer));

        return (
          <div key={question.id} className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium mb-4">
              Question {index + 1}: {question.question}
            </h3>
            <div className="space-y-3">
              {question.options.map((option, optionIndex) => {
                const isSelected = selectedAnswer.includes(optionIndex);
                const isCorrect = question.correctAnswers.includes(optionIndex);

                return (
                  <div
                    key={optionIndex}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      showResult
                        ? isCorrect
                          ? 'bg-green-100 border-green-500'
                          : isSelected
                          ? 'bg-red-100 border-red-500'
                          : 'border-gray-300'
                        : isSelected
                        ? 'bg-blue-100 border-blue-500'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => !showResult && handleAnswerSelect(question.id, optionIndex)}
                  >
                    <div className="flex items-center">
                      <span className="mr-2">{String.fromCharCode(65 + optionIndex)}.</span>
                      <span>{option}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {!showResult && (
              <button
                onClick={() => handleCheckAnswer(question.id)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Check Answer
              </button>
            )}
            {showResult && (
              <div className="mt-4">
                <p className={`font-medium ${isAnswerCorrect ? 'text-green-600' : 'text-red-600'}`}>
                  {isAnswerCorrect ? 'Correct!' : 'Incorrect. Try again!'}
                </p>
                <p className="mt-2 text-gray-600">{question.explanation}</p>
              </div>
            )}
          </div>
        );
      })}
      {!showAllResults && (
        <button
          onClick={handleShowAllResults}
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
        >
          Show All Results
        </button>
      )}
    </div>
  );
}