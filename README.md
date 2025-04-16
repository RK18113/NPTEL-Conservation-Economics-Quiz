# 🌿 Conservation Economics Quiz

An interactive quiz application focused on **Conservation Economics**, built with **React** and **Vite**. The app features randomized questions, AI-powered explanations, and a “Retake Mistakes” mode for targeted revision.

---

## ✨ Features

- 🔄 **Randomized** questions and answer options for each quiz session  
- ✅ **Instant feedback** on correct/incorrect answers  
- 🤖 **AI-powered explanations** using Google's Gemini API  
- 🔁 **"Retake Mistakes"** feature to retry incorrect answers  
- 💾 **LocalStorage persistence** to save progress across sessions  
- 📱 **Responsive design** for mobile and desktop  
- 🎨 **Clean, modern UI** with custom scrollbars and smooth transitions  

---

## 🚀 App Link

[View Live App](https://nptel-conservation-economics-quiz.vercel.app/) 

---

## 🛠 Technologies Used

- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Google Gemini API](https://aistudio.google.com/app)
- [React Markdown](https://github.com/remarkjs/react-markdown)

---

## 🧑‍💻 Installation and Setup

### ✅ Prerequisites

- Node.js
- npm 
- Google Gemini API Key

---

### 📦 Getting Started

1. **Clone the repository:**

```bash
git clone https://github.com/RK18113/NPTEL-Conservation-Economics-Quiz.git
```

2. **Install dependencies:**

```bash
npm install
```

3. **Create a `.env` file** in the root (client folder) of the project and add your Gemini API key:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

> 🔑 To get a Gemini API key:  
> - Go to [Google AI Studio](https://aistudio.google.com/app)  
> - Sign in with your Google account  
> - Create an API key and paste it into your `.env` file

4. **Start the development server:**

```bash
npm run dev
```

Open your browser and go to [http://localhost:5173](http://localhost:5173)

---

## 📁 Project Structure

```
client/
├── src/
│   ├── App.jsx           # Main app component
│   ├── index.css         # Global styles
│   ├── main.jsx          # App entry point
│   └── questions.js      # Quiz questions
├── .env                  # Environment variables (user have to create)
├── .gitignore
├── index.html
├── package.json
├── README.md
└── vite.config.js
```

---

## ✍️ Customizing Quiz Questions

To modify or add quiz questions, edit `src/questions.js`.  
Each question follows this format:

```js
{
  question: "What is the primary goal of conservation economics?",
  options: [
    "Maximizing profits from natural resources",
    "Balancing economic growth with environmental protection",
    "Eliminating all resource extraction",
    "Promoting unlimited consumption"
  ],
  answer: "Balancing economic growth with environmental protection"
}
```

---

## 🧠 Customizing AI Explanation Prompts

If you want to change the way the AI (Google Gemini) explains answers, you can customize the prompt inside the `handleAskGemini` function (usually found in your quiz component or helper file).

Here’s the default prompt format used:

```js
const prompt = `Explain the concept behind this quiz question from the Conservation Economics subject and why the answer is correct. Use clear and concise language suitable for someone learning the topic. Give crisp and clear 
information making the answer within 100-200 words.

Question: ${questionText}
Correct Answer: ${correctAnswer}`;
```

### 🔧 Tips for Customizing:
- You can **change the tone** (e.g., friendly, formal, technical).
- Add extra **constraints** like word count, style, or explanation depth.
- Provide **examples** if needed, or ask the AI to suggest further reading.

#### Example Modified Prompt:
```js
const prompt = `You are an economics tutor. Explain this quiz question in a student-friendly tone and clarify *why* the correct answer is right. Use real-world examples where applicable. Limit your response to ~150 words.

Q: ${questionText}
A: ${correctAnswer}`;
```

---
