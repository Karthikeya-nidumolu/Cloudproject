import { doc, setDoc } from "firebase/firestore";
import { db, auth } from "./firebase";

export const updateProgress = async (course: string, progress: number) => {
  const user = auth.currentUser;

  if (!user) return;

  // Cache to localStorage for instant access on page reload
  if (typeof window !== 'undefined') {
    localStorage.setItem(`course-progress-${course}`, String(progress));
  }

  const ref = doc(db, "users", user.uid, "progress", course);

  await setDoc(ref, { progress }, { merge: true });
};