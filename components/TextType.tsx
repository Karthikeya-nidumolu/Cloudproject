"use client";

import { useEffect, useState } from "react";

interface TextTypeProps {
  text: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseDuration?: number;
  showCursor?: boolean;
  cursorCharacter?: string;
}

export default function TextType({
  text,
  typingSpeed = 75,
  deletingSpeed = 50,
  pauseDuration = 1500,
  showCursor = true,
  cursorCharacter = "_",
}: TextTypeProps) {
  const [displayText, setDisplayText] = useState("");
  const [index, setIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = text[index % text.length];

    let timeout: NodeJS.Timeout;

    if (!isDeleting) {
      timeout = setTimeout(() => {
        setDisplayText(current.substring(0, displayText.length + 1));
        if (displayText === current) {
          setTimeout(() => setIsDeleting(true), pauseDuration);
        }
      }, typingSpeed);
    } else {
      timeout = setTimeout(() => {
        setDisplayText(current.substring(0, displayText.length - 1));
        if (displayText === "") {
          setIsDeleting(false);
          setIndex((prev) => prev + 1);
        }
      }, deletingSpeed);
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting]);

  return (
    <span className="inline-block">
      {displayText}
      {showCursor && <span>{cursorCharacter}</span>}
    </span>
  );
}