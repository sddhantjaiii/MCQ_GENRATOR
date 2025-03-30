import React, { useState } from 'react';
import { Upload, BookOpen, Settings, Download, Loader2, AlertCircle } from 'lucide-react';
import { GenerationOptions, MCQQuestion } from './types';
import { generateMCQs, generateNextBatch } from './api';
import { QuestionPreview } from './components/QuestionPreview';
import './App.css';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [options, setOptions] = useState<GenerationOptions>({
    questionCount: 10,
    difficulty: 'medium',
    multipleCorrect: false,
  });
  const [loading, setLoading] = useState(false);
  const [hasMoreChunks, setHasMoreChunks] = useState(false);
  const [currentChunk, setCurrentChunk] = useState(1);
  const [totalChunks, setTotalChunks] = useState(0);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
    } else if (selectedFile) {
      setError('Please upload a PDF file');
    }
  };

  const handleOptionsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setOptions(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleGenerate = async () => {
    if (!file) {
      setError('Please select a PDF file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await generateMCQs(file, options);
      setQuestions(response.questions);
      setHasMoreChunks(response.metadata.hasMoreChunks);
      setCurrentChunk(response.metadata.currentChunk);
      setTotalChunks(response.metadata.totalChunks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate questions');
    } finally {
      setLoading(false);
    }
  };

  const handleNextBatch = async () => {
    if (!hasMoreChunks) return;

    setLoading(true);
    setError(null);

    try {
      const response = await generateNextBatch(options);
      setQuestions(prev => [...prev, ...response.questions]);
      setHasMoreChunks(response.metadata.hasMoreChunks);
      setCurrentChunk(response.metadata.currentChunk);
      setTotalChunks(response.metadata.totalChunks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate next batch of questions');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const questionsText = questions
      .map((q, i) => {
        const options = q.options
          .map((opt, j) => `${String.fromCharCode(65 + j)}. ${opt}`)
          .join('\n');
        const correctAnswers = q.correctAnswers
          .map((idx) => String.fromCharCode(65 + idx))
          .join(', ');
        return `Q${i + 1}. ${q.question}\n\n${options}\n\nCorrect Answer(s): ${correctAnswers}\nExplanation: ${q.explanation}\n\n`;
      })
      .join('---\n\n');

    const blob = new Blob([questionsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mcq-questions.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-6 w-6 text-indigo-600" />
            <span className="text-xl font-semibold text-gray-900">MCQ Generator</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-xl p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Upload Section */}
            <div className="space-y-6">
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center ${
                  error ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              >
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="pdf-upload"
                />
                <label
                  htmlFor="pdf-upload"
                  className="cursor-pointer flex flex-col items-center space-y-2"
                >
                  <Upload className={`h-12 w-12 ${error ? 'text-red-400' : 'text-gray-400'}`} />
                  <span className={`text-sm ${error ? 'text-red-600' : 'text-gray-600'}`}>
                    {file ? file.name : 'Upload PDF Study Material'}
                  </span>
                </label>
                {error && (
                  <div className="mt-2 flex items-center justify-center gap-1 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              {/* Generation Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Generation Options
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Number of Questions
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={options.questionCount}
                      onChange={handleOptionsChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Difficulty Level
                    </label>
                    <select
                      value={options.difficulty}
                      onChange={handleOptionsChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="multiple-correct"
                      name="multipleCorrect"
                      checked={options.multipleCorrect}
                      onChange={handleOptionsChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="multiple-correct"
                      className="ml-2 block text-sm text-gray-700"
                    >
                      Allow multiple correct answers
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Section */}
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-medium">Preview & Export</h3>
              <QuestionPreview questions={questions} />
              <div className="flex justify-end space-x-4">
                <button
                  onClick={handleGenerate}
                  disabled={!file || loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Generating...
                    </>
                  ) : (
                    'Generate MCQs'
                  )}
                </button>
                {hasMoreChunks && (
                  <button
                    onClick={handleNextBatch}
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Loading...' : 'Next Batch'}
                  </button>
                )}
                <button
                  onClick={handleExport}
                  disabled={!questions.length || loading}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;