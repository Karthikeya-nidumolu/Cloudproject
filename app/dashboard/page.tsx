"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

import FloatingLines from "@/components/FloatingLines";
import BadgeToast from "@/components/BadgeToast";

import { db, isFirebaseReady, restoreFirebaseAuth } from "@/lib/firebase";
import { logoutUser, getCurrentUser } from "@/lib/auth";
import { doc, onSnapshot, collection, setDoc, serverTimestamp, getDocs, getDoc } from "firebase/firestore";

import { ALL_BADGES, Badge, computeEarnedBadgeIds, syncBadgesToFirestore, RARITY_COLORS } from "@/lib/badges";
import CalendarHeatmap from "react-calendar-heatmap";
import "react-calendar-heatmap/dist/styles.css";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function startOfYear() {
  // Return January 1st of current year at midnight UTC
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), 0, 1));
}

interface BadgeCardProps {
  badge: Badge;
  earned: boolean;
  onClick: () => void;
  delay?: number;
}

function BadgeCard({ badge, earned, onClick, delay = 0 }: BadgeCardProps) {
  const rarityColor = RARITY_COLORS[badge.rarity];

  return (
    <div
      onClick={onClick}
      style={
        {
          animationDelay: `${delay}s`,
          "--badge-color": badge.color,
          "--badge-color-dim": `${badge.color}44`,
          "--badge-color-bg": `${badge.color}12`,
          "--badge-color-glow": `${badge.color}33`,
          "--badge-color-glow-dim": `${badge.color}22`,
          "--rarity-color": rarityColor,
        } as React.CSSProperties
      }
      className={`badge-preview-card ${earned ? "badge-earned" : "badge-locked"}`}
    >
      <div className="text-3xl">{earned ? badge.icon : "🔒"}</div>
      <div>
        <div className="font-bold text-sm text-white">{earned ? badge.title : "???"}</div>
        <div className="text-xs capitalize font-medium" style={{ color: rarityColor }}>
          {badge.rarity}
        </div>
      </div>
    </div>
  );
}

const COURSES = [
  { id: "aws", name: "AWS", icon: "☁️", color: "#22d3ee" },
  { id: "devops", name: "DevOps", icon: "⚙️", color: "#a78bfa" },
  { id: "ai", name: "AI", icon: "🤖", color: "#34d399" },
  { id: "docker", name: "Docker", icon: "🐳", color: "#60a5fa" },
  { id: "kubernetes", name: "Kubernetes", icon: "☸️", color: "#a855f7" },
  { id: "python", name: "Python", icon: "🐍", color: "#fbbf24" },
  { id: "javascript", name: "JavaScript", icon: "📜", color: "#fbbf24" },
  { id: "react", name: "React", icon: "⚛️", color: "#38bdf8" },
  { id: "typescript", name: "TypeScript", icon: "📘", color: "#3b82f6" },
  { id: "git", name: "Git", icon: "🌲", color: "#f87171" },
  { id: "sql", name: "SQL", icon: "🗃️", color: "#818cf8" },
  { id: "linux", name: "Linux", icon: "🐧", color: "#fb923c" },
];

