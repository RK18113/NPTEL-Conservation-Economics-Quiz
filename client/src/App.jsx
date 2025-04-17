import { useState, useEffect } from "react";
import "./index.css"; // Make sure this path is correct
import { quizData } from "./questions.js"; // Make sure this path is correct
import ReactMarkdown from "react-markdown";

// --- IMPORTANT SECURITY WARNING ---
// Exposing API keys directly in frontend code is a security risk.
// Anyone can view the source code in their browser and find your key.
// For production applications, API calls should ideally be routed through a backend server
// where the key can be kept secret. For learning/personal projects, be aware of the risks.
// Consider using environment variables for local development but *do not* commit the .env file
// if it contains sensitive keys unless the repository is private and secure.
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "YOUR_GEMINI_API_KEY"; // Fallback if env var is missing
const GEMINI_MODEL_NAME = "gemini-1.5-flash"; // Updated model name if needed
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 sm:p-10 font-playfair">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-2xl border border-gray-700 relative">
        <h2 className="text-2xl font-semibold mb-4 text-gray-100 font-playfair">
          {title}
        </h2>

        <div
          className="text-gray-300 max-h-[60vh] overflow-y-auto font-playfair prose prose-invert max-w-none"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#4a5568 #1a202c",
          }}
        >
           {/* Render loading state or actual content */}
           {isLoadingGemini && modalContent === "Thinking..." ? (
             <div className="whitespace-pre-wrap">{modalContent}</div>
           ) : typeof children === "string" ? (
            // Use ReactMarkdown only if it's not just the loading/error message
            <ReactMarkdown>{children}</ReactMarkdown>
          ) : (
             <div className="whitespace-pre-wrap">{children}</div> // Fallback for non-string or complex children
           )}
        </div>

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
  const [incorrectQuestions, setIncorrectQuestions] = useState([]);
  const [isRetakeMode, setIsRetakeMode] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState("");
  const [isLoadingGemini, setIsLoadingGemini] = useState(false);
  const [geminiError, setGeminiError] = useState(null);

  // Shuffle questions on initial load
  useEffect(() => {
    const shuffledQuestions = [...quizData]
      .sort(() => Math.random() - 0.5)
      .map((q) => ({
        ...q,
        options: [...q.options].sort(() => Math.random() - 0.5),
      }));
    setQuestions(shuffledQuestions);
    setAnsweredQuestions(new Array(shuffledQuestions.length).fill(null)); // Store selected answer or null
  }, []);

  // Load incorrect questions from local storage
  useEffect(() => {
    try {
      const savedIncorrectQuestions = localStorage.getItem("incorrectQuestions");
      if (savedIncorrectQuestions) {
        const parsedQuestions = JSON.parse(savedIncorrectQuestions);
        // Basic validation: check if it's an array
        if (Array.isArray(parsedQuestions)) {
          setIncorrectQuestions(parsedQuestions);
        } else {
          console.warn("Invalid data found in localStorage for incorrectQuestions. Resetting.");
          localStorage.removeItem("incorrectQuestions");
        }
      }
    } catch (error) {
      console.error("Failed to parse incorrect questions from localStorage:", error);
      localStorage.removeItem("incorrectQuestions"); // Clear corrupted data
    }
  }, []);

  // Save incorrect questions to local storage
  useEffect(() => {
    // Only save if incorrectQuestions is not empty, to avoid storing "[]" unnecessarily
    if (incorrectQuestions.length > 0) {
        try {
            localStorage.setItem(
              "incorrectQuestions",
              JSON.stringify(incorrectQuestions)
            );
        } catch (error) {
            console.error("Failed to save incorrect questions to localStorage:", error);
        }
    } else {
        // If it becomes empty (e.g., after successful retake), remove the item
        localStorage.removeItem("incorrectQuestions");
    }
  }, [incorrectQuestions]);

  const startQuiz = (retake = false) => {
    const questionsSource = retake ? incorrectQuestions : quizData;
    if (retake && questionsSource.length === 0) {
        alert("No mistakes to retake!");
        return;
    }

    const shuffledQuestions = [...questionsSource]
        .sort(() => Math.random() - 0.5)
        .map((q) => ({
          ...q,
          // Ensure options exist and are an array before shuffling
          options: Array.isArray(q.options) ? [...q.options].sort(() => Math.random() - 0.5) : [],
        }));

    setQuestions(shuffledQuestions);
    setCurrentQuestion(0);
    setScore(0);
    setShowScore(false);
    setSelectedAnswer(null);
    setShowAnswer(false);
    setAnsweredQuestions(new Array(shuffledQuestions.length).fill(null)); // Reset answered state
    setIsModalOpen(false);
    setModalContent("");
    setIsLoadingGemini(false);
    setGeminiError(null);
    setIsRetakeMode(retake);
    setQuizStarted(true);
  };


  const handleAnswerClick = (option) => {
    if (showAnswer) return; // Don't allow changing answer after revealing

    const currentQ = questions[currentQuestion];
    const isCorrect = option === currentQ.answer;

    setSelectedAnswer(option); // Store the user's selected option
    setShowAnswer(true);      // Reveal the correct/incorrect status

    // Update answeredQuestions state immutably
    const newAnsweredQuestions = [...answeredQuestions];
    newAnsweredQuestions[currentQuestion] = option; // Store the selected option
    setAnsweredQuestions(newAnsweredQuestions);

    if (isCorrect) {
      setScore(score + 1);
      // If in retake mode and answered correctly, remove from incorrect list for the *next* session
      if (isRetakeMode) {
        setIncorrectQuestions(prevIncorrect =>
            prevIncorrect.filter(q => q.question !== currentQ.question)
        );
      }
    } else {
      // If answered incorrectly, add to incorrect list if not already there (for next session)
      // This check prevents duplicates if user navigates back and forth
      if (!incorrectQuestions.some(q => q.question === currentQ.question)) {
        setIncorrectQuestions(prevIncorrect => [...prevIncorrect, currentQ]);
      }
    }
  };


  const handleNextQuestion = () => {
    const nextQuestion = currentQuestion + 1;
    setShowAnswer(false);       // Hide answer feedback for the next question
    setSelectedAnswer(null);    // Reset selected answer for the next question
    setIsModalOpen(false);      // Close modal if open
    setModalContent("");
    setGeminiError(null);

    if (nextQuestion < questions.length) {
      setCurrentQuestion(nextQuestion);
      // Restore previous answer state if navigating back to an already answered question
      const previousAnswer = answeredQuestions[nextQuestion];
       if(previousAnswer !== null) {
         setSelectedAnswer(previousAnswer);
         setShowAnswer(true);
       }
    } else {
      // End of the quiz
      if (isRetakeMode && score === questions.length) {
        // If retake mode and all answers are correct, clear the incorrect list entirely
        // Note: individual correct answers were already removed during handleAnswerClick
        // This full clear might happen if they retake a list of N questions and get all N right.
        setIncorrectQuestions([]);
        // localStorage.removeItem("incorrectQuestions"); // This will be handled by the useEffect dependency
      }
      setShowScore(true);
    }
  };


  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      const prevQuestionIndex = currentQuestion - 1;
      setCurrentQuestion(prevQuestionIndex);
      setIsModalOpen(false); // Close modal when navigating
      setModalContent("");
      setGeminiError(null);

      // Restore the state of the previous question
      const previousAnswer = answeredQuestions[prevQuestionIndex];
      if (previousAnswer !== null) {
        setSelectedAnswer(previousAnswer);
        setShowAnswer(true); // Show answer feedback immediately
      } else {
        setSelectedAnswer(null);
        setShowAnswer(false); // Not answered yet
      }
    }
  };

  // Renamed from resetQuiz to avoid confusion with retake
  const startNewQuiz = () => {
    setIncorrectQuestions([]); // Clear mistakes when starting fresh
    localStorage.removeItem("incorrectQuestions"); // Clear storage too
    startQuiz(false); // Call the main start function in non-retake mode
  };

  const retakeMistakes = () => {
      if (incorrectQuestions.length === 0) {
          alert("No mistakes recorded to retake!");
          return;
      }
      startQuiz(true); // Call the main start function in retake mode
  };


  const getButtonClass = (option) => {
    const currentQ = questions[currentQuestion];
    if (!currentQ) return "border border-gray-600 text-gray-400 ..."; // Safety check

    // While answer is hidden (before user clicks an option)
    if (!showAnswer) {
      return "border border-white text-white font-semibold py-3 px-6 rounded w-full text-left hover:bg-white hover:bg-opacity-20 transition-colors duration-200";
    }

    // After answer is revealed
    const isCorrectAnswer = option === currentQ.answer;
    const isSelectedAnswer = option === selectedAnswer;

    if (isCorrectAnswer) {
      // Always highlight the correct answer in green
      return "border border-teal-500 bg-teal-500 bg-opacity-20 text-teal-300 font-semibold py-3 px-6 rounded w-full text-left";
    } else if (isSelectedAnswer) {
      // Highlight the user's incorrect selection in red
      return "border border-rose-500 bg-rose-500 bg-opacity-20 text-rose-300 font-semibold py-3 px-6 rounded w-full text-left";
    } else {
      // Other incorrect options remain neutral but disabled-looking
      return "border border-gray-600 text-gray-400 font-semibold py-3 px-6 rounded w-full text-left opacity-70"; // Added opacity
    }
  };

  const handleAskGemini = async () => {
    if (!questions[currentQuestion]) return;

    // --- MODIFICATION START ---
    // Check if the API key is the placeholder value
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") {
      console.warn("Gemini API Key not configured. Opening Google Search in a new tab.");
      const questionText = questions[currentQuestion].question;
      // Add context for a better search query
      const searchQuery = encodeURIComponent(`explain: ${questionText} (conservation economics)`);
      const googleSearchUrl = `https://www.google.com/search?q=${searchQuery}`;
      // Open Google search in a new tab
      window.open(googleSearchUrl, '_blank', 'noopener,noreferrer'); // Use _blank for new tab, add rel for security
      return; // Stop the function here, don't proceed with API call
    }
    // --- MODIFICATION END ---

    // If API key is present, proceed with the API call logic
    const questionText = questions[currentQuestion].question;
    const correctAnswer = questions[currentQuestion].answer;

    // Construct a more robust prompt
    const prompt = `Subject: Conservation Economics
Topic Explanation Request

Please explain the core concept behind the following quiz question and clarify why the stated answer is correct. Provide a concise explanation (aiming for 100-150 words) suitable for a student learning this topic. Focus on the economic principle or conservation strategy involved.

Question: "${questionText}"
Correct Answer: "${correctAnswer}"

Explanation:`;

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
          // Optional: Add generation config if needed
          // generationConfig: {
          //   temperature: 0.7,
          //   maxOutputTokens: 300,
          // },
          // Optional: Add safety settings if needed
          // safetySettings: [
          //   { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          //   // Add other categories as needed
          // ]
        }),
      });

      // Improved error handling for non-OK responses
      if (!response.ok) {
        let errorBody = { message: "Unknown API error" };
        try {
          errorBody = await response.json(); // Attempt to parse error details from API
        } catch (parseError) {
          console.error("Could not parse error response body:", parseError);
          errorBody.message = response.statusText || `HTTP error ${response.status}`;
        }
        console.error("Gemini API Error Response:", errorBody);
        // Extract a more specific error message if available
        const specificError = errorBody?.error?.message || errorBody.message;
        throw new Error(
          `API request failed: ${specificError}`
        );
      }

      const data = await response.json();
      console.log("Gemini API Response Data:", data); // Log successful response for debugging

      // Robust check for response content
      const candidate = data.candidates?.[0];
      const contentPart = candidate?.content?.parts?.[0];
      const text = contentPart?.text;

      if (text) {
        setModalContent(text);
      } else if (candidate?.finishReason && candidate.finishReason !== "STOP") {
        // Handle cases where generation stopped for reasons other than completion (e.g., safety, length)
        const reason = candidate.finishReason;
        const safetyRatings = candidate.safetyRatings?.map(r => `${r.category}: ${r.probability}`).join(', ') || "N/A";
        console.warn(`Gemini generation stopped due to: ${reason}. Safety Ratings: ${safetyRatings}`);
        let userMessage = `The explanation couldn't be fully generated (Reason: ${reason}).`;
        if (reason === 'SAFETY') {
            userMessage += ` This might be due to the content potentially violating safety policies. Details: ${safetyRatings}`;
        } else if (reason === 'MAX_TOKENS') {
            userMessage += ` The explanation exceeded the maximum length limit.`;
        } else {
            userMessage += ` Please try again or rephrase the request if the issue persists.`;
        }
         setModalContent(userMessage);
         setGeminiError(`Generation stopped: ${reason}`);

      } else if (data.promptFeedback?.blockReason) {
        // Handle cases where the prompt itself was blocked
         const reason = data.promptFeedback.blockReason;
         const safetyRatings = data.promptFeedback.safetyRatings?.map(r => `${r.category}: ${r.probability}`).join(', ') || "N/A";
         console.warn(`Gemini prompt blocked: ${reason}. Details: ${safetyRatings}`);
         setModalContent(
           `Your request was blocked due to safety concerns (${reason}). Please ensure your input is appropriate.`
         );
         setGeminiError(`Prompt blocked: ${reason}`);
      }
       else {
        // Fallback for unexpected structure
        console.error("Unexpected Gemini API response structure:", data);
        throw new Error("Received an unexpected response format from the API.");
      }

    } catch (error) {
      console.error("Error calling Gemini API:", error);
      // Display a user-friendly error message in the modal
      setGeminiError(`Failed to get explanation: ${error.message}`);
      setModalContent(`Error: ${error.message}\n\nPlease check your API key, network connection, and the console for more details.`);
    } finally {
      setIsLoadingGemini(false); // Ensure loading stops regardless of outcome
    }
  };


  const handleCloseModal = () => {
    setIsModalOpen(false);
     // Optionally reset error state when closing modal
     // setGeminiError(null);
  };


  // --- Render Logic ---

  // Initial Start Screen
  if (!quizStarted) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 font-playfair">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md border border-gray-700 text-center">
          <h1 className="text-3xl font-bold mb-6 text-gray-100">
            Conservation Economics Quiz
          </h1>
          <p className="mb-6 text-gray-300">
            Test your knowledge with {quizData.length} randomized questions!
          </p>
          <div className="flex flex-col gap-4">
            <button
              onClick={() => startQuiz(false)} // Explicitly start new quiz
              className="border-2 border-white text-white font-semibold py-3 px-6 rounded w-full hover:bg-white hover:bg-opacity-20 transition-colors duration-200"
            >
              Start Quiz
            </button>

            {incorrectQuestions.length > 0 && (
              <button
                onClick={retakeMistakes}
                className="border-2 border-rose-500 text-rose-300 font-semibold py-3 px-6 rounded w-full hover:bg-rose-500 hover:bg-opacity-20 transition-colors duration-200"
              >
                Retake {incorrectQuestions.length} Mistake{incorrectQuestions.length > 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Score Screen
  if (showScore) {
    const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 font-playfair">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md border border-gray-700 text-center">
          <h1 className="text-3xl font-bold mb-6 text-gray-100">
            Quiz Completed!
          </h1>
           {isRetakeMode && (
            <p className="text-lg text-yellow-400 mb-4">(Retake Session)</p>
          )}
          <p className="text-xl mb-6 text-gray-300">
            Your Score: {score} out of {questions.length}
            <br />({percentage}%)
          </p>
          {isRetakeMode && score === questions.length && incorrectQuestions.length === 0 && (
             <p className="text-teal-400 mb-6">Congratulations! You've corrected all your previous mistakes.</p>
          )}
          <div className="flex flex-col gap-4">
            <button
              onClick={startNewQuiz} // Use the renamed function
              className="border-2 border-white text-white font-semibold py-3 px-6 rounded w-full hover:bg-white hover:bg-opacity-20 transition-colors duration-200"
            >
              Start New Quiz
            </button>

            {/* Show Retake button only if there are still incorrect questions */}
            {incorrectQuestions.length > 0 && (
              <button
                onClick={retakeMistakes}
                className="border-2 border-rose-500 text-rose-300 font-semibold py-3 px-6 rounded w-full hover:bg-rose-500 hover:bg-opacity-20 transition-colors duration-200"
              >
                 Retake {incorrectQuestions.length} Mistake{incorrectQuestions.length > 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main Quiz View
  return (
    <>
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 font-playfair">
         {/* Added w-full and max-w-3xl for better responsiveness */}
        <div className="bg-gray-800 p-6 sm:p-8 rounded-lg shadow-lg border border-gray-700 w-full max-w-3xl min-h-[500px] sm:min-h-[600px] flex flex-col">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <span className="font-semibold text-gray-300 text-sm sm:text-base">
              Question {currentQuestion + 1}/{questions.length}
              {isRetakeMode && (
                <span className="ml-2 text-rose-400 font-normal">(Retake Mode)</span>
              )}
            </span>
            <span className="font-semibold text-gray-300 text-sm sm:text-base">Score: {score}</span>
          </div>
          <div className="mb-6 flex-grow">
             {/* Check if questions[currentQuestion] exists before accessing its properties */}
            <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-6 text-gray-100">
                {questions[currentQuestion]?.question ?? "Loading question..."}
            </h2>
            <div className="flex flex-col gap-3 sm:gap-4">
              {questions[currentQuestion]?.options?.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerClick(option)}
                   // Ensure getButtonClass doesn't error if question is loading
                  className={getButtonClass(option)}
                  // Disable button after an answer is shown for the current question
                  disabled={showAnswer}
                >
                  {option}
                </button>
              )) ?? <p className="text-gray-400">Loading options...</p>}
            </div>
          </div>

           {/* Button Container - improved responsiveness */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-auto">
             {/* Previous Button */}
            <button
                onClick={handlePreviousQuestion}
                disabled={currentQuestion === 0}
                className={`border-2 border-white text-white font-semibold py-2 px-4 sm:py-3 sm:px-6 rounded w-full sm:w-auto sm:flex-1 transition-colors duration-200 ${
                    currentQuestion === 0
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-white hover:bg-opacity-20"
                }`}
            >
                Previous
            </button>

            {/* Conditional Buttons: Ask Gemini / Next */}
            {showAnswer && (
                <>
                 <button
                    onClick={handleAskGemini}
                    disabled={isLoadingGemini} // Disable while loading explanation
                    className={`border-2 border-purple-500 text-purple-300 font-semibold py-2 px-4 sm:py-3 sm:px-6 rounded w-full sm:w-auto sm:flex-1 transition-colors duration-200 ${
                        isLoadingGemini
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-purple-500 hover:bg-opacity-20"
                     }`}
                >
                    {isLoadingGemini ? "Thinking..." : "Ask Gemini"}
                 </button>

                 <button
                    onClick={handleNextQuestion}
                    className="border-2 border-white text-white font-semibold py-2 px-4 sm:py-3 sm:px-6 rounded w-full sm:w-auto sm:flex-1 hover:bg-white hover:bg-opacity-20 transition-colors duration-200"
                >
                    {currentQuestion < questions.length - 1
                    ? "Next Question"
                    : "See Results"}
                 </button>
                </>
            )}
            {/* Show Next button even if answer isn't revealed, but only if not answered yet */}
            {!showAnswer && answeredQuestions[currentQuestion] === null && (
                <button
                    onClick={handleNextQuestion} // Allow skipping if needed, but maybe disable?
                    disabled={true} // Usually you want an answer before proceeding
                    className="border-2 border-white text-white font-semibold py-2 px-4 sm:py-3 sm:px-6 rounded w-full sm:w-auto sm:flex-1 opacity-50 cursor-not-allowed transition-colors duration-200"
                >
                    {currentQuestion < questions.length - 1
                    ? "Next Question"
                    : "See Results"}
                </button>
             )}
          </div>
        </div>
      </div>
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Gemini Explanation"
        // Pass loading state explicitly to Modal if needed for internal logic
        // isLoading={isLoadingGemini}
      >
         {/* Pass modalContent directly; Modal component handles rendering */}
        {modalContent}
      </Modal>
    </>
  );
}