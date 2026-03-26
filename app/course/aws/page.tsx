"use client";

import { useEffect, useRef, useState } from "react";
import { updateProgress } from "@/lib/progress";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: any;
  }
}

export default function CoursePage() {
  const playerRef = useRef<any>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Load YouTube API
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => {
      playerRef.current = new window.YT.Player("player", {
        videoId: "3hLmDS179YE",
        events: {
          onStateChange: onPlayerStateChange,
        },
      });
    };

    let interval: any;

    const onPlayerStateChange = (event: any) => {
      if (event.data === window.YT.PlayerState.PLAYING) {
        interval = setInterval(() => {
          const current = playerRef.current.getCurrentTime();
          const duration = playerRef.current.getDuration();

          if (!duration) return;

          const percent = Math.floor((current / duration) * 100);

          setProgress(percent);
          updateProgress("aws", percent);
        }, 2000);
      } else {
        clearInterval(interval);
      }
    };

    return () => {};
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-8">

      <h1 className="text-3xl mb-6 font-bold">AWS Course 🚀</h1>

      {/* 🎥 REAL VIDEO PLAYER */}
      <div id="player" className="w-full h-[400px] mb-6"></div>

      {/* 📊 PROGRESS */}
      <div className="w-full bg-gray-700 h-3 rounded">
        <div
          className="bg-green-400 h-3 rounded transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="mt-2">{progress}% completed</p>

      {/* 📄 DOCS */}
      <div className="mt-8">
        <h2 className="text-xl mb-2">Resources</h2>

        <ul className="space-y-2">
          <li>
            <a href="https://aws.amazon.com/getting-started/" target="_blank">
              AWS Getting Started
            </a>
          </li>

          <li>
            <a href="https://docs.aws.amazon.com/" target="_blank">
              AWS Docs
            </a>
          </li>
        </ul>
      </div>

    </div>
  );
}