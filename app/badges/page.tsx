"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, onSnapshot, collection, getDoc, getDocs } from "firebase/firestore";

import FloatingLines from "@/components/FloatingLines";
import { db, isFirebaseReady, restoreFirebaseAuth } from "@/lib/firebase";
import { logoutUser, getCurrentUser } from "@/lib/auth";
import {
  ALL_BADGES,
  Badge,
  RARITY_COLORS,
  computeEarnedBadgeIds,
  syncBadgesToFirestore,
} from "@/lib/badges";

export default function BadgesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [progressData, setProgressData] = useState<any>({});
  const [earnedIds, setEarnedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "earned" | "locked">("all");

  // ── AUTH CHECK using localStorage (same as dashboard) ───────────────────────────
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

    // Real-time listener for badges document
    const badgeRef = doc(db, "users", currentUser.uid, "badges", "earned");
    const unsubBadges = onSnapshot(badgeRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        let existingIds: string[] = [];
        if (data.badges && typeof data.badges === "object") {
          // Sort by earnedAt (most recent first)
          existingIds = Object.entries(data.badges)
            .sort((a: any, b: any) => (b[1].earnedAt || 0) - (a[1].earnedAt || 0))
            .map(([id]) => id);
        } else if (data.ids && Array.isArray(data.ids)) {
          existingIds = data.ids;
        }
        setEarnedIds(existingIds);
      }
    }, (err) => {
      console.warn("Badge listener error:", err);
    });

    return () => unsubBadges();
  }, [router]);

  // Load progress - merge with localStorage cache for instant display
  useEffect(() => {
    if (!user) return;

    // Load cached progress first
    const cached: Record<string, { progress: number }> = {};
    const courses = ['aws', 'devops', 'ai', 'docker', 'kubernetes', 'python', 'javascript', 'react', 'typescript', 'git', 'sql', 'linux'];
    courses.forEach(course => {
      const saved = localStorage.getItem(`course-progress-${course}`);
      if (saved) {
        cached[course] = { progress: parseInt(saved, 10) };
      }
    });
    setProgressData(cached);

    // Then subscribe to Firebase for real-time updates
    if (!isFirebaseReady()) return;
    const ref = collection(db, "users", user.uid, "progress");
    const unsub = onSnapshot(ref, (snapshot) => {
      const data: Record<string, { progress: number }> = {};
      snapshot.docs.forEach((d) => {
        data[d.id] = d.data() as { progress: number };
      });
      // Merge Firebase data with cached data
      setProgressData((prev: Record<string, { progress: number }>) => {
        const merged = { ...prev };
        Object.entries(data).forEach(([courseId, courseData]) => {
          if (courseData && typeof courseData.progress === "number") {
            merged[courseId] = courseData;
          }
        });
        return merged;
      });
    }, (err) => {
      console.error("Firestore error loading progress:", err);
    });
    return () => unsub();
  }, [user]);

  // Compute badges from progress data
  const earnedBadgeIds = (data: any) => {
    const computed = computeEarnedBadgeIds(data);
    return computed;
  };

  // Compute + sync earned badges
  useEffect(() => {
    if (!user) return;
    const computed = earnedBadgeIds(progressData);

    syncBadgesToFirestore(user.uid, computed)
      .then((merged) => {
        setEarnedIds(merged);
      })
      .catch((err) => {
        console.error("Badge sync failed, using computed:", err);
        setEarnedIds(computed);
      });
  }, [progressData, user]);

  const handleLogout = async () => {
    await logoutUser();
    router.push("/");
  };

  const filteredBadges = ALL_BADGES.filter((b) => {
    if (filter === "earned") return earnedIds.includes(b.id);
    if (filter === "locked") return !earnedIds.includes(b.id);
    return true;
  });

  const earnedCount = earnedIds.length;
  const totalCount = ALL_BADGES.length;

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
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px var(--glow), 0 0 40px var(--glow-dim); }
          50%       { box-shadow: 0 0 35px var(--glow), 0 0 60px var(--glow-dim); }
        }
        .badge-card {
          animation: fadeInUp 0.5s ease both;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .badge-card:hover {
          transform: translateY(-6px) scale(1.03);
        }
        .badge-earned-icon {
          animation: float 3s ease-in-out infinite;
        }
        .badge-earned {
          transition: box-shadow 0.3s ease;
        }
        .badge-earned:hover {
          animation: glow-pulse 2s ease-in-out infinite;
        }
        .filter-btn {
          transition: all 0.2s ease;
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
              className="text-left px-4 py-2 rounded-lg bg-white/10 text-white font-medium"
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
          <div className="mb-8" style={{ animation: "fadeInUp 0.4s ease both" }}>
            <h2 className="text-4xl font-bold mb-1">Your Badges</h2>
            <p className="text-gray-400">Track your achievements across all courses</p>
          </div>

          {/* Stats Row */}
          <div
            className="grid grid-cols-3 gap-4 mb-8"
            style={{ animation: "fadeInUp 0.5s ease both" }}
          >
            {[
              { label: "Earned", value: earnedCount, color: "#22D3EE" },
              { label: "Remaining", value: totalCount - earnedCount, color: "#9CA3AF" },
              {
                label: "Completion",
                value: `${Math.round((earnedCount / totalCount) * 100)}%`,
                color: "#A855F7",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl p-5 text-center"
              >
                <div
                  className="text-3xl font-bold mb-1"
                  style={{ color: stat.color }}
                >
                  {stat.value}
                </div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div
            className="mb-8 bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl p-5"
            style={{ animation: "fadeInUp 0.55s ease both" }}
          >
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-300 font-medium">Overall Badge Progress</span>
              <span className="text-cyan-400">{earnedCount} / {totalCount}</span>
            </div>
            <div className="w-full bg-gray-800 h-3 rounded-full overflow-hidden">
              <div
                className="h-3 rounded-full transition-all duration-1000"
                style={{
                  width: `${(earnedCount / totalCount) * 100}%`,
                  background: "linear-gradient(90deg, #22D3EE, #A855F7)",
                }}
              />
            </div>
          </div>

          {/* Filters */}
          <div
            className="flex gap-3 mb-6"
            style={{ animation: "fadeInUp 0.6s ease both" }}
          >
            {(["all", "earned", "locked"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="filter-btn px-5 py-2 rounded-full text-sm font-medium capitalize border"
                style={{
                  background: filter === f ? "rgba(34,211,238,0.15)" : "rgba(0,0,0,0.4)",
                  borderColor: filter === f ? "#22D3EE" : "rgba(255,255,255,0.1)",
                  color: filter === f ? "#22D3EE" : "#9CA3AF",
                }}
              >
                {f === "all" && `All (${totalCount})`}
                {f === "earned" && `Earned (${earnedCount})`}
                {f === "locked" && `Locked (${totalCount - earnedCount})`}
              </button>
            ))}
          </div>

          {/* Badge Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredBadges.map((badge, i) => {
              const isEarned = earnedIds.includes(badge.id);
              const rarityColor = RARITY_COLORS[badge.rarity];

              return (
                <div
                  key={badge.id}
                  className="badge-card"
                  style={{
                    animationDelay: `${i * 0.05}s`,
                    "--glow": `${badge.color}55`,
                    "--glow-dim": `${badge.color}22`,
                  } as any}
                >
                  <div
                    className={`relative rounded-xl p-5 flex flex-col items-center text-center border ${isEarned ? "badge-earned" : ""}`}
                    style={{
                      background: isEarned
                        ? `linear-gradient(135deg, ${badge.color}18, rgba(0,0,0,0.7))`
                        : "rgba(0,0,0,0.5)",
                      borderColor: isEarned ? `${badge.color}55` : "rgba(255,255,255,0.08)",
                      backdropFilter: "blur(12px)",
                      boxShadow: isEarned
                        ? `0 0 20px ${badge.color}33`
                        : undefined,
                    }}
                  >
                    {/* Rarity tag */}
                    <div
                      className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-semibold capitalize"
                      style={{
                        background: `${rarityColor}22`,
                        color: rarityColor,
                        border: `1px solid ${rarityColor}44`,
                        fontSize: "9px",
                        letterSpacing: "0.5px",
                      }}
                    >
                      {badge.rarity}
                    </div>

                    {/* Icon */}
                    <div
                      className={`text-4xl mb-3 mt-2 ${isEarned ? "badge-earned-icon" : ""}`}
                      style={{
                        filter: isEarned ? "none" : "grayscale(1) opacity(0.3)",
                      }}
                    >
                      {isEarned ? badge.icon : "🔒"}
                    </div>

                    {/* Title */}
                    <div
                      className="font-bold text-sm mb-1"
                      style={{ color: isEarned ? "#fff" : "#9CA3AF" }}
                    >
                      {badge.title}
                    </div>

                    {/* Description */}
                    <div
                      className="text-xs leading-relaxed"
                      style={{ color: isEarned ? "#9CA3AF" : "#6B7280" }}
                    >
                      {badge.description}
                    </div>

                    {/* Earned glow line */}
                    {isEarned && (
                      <div
                        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl"
                        style={{
                          background: `linear-gradient(90deg, transparent, ${badge.color}, transparent)`,
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredBadges.length === 0 && (
            <div className="text-center py-20 text-gray-500">
              <div className="text-5xl mb-4">🔍</div>
              <p>No badges found for this filter.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}