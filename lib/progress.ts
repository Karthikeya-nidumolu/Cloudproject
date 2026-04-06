import { doc, setDoc } from "firebase/firestore";
import { db, auth, isFirebaseReady } from "./firebase";
import { getCurrentUser } from "./auth";

export const updateProgress = async (course: string, progress: number) => {
  // Get user from localStorage (always available) instead of auth.currentUser (may be null)
  const localUser = getCurrentUser();
  const uid = auth?.currentUser?.uid || localUser?.uid;

  if (!uid) return;

  // Cache to localStorage for instant access on page reload
  if (typeof window !== "undefined") {
    localStorage.setItem(`course-progress-${course}`, String(progress));
  }

  // Skip Firestore if Firebase is not initialized
  if (!isFirebaseReady()) return;

  try {
    const ref = doc(db, "users", uid, "progress", course);
    await setDoc(ref, { progress }, { merge: true });
  } catch (e: any) {
    // Silently ignore offline/permission errors
    if (e?.code === "unavailable" || e?.message?.includes("offline")) {
      console.log("Progress save skipped - offline mode");
    } else {
      console.warn("Progress save failed:", e?.message);
    }
  }
};