export async function POST(request: Request) {
  const { email, password } = await request.json();
  const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCeAjUe-Fun3iaebNzAPlqMF0nJFXHv03M";

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return Response.json({ error: data.error?.message || "Registration failed" }, { status: 400 });
    }

    return Response.json({
      uid: data.localId,
      email: data.email,
      token: data.idToken,
      refreshToken: data.refreshToken,
    });
  } catch (error: any) {
    return Response.json({ error: error.message || "Network error" }, { status: 500 });
  }
}
