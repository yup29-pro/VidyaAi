import { useState, useEffect } from "react";
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const API = "http://127.0.0.1:8000";

const TEACHERS = {
  "suchithra": { password: "math123", subject: "Mathematics" },
  "ramesh": { password: "sci123", subject: "Science" },
  "yashwanth": { password: "kan123", subject: "Kannada" },
  "ram": { password: "eng123", subject: "English" },
  "sita": { password: "soc123", subject: "Social Studies" }
};

const SUBJECTS = [
  { id: "math", name: "Mathematics", icon: "🔢", score: 65 },
  { id: "science", name: "Science", icon: "🔬", score: 78 },
  { id: "english", name: "English", icon: "📖", score: 82 },
  { id: "social", name: "Social Studies", icon: "🌍", score: 55 },
  { id: "kannada", name: "Kannada", icon: "🅺", score: 90 },
];

const T = {
  en: { greeting: (n) => `Good Morning, ${n}! 👋`, sub: "Pick a subject and get AI homework", generate: "✨ Generate Homework", submit: "Submit Answers", retry: "Try Again", voiceBtn: "🎤 Ask a Doubt", voiceListening: "🔴 Listening...", voiceThinking: "⏳ Thinking...", voiceSpeaking: "🔊 Speaking..." },
  kn: { greeting: (n) => `ಶುಭೋದಯ, ${n}! 👋`, sub: "ವಿಷಯ ಆಯ್ಕೆ ಮಾಡಿ", generate: "✨ ಹೋಮ್‌ವರ್ಕ್ ರಚಿಸಿ", submit: "ಉತ್ತರ ಸಲ್ಲಿಸಿ", retry: "ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ", voiceBtn: "🎤 ಸಂದೇಹ ಕೇಳಿ", voiceListening: "🔴 ಕೇಳುತ್ತಿದೆ...", voiceThinking: "⏳ ಯೋಚಿಸುತ್ತಿದೆ...", voiceSpeaking: "🔊 ಹೇಳುತ್ತಿದೆ..." },
};