export default function Dashboard() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  // Load cached progress from localStorage for instant display
  const loadCachedProgress = () => {
    if (typeof window === 'undefined') return {};
    const cached: Record<string, { progress: number }> = {};
    const courses = ['aws', 'devops', 'ai', 'docker', 'kubernetes', 'python', 'javascript', 'react', 'typescript', 'git', 'sql', 'linux'];
    courses.forEach(course => {
      const saved = localStorage.getItem(`course-progress-${course}`);
      if (saved) {
        cached[course] = { progress: parseInt(saved, 10) };
      }
    });
    return cached;
  };
  const [progressData, setProgressData] = useState<any>(loadCachedProgress);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [earnedIds, setEarnedIds] = useState<string[]>([]);
  const [toastBadge, setToastBadge] = useState<Badge | null>(null);
  const prevEarnedRef = useRef<string[]>([]);
  const toastQueueRef = useRef<Badge[]>([]);
  const isShowingToastRef = useRef(false);

  const [activeSection, setActiveSection] = useState<"dashboard" | "analytics" | "profile">("dashboard");

  const [profileForm, setProfileForm] = useState({
    name: "",
    bio: "",
    jobTitle: "",
    company: "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  const [heatmapData, setHeatmapData] = useState<{ date: string; count: number }[]>([]);
  const [totalQuizzes, setTotalQuizzes] = useState(0);
  const [avgQuizScore, setAvgQuizScore] = useState(0);
  const [activeDays, setActiveDays] = useState(0);
  const [totalProgress, setTotalProgress] = useState(0);

  const courses = COURSES;

  // Real-time analytics subscriptions
  const analyticsUnsubsRef = useRef<(() => void)[]>([]);

  const subscribeAnalytics = useCallback((uid: string) => {
    // Cleanup previous subscriptions
    analyticsUnsubsRef.current.forEach(unsub => unsub());
    analyticsUnsubsRef.current = [];

    // Real-time activity listener
    const actUnsub = onSnapshot(
      collection(db, "users", uid, "activity"),
      (snapshot) => {
        const countMap: Record<string, number> = {};
        snapshot.docs.forEach((d) => {
          countMap[d.id] = d.data().count ?? 1;
        });
        const heatValues = Object.entries(countMap).map(([date, count]) => ({ date, count }));
        setHeatmapData(heatValues);
        setActiveDays(heatValues.length);
      },
      (err) => console.warn("Activity listener error:", err)
    );
    analyticsUnsubsRef.current.push(actUnsub);

    // Real-time quiz results listener
    const quizUnsub = onSnapshot(
      collection(db, "users", uid, "quizResults"),
      (snapshot) => {
        const quizDocs = snapshot.docs.map((d) => d.data());
        setTotalQuizzes(quizDocs.length);
        if (quizDocs.length > 0) {
          const validDocs = quizDocs.filter(
            (q) => typeof q.score === "number" && typeof q.total === "number" && q.total > 0
          );
          if (validDocs.length > 0) {
            const avg =
              validDocs.reduce((acc, q) => acc + (q.score / q.total) * 100, 0) /
              validDocs.length;
            setAvgQuizScore(Math.round(avg));
          }
        }
      },
      (err) => console.warn("Quiz listener error:", err)
    );
    analyticsUnsubsRef.current.push(quizUnsub);
  }, []);

  // ── INITIAL AUTH AND BADGE LOADING ─────────────────────────────────────────────
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

    // Guard: Skip Firestore operations if Firebase is not initialized
    if (!isFirebaseReady()) {
      console.warn("Firebase not initialized, skipping Firestore operations");
      return;
    }

    const userRef = doc(db, "users", currentUser.uid);
    const unsubDb = onSnapshot(userRef, (snap) => {
      if (snap.exists()) setUserData(snap.data());
    });

    // Load existing badges from Firestore to prevent duplicate toasts
    const loadExistingBadges = async () => {
      try {
        const badgeRef = doc(db, "users", currentUser.uid, "badges", "earned");
        const snap = await getDoc(badgeRef);
        if (snap.exists()) {
          const data = snap.data();
          let existingIds: string[] = [];
          if (data.badges && typeof data.badges === "object") {
            existingIds = Object.keys(data.badges);
          } else if (data.ids && Array.isArray(data.ids)) {
            existingIds = data.ids;
          }
          prevEarnedRef.current = existingIds;
          setEarnedIds(existingIds);
        }
      } catch (e) {
        console.error("Failed to load existing badges:", e);
      }
    };
    loadExistingBadges();

    return () => unsubDb();
  }, [router]);

  // ── LOAD SAVED PROGRESS from Firestore with merge to preserve local cache ─────
  useEffect(() => {
    if (!user) return;
    if (!isFirebaseReady()) return;
    const ref = collection(db, "users", user.uid, "progress");
    const unsub = onSnapshot(ref, (snapshot) => {
      const data: Record<string, { progress: number }> = {};
      snapshot.docs.forEach((d) => {
        data[d.id] = d.data() as { progress: number };
      });
      // Merge Firebase data with cached localStorage data (Firebase takes precedence)
      setProgressData((prev: Record<string, { progress: number }>) => {
        const merged = { ...prev };
        // Update with Firebase data (real-time updates)
        Object.entries(data).forEach(([courseId, courseData]) => {
          if (courseData && typeof courseData.progress === "number") {
            merged[courseId] = courseData;
          }
        });
        return merged;
      });
      setProgressLoaded(true);
    });
    return () => unsub();
  }, [user]);

  // Manual refresh function to force reload progress from Firestore
  const handleRefreshProgress = async () => {
    if (!user) return;
    setIsRefreshing(true);
    try {
      const progressRef = collection(db, "users", user.uid, "progress");
      const snapshot = await getDocs(progressRef);
      const data: Record<string, { progress: number }> = {};
      snapshot.docs.forEach((d) => {
        data[d.id] = d.data() as { progress: number };
      });
      // Merge with localStorage cache
      setProgressData((prev: Record<string, { progress: number }>) => {
        const merged = { ...prev };
        Object.entries(data).forEach(([courseId, courseData]) => {
          if (courseData && typeof courseData.progress === "number") {
            merged[courseId] = courseData;
            // Update localStorage too
            localStorage.setItem(`course-progress-${courseId}`, String(courseData.progress));
          }
        });
        return merged;
      });
    } catch (e) {
      console.error("Failed to refresh progress:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // ── COMPUTE AND SYNC BADGES ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const computed = computeEarnedBadgeIds(progressData);

    syncBadgesToFirestore(user.uid, computed)
      .then((merged) => {
        const prev = prevEarnedRef.current;
        const newlyEarned = merged.filter((id) => !prev.includes(id));

        if (newlyEarned.length > 0 && prev.length > 0) {
          const newBadges = newlyEarned
            .map((id) => ALL_BADGES.find((b) => b.id === id))
            .filter(Boolean) as Badge[];
          toastQueueRef.current = [...toastQueueRef.current, ...newBadges];
          showNextToast();
        }

        prevEarnedRef.current = merged;
        setEarnedIds(merged);
      })
      .catch((err) => {
        console.error("Badge sync failed:", err);
        setEarnedIds(computed);
      });
  }, [progressData, user]);

  useEffect(() => {
    if (!user) return;
    if (!isFirebaseReady()) return;
    subscribeAnalytics(user.uid);
    return () => {
      analyticsUnsubsRef.current.forEach(unsub => unsub());
      analyticsUnsubsRef.current = [];
    };
  }, [user, subscribeAnalytics]);

  // No need for separate analytics reload on section change - it's real-time now

  useEffect(() => {
    const vals = COURSES.map((c) => progressData[c.id]?.progress || 0);
    const avg = Math.round(vals.reduce((a, b) => a + b, 0) / COURSES.length);
    setTotalProgress(avg);
  }, [progressData]);

  useEffect(() => {
    if (userData) {
      setProfileForm({
        name: userData.name || "",
        bio: userData.bio || "",
        jobTitle: userData.jobTitle || "",
        company: userData.company || "",
      });
    }
  }, [userData]);

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

  const handleLogout = () => {
    logoutUser();
    router.push("/");
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!isFirebaseReady()) {
      setProfileMessage("❌ Firebase not initialized.");
      setIsSavingProfile(false);
      return;
    }
    setIsSavingProfile(true);
    setProfileMessage("");

    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          name: profileForm.name,
          bio: profileForm.bio,
          jobTitle: profileForm.jobTitle,
          company: profileForm.company,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setProfileMessage("✅ Profile saved successfully!");
    } catch (err) {
      console.error("Failed to save profile:", err);
      setProfileMessage("❌ Failed to save profile.");
    } finally {
      setIsSavingProfile(false);
      setTimeout(() => setProfileMessage(""), 3000);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        Loading...
      </div>
    );
  }

  const previewBadges = earnedIds
    .slice(0, 3)
    .map((id) => ALL_BADGES.find((b) => b.id === id))
    .filter(Boolean) as Badge[];

  return (
    <div className="relative w-full h-screen overflow-hidden text-white">
      <style>{`
        .badge-preview-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-radius: 12px;
          cursor: pointer;
          border: 1px solid transparent;
          transition: transform 200ms ease, box-shadow 200ms ease;
          will-change: transform;
        }
        .badge-earned {
          background: linear-gradient(135deg, var(--badge-color-bg), rgba(0,0,0,0.6));
          border-color: var(--badge-color-dim);
          box-shadow: 0 0 15px var(--badge-color-glow);
        }
        .badge-locked {
          background: rgba(0,0,0,0.4);
          border-color: rgba(255,255,255,0.08);
        }
        .badge-preview-card:hover {
          transform: translateY(-4px) scale(1.03);
          box-shadow: 0 0 25px var(--badge-color-glow, rgba(255,255,255,0.1));
        }
        .react-calendar-heatmap { width: 100%; }
        .react-calendar-heatmap .color-empty { fill: #1a1a2e; }
        .react-calendar-heatmap .color-scale-1 { fill: #164e63; }
        .react-calendar-heatmap .color-scale-2 { fill: #0891b2; }
        .react-calendar-heatmap .color-scale-3 { fill: #22d3ee; }
        .react-calendar-heatmap .color-scale-4 { fill: #67e8f9; }
        .react-calendar-heatmap text { fill: #6b7280; font-size: 10px; }
        .react-calendar-heatmap rect { rx: 2px; ry: 2px; }
        .react-calendar-heatmap rect:hover { opacity: 0.8; cursor: pointer; }
      `}</style>

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

      <BadgeToast badge={toastBadge} onDone={handleToastDone} />

      <div className="relative z-20 flex h-full">
        <div className="w-64 bg-black/50 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col">
          <h1 className="text-xl font-bold mb-10">CloudAcademy</h1>

          <nav className="flex flex-col gap-2">
            <button
              onClick={() => setActiveSection("dashboard")}
              className={`text-left px-4 py-2 rounded-lg font-medium transition ${
                activeSection === "dashboard"
                  ? "bg-white/10 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              📊 Dashboard
            </button>

            <button
              onClick={() => setActiveSection("analytics")}
              className={`text-left px-4 py-2 rounded-lg font-medium transition ${
                activeSection === "analytics"
                  ? "bg-cyan-500/20 text-cyan-300"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              📈 Progress Analytics
            </button>

            <button
              onClick={() => router.push("/badges")}
              className="text-left px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
            >
              🏆 Badges
              {earnedIds.length > 0 && (
                <span className="ml-2 bg-cyan-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                  {earnedIds.length}
                </span>
              )}
            </button>

            <button
              onClick={() => router.push("/interview")}
              className="text-left px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
            >
              💼 Interview Prep
            </button>

            <button
              onClick={() => router.push("/community")}
              className="text-left px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
            >
              👥 Community
            </button>

            <button
              onClick={() => setActiveSection("profile")}
              className={`text-left px-4 py-2 rounded-lg font-medium transition ${
                activeSection === "profile"
                  ? "bg-cyan-500/20 text-cyan-300"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              👤 Profile
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

        <div className="flex-1 p-8 overflow-y-auto">
          {activeSection === "dashboard" && (
            <>
              <h2 className="text-3xl font-bold mb-6">
                Welcome, {userData?.name || user?.email}
              </h2>

              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl">Your Courses</h3>
                <button
                  onClick={handleRefreshProgress}
                  disabled={isRefreshing}
                  className="text-sm text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1 disabled:opacity-50"
                  title="Refresh progress from server"
                >
                  {isRefreshing ? (
                    <>
                      <span className="animate-spin">↻</span>
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <span>↻</span>
                      Refresh
                    </>
                  )}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    onClick={() => router.push(`/course/${course.id}`)}
                    className="bg-black/50 p-6 rounded-xl cursor-pointer hover:scale-105 transition group"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">{course.icon}</span>
                      <h3 className="text-lg font-semibold">{course.name}</h3>
                    </div>
                    <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${progressData[course.id]?.progress || 0}%`,
                          backgroundColor: course.color,
                        }}
                      />
                    </div>
                    <p className="text-sm mt-2 text-gray-400">
                      {progressData[course.id]?.progress || 0}% completed
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl">Recent Badges</h3>
                <button
                  onClick={() => router.push("/badges")}
                  className="text-sm text-cyan-400 hover:underline"
                >
                  View all ({earnedIds.length}/{ALL_BADGES.length}) →
                </button>
              </div>

              {previewBadges.length === 0 ? (
                <div className="bg-black/50 rounded-xl p-6 border border-white/10 text-center text-gray-500">
                  <div className="text-3xl mb-2">🔒</div>
                  <p className="text-sm">Complete course milestones to earn badges!</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {previewBadges.map((badge) => (
                    <BadgeCard
                      key={badge.id}
                      badge={badge}
                      earned={earnedIds.includes(badge.id)}
                      onClick={() => router.push("/badges")}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {activeSection === "profile" && (
            <>
              <h2 className="text-3xl font-bold mb-2">Your Profile</h2>
              <p className="text-gray-400 mb-8">Manage your personal information</p>

              <div className="bg-black/50 border border-white/10 rounded-xl p-6 max-w-2xl backdrop-blur">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-3xl">
                    {profileForm.name
                      ? profileForm.name.charAt(0).toUpperCase()
                      : user?.email?.charAt(0).toUpperCase() || "👤"}
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Email</p>
                    <p className="font-medium">{user?.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Display Name</label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, name: e.target.value })
                      }
                      placeholder="Enter your name"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-cyan-500 transition placeholder:text-gray-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Job Title</label>
                    <input
                      type="text"
                      value={profileForm.jobTitle}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, jobTitle: e.target.value })
                      }
                      placeholder="e.g. Software Engineer"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-cyan-500 transition placeholder:text-gray-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Company</label>
                    <input
                      type="text"
                      value={profileForm.company}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, company: e.target.value })
                      }
                      placeholder="e.g. Acme Corp"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-cyan-500 transition placeholder:text-gray-600"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm text-gray-400">Bio</label>
                    <textarea
                      value={profileForm.bio}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, bio: e.target.value })
                      }
                      placeholder="Tell us about yourself..."
                      rows={4}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-cyan-500 transition placeholder:text-gray-600 resize-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-8">
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-bold px-6 py-3 rounded-lg transition"
                  >
                    {isSavingProfile ? "Saving..." : "Save Changes"}
                  </button>

                  {profileMessage && (
                    <span
                      className={`text-sm ${
                        profileMessage.startsWith("✅")
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {profileMessage}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}

          {activeSection === "analytics" && (
            <>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-3xl font-bold">Progress Analytics</h2>
                <button
                  onClick={() => subscribeAnalytics(user.uid)}
                  className="text-sm text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1"
                >
                  ↻ Refresh
                </button>
              </div>
              <p className="text-gray-400 mb-8">Your learning activity across all courses</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                {[
                  { label: "Active Days", value: activeDays, icon: "📅" },
                  { label: "Avg Progress", value: `${totalProgress}%`, icon: "📈" },
                  { label: "Quizzes Taken", value: totalQuizzes, icon: "📝" },
                  { label: "Avg Quiz Score", value: `${avgQuizScore}%`, icon: "🎯" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="bg-black/50 border border-white/10 rounded-xl p-5 flex flex-col gap-1 backdrop-blur"
                  >
                    <span className="text-2xl">{stat.icon}</span>
                    <span className="text-2xl font-bold text-white">{stat.value}</span>
                    <span className="text-xs text-gray-400">{stat.label}</span>
                  </div>
                ))}
              </div>

              <div className="bg-black/50 border border-white/10 rounded-xl p-6 mb-8 backdrop-blur">
                <h3 className="text-lg font-semibold mb-4">Activity Heatmap</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Each square = a day. Brighter = more activity.
                </p>
                <div className="overflow-x-auto">
                  <div className="min-w-[700px]">
                    <CalendarHeatmap
                  startDate={startOfYear()}
                  endDate={new Date()}
                  values={heatmapData}
                  classForValue={(value) => {
                    if (!value || value.count === 0) return "color-empty";
                    if (value.count >= 4) return "color-scale-4";
                    if (value.count >= 3) return "color-scale-3";
                    if (value.count >= 2) return "color-scale-2";
                    return "color-scale-1";
                  }}
                  tooltipDataAttrs={(value: any) => ({
                    "data-tip": value ? `${value.date}: ${value.count} activities` : "No activity",
                  } as any)}
                  showWeekdayLabels
                />
                  </div>
                </div>
              </div>

              <div className="bg-black/50 border border-white/10 rounded-xl p-6 backdrop-blur">
                <h3 className="text-lg font-semibold mb-4">Course Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {courses.map((course) => {
                    const pct = progressData[course.id]?.progress || 0;
                    return (
                      <div key={course.id}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium tracking-wider">
                            {course.name}
                          </span>
                          <span className="text-sm text-gray-400">{pct}%</span>
                        </div>
                        <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="h-2 rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, backgroundColor: course.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
