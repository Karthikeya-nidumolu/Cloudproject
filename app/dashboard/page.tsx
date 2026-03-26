"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import FloatingLines from "@/components/FloatingLines";

import { auth } from "@/lib/firebase";
import { logoutUser } from "@/lib/auth";
import { onAuthStateChanged } from "firebase/auth";

import { db } from "@/lib/firebase";
import { doc, onSnapshot, collection } from "firebase/firestore";

export default function Dashboard() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [progressData, setProgressData] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // 🔐 AUTH
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        router.push("/");
      } else {
        setUser(firebaseUser);

        const userRef = doc(db, "users", firebaseUser.uid);

        const unsubDb = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          }
        });

        setLoading(false);

        return () => unsubDb();
      }
    });

    return () => unsubscribe();
  }, [router]);

  // 🔥 REAL-TIME PROGRESS
  useEffect(() => {
    if (!user) return;

    const ref = collection(db, "users", user.uid, "progress");

    const unsub = onSnapshot(ref, (snapshot) => {
      const data: any = {};

      snapshot.docs.forEach((doc) => {
        data[doc.id] = doc.data();
      });

      setProgressData(data);
    });

    return () => unsub();
  }, [user]);

  const handleLogout = async () => {
    await logoutUser();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden text-white">

      {/* BACKGROUND */}
      <div className="absolute inset-0 z-0">
        <FloatingLines />
      </div>

      <div className="absolute inset-0 z-10 bg-black/30" />

      <div className="relative z-20 flex h-full">

        {/* SIDEBAR */}
        <div className="w-64 bg-black/50 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col">
          <h1 className="text-xl font-bold mb-10">CloudAcademy</h1>

          <div className="mt-auto">
            <button
              onClick={handleLogout}
              className="w-full bg-red-500 py-2 rounded-lg"
            >
              Logout
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 p-8 overflow-y-auto">

          <h2 className="text-3xl font-bold mb-6">
            Welcome, {userData?.name || user?.email}
          </h2>

          <h3 className="text-xl mb-4">Your Courses</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {["aws", "devops", "ai"].map((course) => (
              <div
                key={course}
                onClick={() => router.push(`/course/${course}`)}
                className="bg-black/50 p-6 rounded-xl cursor-pointer hover:scale-105 transition"
              >
                <h3 className="text-lg mb-2">{course.toUpperCase()}</h3>

                <div className="w-full bg-gray-700 h-2 rounded">
                  <div
                    className="bg-cyan-400 h-2 rounded transition-all"
                    style={{
                      width: `${progressData[course]?.progress || 0}%`,
                    }}
                  />
                </div>

                <p className="text-sm mt-2">
                  {progressData[course]?.progress || 0}% completed
                </p>

              </div>
            ))}

          </div>

        </div>

      </div>

    </div>
  );
}