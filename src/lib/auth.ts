'use client';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from './firebase';

const provider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, provider);
export const signOut = () => fbSignOut(auth);
export const onAuth = (cb: (user: User | null) => void) =>
  onAuthStateChanged(auth, cb);