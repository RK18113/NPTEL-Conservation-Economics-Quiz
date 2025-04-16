import { useState, useEffect } from "react";
import "./index.css";
import { quizData } from "./questions.js";
import ReactMarkdown from "react-markdown";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL_NAME = "gemini-2.0-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-10 font-playfair">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-2xl border border-gray-700 relative">
        {/* Title */}
        <h2 className="text-2xl font-semibold mb-4 text-gray-100 font-playfair">
          {title}
        </h2>

        {/* Body */}
        <div
          className="text-gray-300 max-h-[60vh] overflow-y-auto font-playfair"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#4a5568 #1a202c",
          }}
        >
          {/* Use a wrapper div with the class instead of className on ReactMarkdown */}
          {typeof children === "string" && children !== "Thinking..." ? (
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown>{children}</ReactMarkdown>
            </div>
          ) : (
            <div className="whitespace-pre-wrap">{children}</div>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="border-2 border-white text-white font-playfair font-semibold py-3 px-6 rounded w-full mt-6 hover:bg-white hover:bg-opacity-20 transition-colors duration-200"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState([]);
  // Add new state for tracking incorrect questions
  const [incorrectQuestions, setIncorrectQuestions] = useState([]);
  // Add state to track if we're in retake mode
  const [isRetakeMode, setIsRetakeMode] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState("");
  const [isLoadingGemini, setIsLoadingGemini] = useState(false);
  const [geminiError, setGeminiError] = useState(null);

  // Load initial questions
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

  // Load incorrect questions from localStorage
  useEffect(() => {
    const savedIncorrectQuestions = localStorage.getItem("incorrectQuestions");
    if (savedIncorrectQuestions) {
      setIncorrectQuestions(JSON.parse(savedIncorrectQuestions));
    }
  }, []);

  // Save incorrect questions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(
      "incorrectQuestions",
      JSON.stringify(incorrectQuestions)
    );
  }, [incorrectQuestions]);

  const startQuiz = () => {
    setQuizStarted(true);
    setScore(0);
    setCurrentQuestion(0);
    setShowScore(false);
    setAnsweredQuestions(new Array(questions.length).fill(false));
    setIsModalOpen(false);
    setModalContent("");
    setIsLoadingGemini(false);
    setGeminiError(null);
    setIsRetakeMode(false);
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

      // If we're in retake mode and this question was answered correctly,
      // remove it from the incorrect questions list
      if (isRetakeMode) {
        const updatedIncorrectQuestions = incorrectQuestions.filter(
          (q) => q.question !== questions[currentQuestion].question
        );
        setIncorrectQuestions(updatedIncorrectQuestions);
      }
    } else {
      // Store the incorrectly answered question
      const newIncorrectQuestions = [...incorrectQuestions];
      // Check if this question is already in the incorrect questions array
      const questionExists = newIncorrectQuestions.some(
        (q) => q.question === questions[currentQuestion].question
      );

      if (!questionExists) {
        newIncorrectQuestions.push(questions[currentQuestion]);
        setIncorrectQuestions(newIncorrectQuestions);
      }
    }
  };

  const handleNextQuestion = () => {
    setSelectedAnswer(null);
    setShowAnswer(false);
    setIsModalOpen(false);
    setModalContent("");
    setGeminiError(null);

    const nextQuestion = currentQuestion + 1;
    if (nextQuestion < questions.length) {
      setCurrentQuestion(nextQuestion);
    } else {
      // If we're in "retake mistakes" mode and the user got all questions correct
      if (isRetakeMode && score === questions.length) {
        // Clear the incorrect questions
        setIncorrectQuestions([]);
        localStorage.removeItem("incorrectQuestions");
      }
      setShowScore(true);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setIsModalOpen(false);
      setModalContent("");
      setGeminiError(null);

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
    setIsModalOpen(false);
    setModalContent("");
    setIsLoadingGemini(false);
    setGeminiError(null);
    setIsRetakeMode(false);
  };

  // Add function to handle retaking only the incorrect questions
  const retakeMistakes = () => {
    // Set the questions to only the incorrect ones
    setQuestions(incorrectQuestions);
    // Reset other quiz state
    setCurrentQuestion(0);
    setScore(0);
    setShowScore(false);
    setSelectedAnswer(null);
    setShowAnswer(false);
    setAnsweredQuestions(new Array(incorrectQuestions.length).fill(false));
    // Clear the modal if it's open
    setIsModalOpen(false);
    setModalContent("");
    setIsLoadingGemini(false);
    setGeminiError(null);
    setIsRetakeMode(true);
    setQuizStarted(true);
  };

  const getButtonClass = (option) => {
    if (!showAnswer) {
      return "border border-white text-white font-semibold py-3 px-6 rounded w-full text-left hover:bg-white hover:bg-opacity-20 transition-colors duration-200";
    }
    if (option === questions[currentQuestion]?.answer) {
      return "border border-teal-500 bg-teal-500 bg-opacity-20 text-teal-300 font-semibold py-3 px-6 rounded w-full text-left";
    } else if (option === selectedAnswer) {
      return "border border-rose-500 bg-rose-500 bg-opacity-20 text-rose-300 font-semibold py-3 px-6 rounded w-full text-left";
    } else {
      return "border border-gray-600 text-gray-400 font-semibold py-3 px-6 rounded w-full text-left";
    }
  };

  const handleAskGemini = async () => {
    if (!questions[currentQuestion]) return;
    if (GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") {
      alert(
        "Please replace 'YOUR_GEMINI_API_KEY' with your actual Gemini API key in App.jsx. Remember the security warning about exposing keys in the frontend."
      );
      return;
    }

    const questionText = questions[currentQuestion].question;
    const correctAnswer = questions[currentQuestion].answer;

    const prompt = `Explain the concept behind this quiz question from the Conservation Economics subject and why the answer is correct. Use clear and concise language suitable for someone learning the topic. Give crisp and clear 
    information making the answer within 100-200 words.

Question: ${questionText}
Correct Answer: ${correctAnswer}`;

    setIsLoadingGemini(true);
    setGeminiError(null);
    setModalContent("Thinking...");
    setIsModalOpen(true);

    try {
      const response = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      if (!response.ok) {
        let errorBody = { message: "Unknown error" };
        try {
          errorBody = await response.json();
        } catch (parseError) {
          console.error("Could not parse error response body:", parseError);
          errorBody.message = response.statusText || errorBody.message;
        }
        console.error("Gemini API Error Response:", errorBody);
        throw new Error(
          `API request failed with status ${response.status}: ${
            errorBody?.error?.message || errorBody.message
          }`
        );
      }

      const data = await response.json();

      if (
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0]
      ) {
        const geminiResponse = data.candidates[0].content.parts[0].text;
        setModalContent(geminiResponse);
      } else if (data.promptFeedback && data.promptFeedback.blockReason) {
        const blockReason = data.promptFeedback.blockReason;
        const blockMessage =
          data.promptFeedback.safetyRatings
            ?.map((r) => `${r.category}: ${r.probability}`)
            .join(", ") || "No specific ratings.";
        console.warn(
          `Gemini content blocked: ${blockReason}. Details: ${blockMessage}`
        );
        setModalContent(
          `The request was blocked by the safety filter (${blockReason}). Please try rephrasing or contact support if you believe this is an error.`
        );
        setGeminiError(`Content blocked: ${blockReason}`);
      } else if (
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].finishReason &&
        data.candidates[0].finishReason !== "STOP"
      ) {
        const finishReason = data.candidates[0].finishReason;
        const safetyRatings =
          data.candidates[0].safetyRatings
            ?.map((r) => `${r.category}: ${r.probability}`)
            .join(", ") || "No specific ratings.";
        console.warn(
          `Gemini generation stopped due to: ${finishReason}. Safety Ratings: ${safetyRatings}`
        );
        setModalContent(
          `The explanation could not be fully generated (Reason: ${finishReason}). This might be due to safety settings or other limitations.`
        );
        setGeminiError(`Generation stopped: ${finishReason}`);
      } else {
        console.error("Unexpected Gemini API response structure:", data);
        throw new Error("Received an unexpected response format from the API.");
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      setGeminiError(`Failed to get explanation: ${error.message}`);
      setModalContent(`Error: ${error.message}`);
    } finally {
      setIsLoadingGemini(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
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
          <div className="flex flex-col gap-4">
            <button
              onClick={startQuiz}
              className="border-2 border-white text-white font-semibold py-3 px-6 rounded w-full hover:bg-white hover:bg-opacity-20 transition-colors duration-200"
            >
              Start Quiz
            </button>

            {incorrectQuestions.length > 0 && (
              <button
                onClick={retakeMistakes}
                className="border-2 border-rose-500 text-rose-300 font-semibold py-3 px-6 rounded w-full hover:bg-rose-500 hover:bg-opacity-20 transition-colors duration-200"
              >
                Retake Mistakes ({incorrectQuestions.length})
              </button>
            )}
          </div>
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
          <div className="flex flex-col gap-4">
            <button
              onClick={resetQuiz}
              className="border-2 border-white text-white font-semibold py-3 px-6 rounded w-full hover:bg-white hover:bg-opacity-20 transition-colors duration-200"
            >
              Restart Quiz
            </button>

            {incorrectQuestions.length > 0 && (
              <button
                onClick={retakeMistakes}
                className="border-2 border-rose-500 text-rose-300 font-semibold py-3 px-6 rounded w-full hover:bg-rose-500 hover:bg-opacity-20 transition-colors duration-200"
              >
                Retake Mistakes ({incorrectQuestions.length})
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-700 w-[700px] min:h-[600px] flex flex-col">
          <div className="flex justify-between mb-4">
            <span className="font-semibold text-gray-300">
              Question {currentQuestion + 1}/{questions.length}
              {isRetakeMode && (
                <span className="ml-2 text-rose-400">(Retake Mode)</span>
              )}
            </span>
            <span className="font-semibold text-gray-300">Score: {score}</span>
          </div>
          <div className="mb-6 flex-grow">
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
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={handlePreviousQuestion}
              disabled={currentQuestion === 0}
              className={`border-2 border-white text-white font-semibold py-3 px-6 rounded flex-1 mt-4 hover:bg-white hover:bg-opacity-20 transition-colors duration-200 ${
                currentQuestion === 0 ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              Previous Question
            </button>

            {showAnswer && (
              <>
                <button
                  onClick={handleAskGemini}
                  className="border-2 border-purple-500 text-purple-300 font-semibold py-3 px-6 rounded flex-1 mt-4 hover:bg-purple-500 hover:bg-opacity-20 transition-colors duration-200"
                >
                  Ask Gemini
                </button>

                <button
                  onClick={handleNextQuestion}
                  className="border-2 border-white text-white font-semibold py-3 px-6 rounded flex-1 mt-4 hover:bg-white hover:bg-opacity-20 transition-colors duration-200"
                >
                  {currentQuestion < questions.length - 1
                    ? "Next Question"
                    : "See Results"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Gemini Explanation"
      >
        {isLoadingGemini && !modalContent.startsWith("Error:")
          ? "Thinking..."
          : modalContent}
      </Modal>
    </>
  );
}
