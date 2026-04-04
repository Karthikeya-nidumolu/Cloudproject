"use client";

// Use local API routes to bypass CORS
export const loginUser = async (email: string, password: string) => {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.error;
    if (errorMsg === "EMAIL_NOT_FOUND") throw new Error("Account not found. Please register.");
    if (errorMsg === "INVALID_PASSWORD" || errorMsg === "INVALID_LOGIN_CREDENTIALS") {
      throw new Error("Invalid email or password.");
    }
    throw new Error(errorMsg || "Login failed");
  }

  localStorage.setItem("auth_user", JSON.stringify({
    uid: data.uid,
    email: data.email,
    token: data.token,
    refreshToken: data.refreshToken,
  }));

  return { uid: data.uid, email: data.email };
};

export const registerUser = async (email: string, password: string) => {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.error;
    if (errorMsg === "EMAIL_EXISTS") throw new Error("Account already exists.");
    throw new Error(errorMsg || "Registration failed");
  }

  localStorage.setItem("auth_user", JSON.stringify({
    uid: data.uid,
    email: data.email,
    token: data.token,
    refreshToken: data.refreshToken,
  }));

  return { uid: data.uid, email: data.email };
};

export const logoutUser = () => {
  localStorage.removeItem("auth_user");
};

export const resetPassword = async (email: string) => {
  // For now just alert - can add API route if needed
  throw new Error("Password reset not implemented yet");
};

export const getCurrentUser = () => {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("auth_user");
  return stored ? JSON.parse(stored) : null;
};
