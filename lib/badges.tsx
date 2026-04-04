// lib/badges.ts
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

export type Badge = {
  id: string;
  title: string;
  description: string;
  icon: string;
  course?: string;
  threshold?: number;
  color: string;
  rarity: "common" | "rare" | "epic" | "legendary";
};

export const ALL_BADGES: Badge[] = [
  // AWS Badges
  {
    id: "aws_25",
    title: "Cloud Cadet",
    description: "Complete 25% of AWS course",
    icon: "☁️",
    course: "aws",
    threshold: 25,
    color: "#FF9900",
    rarity: "common",
  },
  {
    id: "aws_50",
    title: "Cloud Architect",
    description: "Complete 50% of AWS course",
    icon: "🏗️",
    course: "aws",
    threshold: 50,
    color: "#FF9900",
    rarity: "rare",
  },
  {
    id: "aws_75",
    title: "Cloud Engineer",
    description: "Complete 75% of AWS course",
    icon: "⚡",
    course: "aws",
    threshold: 75,
    color: "#FF9900",
    rarity: "epic",
  },
  {
    id: "aws_100",
    title: "AWS Master",
    description: "Complete the full AWS course",
    icon: "👑",
    course: "aws",
    threshold: 100,
    color: "#FF9900",
    rarity: "legendary",
  },

  // DevOps Badges
  {
    id: "devops_25",
    title: "Pipeline Rookie",
    description: "Complete 25% of DevOps course",
    icon: "🔧",
    course: "devops",
    threshold: 25,
    color: "#00D4AA",
    rarity: "common",
  },
  {
    id: "devops_50",
    title: "CI/CD Champion",
    description: "Complete 50% of DevOps course",
    icon: "🔄",
    course: "devops",
    threshold: 50,
    color: "#00D4AA",
    rarity: "rare",
  },
  {
    id: "devops_75",
    title: "Container King",
    description: "Complete 75% of DevOps course",
    icon: "🐳",
    course: "devops",
    threshold: 75,
    color: "#00D4AA",
    rarity: "epic",
  },
  {
    id: "devops_100",
    title: "DevOps Legend",
    description: "Complete the full DevOps course",
    icon: "🚀",
    course: "devops",
    threshold: 100,
    color: "#00D4AA",
    rarity: "legendary",
  },

  // AI Badges
  {
    id: "ai_25",
    title: "AI Apprentice",
    description: "Complete 25% of AI course",
    icon: "🤖",
    course: "ai",
    threshold: 25,
    color: "#A855F7",
    rarity: "common",
  },
  {
    id: "ai_50",
    title: "Neural Navigator",
    description: "Complete 50% of AI course",
    icon: "🧠",
    course: "ai",
    threshold: 50,
    color: "#A855F7",
    rarity: "rare",
  },
  {
    id: "ai_75",
    title: "Model Maestro",
    description: "Complete 75% of AI course",
    icon: "🎯",
    course: "ai",
    threshold: 75,
    color: "#A855F7",
    rarity: "epic",
  },
  {
    id: "ai_100",
    title: "AI Overlord",
    description: "Complete the full AI course",
    icon: "✨",
    course: "ai",
    threshold: 100,
    color: "#A855F7",
    rarity: "legendary",
  },

  // Docker Badges
  {
    id: "docker_25",
    title: "Container Novice",
    description: "Complete 25% of Docker course",
    icon: "🐳",
    course: "docker",
    threshold: 25,
    color: "#60A5FA",
    rarity: "common",
  },
  {
    id: "docker_50",
    title: "Image Builder",
    description: "Complete 50% of Docker course",
    icon: "📦",
    course: "docker",
    threshold: 50,
    color: "#60A5FA",
    rarity: "rare",
  },
  {
    id: "docker_75",
    title: "Container Captain",
    description: "Complete 75% of Docker course",
    icon: "⚓",
    course: "docker",
    threshold: 75,
    color: "#60A5FA",
    rarity: "epic",
  },
  {
    id: "docker_100",
    title: "Docker Master",
    description: "Complete the full Docker course",
    icon: "🏆",
    course: "docker",
    threshold: 100,
    color: "#60A5FA",
    rarity: "legendary",
  },

  // Kubernetes Badges
  {
    id: "kubernetes_25",
    title: "K8s Rookie",
    description: "Complete 25% of Kubernetes course",
    icon: "☸️",
    course: "kubernetes",
    threshold: 25,
    color: "#A855F7",
    rarity: "common",
  },
  {
    id: "kubernetes_50",
    title: "Pod Pilot",
    description: "Complete 50% of Kubernetes course",
    icon: "🚁",
    course: "kubernetes",
    threshold: 50,
    color: "#A855F7",
    rarity: "rare",
  },
  {
    id: "kubernetes_75",
    title: "Cluster Commander",
    description: "Complete 75% of Kubernetes course",
    icon: "🎖️",
    course: "kubernetes",
    threshold: 75,
    color: "#A855F7",
    rarity: "epic",
  },
  {
    id: "kubernetes_100",
    title: "K8s Legend",
    description: "Complete the full Kubernetes course",
    icon: "👑",
    course: "kubernetes",
    threshold: 100,
    color: "#A855F7",
    rarity: "legendary",
  },

  // Python Badges
  {
    id: "python_25",
    title: "Python Hatchling",
    description: "Complete 25% of Python course",
    icon: "🐍",
    course: "python",
    threshold: 25,
    color: "#FBBF24",
    rarity: "common",
  },
  {
    id: "python_50",
    title: "Code Slinger",
    description: "Complete 50% of Python course",
    icon: "💻",
    course: "python",
    threshold: 50,
    color: "#FBBF24",
    rarity: "rare",
  },
  {
    id: "python_75",
    title: "Python Pro",
    description: "Complete 75% of Python course",
    icon: "🐍",
    course: "python",
    threshold: 75,
    color: "#FBBF24",
    rarity: "epic",
  },
  {
    id: "python_100",
    title: "Pythonista",
    description: "Complete the full Python course",
    icon: "🌟",
    course: "python",
    threshold: 100,
    color: "#FBBF24",
    rarity: "legendary",
  },

  // JavaScript Badges
  {
    id: "javascript_25",
    title: "JS Newbie",
    description: "Complete 25% of JavaScript course",
    icon: "📜",
    course: "javascript",
    threshold: 25,
    color: "#FBBF24",
    rarity: "common",
  },
  {
    id: "javascript_50",
    title: "Script Runner",
    description: "Complete 50% of JavaScript course",
    icon: "⚡",
    course: "javascript",
    threshold: 50,
    color: "#FBBF24",
    rarity: "rare",
  },
  {
    id: "javascript_75",
    title: "DOM Manipulator",
    description: "Complete 75% of JavaScript course",
    icon: "🎨",
    course: "javascript",
    threshold: 75,
    color: "#FBBF24",
    rarity: "epic",
  },
  {
    id: "javascript_100",
    title: "JS Ninja",
    description: "Complete the full JavaScript course",
    icon: "🥷",
    course: "javascript",
    threshold: 100,
    color: "#FBBF24",
    rarity: "legendary",
  },

  // React Badges
  {
    id: "react_25",
    title: "React Rookie",
    description: "Complete 25% of React course",
    icon: "⚛️",
    course: "react",
    threshold: 25,
    color: "#38BDF8",
    rarity: "common",
  },
  {
    id: "react_50",
    title: "Component Crafter",
    description: "Complete 50% of React course",
    icon: "🧩",
    course: "react",
    threshold: 50,
    color: "#38BDF8",
    rarity: "rare",
  },
  {
    id: "react_75",
    title: "Hook Master",
    description: "Complete 75% of React course",
    icon: "🪝",
    course: "react",
    threshold: 75,
    color: "#38BDF8",
    rarity: "epic",
  },
  {
    id: "react_100",
    title: "React Rockstar",
    description: "Complete the full React course",
    icon: "🎸",
    course: "react",
    threshold: 100,
    color: "#38BDF8",
    rarity: "legendary",
  },

  // TypeScript Badges
  {
    id: "typescript_25",
    title: "Type Beginner",
    description: "Complete 25% of TypeScript course",
    icon: "📘",
    course: "typescript",
    threshold: 25,
    color: "#3B82F6",
    rarity: "common",
  },
  {
    id: "typescript_50",
    title: "Type Checker",
    description: "Complete 50% of TypeScript course",
    icon: "✅",
    course: "typescript",
    threshold: 50,
    color: "#3B82F6",
    rarity: "rare",
  },
  {
    id: "typescript_75",
    title: "Interface Architect",
    description: "Complete 75% of TypeScript course",
    icon: "🏗️",
    course: "typescript",
    threshold: 75,
    color: "#3B82F6",
    rarity: "epic",
  },
  {
    id: "typescript_100",
    title: "Type Wizard",
    description: "Complete the full TypeScript course",
    icon: "🧙",
    course: "typescript",
    threshold: 100,
    color: "#3B82F6",
    rarity: "legendary",
  },

  // Git Badges
  {
    id: "git_25",
    title: "Git Init",
    description: "Complete 25% of Git course",
    icon: "🌲",
    course: "git",
    threshold: 25,
    color: "#F87171",
    rarity: "common",
  },
  {
    id: "git_50",
    title: "Branch Manager",
    description: "Complete 50% of Git course",
    icon: "🌿",
    course: "git",
    threshold: 50,
    color: "#F87171",
    rarity: "rare",
  },
  {
    id: "git_75",
    title: "Merge Master",
    description: "Complete 75% of Git course",
    icon: "🔀",
    course: "git",
    threshold: 75,
    color: "#F87171",
    rarity: "epic",
  },
  {
    id: "git_100",
    title: "Git Guru",
    description: "Complete the full Git course",
    icon: "🧘",
    course: "git",
    threshold: 100,
    color: "#F87171",
    rarity: "legendary",
  },

  // SQL Badges
  {
    id: "sql_25",
    title: "Query Rookie",
    description: "Complete 25% of SQL course",
    icon: "🗃️",
    course: "sql",
    threshold: 25,
    color: "#818CF8",
    rarity: "common",
  },
  {
    id: "sql_50",
    title: "Data Seeker",
    description: "Complete 50% of SQL course",
    icon: "🔍",
    course: "sql",
    threshold: 50,
    color: "#818CF8",
    rarity: "rare",
  },
  {
    id: "sql_75",
    title: "Table Titan",
    description: "Complete 75% of SQL course",
    icon: "📊",
    course: "sql",
    threshold: 75,
    color: "#818CF8",
    rarity: "epic",
  },
  {
    id: "sql_100",
    title: "Database Guru",
    description: "Complete the full SQL course",
    icon: "🎓",
    course: "sql",
    threshold: 100,
    color: "#818CF8",
    rarity: "legendary",
  },

  // Linux Badges
  {
    id: "linux_25",
    title: "Linux Explorer",
    description: "Complete 25% of Linux course",
    icon: "🐧",
    course: "linux",
    threshold: 25,
    color: "#FB923C",
    rarity: "common",
  },
  {
    id: "linux_50",
    title: "Terminal Hero",
    description: "Complete 50% of Linux course",
    icon: "💻",
    course: "linux",
    threshold: 50,
    color: "#FB923C",
    rarity: "rare",
  },
  {
    id: "linux_75",
    title: "Shell Commander",
    description: "Complete 75% of Linux course",
    icon: "⚡",
    course: "linux",
    threshold: 75,
    color: "#FB923C",
    rarity: "epic",
  },
  {
    id: "linux_100",
    title: "Linux Legend",
    description: "Complete the full Linux course",
    icon: "🏅",
    course: "linux",
    threshold: 100,
    color: "#FB923C",
    rarity: "legendary",
  },

  // Special Cross-Course Badges
  {
    id: "triple_start",
    title: "Triple Threat",
    description: "Start all 3 original courses",
    icon: "🌟",
    color: "#22D3EE",
    rarity: "rare",
  },
  {
    id: "all_complete",
    title: "CloudAcademy Graduate",
    description: "Complete all 3 original courses",
    icon: "🎓",
    color: "#F59E0B",
    rarity: "legendary",
  },
  {
    id: "polyglot",
    title: "Polyglot",
    description: "Start 5 different courses",
    icon: "📚",
    color: "#EC4899",
    rarity: "epic",
  },
  {
    id: "master_student",
    title: "Master Student",
    description: "Complete 5 different courses",
    icon: "🎖️",
    color: "#8B5CF6",
    rarity: "legendary",
  },
  {
    id: "completionist",
    title: "True Completionist",
    description: "Complete all 12 courses",
    icon: "👑",
    color: "#FFD700",
    rarity: "legendary",
  },
];

