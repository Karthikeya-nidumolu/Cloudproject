"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import FloatingLines from "@/components/FloatingLines";
import { logoutUser, getCurrentUser } from "@/lib/auth";
import { isFirebaseReady, restoreFirebaseAuth } from "@/lib/firebase";
import {
  COMPANIES,
  DIFFICULTY_COLORS,
  InterviewSolution,
  InterviewQuestion,
  getAllQuestions,
  getSolutions,
  submitSolution,
  getCompanyById,
} from "@/lib/interviews";

export default function CommunityPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Questions & Solutions
  const [allQuestions, setAllQuestions] = useState<(InterviewQuestion & { companyId: string; companyName: string })[]>([]);
  const [solutions, setSolutions] = useState<Record<string, InterviewSolution[]>>({});
  const [solutionsLoading, setSolutionsLoading] = useState(false);

  // Filters
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  // Submit modal
  const [showSubmitModal, setShowSubmitModal] = useState<string | null>(null);
  const [submitForm, setSubmitForm] = useState({ authorName: "", experience: "", code: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Auth check
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/");
      return;
    }
    setUser(currentUser);
    setLoading(false);
    restoreFirebaseAuth().catch(() => {});
  }, [router]);

  // Load questions
  useEffect(() => {
    setAllQuestions(getAllQuestions());
  }, []);

  // Load solutions for expanded question
  const loadSolutions = useCallback(async (questionId: string) => {
    if (solutions[questionId]) return; // Already loaded
    setSolutionsLoading(true);
    try {
      const fetchedSolutions = await getSolutions(questionId);
      // Also merge with localStorage
      const local = JSON.parse(localStorage.getItem(`solutions-${questionId}`) || "[]") as InterviewSolution[];
      const allIds = new Set(fetchedSolutions.map(s => s.id));
      const merged = [...fetchedSolutions, ...local.filter(l => !allIds.has(l.id))];
      merged.sort((a, b) => b.createdAt - a.createdAt);
      setSolutions(prev => ({ ...prev, [questionId]: merged }));
    } catch (error) {
      console.error("Failed to load solutions:", error);
      const local = JSON.parse(localStorage.getItem(`solutions-${questionId}`) || "[]") as InterviewSolution[];
      setSolutions(prev => ({ ...prev, [questionId]: local }));
    } finally {
      setSolutionsLoading(false);
    }
  }, [solutions]);

  const handleExpand = (questionId: string) => {
    if (expandedQuestion === questionId) {
      setExpandedQuestion(null);
    } else {
      setExpandedQuestion(questionId);
      loadSolutions(questionId);
    }
  };

  const handleSubmitSolution = async (questionId: string) => {
    if (!submitForm.authorName.trim() || !submitForm.code.trim()) {
      setSubmitError("Please provide your name and solution code");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const localSolution: InterviewSolution = {
      id: `local-${Date.now()}`,
      questionId,
      authorName: submitForm.authorName.trim(),
      experience: submitForm.experience.trim() || "Not specified",
      code: submitForm.code.trim(),
      createdAt: Date.now(),
      likes: 0,
    };

    try {
      const newSolution = await submitSolution(
        questionId,
        submitForm.authorName,
        submitForm.experience,
        submitForm.code
      );
      if (newSolution) {
        setSolutions(prev => ({
          ...prev,
          [questionId]: [newSolution, ...(prev[questionId] || [])],
        }));
      }
      setSubmitSuccess(true);
    } catch (error) {
      console.warn("Firebase submission failed, using localStorage:", error);
      const existing = JSON.parse(localStorage.getItem(`solutions-${questionId}`) || "[]");
      const updated = [localSolution, ...existing];
      localStorage.setItem(`solutions-${questionId}`, JSON.stringify(updated));
      setSolutions(prev => ({
        ...prev,
        [questionId]: [localSolution, ...(prev[questionId] || [])],
      }));
      setSubmitSuccess(true);
    } finally {
      setSubmitForm({ authorName: "", experience: "", code: "" });
      setShowSubmitModal(null);
      setSubmitting(false);
      setTimeout(() => setSubmitSuccess(false), 3000);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    router.push("/");
  };

  // Filter questions
  const filteredQuestions = allQuestions.filter(q => {
    if (selectedCompany !== "all" && q.companyId !== selectedCompany) return false;
    if (selectedDifficulty !== "all" && q.difficulty !== selectedDifficulty) return false;
    return true;
  });

  // Count solutions
  const totalSolutions = Object.values(solutions).flat().length;

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
          to   { opacity: 1; max-height: 4000px; }
        }
        @keyframes successPulse {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        .fade-in-up { animation: fadeInUp 0.5s ease both; }
        .fade-in { animation: fadeIn 0.3s ease both; }
        .slide-down { animation: slideDown 0.4s ease both; }
        .success-pulse { animation: successPulse 0.4s ease both; }
        .question-card { transition: all 0.3s ease; }
        .question-card:hover { border-color: rgba(168, 85, 247, 0.3); }
        .solution-card { transition: all 0.3s ease; }
        .solution-card:hover { border-color: rgba(34, 211, 238, 0.3); }
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
              onClick={() => router.push("/interview")}
              className="text-left px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
            >
              💼 Interview Prep
            </button>
            <button
              className="text-left px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-purple-300 font-medium border border-purple-500/20"
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
            <h2 className="text-4xl font-bold mb-2 flex items-center gap-3">
              👥 Community Solutions
              {totalSolutions > 0 && (
                <span className="text-sm px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {totalSolutions} solution{totalSolutions !== 1 ? "s" : ""} shared
                </span>
              )}
            </h2>
            <p className="text-gray-400">
              Browse and share coding solutions with the community. Learn from others&apos; approaches!
            </p>
          </div>

          {/* Success Toast */}
          {submitSuccess && (
            <div className="fixed top-6 right-6 z-50 success-pulse">
              <div className="bg-gradient-to-r from-green-500 to-cyan-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
                <span className="text-xl">✅</span>
                <span className="font-medium">Solution submitted successfully!</span>
              </div>
            </div>
          )}

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4 mb-6 fade-in-up" style={{ animationDelay: "0.1s" }}>
            <div className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">{allQuestions.length}</div>
              <div className="text-xs text-gray-400">Total Questions</div>
            </div>
            <div className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-cyan-400">{COMPANIES.length}</div>
              <div className="text-xs text-gray-400">Companies</div>
            </div>
            <div className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{totalSolutions}</div>
              <div className="text-xs text-gray-400">Solutions Shared</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6 fade-in-up" style={{ animationDelay: "0.15s" }}>
            {/* Company Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Company:</span>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-purple-500 transition"
              >
                <option value="all">All Companies</option>
                {COMPANIES.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Difficulty Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Difficulty:</span>
              {(["all", "easy", "medium", "hard"] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setSelectedDifficulty(d)}
                  className="px-3 py-1 rounded-full text-xs font-medium capitalize transition border"
                  style={{
                    background: selectedDifficulty === d ? "rgba(168,85,247,0.15)" : "rgba(0,0,0,0.4)",
                    borderColor: selectedDifficulty === d ? "#a855f7" : "rgba(255,255,255,0.1)",
                    color: selectedDifficulty === d ? "#c084fc" : "#9CA3AF",
                  }}
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="ml-auto text-sm text-gray-500">
              Showing {filteredQuestions.length} question{filteredQuestions.length !== 1 ? "s" : ""}
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-3">
            {filteredQuestions.map((question, index) => {
              const isExpanded = expandedQuestion === question.id;
              const questionSolutions = solutions[question.id] || [];
              const company = getCompanyById(question.companyId);

              return (
                <div
                  key={question.id}
                  className="question-card bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden fade-in-up"
                  style={{ animationDelay: `${Math.min(index * 0.03, 0.5)}s` }}
                >
                  {/* Question Header */}
                  <button
                    onClick={() => handleExpand(question.id)}
                    className="w-full p-4 text-left flex items-start justify-between"
                  >
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className="text-xs px-2 py-0.5 rounded font-medium"
                          style={{
                            backgroundColor: `${company?.color || "#666"}22`,
                            color: company?.color || "#999",
                          }}
                        >
                          {question.companyName}
                        </span>
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
                        {questionSolutions.length > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                            {questionSolutions.length} solution{questionSolutions.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-medium">{question.question}</h4>
                    </div>
                    <span className="text-lg text-gray-400 mt-1">
                      {isExpanded ? "▼" : "▶"}
                    </span>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-white/10 slide-down">
                      <div className="p-5">
                        {/* Answer */}
                        <div className="mb-4">
                          <h5 className="text-sm font-semibold text-cyan-400 mb-2">💡 Answer:</h5>
                          <p className="text-gray-300 text-sm leading-relaxed">{question.answer}</p>
                        </div>

                        {/* Sample Code */}
                        {question.code && (
                          <div className="mb-6">
                            <h5 className="text-sm font-semibold text-cyan-400 mb-2">📝 Sample Code:</h5>
                            <div className="bg-black/70 rounded-lg p-4 overflow-x-auto border border-white/5">
                              <pre className="code-block text-xs text-gray-300">
                                <code>{question.code}</code>
                              </pre>
                            </div>
                          </div>
                        )}

                        {/* Community Solutions */}
                        <div className="border-t border-white/10 pt-5 mt-4">
                          <div className="flex items-center justify-between mb-4">
                            <h5 className="text-sm font-semibold text-purple-400 flex items-center gap-2">
                              👥 Community Solutions
                              <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                                {questionSolutions.length}
                              </span>
                            </h5>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowSubmitModal(question.id);
                              }}
                              className="text-xs px-4 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white rounded-lg transition flex items-center gap-1 font-medium"
                            >
                              ➕ Share Your Solution
                            </button>
                          </div>

                          {solutionsLoading && !solutions[question.id] ? (
                            <div className="text-center py-6 text-gray-500">
                              <span className="animate-spin inline-block mr-2">⚡</span>
                              Loading solutions...
                            </div>
                          ) : questionSolutions.length > 0 ? (
                            <div className="space-y-3">
                              {questionSolutions.map((sol) => (
                                <div
                                  key={sol.id}
                                  className="solution-card bg-black/30 border border-white/5 rounded-lg p-4"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="w-7 h-7 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 flex items-center justify-center text-xs font-bold">
                                        {sol.authorName.charAt(0).toUpperCase()}
                                      </span>
                                      <span className="text-sm font-medium text-cyan-300">
                                        {sol.authorName}
                                      </span>
                                      <span className="text-xs text-gray-500">•</span>
                                      <span className="text-xs text-gray-400">
                                        {sol.experience}
                                      </span>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                      {new Date(sol.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className="bg-black/50 rounded-lg p-3 overflow-x-auto border border-white/5">
                                    <pre className="code-block text-xs text-gray-300">
                                      <code>{sol.code}</code>
                                    </pre>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <div className="text-3xl mb-2">💭</div>
                              <p className="text-sm">No solutions yet. Be the first to share your approach!</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredQuestions.length === 0 && (
            <div className="text-center py-20 text-gray-500 fade-in">
              <div className="text-5xl mb-4">🔍</div>
              <p>No questions found for this filter combination.</p>
              <button
                onClick={() => { setSelectedCompany("all"); setSelectedDifficulty("all"); }}
                className="mt-4 text-purple-400 hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Submit Solution Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm fade-in">
          <div className="bg-black/90 border border-white/20 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-purple-400 flex items-center gap-2">
                <span>✍️</span> Share Your Solution
              </h3>
              <button
                onClick={() => {
                  setShowSubmitModal(null);
                  setSubmitError(null);
                }}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Which question */}
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 mb-4">
              <p className="text-xs text-purple-300 mb-1">Solving:</p>
              <p className="text-sm text-white">{allQuestions.find(q => q.id === showSubmitModal)?.question}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Your Name *</label>
                <input
                  type="text"
                  value={submitForm.authorName}
                  onChange={(e) => setSubmitForm(prev => ({ ...prev, authorName: e.target.value }))}
                  placeholder="e.g., John Doe"
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500 transition"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Experience Level</label>
                <select
                  value={submitForm.experience}
                  onChange={(e) => setSubmitForm(prev => ({ ...prev, experience: e.target.value }))}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500 transition"
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
                  value={submitForm.code}
                  onChange={(e) => setSubmitForm(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="Paste your code solution here..."
                  rows={12}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500 transition font-mono text-sm"
                />
              </div>

              {submitError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm">
                  {submitError}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowSubmitModal(null);
                    setSubmitError(null);
                  }}
                  className="flex-1 px-4 py-2.5 border border-white/20 rounded-lg text-gray-300 hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSubmitSolution(showSubmitModal)}
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 disabled:opacity-50 text-white rounded-lg transition flex items-center justify-center gap-2 font-medium"
                >
                  {submitting ? (
                    <>
                      <span className="animate-spin">⚡</span>
                      Submitting...
                    </>
                  ) : (
                    <>🚀 Submit Solution</>
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
