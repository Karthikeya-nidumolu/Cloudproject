export async function askGemini(prompt: string): Promise<string> {
  console.log("Calling Gemini API with prompt:", prompt.substring(0, 50) + "...");

  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  console.log("API response status:", res.status);

  if (!res.ok) {
    const errorText = await res.text();
    console.error("API error response:", errorText);
    throw new Error(errorText || "Failed to get response");
  }

  const data = await res.json();
  console.log("API response data:", data);
  return data.text ?? "No response";
}