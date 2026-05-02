# 📚 VidyaAI — AI-Powered Personalized Learning Platform

> Smart Learning for Government Schools | CODE VEDA Hackathon 2026

## 🎯 Problem Statement

Government schools in Karnataka face critical challenges:
- Large classroom sizes with varying student learning levels
- Limited personalized attention for each student
- Language barriers — students are more comfortable in Kannada
- Teachers struggle to track individual student progress

**VidyaAI solves this by providing an AI-powered learning assistant that generates personalized homework, explains doubts in the student's language, and gives teachers real-time insights.**

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Homework Generator** | Generates 4 personalized MCQs per subject based on student's performance level |
| 🎤 **Voice Doubt Assistant** | Student speaks their doubt → AI explains → Speaks back in their language |
| 🌐 **Multilingual Support** | Full support for English and Kannada (UI + Questions + Voice) |
| ✅ **Auto Grading** | Instant right/wrong feedback with correct answer highlighting |
| 💬 **AI Feedback** | Personalized encouragement and tips after each quiz |
| 👩‍🏫 **Teacher Dashboard** | Real-time student performance monitoring |
| 📊 **Performance Tracking** | Subject-wise score tracking per student |
| 🏫 **Multi-Class Support** | Classes 6 to 10 across 5 subjects |

---

## 🛠️ Tech Stack

### Frontend
```
React + Vite + Tailwind CSS
```

### AI & Voice
```
Groq API (Llama 3.3 70B)     → Question generation, grading, feedback
Azure Speech Service (STT)    → Voice input in Kannada/English
Azure Neural TTS              → Speak explanations back to student
```

### Backend
```
FastAPI (Python) → REST API server
In-memory DB    → Student score storage
```

## 🏗️ Architecture

```
[Student / Teacher]
        ↓
[React Frontend — Azure Static Web Apps]
        ↓
[FastAPI Backend — Azure Container Apps]
        ↙               ↘
[Groq API]          [Azure Speech]
(Questions,          (STT + TTS
 Grading,            Kannada/English)
 Feedback)
        ↓
[In-Memory Score DB]
        ↓
[Teacher Dashboard]
```

---

## 🌐 Multilingual Voice Flow

```
Student clicks 🎤 Ask a Doubt
        ↓
Azure Speech STT listens (kn-IN / en-IN)
        ↓
Student says: "ಎರಡನೇ ಪ್ರಶ್ನೆ ಅರ್ಥವಾಗಲಿಲ್ಲ"
(I didn't understand question 2)
        ↓
Groq AI identifies question & explains
        ↓
Azure Neural TTS speaks back in Kannada
(Voice: kn-IN-SapnaNeural)
```

---

## 📁 Project Structure

```
VidyaAI/
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main React component
│   │   ├── index.css        # Tailwind styles
│   │   └── main.jsx         # Entry point
│   ├── .env                 # Environment variables (not committed)
│   ├── vite.config.js       # Vite + Tailwind + SSL config
│   └── package.json
├── backend/
│   └── main.py              # FastAPI server
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- Python 3.9+
- Groq API Key (free at groq.com)
- Azure Speech Service Key

### 1. Clone the Repository
```bash
git clone https://github.com/yup29-pro/VidyaAi.git
cd VidyaAi
```

### 2. Setup Frontend
```bash
cd frontend
npm install --legacy-peer-deps
```

Create `.env` file in `frontend/`:
```env
VITE_GROQ_API_KEY=your_groq_key_here
VITE_AZURE_SPEECH_KEY=your_azure_speech_key_here
VITE_AZURE_SPEECH_REGION=eastus
```

Run frontend:
```bash
npm run dev
```
Open **https://localhost:5173**

### 3. Setup Backend
```bash
cd backend
pip install fastapi uvicorn python-dotenv
uvicorn main:app --reload
```

---

## 👥 Users & Roles

### 🎒 Student
- Login with name, class (6-10), language preference
- Select subject → Generate AI homework
- Answer 4 MCQs → Get instant grading + feedback
- Use voice button to ask doubts in Kannada/English

### 👩‍🏫 Teacher
- Login with name + password
- View real-time student performance dashboard
- See scores, class-wise breakdown, students needing help

### Teacher Credentials (Demo)
| Name | Password | Subject |
|------|----------|---------|
| suchithra | math123 | Mathematics |
| ramesh | sci123 | Science |
| yashwanth | kan123 | Kannada |
| ram | eng123 | English |
| sita | soc123 | Social Studies |

---

## 📚 Subjects & Classes

| Subject | Classes |
|---------|---------|
| Mathematics | 6, 7, 8, 9, 10 |
| Science | 6, 7, 8, 9, 10 |
| English | 6, 7, 8, 9, 10 |
| Social Studies | 6, 7, 8, 9, 10 |
| Kannada | 6, 7, 8, 9, 10 |

---

## 🎓 SDG Alignment

**SDG 4 — Quality Education**

VidyaAI directly addresses:
- ✅ Personalized learning for every student
- ✅ Accessible in local language (Kannada)
- ✅ Designed for real government school constraints
- ✅ Supports teachers with data-driven insights
- ✅ Early identification of learning gaps

---

## 🔑 Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_GROQ_API_KEY` | Groq API key for LLM |
| `VITE_AZURE_SPEECH_KEY` | Azure Speech Service key |
| `VITE_AZURE_SPEECH_REGION` | Azure region (e.g. eastus) |

---

## 🏆 Hackathon

Built for **CODE VEDA Hackathon 2026**
- Theme: AI-Powered Personalized Learning Platform for Government Schools
- SDG: 4 — Quality Education
- Team: VidyaAI

---

## 📄 License

MIT License — feel free to use and build upon this project!

---

<div align="center">
  <b>Built with ❤️ for Karnataka Government School Students</b><br/>
  <i>ಕರ್ನಾಟಕದ ಸರ್ಕಾರಿ ಶಾಲೆಯ ವಿದ್ಯಾರ್ಥಿಗಳಿಗಾಗಿ ನಿರ್ಮಿಸಲಾಗಿದೆ</i>
</div>
