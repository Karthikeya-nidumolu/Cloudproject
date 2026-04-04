"use client";

import { useEffect, useState } from "react";
import { Badge, RARITY_COLORS } from "@/lib/badges";

type Props = {
  badge: Badge | null;
  onDone: () => void;
};

export default function BadgeToast({ badge, onDone }: Props) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!badge) return;

    setVisible(true);
    setLeaving(false);

    const leaveTimer = setTimeout(() => {
      setLeaving(true);
    }, 3500);

    const doneTimer = setTimeout(() => {
      setVisible(false);
      onDone();
    }, 4200);

    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(doneTimer);
    };
  }, [badge]);

  if (!visible || !badge) return null;

  const rarityColor = RARITY_COLORS[badge.rarity];

  return (
    <div
      style={{
        position: "fixed",
        bottom: "2rem",
        right: "2rem",
        zIndex: 9999,
        transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        opacity: leaving ? 0 : 1,
        transform: leaving ? "translateY(20px) scale(0.95)" : "translateY(0) scale(1)",
        animation: !leaving ? "slideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)" : undefined,
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px) scale(0.9); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>

      <div
        style={{
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(20px)",
          border: `1px solid ${rarityColor}55`,
          borderRadius: "16px",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          minWidth: "300px",
          boxShadow: `0 0 30px ${rarityColor}33, 0 8px 32px rgba(0,0,0,0.5)`,
        }}
      >
        {/* Icon with pulse ring */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: `2px solid ${rarityColor}`,
              animation: "pulse-ring 1.2s ease-out infinite",
            }}
          />
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: `${rarityColor}22`,
              border: `2px solid ${rarityColor}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
            }}
          >
            {badge.icon}
          </div>
        </div>

        {/* Text */}
        <div>
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "2px",
              textTransform: "uppercase",
              color: rarityColor,
              marginBottom: "2px",
            }}
          >
            🏆 Badge Unlocked · {badge.rarity}
          </div>
          <div
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: "#fff",
              marginBottom: "2px",
            }}
          >
            {badge.title}
          </div>
          <div style={{ fontSize: "12px", color: "#9CA3AF" }}>
            {badge.description}
          </div>
        </div>
      </div>
    </div>
  );
}