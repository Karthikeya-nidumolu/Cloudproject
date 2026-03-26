import { doc, setDoc } from "firebase/firestore";
import { db, auth } from "./firebase";

export const updateProgress = async (courseId: string, value: number) => {
  const user = auth.currentUser;
  if (!user) return;

  const ref = doc(db, "users", user.uid, "progress", courseId);

  await setDoc(
    ref,
    {
      progress: value,
      completed: value >= 100,
    },
    { merge: true }
  );
};