"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { BackgroundLines } from "@/components/ui/background-lines";
import BorderGlow from "@/components/BorderGlow";
import RotatingText from "@/components/RotatingText";
import LogoLoop from "@/components/LogoLoop";

import {
  SiReact,
  SiNextdotjs,
  SiTypescript,
  SiTailwindcss,
} from "react-icons/si";

import { loginUser, resetPassword } from "@/lib/auth";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const techLogos = [
    { node: <SiReact className="text-white text-4xl" />, title: "React", href: "#" },
    { node: <SiNextdotjs className="text-white text-4xl" />, title: "Next.js", href: "#" },
    { node: <SiTypescript className="text-white text-4xl" />, title: "TypeScript", href: "#" },
    { node: <SiTailwindcss className="text-white text-4xl" />, title: "Tailwind CSS", href: "#" },
  ];

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      await loginUser(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Enter your email first");
      return;
    }

    try {
      await resetPassword(email);
      setError("");
      alert("Password reset email sent!");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#05010a] text-white overflow-x-hidden">

      {/* BACKGROUND + MAIN */}
      <BackgroundLines className="flex flex-col items-center w-full min-h-screen px-4 bg-[#05010a]">

        {/* TITLE */}
        <div className="flex items-center gap-2 text-3xl sm:text-4xl md:text-5xl font-bold text-white text-center mt-10">
          <span>Cloud</span>
          <RotatingText
            texts={['Learning', 'Computing', 'Engineering', 'Security', 'Systems']}
            mainClassName="px-2 md:px-3 bg-cyan-300 text-black rounded-lg"
            rotationInterval={2000}
          />
        </div>

        {/* LOGIN */}
        <div className="mt-10">
          <BorderGlow borderRadius={28}>
            <div className="p-6 sm:p-8 w-full max-w-sm sm:max-w-md">

              <h2 className="text-white text-xl sm:text-2xl font-semibold mb-4 text-center">
                Login
              </h2>

              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                  {error}
                </div>
              )}

              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mb-4 px-4 py-3 rounded-lg bg-transparent border border-white/10 text-white placeholder-gray-400 focus:outline-none"
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mb-3 px-4 py-3 rounded-lg bg-transparent border border-white/10 text-white placeholder-gray-400 focus:outline-none"
              />

              <div className="text-right mb-4">
                <span
                  onClick={handleForgotPassword}
                  className="text-sm text-gray-400 hover:text-white cursor-pointer"
                >
                  Forgot Password?
                </span>
              </div>

              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-white text-black py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Logging in..." : "Login"}
              </button>

              <p className="text-center text-gray-400 mt-6 text-sm">
                Don't have an account?{" "}
                <span
                  onClick={() => router.push("/register")}
                  className="text-white cursor-pointer hover:underline"
                >
                  Register
                </span>
              </p>

            </div>
          </BorderGlow>
        </div>

      </BackgroundLines>

      {/* LOGO LOOP */}
      <div className="absolute bottom-0 w-full h-[100px] sm:h-[120px] flex items-center overflow-hidden z-10">
        <LogoLoop
          logos={techLogos}
          speed={80}
          direction="left"
          logoHeight={40}
          gap={50}
        />
      </div>

    </div>
  );
}
