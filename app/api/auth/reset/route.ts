export async function POST(request: Request) {
  const { email } = await request.json();
  const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestType: "PASSWORD_RESET", email }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        { error: data.error?.message || "Password reset failed" },
        { status: 400 }
      );
    }

    return Response.json({ success: true, email: data.email });
  } catch (error: any) {
    return Response.json(
      { error: error.message || "Network error" },
      { status: 500 }
    );
  }
}
