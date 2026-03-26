"use client";

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCeAjUe-Fun3iaebNzAPlqMF0nJFXHv03M",
  authDomain: "e-learning-625e1.firebaseapp.com",
  projectId: "e-learning-625e1",
  appId: "1:900604154673:web:4d59984f1d7d45262a9610",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);