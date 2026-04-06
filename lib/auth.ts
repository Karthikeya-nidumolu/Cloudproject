"use client";

import { signInFirebaseSDK } from "./firebase";

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
    if (errorMsg === "EMAIL_NOT_FOUND")
      throw new Error("Account not found. Please register.");
    if (
      errorMsg === "INVALID_PASSWORD" ||
      errorMsg === "INVALID_LOGIN_CREDENTIALS"
    ) {
      throw new Error("Invalid email or password.");
    }
    throw new Error(errorMsg || "Login failed");
  }

  localStorage.setItem(
    "auth_user",
    JSON.stringify({
      uid: data.uid,
      email: data.email,
      token: data.token,
      refreshToken: data.refreshToken,
    })
  );

  // Also sign into Firebase client SDK so auth.currentUser works
  // This enables real-time Firestore listeners and security rules
  await signInFirebaseSDK(email, password);

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
    if (errorMsg === "EMAIL_EXISTS")
      throw new Error("Account already exists.");
    throw new Error(errorMsg || "Registration failed");
  }

  localStorage.setItem(
    "auth_user",
    JSON.stringify({
      uid: data.uid,
      email: data.email,
      token: data.token,
      refreshToken: data.refreshToken,
    })
  );

  // Also sign into Firebase client SDK
  await signInFirebaseSDK(email, password);

  return { uid: data.uid, email: data.email };
};

export const logoutUser = () => {
  localStorage.removeItem("auth_user");
  // Sign out Firebase SDK too
  import("./firebase").then(({ auth }) => {
    if (auth) {
      import("firebase/auth").then(({ signOut }) => {
        signOut(auth).catch(() => {});
      });
    }
  });
};

export const resetPassword = async (email: string) => {
  const response = await fetch("/api/auth/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.error;
    if (errorMsg === "EMAIL_NOT_FOUND")
      throw new Error("No account found with this email.");
    throw new Error(errorMsg || "Password reset failed");
  }

  return data;
};

export const getCurrentUser = () => {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("auth_user");
  return stored ? JSON.parse(stored) : null;
};
