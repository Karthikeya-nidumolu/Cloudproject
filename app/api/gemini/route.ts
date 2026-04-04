import { NextRequest, NextResponse } from "next/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Test endpoint
export async function GET() {
  return NextResponse.json({
    status: "API route working",
    keyConfigured: !!GROQ_API_KEY,
    keyPreview: GROQ_API_KEY ? GROQ_API_KEY.substring(0, 5) + "..." : null,
  });
}

export async function POST(req: NextRequest) {
  if (!GROQ_API_KEY) {
    return NextResponse.json(
      { error: "Groq API key not configured" },
      { status: 500 }
    );
  }

  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Groq API error status:", res.status);
      console.error("Groq API error response:", errorText);
      return NextResponse.json(
        { error: `Groq API error: ${res.status} - ${errorText}` },
        { status: 500 }
      );
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? "No response";

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Error calling Groq:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
