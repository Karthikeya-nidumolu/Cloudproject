"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import FloatingLines from "@/components/FloatingLines";
import { logoutUser, getCurrentUser } from "@/lib/auth";
import {
  COMPANIES,
  INTERVIEW_QUESTIONS,
  InterviewQuestion,
  getRandomQuestions,
  getCompanyById,
  DIFFICULTY_COLORS,
  InterviewSolution,
  getSolutions,
  submitSolution,
} from "@/lib/interviews";
import { generateInterviewQuestions, GeneratedQuestion } from "@/lib/grok";
import { isFirebaseReady, restoreFirebaseAuth } from "@/lib/firebase";

const TOPICS = [
  "Arrays & Strings",
  "Linked Lists",
  "Trees & Graphs",
  "Dynamic Programming",
  "System Design",
  "Object-Oriented Design",
  "Concurrency",
  "Database Design",
];

export default function InterviewPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [questions, setQuestions] = useState<(InterviewQuestion | GeneratedQuestion)[]>([]);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "easy" | "medium" | "hard">("all");

  // AI Generation states
  const [aiMode, setAiMode] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<"mixed" | "easy" | "medium" | "hard">("mixed");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Solutions states
  const [solutions, setSolutions] = useState<Record<string, InterviewSolution[]>>({});
  const [showSolutionModal, setShowSolutionModal] = useState<string | null>(null);
  const [solutionForm, setSolutionForm] = useState({
    authorName: "",
    experience: "",
    code: "",
  });
  const [submittingSolution, setSubmittingSolution] = useState(false);
  const [solutionError, setSolutionError] = useState<string | null>(null);

  // Auth check
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/");
      return;
    }
    setUser(currentUser);
    setLoading(false);
    // Restore Firebase SDK auth for Firestore security rules
    restoreFirebaseAuth().catch(() => {});
  }, [router]);

  const handleCompanySelect = (companyId: string) => {
    setSelectedCompany(companyId);
    setAiMode(false);
    const randomQuestions = getRandomQuestions(companyId, 5);
    setQuestions(randomQuestions);
    setExpandedQuestions(new Set());
    setAiError(null);
  };

  const handleAiMode = (companyId: string) => {
    setSelectedCompany(companyId);
    setAiMode(true);
    setQuestions([]);
    setExpandedQuestions(new Set());
    setAiError(null);
  };

  const generateAiQuestions = async () => {
    if (!selectedCompany) return;

    setAiLoading(true);
    setAiError(null);

    try {
      const company = getCompanyById(selectedCompany)?.name || selectedCompany;
      const generatedQuestions = await generateInterviewQuestions(
        company,
        selectedTopic,
        selectedDifficulty,
        3
      );
      setQuestions(generatedQuestions);
      setExpandedQuestions(new Set());
    } catch (error) {
      console.error("Failed to generate questions:", error);
      setAiError("Failed to generate AI questions. Please try again or use pre-loaded questions.");
    } finally {
      setAiLoading(false);
    }
  };

  const toggleQuestion = (questionId: string) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
    }
    setExpandedQuestions(newExpanded);
  };

  const handleLogout = async () => {
    await logoutUser();
    router.push("/");
  };

  const filteredQuestions = questions.filter((q) => {
    if (filter === "all") return true;
    return q.difficulty === filter;
  });

  // Load solutions when a question is expanded (Firebase + localStorage fallback)
  const loadSolutionsForQuestion = async (questionId: string) => {
    const local = JSON.parse(localStorage.getItem(`solutions-${questionId}`) || "[]") as InterviewSolution[];

    if (!isFirebaseReady()) {
      // Use localStorage only
      setSolutions(prev => ({ ...prev, [questionId]: local }));
      return;
    }

    try {
      const questionSolutions = await getSolutions(questionId);
      // Merge Firebase solutions with local ones
      const merged = [...questionSolutions, ...local].sort((a, b) => b.createdAt - a.createdAt);
      setSolutions(prev => ({ ...prev, [questionId]: merged }));
    } catch (error) {
      console.error("Failed to load solutions, using localStorage:", error);
      setSolutions(prev => ({ ...prev, [questionId]: local }));
    }
  };

  // Enhanced toggle that also loads solutions
  const toggleQuestionWithSolutions = (questionId: string) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
      // Load solutions when expanding
      if (!solutions[questionId]) {
        loadSolutionsForQuestion(questionId);
      }
    }
    setExpandedQuestions(newExpanded);
  };

  // Submit solution handler with localStorage fallback
  const handleSubmitSolution = async (questionId: string) => {
    if (!solutionForm.authorName.trim() || !solutionForm.code.trim()) {
      setSolutionError("Please provide your name and solution code");
      return;
    }

    setSubmittingSolution(true);
    setSolutionError(null);

    const localSolution: InterviewSolution = {
      id: `local-${Date.now()}`,
      questionId,
      authorName: solutionForm.authorName.trim(),
      experience: solutionForm.experience.trim() || "Not specified",
      code: solutionForm.code.trim(),
      createdAt: Date.now(),
      likes: 0,
    };

    try {
      // Try Firebase first
      const newSolution = await submitSolution(
        questionId,
        solutionForm.authorName,
        solutionForm.experience,
        solutionForm.code
      );
      if (newSolution) {
        setSolutions(prev => ({
          ...prev,
          [questionId]: [newSolution, ...(prev[questionId] || [])]
        }));
      }
    } catch (error) {
      // Fallback to localStorage when Firebase fails
      console.warn("Firebase submission failed, using localStorage:", error);

      // Load existing local solutions
      const existing = JSON.parse(localStorage.getItem(`solutions-${questionId}`) || "[]");
      const updated = [localSolution, ...existing];
      localStorage.setItem(`solutions-${questionId}`, JSON.stringify(updated));

      // Update UI with local solution
      setSolutions(prev => ({
        ...prev,
        [questionId]: [localSolution, ...(prev[questionId] || [])]
      }));
    } finally {
      setSolutionForm({ authorName: "", experience: "", code: "" });
      setShowSolutionModal(null);
      setSubmittingSolution(false);
    }
  };

  const refreshQuestions = async () => {
    if (!selectedCompany) return;

    setAiLoading(true);
    setAiError(null);

    try {
      const company = getCompanyById(selectedCompany)?.name || selectedCompany;
      // Always generate fresh AI questions for truly new content
      const generatedQuestions = await generateInterviewQuestions(
        company,
        selectedTopic,
        selectedDifficulty,
        5
      );
      setQuestions(generatedQuestions);
      setExpandedQuestions(new Set());
      // Show AI indicator
      setAiMode(true);
    } catch (error) {
      console.error("Failed to generate questions:", error);
      // Fallback to pre-loaded questions if AI fails
      const randomQuestions = getRandomQuestions(selectedCompany, 5);
      setQuestions(randomQuestions);
      setAiMode(false);
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen overflow-hidden text-white">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideDown {
          from { opacity: 0; max-height: 0; }
          to   { opacity: 1; max-height: 2000px; }
        }
        .fade-in-up {
          animation: fadeInUp 0.5s ease both;
        }
        .fade-in {
          animation: fadeIn 0.3s ease both;
        }
        .slide-down {
          animation: slideDown 0.4s ease both;
        }
        .company-card {
          transition: all 0.3s ease;
        }
        .company-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }
        .question-card {
          transition: all 0.3s ease;
        }
        .question-card:hover {
          border-color: rgba(34, 211, 238, 0.3);
        }
        .code-block {
          font-family: 'Geist Mono', monospace;
          white-space: pre;
          overflow-x: auto;
        }
      `}</style>

      {/* Background */}
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
      <div className="absolute inset-0 z-10 bg-black/30" />

      <div className="relative z-20 flex h-full min-h-screen">

        {/* SIDEBAR */}
        <div className="w-64 bg-black/50 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col fixed h-full">
          <h1
            className="text-xl font-bold mb-10 cursor-pointer"
            onClick={() => router.push("/dashboard")}
          >
            CloudAcademy
          </h1>

          <nav className="flex flex-col gap-2">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-left px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => router.push("/badges")}
              className="text-left px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
            >
              🏆 Badges
            </button>
            <button
              className="text-left px-4 py-2 rounded-lg bg-white/10 text-white font-medium"
            >
              💼 Interview Prep
            </button>
            <button
              onClick={() => router.push("/community")}
              className="text-left px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
            >
              👥 Community
            </button>
          </nav>

          <div className="mt-auto">
            <button
              onClick={handleLogout}
              className="w-full bg-red-500 py-2 rounded-lg hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 ml-64 p-8 overflow-y-auto">

          {/* Header */}
          <div className="mb-8 fade-in-up">
            <h2 className="text-4xl font-bold mb-2">Interview Prep</h2>
            <p className="text-gray-400">Practice real interview questions from top tech companies</p>
          </div>

          {!selectedCompany ? (
            <>
              {/* Company Selection Grid */}
              <div className="mb-6 fade-in-up" style={{ animationDelay: "0.1s" }}>
                <h3 className="text-xl font-semibold mb-4">Select a Company</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {COMPANIES.map((company, index) => (
                    <div key={company.id} className="relative group">
                      <button
                        onClick={() => handleCompanySelect(company.id)}
                        className="w-full company-card text-left bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl p-5 hover:border-white/20"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-4xl">{company.logo}</span>
                          <span
                            className="text-xs px-2 py-1 rounded-full font-medium"
                            style={{
                              backgroundColor: `${company.color}22`,
                              color: company.color,
                            }}
                          >
                            {company.questionCount} questions
                          </span>
                        </div>
                        <h4 className="text-lg font-bold mb-1">{company.name}</h4>
                        <p className="text-sm text-gray-400">{company.description}</p>
                      </button>
                      {/* AI Button overlay */}
                      <button
                        onClick={() => handleAiMode(company.id)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-3 py-1 rounded-full font-medium hover:from-purple-600 hover:to-pink-600"
                        title="Generate AI Questions with Grok"
                      >
                        🤖 AI Mode
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 fade-in-up" style={{ animationDelay: "0.2s" }}>
                <div className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl p-5 text-center">
                  <div className="text-3xl font-bold text-cyan-400">{COMPANIES.length}</div>
                  <div className="text-sm text-gray-400">Companies</div>
                </div>
                <div className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl p-5 text-center">
                  <div className="text-3xl font-bold text-purple-400">
                    {Object.values(INTERVIEW_QUESTIONS).flat().length}
                  </div>
                  <div className="text-sm text-gray-400">Pre-loaded Questions</div>
                </div>
                <div className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl p-5 text-center">
                  <div className="text-3xl font-bold text-green-400">∞</div>
                  <div className="text-sm text-gray-400">AI Generated (Grok)</div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Company Header */}
              <div className="flex items-center justify-between mb-6 fade-in-up">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      setSelectedCompany(null);
                      setAiMode(false);
                    }}
                    className="text-gray-400 hover:text-white transition"
                  >
                    ← Back
                  </button>
                  <div>
                    <h3 className="text-2xl font-bold flex items-center gap-2">
                      {getCompanyById(selectedCompany)?.logo}
                      {getCompanyById(selectedCompany)?.name} Questions
                      {aiMode && (
                        <span className="text-sm ml-2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/30">
                          🤖 AI Powered by Grok
                        </span>
                      )}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={refreshQuestions}
                  disabled={aiLoading}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 disabled:opacity-50 text-cyan-300 rounded-lg transition flex items-center gap-2"
                >
                  {aiLoading ? (
                    <>
                      <span className="animate-spin">⚡</span>
                      Generating...
                    </>
                  ) : (
                    <>
                      🤖 Get New Questions
                    </>
                  )}
                </button>
              </div>

              {/* AI Mode Controls */}
              {aiMode && (
                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6 mb-6 fade-in">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">🤖</span>
                    <div>
                      <h4 className="font-semibold text-purple-300">Grok AI Question Generator</h4>
                      <p className="text-sm text-gray-400">Generate real-time interview questions using xAI's Grok</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="text-sm text-gray-400 mb-2 block">Topic (Optional)</label>
                      <select
                        value={selectedTopic}
                        onChange={(e) => setSelectedTopic(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500 transition"
                      >
                        <option value="">Any Topic</option>
                        {TOPICS.map(topic => (
                          <option key={topic} value={topic}>{topic}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm text-gray-400 mb-2 block">Difficulty</label>
                      <select
                        value={selectedDifficulty}
                        onChange={(e) => setSelectedDifficulty(e.target.value as any)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500 transition"
                      >
                        <option value="mixed">Mixed</option>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        onClick={generateAiQuestions}
                        disabled={aiLoading}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg transition flex items-center justify-center gap-2"
                      >
                        {aiLoading ? (
                          <>
                            <span className="animate-spin">⚡</span>
                            Generating...
                          </>
                        ) : (
                          <>🤖 Generate Questions</>
                        )}
                      </button>
                    </div>
                  </div>

                  {aiError && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm">
                      {aiError}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setAiMode(false);
                        const randomQuestions = getRandomQuestions(selectedCompany, 5);
                        setQuestions(randomQuestions);
                        setAiError(null);
                      }}
                      className="text-sm text-gray-400 hover:text-white underline"
                    >
                      Switch to pre-loaded questions
                    </button>
                  </div>
                </div>
              )}

              {/* Difficulty Filter */}
              {questions.length > 0 && (
                <div className="flex gap-3 mb-6 fade-in" style={{ animationDelay: "0.1s" }}>
                  {(["all", "easy", "medium", "hard"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className="px-4 py-2 rounded-full text-sm font-medium capitalize transition border"
                      style={{
                        background: filter === f ? "rgba(34,211,238,0.15)" : "rgba(0,0,0,0.4)",
                        borderColor: filter === f ? "#22D3EE" : "rgba(255,255,255,0.1)",
                        color: filter === f ? "#22D3EE" : "#9CA3AF",
                      }}
                    >
                      {f}
                      {f !== "all" && (
                        <span className="ml-1 text-xs">
                          ({questions.filter(q => q.difficulty === f).length})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Questions List */}
              <div className="space-y-4">
                {filteredQuestions.map((question, index) => (
                  <div
                    key={question.id}
                    className="question-card bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden fade-in-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {/* Question Header */}
                    <button
                      onClick={() => toggleQuestionWithSolutions(question.id)}
                      className="w-full p-5 text-left flex items-start justify-between"
                    >
                      <div className="flex-1 pr-4">
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                            style={{
                              backgroundColor: `${DIFFICULTY_COLORS[question.difficulty]}22`,
                              color: DIFFICULTY_COLORS[question.difficulty],
                              border: `1px solid ${DIFFICULTY_COLORS[question.difficulty]}44`,
                            }}
                          >
                            {question.difficulty}
                          </span>
                          <span className="text-xs text-gray-500">{question.topic}</span>
                          {aiMode && question.id.startsWith("grok-") && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              🤖 AI Generated
                            </span>
                          )}
                        </div>
                        <h4 className="text-lg font-medium">{question.question}</h4>
                      </div>
                      <span className="text-xl text-gray-400">
                        {expandedQuestions.has(question.id) ? "▼" : "▶"}
                      </span>
                    </button>

                    {/* Expanded Answer */}
                    {expandedQuestions.has(question.id) && (
                      <div className="border-t border-white/10 slide-down">
                        <div className="p-5">
                          <div className="mb-4">
                            <h5 className="text-sm font-semibold text-cyan-400 mb-2">Answer:</h5>
                            <p className="text-gray-300 leading-relaxed">{question.answer}</p>
                          </div>

                          {question.code && (
                            <div className="mb-6">
                              <h5 className="text-sm font-semibold text-cyan-400 mb-2">Code:</h5>
                              <div className="bg-black/70 rounded-lg p-4 overflow-x-auto border border-white/5">
                                <pre className="code-block text-sm text-gray-300">
                                  <code>{question.code}</code>
                                </pre>
                              </div>
                            </div>
                          )}

                          {/* Community Solutions Section */}
                          <div className="border-t border-white/10 pt-4 mt-4">
                            <div className="flex items-center justify-between mb-4">
                              <h5 className="text-sm font-semibold text-green-400 flex items-center gap-2">
                                👥 Community Solutions
                                {solutions[question.id] && (
                                  <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">
                                    {solutions[question.id].length}
                                  </span>
                                )}
                              </h5>
                              <button
                                onClick={() => setShowSolutionModal(question.id)}
                                className="text-xs px-3 py-1.5 bg-gradient-to-r from-green-500/20 to-cyan-500/20 hover:from-green-500/30 hover:to-cyan-500/30 text-green-300 rounded-lg transition flex items-center gap-1"
                              >
                                ➕ Submit Solution
                              </button>
                            </div>

                            {/* Solutions List */}
                            {solutions[question.id]?.length > 0 ? (
                              <div className="space-y-3">
                                {solutions[question.id].map((solution) => (
                                  <div
                                    key={solution.id}
                                    className="bg-black/30 border border-white/5 rounded-lg p-4"
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-cyan-300">
                                          {solution.authorName}
                                        </span>
                                        <span className="text-xs text-gray-500">•</span>
                                        <span className="text-xs text-gray-400">
                                          {solution.experience}
                                        </span>
                                      </div>
                                      <span className="text-xs text-gray-500">
                                        {new Date(solution.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <div className="bg-black/50 rounded-lg p-3 overflow-x-auto">
                                      <pre className="code-block text-xs text-gray-300">
                                        <code>{solution.code}</code>
                                      </pre>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 italic">
                                No community solutions yet. Be the first to share your approach!
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {filteredQuestions.length === 0 && !aiLoading && (
                <div className="text-center py-20 text-gray-500 fade-in">
                  <div className="text-5xl mb-4">{aiMode ? "🤖" : "🔍"}</div>
                  <p>{aiMode ? "Click 'Generate Questions' to get AI-powered interview questions!" : "No questions found for this filter."}</p>
                  {!aiMode && (
                    <button
                      onClick={() => setFilter("all")}
                      className="mt-4 text-cyan-400 hover:underline"
                    >
                      Clear filter
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Solution Submission Modal */}
      {showSolutionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm fade-in">
          <div className="bg-black/90 border border-white/20 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-green-400">Submit Your Solution</h3>
              <button
                onClick={() => {
                  setShowSolutionModal(null);
                  setSolutionError(null);
                }}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Your Name *</label>
                <input
                  type="text"
                  value={solutionForm.authorName}
                  onChange={(e) => setSolutionForm(prev => ({ ...prev, authorName: e.target.value }))}
                  placeholder="e.g., John Doe"
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-green-500 transition"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Experience Level</label>
                <select
                  value={solutionForm.experience}
                  onChange={(e) => setSolutionForm(prev => ({ ...prev, experience: e.target.value }))}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-green-500 transition"
                >
                  <option value="">Select experience</option>
                  <option value="Student">Student</option>
                  <option value="Junior (0-2 years)">Junior (0-2 years)</option>
                  <option value="Mid-level (3-5 years)">Mid-level (3-5 years)</option>
                  <option value="Senior (5-10 years)">Senior (5-10 years)</option>
                  <option value="Staff/Principal (10+ years)">Staff/Principal (10+ years)</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Your Solution Code *</label>
                <textarea
                  value={solutionForm.code}
                  onChange={(e) => setSolutionForm(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="Paste your code here..."
                  rows={10}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-green-500 transition font-mono text-sm"
                />
              </div>

              {solutionError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm">
                  {solutionError}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowSolutionModal(null);
                    setSolutionError(null);
                  }}
                  className="flex-1 px-4 py-2 border border-white/20 rounded-lg text-gray-300 hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSubmitSolution(showSolutionModal)}
                  disabled={submittingSolution}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 disabled:opacity-50 text-white rounded-lg transition flex items-center justify-center gap-2"
                >
                  {submittingSolution ? (
                    <>
                      <span className="animate-spin">⚡</span>
                      Submitting...
                    </>
                  ) : (
                    "Submit Solution"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
