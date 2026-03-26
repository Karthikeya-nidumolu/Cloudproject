"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { BackgroundLines } from "@/components/ui/background-lines";
import RotatingText from "@/components/RotatingText";

import { registerUser } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ Validation
  const isNameValid = name.trim().length >= 3;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordValid = password.length >= 6;

  const passwordStrength =
    password.length > 10
      ? "strong"
      : password.length > 7
      ? "medium"
      : password.length > 0
      ? "weak"
      : "";

  const isFormValid = isNameValid && isEmailValid && isPasswordValid;

  const handleRegister = async () => {
    if (!isFormValid) return;

    try {
      setLoading(true);
      setError("");

      const user = await registerUser(email, password);

      await setDoc(doc(db, "users", user.uid), {
        name,
        email,
        createdAt: new Date(),
      });

      router.push("/onboarding");
    } catch (err: any) {
      console.log(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#05010a] relative overflow-hidden">

      {/* BACKGROUND */}
      <BackgroundLines className="flex items-center justify-center w-full h-full px-4 bg-[#05010a]">

        <div className="flex flex-col items-center gap-6 w-full">

          {/* TITLE */}
          <div className="flex items-center gap-2 text-3xl sm:text-4xl font-bold text-white text-center">
            <span>Cloud</span>
            <RotatingText
              texts={["Learning", "Computing", "Engineering"]}
              mainClassName="px-2 bg-cyan-300 text-black rounded-lg"
              rotationInterval={2000}
            />
          </div>

          {/* CARD */}
          <div className="w-full max-w-md sm:max-w-lg md:max-w-xl p-6 sm:p-8 bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl">

            <h1 className="text-xl sm:text-2xl font-bold mb-6 text-center text-white">
              Create Account
            </h1>

            {/* NAME */}
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mb-2 px-4 py-3 rounded-lg bg-black/30 border border-white/20 text-white placeholder-gray-400 focus:outline-none"
            />
            {!isNameValid && name && (
              <p className="text-red-400 text-sm mb-2">
                Name must be at least 3 characters
              </p>
            )}

            {/* EMAIL */}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mb-2 px-4 py-3 rounded-lg bg-black/30 border border-white/20 text-white placeholder-gray-400 focus:outline-none"
            />
            {!isEmailValid && email && (
              <p className="text-red-400 text-sm mb-2">
                Enter a valid email
              </p>
            )}

            {/* PASSWORD */}
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mb-2 px-4 py-3 rounded-lg bg-black/30 border border-white/20 text-white placeholder-gray-400 focus:outline-none"
            />

            {/* PASSWORD STRENGTH */}
            {password && (
              <p
                className={`text-sm mb-2 ${
                  passwordStrength === "strong"
                    ? "text-green-400"
                    : passwordStrength === "medium"
                    ? "text-yellow-400"
                    : "text-red-400"
                }`}
              >
                Password strength: {passwordStrength}
              </p>
            )}

            {!isPasswordValid && password && (
              <p className="text-red-400 text-sm mb-2">
                Password must be at least 6 characters
              </p>
            )}

            {/* ERROR */}
            {error && (
              <p className="text-red-500 text-sm mb-3">{error}</p>
            )}

            {/* BUTTON */}
            <button
              onClick={handleRegister}
              disabled={!isFormValid || loading}
              className={`w-full py-3 rounded-lg font-semibold transition ${
                isFormValid
                  ? "bg-white text-black hover:opacity-90"
                  : "bg-gray-700 text-gray-400"
              }`}
            >
              {loading ? "Creating account..." : "Register"}
            </button>

            {/* NAV */}
            <p
              onClick={() => router.push("/")}
              className="text-center text-gray-400 mt-4 cursor-pointer hover:text-white"
            >
              Already have an account? Login
            </p>

          </div>

        </div>

      </BackgroundLines>

    </div>
  );
}