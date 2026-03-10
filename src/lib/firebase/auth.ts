import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  GithubAuthProvider,
  linkWithPopup,
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

    // Account exists with different credential (e.g. same email on Google account).
    // We can't open a second popup here — browsers block it (not a direct user click).
    // Throw a specific error so the login page can show a helpful message.
    if (authError.code === "auth/account-exists-with-different-credential") {
      const customError = new Error("github_needs_google_first") as Error & { code: string };
      customError.code = "auth/account-exists-with-different-credential";
      throw customError;
    }

    throw error;
  }
}

/**
 * Link GitHub to an existing signed-in user (e.g. from Settings page).
 * Returns the GitHub access token on success.
 */
export async function linkGithubToCurrentUser(): Promise<{ githubAccessToken: string | null }> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("No authenticated user");

  // Check if GitHub is already linked
  const hasGithub = currentUser.providerData.some((p) => p.providerId === "github.com");
  if (hasGithub) {
    // Re-authenticate with GitHub popup to get a fresh token
    // We can't linkWithPopup if already linked, so unlink + relink
    // Simpler: just sign in separately to get the token
    throw new Error("github_already_linked");
  }

  const result = await linkWithPopup(currentUser, githubProvider);
  const credential = GithubAuthProvider.credentialFromResult(result);
  return { githubAccessToken: credential?.accessToken ?? null };
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
