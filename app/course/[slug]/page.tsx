"use client";

export const dynamic = 'force-dynamic';

import { useParams } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import YouTube from "react-youtube";
import { useRouter } from "next/navigation";

import FloatingLines from "@/components/FloatingLines";
import BadgeToast from "@/components/BadgeToast";
import { updateProgress } from "@/lib/progress";
import { askGemini } from "@/lib/gemini";
import { ALL_BADGES, Badge } from "@/lib/badges";
import { auth } from "@/lib/firebase";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  setDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { computeEarnedBadgeIds, syncBadgesToFirestore } from "@/lib/badges";

// ── course data ───────────────────────────────────────────────────────────────

const courses: Record<string, { title: string; videoId: string; topic: string }> = {
  aws: {
    title: "AWS Course 🚀",
    videoId: "zA8guDqfv40",
    topic: "Amazon Web Services (AWS) cloud computing",
  },
  devops: {
    title: "DevOps Course ⚙️",
    videoId: "j5Zsa_eOXeY",
    topic: "DevOps, CI/CD pipelines, Docker, Kubernetes",
  },
  ai: {
    title: "AI Course 🤖",
    videoId: "2ePf9rue1Ao",
    topic: "Artificial Intelligence and Machine Learning",
  },
  docker: {
    title: "Docker Course 🐳",
    videoId: "fqMOX6JJhGo",
    topic: "Docker containerization and deployment",
  },
  kubernetes: {
    title: "Kubernetes Course ☸️",
    videoId: "d6WC5n9G_sM",
    topic: "Kubernetes orchestration and cluster management",
  },
  python: {
    title: "Python Course 🐍",
    videoId: "x7X9w_GIm1s",
    topic: "Python programming fundamentals",
  },
  javascript: {
    title: "JavaScript Course 📜",
    videoId: "W6NZfCO5SIk",
    topic: "JavaScript programming and web development",
  },
  react: {
    title: "React Course ⚛️",
    videoId: "w7ejDZ8SWv8",
    topic: "React.js frontend development",
  },
  typescript: {
    title: "TypeScript Course 📘",
    videoId: "d56mG7DezGs",
    topic: "TypeScript type-safe JavaScript development",
  },
  git: {
    title: "Git Course 🌲",
    videoId: "zTjRZNkhiEU",
    topic: "Git version control and GitHub workflows",
  },
  sql: {
    title: "SQL Course 🗃️",
    videoId: "27axs9dO7AE",
    topic: "SQL database queries and management",
  },
  linux: {
    title: "Linux Course 🐧",
    videoId: "sWbUDq4S6Y8",
    topic: "Linux command line and system administration",
  },
};

// ── types ─────────────────────────────────────────────────────────────────────

type ChatMessage = { role: "user" | "model"; text: string };

type QuizQuestion = {
  question: string;
  options: string[];
  answer: number;
};

// ── helpers ───────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

async function logActivity(uid: string) {
  const today = todayStr();
  const ref = doc(db, "users", uid, "activity", today);
  try {
    const snap = await getDocs(collection(db, "users", uid, "activity"));
    const existing = snap.docs.find((d) => d.id === today);
    const currentCount = existing?.data().count ?? 0;
    await setDoc(ref, { count: currentCount + 1, lastSeen: serverTimestamp() }, { merge: true });
  } catch (e: any) {
    // Silently ignore offline errors - Firebase will sync when back online
    if (e?.code === "unavailable" || e?.message?.includes("offline")) {
      console.log("Activity logging skipped - offline mode");
    }
  }
}

// Robustly extract JSON array from a Gemini response that may include
// markdown fences, extra prose before/after the array, or escaped characters.
function extractJsonArray(raw: string): string {
  // 1. Strip markdown code fences (```json ... ``` or ``` ... ```)
  let cleaned = raw.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();

  // 2. Find the first '[' and last ']' to isolate the array
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON array found in response");
  }
  return cleaned.slice(start, end + 1);
}

// ── component ─────────────────────────────────────────────────────────────────