// Check which badges a user has earned based on progress
export function computeEarnedBadgeIds(progressData: Record<string, { progress: number }>): string[] {
  const earned: string[] = [];

  for (const badge of ALL_BADGES) {
    if (badge.course && badge.threshold !== undefined) {
      const courseProgress = progressData[badge.course]?.progress || 0;
      if (courseProgress >= badge.threshold) {
        earned.push(badge.id);
      }
    }
  }

  // Special: Triple Threat — all 3 original courses started
  const allStarted = ["aws", "devops", "ai"].every(
    (c) => (progressData[c]?.progress || 0) > 0
  );
  if (allStarted) earned.push("triple_start");

  // Special: Graduate — all 3 original courses completed
  const allComplete = ["aws", "devops", "ai"].every(
    (c) => (progressData[c]?.progress || 0) >= 100
  );
  if (allComplete) earned.push("all_complete");

  // Special: Polyglot — start 5 different courses
  const allCourses = ["aws", "devops", "ai", "docker", "kubernetes", "python", "javascript", "react", "typescript", "git", "sql", "linux"];
  const startedCount = allCourses.filter((c) => (progressData[c]?.progress || 0) > 0).length;
  if (startedCount >= 5) earned.push("polyglot");

  // Special: Master Student — complete 5 different courses
  const completedCount = allCourses.filter((c) => (progressData[c]?.progress || 0) >= 100).length;
  if (completedCount >= 5) earned.push("master_student");

  // Special: Completionist — complete all courses
  if (completedCount === allCourses.length) earned.push("completionist");

  return earned;
}

