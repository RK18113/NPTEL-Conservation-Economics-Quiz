import { useState, useEffect } from "react";
import "./index.css";
import { quizData } from "./questions.js";

export default function App() {
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState([]);

  useEffect(() => {
    const shuffledQuestions = [...quizData]
      .sort(() => Math.random() - 0.5)
      .map((q) => ({
        ...q,
        options: [...q.options].sort(() => Math.random() - 0.5),
      }));
    setQuestions(shuffledQuestions);
    setAnsweredQuestions(new Array(shuffledQuestions.length).fill(false));
  }, []);

  const startQuiz = () => {
    setQuizStarted(true);
    setScore(0);
    setCurrentQuestion(0);
    setShowScore(false);
    setAnsweredQuestions(new Array(questions.length).fill(false));
  };

  const handleAnswerClick = (option) => {
    if (showAnswer) return; 

    setSelectedAnswer(option);
    setShowAnswer(true);

    const newAnsweredQuestions = [...answeredQuestions];
    newAnsweredQuestions[currentQuestion] = true;
    setAnsweredQuestions(newAnsweredQuestions);

    if (option === questions[currentQuestion].answer) {
      setScore(score + 1);
    }
  };

  const handleNextQuestion = () => {
    setSelectedAnswer(null);
    setShowAnswer(false);

    const nextQuestion = currentQuestion + 1;
    if (nextQuestion < questions.length) {
      setCurrentQuestion(nextQuestion);
    } else {
      setShowScore(true);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);

      if (answeredQuestions[currentQuestion - 1]) {
        setShowAnswer(true);
        setSelectedAnswer(null); 
      } else {
        setShowAnswer(false);
        setSelectedAnswer(null);
      }
    }
  };

  const resetQuiz = () => {
    const shuffledQuestions = [...quizData]
      .sort(() => Math.random() - 0.5)
      .map((q) => ({
        ...q,
        options: [...q.options].sort(() => Math.random() - 0.5),
      }));
    setQuestions(shuffledQuestions);
    setCurrentQuestion(0);
    setScore(0);
    setShowScore(false);
    setSelectedAnswer(null);
    setShowAnswer(false);
    setAnsweredQuestions(new Array(shuffledQuestions.length).fill(false));
  };

  const getButtonClass = (option) => {
    if (!showAnswer) {
      return "border border-white text-white font-semibold py-3 px-6 rounded w-full text-left hover:bg-white hover:bg-opacity-20 transition-colors duration-200";
    }

    if (option === questions[currentQuestion].answer) {
      return "border border-teal-500 bg-teal-500 bg-opacity-20 text-teal-300 font-semibold py-3 px-6 rounded w-full text-left";
    } else if (option === selectedAnswer) {
      return "border border-rose-500 bg-rose-500 bg-opacity-20 text-rose-300 font-semibold py-3 px-6 rounded w-full text-left";
    } else {
      return "border border-gray-600 text-gray-400 font-semibold py-3 px-6 rounded w-full text-left";
    }
  };

  if (!quizStarted) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md border border-gray-700">
          <h1 className="text-3xl font-bold mb-6 text-center text-gray-100">
            Conservation Economics Quiz
          </h1>
          <p className="mb-6 text-center text-gray-300">
            Test your knowledge with {quizData.length} randomized questions!
          </p>
          <button
            onClick={startQuiz}
            className="border-2 border-white text-white font-semibold py-3 px-6 rounded w-full hover:bg-white hover:bg-opacity-20 transition-colors duration-200"
          >
            Start Quiz
          </button>
        </div>
      </div>
    );
  }

  if (showScore) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md border border-gray-700">
          <h1 className="text-3xl font-bold mb-6 text-center text-gray-100">
            Quiz Completed!
          </h1>
          <p className="text-xl text-center mb-6 text-gray-300">
            Your Score: {score} out of {questions.length}
            <br />({Math.round((score / questions.length) * 100)}%)
          </p>
          <button
            onClick={resetQuiz}
            className="border-2 border-white text-white font-semibold py-3 px-6 rounded w-full hover:bg-white hover:bg-opacity-20 transition-colors duration-200"
          >
            Restart Quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full border border-gray-700 w-[700px]">
        <div className="flex justify-between mb-4">
          <span className="font-semibold text-gray-300">
            Question {currentQuestion + 1}/{questions.length}
          </span>
          <span className="font-semibold text-gray-300">Score: {score}</span>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-gray-100">
            {questions[currentQuestion]?.question}
          </h2>
          <div className="flex flex-col gap-4">
            {questions[currentQuestion]?.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerClick(option)}
                className={getButtonClass(option)}
                disabled={showAnswer}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handlePreviousQuestion}
            disabled={currentQuestion === 0}
            className={`border-2 border-white text-white font-semibold py-3 px-6 rounded w-full mt-4 hover:bg-white hover:bg-opacity-20 transition-colors duration-200 ${
              currentQuestion === 0 ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            Previous Question
          </button>

          {showAnswer && (
            <button
              onClick={handleNextQuestion}
              className="border-2 border-white text-white font-semibold py-3 px-6 rounded w-full mt-4 hover:bg-white hover:bg-opacity-20 transition-colors duration-200"
            >
              {currentQuestion < questions.length - 1
                ? "Next Question"
                : "See Results"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