export default function CoursePage() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();
  const course = courses[slug];

  const playerRef = useRef<any>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const savedProgressRef = useRef<number>(0); // Store saved progress to apply when player ready
  const [progress, setProgress] = useState(0);
  const [user, setUser] = useState<any>(null);

  // tab state
  const [activeTab, setActiveTab] = useState<"video" | "assistant" | "quiz">("video");

  // ── AI ASSISTANT state ────────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── AI QUIZ state ─────────────────────────────────────────────────────────
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizGenerated, setQuizGenerated] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizError, setQuizError] = useState("");

  // ── BADGE NOTIFICATION state ──────────────────────────────────────────────
  const [toastBadge, setToastBadge] = useState<Badge | null>(null);
  const prevEarnedRef = useRef<string[]>([]);
  const toastQueueRef = useRef<Badge[]>([]);
  const isShowingToastRef = useRef(false);

  // ── AUTH ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  // ── LOAD SAVED PROGRESS from Firestore ─────────────────────────────────────
  useEffect(() => {
    if (!user || !slug) return;
    const loadSavedProgress = async () => {
      try {
        const progressRef = doc(db, "users", user.uid, "progress", slug);
        const snap = await getDoc(progressRef);
        if (snap.exists()) {
          const savedProgress = snap.data().progress || 0;
          savedProgressRef.current = savedProgress;
          setProgress(savedProgress);
          console.log("Loaded saved progress:", savedProgress + "%");
        }
      } catch (e) {
        console.error("Failed to load saved progress:", e);
      }
    };
    loadSavedProgress();
  }, [user, slug]);

  // ── LOAD EXISTING BADGES on auth ───────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const loadExistingBadges = async () => {
      try {
        const badgeRef = doc(db, "users", user.uid, "badges", "earned");
        const snap = await getDoc(badgeRef);
        if (snap.exists()) {
          const existingIds: string[] = snap.data().ids || [];
          prevEarnedRef.current = existingIds;
        }
      } catch (e) {
        console.error("Failed to load existing badges:", e);
      }
    };
    loadExistingBadges();
  }, [user]);

  // ── CLEANUP interval on unmount ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  // ── VIDEO PROGRESS ────────────────────────────────────────────────────────
  const handleReady = (event: any) => {
    playerRef.current = event.target;
    const player = event.target;

    // Apply saved progress if exists (seek to saved timestamp)
    const savedProgress = savedProgressRef.current;
    if (savedProgress > 0) {
      const duration = player.getDuration();
      if (duration) {
        const seekTime = (savedProgress / 100) * duration;
        player.seekTo(seekTime, true);
        console.log("Seeked to saved position:", seekTime + "s (" + savedProgress + "%)");
      }
    }

    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    progressIntervalRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      const duration = p.getDuration();
      const current = p.getCurrentTime();
      if (!duration) return;
      const percent = Math.floor((current / duration) * 100);
      setProgress(percent);
      updateProgress(slug, percent);
      if (user) logActivity(user.uid);
    }, 3000);
  };

  // scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ── CHECK BADGES ON PROGRESS MILESTONE ────────────────────────────────────
  useEffect(() => {
    if (!user || !slug) return;

    const checkAndAwardBadges = async () => {
      try {
        // Fetch current progress data from Firestore for all courses
        const progressRef = collection(db, "users", user.uid, "progress");
        const snap = await getDocs(progressRef);
        const progressData: Record<string, { progress: number }> = {};
        snap.docs.forEach((d) => {
          progressData[d.id] = { progress: d.data().progress || 0 };
        });

        // Include current course progress (may not be synced yet)
        progressData[slug] = { progress };

        // Compute earned badges
        const earnedIds = computeEarnedBadgeIds(progressData);

        // Sync to Firestore (this saves new badges) and get merged list
        const merged = await syncBadgesToFirestore(user.uid, earnedIds);

        // Find newly earned badges (not in previous list)
        const prev = prevEarnedRef.current;
        const newlyEarned = merged.filter((id) => !prev.includes(id));

        // Queue new badges for toast notification
        if (newlyEarned.length > 0 && prev.length > 0) {
          const newBadges = newlyEarned
            .map((id) => ALL_BADGES.find((b) => b.id === id))
            .filter(Boolean) as Badge[];
          toastQueueRef.current = [...toastQueueRef.current, ...newBadges];
          showNextToast();
        }

        // Update previous earned ref
        prevEarnedRef.current = merged;

        // Log milestone if high progress
        if (progress >= 100) {
          console.log("🎉 Course completed! Badge sync triggered.");
        }
      } catch (e) {
        console.error("Badge check failed:", e);
      }
    };

    // Check badges when hitting milestone thresholds
    if (progress >= 25 || progress >= 50 || progress >= 75 || progress >= 100) {
      checkAndAwardBadges();
    }
  }, [progress, user, slug]);

  // ── TOAST DISPLAY FUNCTIONS ────────────────────────────────────────────────
  const showNextToast = () => {
    if (isShowingToastRef.current || toastQueueRef.current.length === 0) return;
    isShowingToastRef.current = true;
    const next = toastQueueRef.current.shift()!;
    setToastBadge(next);
  };

  const handleToastDone = () => {
    setToastBadge(null);
    isShowingToastRef.current = false;
    setTimeout(showNextToast, 400);
  };

  // ── AI ASSISTANT ──────────────────────────────────────────────────────────
  const sendChat = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || chatLoading) return;

    const userMsg: ChatMessage = { role: "user", text: trimmed };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const history = chatMessages
        .map((m) => `${m.role === "user" ? "Student" : "Tutor"}: ${m.text}`)
        .join("\n");

      const prompt = `You are an expert tutor for ${course.topic}.
Previous conversation:
${history}

Student asks: ${trimmed}

Give a clear, helpful, concise answer (max 4 sentences). Use simple language.`;

      const reply = await askGemini(prompt);
      const modelMsg: ChatMessage = { role: "model", text: reply };
      setChatMessages((prev) => [...prev, modelMsg]);

      if (user) {
        await addDoc(collection(db, "users", user.uid, "chats"), {
          course: slug,
          userText: trimmed,
          aiText: reply,
          timestamp: serverTimestamp(),
        });
        logActivity(user.uid);
      }
    } catch (err: any) {
      console.error("Chat error:", err);
      const errorMsg = err instanceof Error ? err.message : "";
      const isQuotaError = errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("exceeded");
      const isOfflineError = err?.code === "unavailable" || errorMsg.includes("offline");

      // Handle offline errors (removed early return so finally always executes)
      if (isOfflineError) {
        setChatMessages((prev) => [
          ...prev,
          { role: "model", text: "I'm here to help! Please ask your question again." },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          { role: "model", text: isQuotaError
            ? "⏳ AI service is temporarily unavailable due to rate limits. Please try again in a few minutes."
            : "Sorry, something went wrong. Please try again."
          },
        ]);
      }
    } finally {
      setChatLoading(false);
    }
  };

  // ── AI QUIZ ───────────────────────────────────────────────────────────────
  const generateQuiz = async () => {
    setQuizLoading(true);
    setQuizGenerated(false);
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setQuizError("");

    try {
      const prompt = `Generate exactly 5 multiple-choice questions about ${course.topic}.

IMPORTANT: Return ONLY a raw JSON array. No markdown, no backticks, no explanation text before or after. Just the JSON array starting with [ and ending with ].

Format:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": 0
  }
]

Rules:
- "answer" must be the index (0, 1, 2, or 3) of the correct option
- All 4 options must be clearly distinct
- Questions should test real understanding
- No duplicate questions
- Return exactly 5 questions`;

      const raw = await askGemini(prompt);

      // Use robust extraction — handles markdown fences, extra prose, etc.
      const jsonStr = extractJsonArray(raw);
      const parsed: QuizQuestion[] = JSON.parse(jsonStr);

      // Validate structure
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("Invalid quiz format received");
      }

      // Validate each question
      const validated = parsed.filter(
        (q) =>
          q.question &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          typeof q.answer === "number" &&
          q.answer >= 0 &&
          q.answer <= 3
      );

      if (validated.length === 0) {
        throw new Error("Questions failed validation");
      }

      setQuizQuestions(validated);
      setQuizGenerated(true);
    } catch (err) {
      console.error("Quiz generation error:", err);
      setQuizError("Failed to generate quiz. Please try again.");
    } finally {
      setQuizLoading(false);
    }
  };

  const submitQuiz = async () => {
    let score = 0;
    quizQuestions.forEach((q, i) => {
      if (selectedAnswers[i] === q.answer) score++;
    });
    setQuizScore(score);
    setQuizSubmitted(true);

    if (user) {
      try {
        await addDoc(collection(db, "users", user.uid, "quizResults"), {
          course: slug,
          score,
          total: quizQuestions.length,
          date: serverTimestamp(),
        });
        logActivity(user.uid);
      } catch (e) {
        console.error("Failed to save quiz result:", e);
      }
    }
  };

  const resetQuiz = () => {
    setQuizGenerated(false);
    setQuizQuestions([]);
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setQuizScore(0);
    setQuizError("");
  };

  // ── early return ──────────────────────────────────────────────────────────
  if (!course) {
    return <div className="text-white p-10">Course not found</div>;
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full min-h-screen overflow-hidden text-white">

      {/* BACKGROUND */}
      <div className="absolute inset-0 z-0">
        <FloatingLines
          enabledWaves={["middle"]}
          lineCount={3}
          lineDistance={8}
          bendRadius={3}
          bendStrength={-0.3}
          interactive={false}
          parallax={false}
        />
      </div>
      <div className="absolute inset-0 z-10 bg-black/40" />

      {/* Badge Toast Notification */}
      <BadgeToast badge={toastBadge} onDone={handleToastDone} />

      {/* CONTENT */}
      <div className="relative z-20 p-6 max-w-5xl mx-auto">

        {/* BACK + TITLE */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-gray-400 hover:text-white transition text-sm"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold">{course.title}</h1>
        </div>

        {/* TAB BAR */}
        <div className="flex gap-2 mb-6 bg-black/40 backdrop-blur p-1 rounded-xl w-fit">
          {(["video", "assistant", "quiz"] as const).map((tab) => {
            const labels: Record<string, string> = {
              video: "🎥 Video",
              assistant: "🤖 AI Assistant",
              quiz: "📝 AI Quiz",
            };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === tab
                    ? "bg-cyan-500 text-black"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {/* ══ VIDEO TAB ══ */}
        {activeTab === "video" && (
          <div className="bg-black/50 backdrop-blur rounded-2xl p-6 border border-white/10">
            <YouTube
              videoId={course.videoId}
              className="w-full mb-6"
              iframeClassName="w-full h-[420px] rounded-xl"
              onReady={handleReady}
              opts={{
                width: "100%",
                height: "420",
                playerVars: {
                  autoplay: 0,
                  modestbranding: 1,
                  rel: 0,
                },
              }}
            />
            <div className="w-full bg-gray-800 h-3 rounded-full overflow-hidden">
              <div
                className="bg-cyan-400 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-gray-400">{progress}% completed</p>
          </div>
        )}

        {/* ══ AI ASSISTANT TAB ══ */}
        {activeTab === "assistant" && (
          <div className="bg-black/50 backdrop-blur rounded-2xl border border-white/10 flex flex-col h-[600px]">

            <div className="p-4 border-b border-white/10">
              <p className="text-sm text-gray-400">
                Ask anything about <span className="text-cyan-400">{course.topic}</span>
              </p>
            </div>

            {/* MESSAGES */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {chatMessages.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-600 gap-3">
                  <div className="text-5xl">🤖</div>
                  <p className="text-sm">Ask me anything about {course.topic}!</p>
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {[
                      `What is ${slug.toUpperCase()}?`,
                      "Explain key concepts",
                      "Give me a quick summary",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setChatInput(suggestion)}
                        className="text-xs bg-white/5 border border-white/10 px-3 py-1.5 rounded-full hover:bg-white/10 transition text-gray-300"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-cyan-500 text-black rounded-br-sm"
                        : "bg-white/10 text-gray-100 rounded-bl-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/10 px-4 py-3 rounded-2xl rounded-bl-sm">
                    <div className="flex gap-1 items-center h-4">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* INPUT */}
            <div className="p-4 border-t border-white/10 flex gap-3">
              <input
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-cyan-500 transition placeholder:text-gray-600"
                placeholder="Ask a question..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
              />
              <button
                onClick={sendChat}
                disabled={chatLoading || !chatInput.trim()}
                className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-bold px-5 py-3 rounded-xl transition text-sm"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {/* ══ AI QUIZ TAB ══ */}
        {activeTab === "quiz" && (
          <div className="bg-black/50 backdrop-blur rounded-2xl border border-white/10 p-6">

            {/* PRE-QUIZ */}
            {!quizGenerated && !quizLoading && (
              <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                <div className="text-5xl">📝</div>
                <h2 className="text-xl font-bold">Test Your Knowledge</h2>
                <p className="text-gray-400 text-sm max-w-sm">
                  Generate a 5-question AI quiz on{" "}
                  <span className="text-cyan-400">{course.topic}</span>. Questions are unique every time!
                </p>
                {quizError && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl max-w-sm">
                    {quizError}
                  </div>
                )}
                <button
                  onClick={generateQuiz}
                  className="mt-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-8 py-3 rounded-xl transition"
                >
                  {quizError ? "Try Again" : "Generate Quiz"}
                </button>
              </div>
            )}

            {/* LOADING */}
            {quizLoading && (
              <div className="flex flex-col items-center justify-center gap-4 py-16">
                <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-400 text-sm">Generating your quiz...</p>
              </div>
            )}

            {/* QUIZ QUESTIONS */}
            {quizGenerated && !quizSubmitted && (
              <div className="flex flex-col gap-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Quiz — {course.title}</h2>
                  <button onClick={resetQuiz} className="text-xs text-gray-500 hover:text-white transition">
                    Regenerate ↺
                  </button>
                </div>

                {quizQuestions.map((q, qi) => (
                  <div key={qi} className="bg-white/5 rounded-xl p-5 border border-white/10">
                    <p className="font-medium mb-4 text-sm leading-relaxed">
                      <span className="text-cyan-400 font-bold mr-2">Q{qi + 1}.</span>
                      {q.question}
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {q.options.map((opt, oi) => (
                        <button
                          key={oi}
                          onClick={() =>
                            setSelectedAnswers((prev) => ({ ...prev, [qi]: oi }))
                          }
                          className={`text-left px-4 py-3 rounded-lg text-sm border transition ${
                            selectedAnswers[qi] === oi
                              ? "bg-cyan-500/20 border-cyan-500 text-white"
                              : "border-white/10 text-gray-300 hover:border-white/30 hover:bg-white/5"
                          }`}
                        >
                          <span className="font-bold mr-2 text-gray-500">
                            {["A", "B", "C", "D"][oi]}.
                          </span>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                <button
                  onClick={submitQuiz}
                  disabled={Object.keys(selectedAnswers).length < quizQuestions.length}
                  className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-bold py-3 rounded-xl transition"
                >
                  Submit Quiz ({Object.keys(selectedAnswers).length}/{quizQuestions.length} answered)
                </button>
              </div>
            )}

            {/* QUIZ RESULTS */}
            {quizSubmitted && (
              <div className="flex flex-col gap-6">
                <div className="text-center py-8 bg-white/5 rounded-xl border border-white/10">
                  <div className="text-5xl mb-3">
                    {quizScore === quizQuestions.length
                      ? "🏆"
                      : quizScore >= quizQuestions.length * 0.6
                      ? "🎯"
                      : "📚"}
                  </div>
                  <p className="text-4xl font-bold text-cyan-400">
                    {quizScore}/{quizQuestions.length}
                  </p>
                  <p className="text-gray-400 mt-1 text-sm">
                    {Math.round((quizScore / quizQuestions.length) * 100)}% correct
                  </p>
                  <p className="text-sm mt-2 text-gray-300">
                    {quizScore === quizQuestions.length
                      ? "Perfect score! Outstanding!"
                      : quizScore >= quizQuestions.length * 0.6
                      ? "Great job! Keep learning!"
                      : "Keep studying — you've got this!"}
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  {quizQuestions.map((q, qi) => {
                    const selected = selectedAnswers[qi];
                    const correct = q.answer;
                    const isRight = selected === correct;
                    return (
                      <div
                        key={qi}
                        className={`rounded-xl p-4 border text-sm ${
                          isRight
                            ? "border-green-500/40 bg-green-500/10"
                            : "border-red-500/40 bg-red-500/10"
                        }`}
                      >
                        <p className="font-medium mb-2">
                          <span className={`mr-2 ${isRight ? "text-green-400" : "text-red-400"}`}>
                            {isRight ? "✓" : "✗"}
                          </span>
                          {q.question}
                        </p>
                        {!isRight && (
                          <p className="text-red-300 text-xs mb-1">
                            Your answer: {q.options[selected]}
                          </p>
                        )}
                        <p className="text-green-300 text-xs">
                          Correct: {q.options[correct]}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={resetQuiz}
                  className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition"
                >
                  Try Again ↺
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}