// Save earned badges to Firestore
export async function syncBadgesToFirestore(
  uid: string,
  earnedIds: string[]
): Promise<string[]> {
  try {
    const ref = doc(db, "users", uid, "badges", "earned");
    const snap = await getDoc(ref);

    // Get existing badges (handle both old format: {ids: [...]} and new format: {badges: {...}})
    let existingIds: string[] = [];
    let existingBadges: Record<string, { earnedAt: number }> = {};

    if (snap.exists()) {
      const data = snap.data();
      // New format with timestamps
      if (data.badges && typeof data.badges === "object") {
        existingBadges = data.badges;
        existingIds = Object.keys(existingBadges);
      }
      // Old format with just ids array
      else if (data.ids && Array.isArray(data.ids)) {
        existingIds = data.ids;
        // Convert to new format for timestamp tracking
        const now = Date.now();
        data.ids.forEach((id: string, index: number) => {
          existingBadges[id] = { earnedAt: now - (data.ids.length - index) * 1000 };
        });
      }
    }

    // Merge old + new (preserve existing, add new)
    const mergedIds = Array.from(new Set([...existingIds, ...earnedIds]));
    const now = Date.now();

    // Add timestamps for any new badges
    let hasNew = false;
    for (const id of earnedIds) {
      if (!existingBadges[id]) {
        existingBadges[id] = { earnedAt: now };
        hasNew = true;
      }
    }

    // Save to Firestore (only if there are new badges or we're migrating)
    if (hasNew || (snap.exists() && snap.data()?.ids && !snap.data()?.badges)) {
      await setDoc(ref, { badges: existingBadges }, { merge: true });
    }

    // Return sorted by earned time (most recent first) for "Recent Badges"
    const sortedIds = Object.entries(existingBadges)
      .sort((a, b) => (b[1].earnedAt || 0) - (a[1].earnedAt || 0))
      .map(([id]) => id);

    console.log("syncBadgesToFirestore - returning:", sortedIds);
    return sortedIds;
  } catch (error) {
    console.error("Error syncing badges:", error);
    // Return earned IDs without sorting if there's an error
    return earnedIds;
  }
}

export const RARITY_COLORS: Record<string, string> = {
  common: "#9CA3AF",
  rare: "#3B82F6",
  epic: "#A855F7",
  legendary: "#F59E0B",
};