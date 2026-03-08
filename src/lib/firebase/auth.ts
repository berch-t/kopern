import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  GithubAuthProvider,
  linkWithCredential,
  fetchSignInMethodsForEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
  type AuthError,
} from "firebase/auth";
import { auth } from "./config";

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();
githubProvider.addScope("repo");

export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function signInWithGithub() {
  try {
    const result = await signInWithPopup(auth, githubProvider);
    const credential = GithubAuthProvider.credentialFromResult(result);
    return { result, githubAccessToken: credential?.accessToken ?? null };
  } catch (error) {
    const authError = error as AuthError;

    // Account exists with different credential — link them
    if (authError.code === "auth/account-exists-with-different-credential") {
      const pendingCred = GithubAuthProvider.credentialFromError(authError);
      const email = authError.customData?.email as string | undefined;

      if (!email || !pendingCred) throw error;

      // Check which provider the existing account uses
      const methods = await fetchSignInMethodsForEmail(auth, email);

      if (methods.includes("google.com")) {
        // Sign in with Google first, then link GitHub
        const googleResult = await signInWithPopup(auth, googleProvider);
        const linkResult = await linkWithCredential(googleResult.user, pendingCred);
        const credential = GithubAuthProvider.credentialFromResult(linkResult);
        return { result: linkResult, githubAccessToken: credential?.accessToken ?? null };
      }

      // If the existing provider is something else, re-throw
      throw error;
    }

    throw error;
  }
}

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signOut() {
  return firebaseSignOut(auth);
}

export function onAuthChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