export default function App() {
  const [screen, setScreen] = useState("login");
  const [role, setRole] = useState("student");
  const [name, setName] = useState("");
  const [lang, setLang] = useState("en");
  const [cls, setCls] = useState("8");
  const [subject, setSubject] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [subjects, setSubjects] = useState(SUBJECTS);
  const [realScores, setRealScores] = useState([]);
  const [password, setPassword] = useState("");
  const [voiceStatus, setVoiceStatus] = useState("idle");

  // ── NEW: Confidence state ──
  const [showConfidence, setShowConfidence] = useState(false); // show star screen
  const [confidenceRating, setConfidenceRating] = useState(0); // 1-5 stars selected
  const [hoveredStar, setHoveredStar] = useState(0);
  const [pendingScore, setPendingScore] = useState(null); // store score while showing star screen
  const [savedConfidence, setSavedConfidence] = useState(0); // saved after confirmation

  const t = T[lang];

  // ── FETCH TEACHER SCORES ──
  useEffect(() => {
    if (screen === "app" && role === "teacher") {
      fetch(`${API}/teacher/all-scores/${name}`)
        .then(r => r.json())
        .then(d => setRealScores(d.scores || []))
        .catch(() => setRealScores([]));
    }
  }, [screen, role, name]);

  // ── LOGIN ──
  async function login() {
    if (!name.trim()) return alert("Enter your name!");
    if (role === "teacher") {
      const teacher = TEACHERS[name.toLowerCase()];
      if (!teacher) return alert("❌ Invalid teacher name!");
      if (password !== teacher.password) return alert("❌ Wrong password!");
    }
    try {
      await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role, cls, lang })
      });
    } catch (e) {
      console.log("Backend not connected yet, continuing...");
    }
    setScreen("app");
  }

  // ── LOGOUT ──
  function logout() {
    setScreen("login");
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);
    setSubject(null);
    setFeedback("");
    setRealScores([]);
    setPassword("");
    setVoiceStatus("idle");
    setShowConfidence(false);
    setConfidenceRating(0);
    setPendingScore(null);
    setSavedConfidence(0);
  }

  // ── GLOBAL VOICE DOUBT ──
  async function askVoice() {
    if (!questions.length) return alert(lang === "kn" ? "ಮೊದಲು ಹೋಮ್‌ವರ್ಕ್ ರಚಿಸಿ!" : "Generate homework first!");

    const speechKey = import.meta.env.VITE_AZURE_SPEECH_KEY;
    const speechRegion = import.meta.env.VITE_AZURE_SPEECH_REGION;
    console.log("Key:", speechKey?.substring(0, 8), "Region:", speechRegion);

    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(speechKey, speechRegion);
    speechConfig.speechRecognitionLanguage = lang === "kn" ? "kn-IN" : "en-IN";

    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

    setVoiceStatus("listening");

    recognizer.recognizeOnceAsync(async (result) => {
      if (result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
        const doubt = result.text;
        console.log("Heard:", doubt);
        setVoiceStatus("thinking");

        const questionsContext = questions.map((q, i) => `Question ${i + 1}: ${q.q}`).join("\n");
        const langInstr = lang === "kn" ? "Reply ONLY in simple Kannada language." : "Reply ONLY in simple English.";
        const prompt = `You are a helpful tutor for Indian government school students.
Here are the current quiz questions:
${questionsContext}

The student said: "${doubt}"
${langInstr}
Identify which question they are asking about and explain it in 2-3 very simple sentences.`;

        try {
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [{ role: "user", content: prompt }],
              max_tokens: 250
            })
          });
          const data = await res.json();
          const explanation = data.choices?.[0]?.message?.content || "";

          setVoiceStatus("speaking");
          const ttsConfig = SpeechSDK.SpeechConfig.fromSubscription(speechKey, speechRegion);
          ttsConfig.speechSynthesisLanguage = lang === "kn" ? "kn-IN" : "en-IN";
          ttsConfig.speechSynthesisVoiceName = lang === "kn" ? "kn-IN-SapnaNeural" : "en-IN-NeerjaNeural";

          const ttsAudio = SpeechSDK.AudioConfig.fromDefaultSpeakerOutput();
          const synthesizer = new SpeechSDK.SpeechSynthesizer(ttsConfig, ttsAudio);

          synthesizer.speakTextAsync(
            explanation,
            result => { synthesizer.close(); setVoiceStatus("idle"); },
            error => { console.error("TTS error:", error); synthesizer.close(); setVoiceStatus("idle"); }
          );
        } catch (e) {
          console.error("Groq error:", e);
          setVoiceStatus("idle");
        }
      } else {
        console.error("Speech not recognized:", result.reason);
        alert(lang === "kn" ? "ಮಾತು ಕೇಳಲಿಲ್ಲ, ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ" : "Could not hear you, please try again!");
        setVoiceStatus("idle");
      }
      recognizer.close();
    }, error => {
      console.error("Recognition error:", error);
      setVoiceStatus("idle");
      recognizer.close();
    });
  }

  // ── GENERATE HOMEWORK ──
  async function generateHomework() {
    if (!subject || loading) return;
    setLoading(true);
    setSubmitted(false);
    setAnswers({});
    setFeedback("");
    setQuestions([]);
    setVoiceStatus("idle");
    setShowConfidence(false);
    setConfidenceRating(0);
    setPendingScore(null);
    setSavedConfidence(0);

    const langInstr = lang === "kn"
      ? "Generate all questions and options in Kannada language."
      : "Generate all in English.";
    const diff = subject.score < 60 ? "easy" : subject.score < 80 ? "medium" : "hard";

    const prompt = `You are an AI tutor for Indian government school students.
${langInstr}
Generate exactly 4 multiple choice questions for Class ${cls} ${subject.name}.
Difficulty: ${diff}. Make questions appropriate for Class ${cls} level.
Return ONLY a valid JSON array with no extra text:
[{"q":"question?","options":["A","B","C","D"],"answer":0}]
answer is index (0-3) of correct option.`;

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 2000
        }),
      });
      const data = await res.json();
      let text = data.choices?.[0]?.message?.content || "";
      text = text.replace(/```json|```/g, "").trim();
      setQuestions(JSON.parse(text));
    } catch (e) {
      console.error("Groq error:", e);
      setQuestions(lang === "kn" ? [
        { q: "2 + 2 ಎಷ್ಟು?", options: ["3", "4", "5", "6"], answer: 1 },
        { q: "ಭಾರತದ ರಾಜಧಾನಿ?", options: ["ಮುಂಬೈ", "ದಿಲ್ಲಿ", "ಬೆಂಗಳೂರು", "ಚೆನ್ನೈ"], answer: 1 },
        { q: "ನೀರಿನ ಸೂತ್ರ?", options: ["CO2", "H2O", "O2", "NaCl"], answer: 1 },
        { q: "ಸೂರ್ಯ ಯಾವ ದಿಕ್ಕಿನಲ್ಲಿ ಉದಯಿಸುತ್ತಾನೆ?", options: ["ಪಶ್ಚಿಮ", "ದಕ್ಷಿಣ", "ಪೂರ್ವ", "ಉತ್ತರ"], answer: 2 },
      ] : [
        { q: "What is 15 × 4?", options: ["50", "55", "60", "65"], answer: 2 },
        { q: "Closest planet to Sun?", options: ["Earth", "Venus", "Mercury", "Mars"], answer: 2 },
        { q: "Chemical formula of water?", options: ["CO2", "H2O", "O2", "NaCl"], answer: 1 },
        { q: "Who wrote Indian National Anthem?", options: ["Gandhi", "Tagore", "Nehru", "Ambedkar"], answer: 1 },
      ]);
    }
    setLoading(false);
  }

  // ── SUBMIT ANSWERS — now shows confidence screen first ──
  async function submitAnswers() {
    if (Object.keys(answers).length < questions.length)
      return alert(lang === "kn" ? "ಎಲ್ಲಾ ಉತ್ತರಿಸಿ!" : "Answer all questions!");

    const correct = questions.filter((q, i) => answers[i] === q.answer).length;
    const pct = Math.round((correct / questions.length) * 100);
    setPendingScore({ correct, pct });

    // Show confidence star screen BEFORE results
    setShowConfidence(true);
    setConfidenceRating(0);
    setVoiceStatus("idle");
  }

  // ── CONFIRM CONFIDENCE — called when student picks stars and confirms ──
  async function confirmConfidence() {
    if (confidenceRating === 0) return alert(lang === "kn" ? "ನಿಮ್ಮ ವಿಶ್ವಾಸ ರೇಟಿಂಗ್ ಆಯ್ಕೆ ಮಾಡಿ!" : "Please select your confidence rating!");

    setSavedConfidence(confidenceRating);
    setShowConfidence(false);
    setSubmitted(true);

    const { correct, pct } = pendingScore;

    setSubjects(prev => prev.map(s =>
      s.id === subject.id ? { ...s, score: Math.round((s.score + pct) / 2) } : s
    ));

    try {
      await fetch(`${API}/save-score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_name: name,
          subject: subject.name,
          score: correct,
          total: questions.length,
          cls,
          confidence: confidenceRating  // ← send confidence to backend
        })
      });
    } catch (e) {
      console.log("Backend not connected yet");
    }

    const langInstr = lang === "kn" ? "Reply in Kannada." : "Reply in English.";
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: `Student scored ${correct}/${questions.length} on ${subject.name}. ${langInstr} Give 2 sentences of friendly encouragement and 1 tip.` }],
          max_tokens: 150
        }),
      });
      const data = await res.json();
      setFeedback(data.choices?.[0]?.message?.content || "");
    } catch {
      setFeedback(lang === "kn" ? "ಉತ್ತಮ ಪ್ರಯತ್ನ! ಮುಂದುವರಿಯಿರಿ!" : "Great effort! Keep practicing!");
    }
  }

  // ── DOWNLOAD CSV REPORT for teacher ──
  function downloadCSV() {
    const headers = ["Student", "Class", "Subject", "Score (%)", "Confidence (1-5)", "Status"];
    const rows = realScores.map(s => {
      const score = s.percentage || s.score || 0;
      const confidence = s.confidence || "—";
      const status = score >= 75 ? "Good" : score >= 50 ? "Average" : "Needs Help";
      return [
        s.student || s.name || s.student_name || "—",
        s.cls || "—",
        s.subject || "—",
        score,
        confidence,
        status
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(v => `"${v}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `VidyaAI_Report_${name}_${new Date().toLocaleDateString("en-IN").replace(/\//g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── STAR LABEL helper ──
  function starLabel(n) {
    return ["", "😟 Not Confident", "😐 Slightly Confident", "🙂 Somewhat Confident", "😊 Confident", "🌟 Very Confident!"][n] || "";
  }

  // ── VOICE BUTTON STYLE ──
  const voiceBtnStyle = {
    idle: { bg: "bg-blue-500 hover:bg-blue-600", text: t.voiceBtn },
    listening: { bg: "bg-red-500 animate-pulse", text: t.voiceListening },
    thinking: { bg: "bg-yellow-500 animate-pulse", text: t.voiceThinking },
    speaking: { bg: "bg-green-500 animate-pulse", text: t.voiceSpeaking },
  }[voiceStatus];

  // ── LOGIN SCREEN ──
  if (screen === "login") return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center text-2xl">📚</div>
          <div>
            <div className="text-2xl font-black text-yellow-400">VidyaAI</div>
            <div className="text-xs text-gray-500">Smart Learning for Govt Schools</div>
          </div>
        </div>

        <div className="flex bg-gray-800 rounded-xl p-1 mb-6">
          {["student", "teacher"].map(r => (
            <button key={r} onClick={() => setRole(r)}
              className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${role === r ? "bg-yellow-400 text-gray-950" : "text-gray-400"}`}>
              {r === "student" ? "🎒 Student" : "👩‍🏫 Teacher"}
            </button>
          ))}
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider font-bold block mb-2">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-yellow-400 outline-none" />
          </div>
          {role === "teacher" && (
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider font-bold block mb-2">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-yellow-400 outline-none" />
            </div>
          )}
          {role === "student" && (
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider font-bold block mb-2">Class</label>
              <select value={cls} onChange={e => setCls(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-yellow-400 outline-none">
                {["6", "7", "8", "9", "10"].map(c => <option key={c} value={c}>Class {c}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider font-bold block mb-2">Language</label>
            <select value={lang} onChange={e => setLang(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-yellow-400 outline-none">
              <option value="en">English</option>
              <option value="kn">ಕನ್ನಡ (Kannada)</option>
            </select>
          </div>
        </div>
        <button onClick={login} className="w-full bg-yellow-400 text-gray-950 font-black py-4 rounded-xl hover:opacity-90 transition-all text-lg">
          Enter VidyaAI →
        </button>
      </div>
    </div>
  );

  // ── APP SCREEN ──
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="text-xl font-black text-yellow-400">📚 VidyaAI</div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-800 rounded-lg p-1">
            {["en", "kn"].map(l => (
              <button key={l} onClick={() => setLang(l)}
                className={`px-3 py-1 rounded-md text-sm font-bold transition-all ${lang === l ? "bg-yellow-400 text-gray-950" : "text-gray-400"}`}>
                {l === "en" ? "EN" : "ಕನ್ನಡ"}
              </button>
            ))}
          </div>
          <div className="bg-gray-800 rounded-lg px-3 py-2 flex items-center gap-2 text-sm font-bold">
            <div className="w-7 h-7 bg-yellow-400 text-gray-950 rounded-full flex items-center justify-center font-black text-xs">
              {name[0]?.toUpperCase()}
            </div>
            {name}
          </div>
          <button onClick={logout} className="border border-gray-700 px-3 py-2 rounded-lg text-sm text-gray-400 hover:border-red-400 hover:text-red-400 transition-all">
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-6">

        {/* STUDENT VIEW */}
        {role === "student" && (
          <>
            <h1 className="text-2xl font-black mb-1">{t.greeting(name)}</h1>
            <p className="text-gray-400 mb-6">{t.sub}</p>

            {/* Subject Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
              {subjects.map(s => (
                <div key={s.id} onClick={() => { setSubject(s); setQuestions([]); setAnswers({}); setSubmitted(false); setFeedback(""); setVoiceStatus("idle"); setShowConfidence(false); setConfidenceRating(0); setSavedConfidence(0); }}
                  className={`bg-gray-900 border-2 rounded-xl p-4 cursor-pointer text-center transition-all hover:border-yellow-400 ${subject?.id === s.id ? "border-yellow-400 bg-yellow-400/10" : "border-gray-800"}`}>
                  <div className="text-3xl mb-2">{s.icon}</div>
                  <div className="font-bold text-sm">{s.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{s.score}%</div>
                  <div className="h-1 bg-gray-800 rounded mt-2">
                    <div className="h-full bg-green-400 rounded" style={{ width: `${s.score}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Homework Card */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <h2 className="text-lg font-black">📝 {subject ? `${subject.icon} ${subject.name} Homework` : "Select a subject"}</h2>
                <div className="flex gap-3">
                  {questions.length > 0 && (
                    <button
                      onClick={askVoice}
                      disabled={voiceStatus !== "idle"}
                      className={`${voiceBtnStyle.bg} text-white font-bold px-4 py-2 rounded-xl transition-all text-sm disabled:cursor-not-allowed`}>
                      {voiceBtnStyle.text}
                    </button>
                  )}
                  <button onClick={generateHomework} disabled={!subject || loading}
                    className="bg-yellow-400 text-gray-950 font-black px-5 py-2 rounded-xl disabled:opacity-40 hover:opacity-90 transition-all">
                    {loading ? "⏳ Generating..." : t.generate}
                  </button>
                </div>
              </div>

              {!subject && <div className="text-center py-12 text-gray-500"><div className="text-5xl mb-3">🎯</div>Choose a subject above!</div>}
              {loading && <div className="text-center py-12 text-gray-400"><div className="text-4xl mb-3 animate-spin">⏳</div>Generating questions...</div>}

              {/* ── CONFIDENCE STAR SCREEN (shown after submit, before results) ── */}
              {showConfidence && (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <div className="text-5xl mb-3">🌟</div>
                  <h3 className="text-2xl font-black text-yellow-400 mb-1">
                    {lang === "kn" ? "ನಿಮ್ಮ ವಿಶ್ವಾಸ ಮಟ್ಟ?" : "How Confident Did You Feel?"}
                  </h3>
                  <p className="text-gray-400 text-sm mb-6">
                    {lang === "kn"
                      ? "ಈ ಹೋಮ್‌ವರ್ಕ್‌ನಲ್ಲಿ ನೀವು ಎಷ್ಟು ಆತ್ಮವಿಶ್ವಾಸ ಹೊಂದಿದ್ದೀರಿ?"
                      : "Rate how confident you felt while doing this homework"}
                  </p>

                  {/* Stars */}
                  <div className="flex gap-3 mb-4">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => setConfidenceRating(star)}
                        onMouseEnter={() => setHoveredStar(star)}
                        onMouseLeave={() => setHoveredStar(0)}
                        className="text-5xl transition-transform hover:scale-125 focus:outline-none"
                        style={{ filter: (hoveredStar || confidenceRating) >= star ? "none" : "grayscale(1) opacity(0.3)" }}
                      >
                        ⭐
                      </button>
                    ))}
                  </div>

                  {/* Star label */}
                  <div className="h-7 mb-6">
                    {(confidenceRating > 0 || hoveredStar > 0) && (
                      <p className="text-lg font-bold text-yellow-300">
                        {starLabel(hoveredStar || confidenceRating)}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={confirmConfidence}
                    className="bg-yellow-400 text-gray-950 font-black px-8 py-3 rounded-xl hover:opacity-90 transition-all text-base"
                  >
                    {lang === "kn" ? "ಫಲಿತಾಂಶ ನೋಡಿ →" : "See My Results →"}
                  </button>
                </div>
              )}

              {/* Questions + Results */}
              {!loading && questions.length > 0 && !showConfidence && (
                <div className="space-y-4">
                  {questions.map((q, i) => (
                    <div key={i} className="bg-gray-800 rounded-xl p-5">
                      <div className="text-xs text-yellow-400 font-bold uppercase tracking-wider mb-2">Question {i + 1}</div>
                      <div className="font-bold text-base mb-4">{q.q}</div>
                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map((opt, j) => {
                          let btnCls = "bg-gray-900 border border-gray-700 hover:border-blue-400";
                          if (submitted) {
                            if (j === q.answer) btnCls = "bg-green-500/20 border border-green-400 text-green-300";
                            else if (answers[i] === j) btnCls = "bg-red-500/20 border border-red-400 text-red-300";
                          } else if (answers[i] === j) btnCls = "bg-yellow-400/20 border border-yellow-400 text-yellow-300";
                          return (
                            <button key={j} disabled={submitted} onClick={() => setAnswers(a => ({ ...a, [i]: j }))}
                              className={`${btnCls} rounded-lg px-4 py-3 text-left text-sm font-medium transition-all`}>
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {!submitted && (
                    <button onClick={submitAnswers} className="w-full bg-green-500 text-white font-black py-4 rounded-xl hover:opacity-90 transition-all">
                      {t.submit}
                    </button>
                  )}

                  {/* ── RESULTS — shows score + confidence ── */}
                  {submitted && (
                    <div className="bg-gray-800 rounded-xl p-6 text-center">
                      <div className="text-5xl font-black text-yellow-400 mb-1">
                        {questions.filter((q, i) => answers[i] === q.answer).length}/{questions.length}
                      </div>

                      {/* Show confidence rating in results */}
                      {savedConfidence > 0 && (
                        <div className="flex items-center justify-center gap-2 mb-3">
                          <span className="text-gray-400 text-sm">Your confidence:</span>
                          <span className="text-xl">
                            {Array.from({ length: 5 }, (_, i) => (
                              <span key={i} style={{ opacity: i < savedConfidence ? 1 : 0.2 }}>⭐</span>
                            ))}
                          </span>
                          <span className="text-yellow-300 text-sm font-bold">{starLabel(savedConfidence)}</span>
                        </div>
                      )}

                      {/* Insight: high confidence but wrong answers */}
                      {savedConfidence >= 4 && pendingScore && pendingScore.pct < 50 && (
                        <div className="bg-orange-500/20 border border-orange-400 rounded-lg px-4 py-2 mb-3 text-sm text-orange-300 font-medium">
                          💡 You felt very confident but some answers were wrong — let's review those topics!
                        </div>
                      )}

                      {feedback && <p className="text-gray-300 mb-4 text-sm leading-relaxed">{feedback}</p>}
                      <button onClick={generateHomework} className="border-2 border-yellow-400 text-yellow-400 font-black px-6 py-3 rounded-xl hover:bg-yellow-400 hover:text-gray-950 transition-all">
                        {t.retry}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* TEACHER VIEW */}
        {role === "teacher" && (
          <>
            <h1 className="text-2xl font-black mb-1">👩‍🏫 {name}'s Dashboard</h1>
            <p className="text-gray-400 mb-6">
              Subject: <span className="text-yellow-400 font-bold">
                {TEACHERS[name.toLowerCase()]?.subject || "All Subjects"}
              </span>
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                [realScores.length, "Total Students", "yellow"],
                [realScores.filter(s => (s.percentage || s.score) >= 50).length, "Active Today", "green"],
                [realScores.length ? Math.round(realScores.reduce((a, s) => a + (s.percentage || s.score), 0) / realScores.length) + "%" : "0%", "Avg Score", "blue"],
                [realScores.filter(s => (s.percentage || s.score) < 50).length, "Need Attention", "red"]
              ].map(([v, l, c]) => (
                <div key={l} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className={`text-3xl font-black ${c === "yellow" ? "text-yellow-400" : c === "green" ? "text-green-400" : c === "blue" ? "text-blue-400" : "text-red-400"}`}>{v}</div>
                  <div className="text-sm text-gray-500 mt-1">{l}</div>
                </div>
              ))}
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              {/* Header + Download Button */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h2 className="font-black text-lg">📊 Student Performance</h2>
                {realScores.length > 0 && (
                  <button
                    onClick={downloadCSV}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all flex items-center gap-2"
                  >
                    ⬇️ Download Report (CSV)
                  </button>
                )}
              </div>

              {realScores.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-3">📭</div>
                  <div>No student scores yet. Students need to complete homework first!</div>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                      {["Student", "Class", "Subject", "Score", "Confidence", "Status"].map(h =>
                        <th key={h} className="text-left py-3 px-4">{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {realScores.map((s, i) => {
                      const score = s.percentage || s.score || 0;
                      const conf = s.confidence || 0;
                      return (
                        <tr key={i} className="border-b border-gray-800 hover:bg-gray-800 transition-all">
                          <td className="py-3 px-4 font-bold">{s.student || s.name || s.student_name}</td>
                          <td className="py-3 px-4 text-gray-400">{s.cls || "—"}</td>
                          <td className="py-3 px-4 text-gray-400">{s.subject}</td>
                          <td className="py-3 px-4 font-bold">{score}%</td>
                          {/* Confidence column */}
                          <td className="py-3 px-4">
                            {conf > 0 ? (
                              <div className="flex items-center gap-1">
                                <span className="text-sm">
                                  {Array.from({ length: 5 }, (_, idx) => (
                                    <span key={idx} style={{ opacity: idx < conf ? 1 : 0.2 }}>⭐</span>
                                  ))}
                                </span>
                                <span className="text-xs text-gray-400 ml-1">{conf}/5</span>
                              </div>
                            ) : (
                              <span className="text-gray-600 text-xs">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${score >= 75 ? "bg-green-500/20 text-green-400" : score >= 50 ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
                              {score >= 75 ? "✅ Good" : score >= 50 ? "⚠️ Average" : "❗ Needs Help"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}