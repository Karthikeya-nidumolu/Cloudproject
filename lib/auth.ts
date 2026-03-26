"use client";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";

import { auth } from "./firebase";

// ✅ LOGIN
export const loginUser = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

// ✅ REGISTER
export const registerUser = async (email: string, password: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

// ✅ LOGOUT
export const logoutUser = async () => {
  await signOut(auth);
};

// ✅ FORGOT PASSWORD
export const resetPassword = async (email: string) => {
  return await sendPasswordResetEmail(auth, email);
};