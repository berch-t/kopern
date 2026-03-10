import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  GithubAuthProvider,
  linkWithCredential,
  linkWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
  type AuthError,
  type UserCredential,
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

      if (!pendingCred) throw error;

      // Try signing in with Google (primary OAuth provider), then link GitHub.
      // We don't use fetchSignInMethodsForEmail — it returns [] when
      // Email Enumeration Protection is enabled (Firebase default since 2023).
      try {
        const googleResult = await signInWithPopup(auth, googleProvider);
        const linkResult = await linkWithCredential(googleResult.user, pendingCred);
        const credential = GithubAuthProvider.credentialFromResult(linkResult);
        return { result: linkResult, githubAccessToken: credential?.accessToken ?? null };
      } catch (linkError) {
        const linkAuthError = linkError as AuthError;
        // If linking fails because provider is already linked, get token via linkWithPopup
        if (linkAuthError.code === "auth/provider-already-linked") {
          // GitHub is already linked — just sign in with Google and fetch GitHub token
          const googleResult = await signInWithPopup(auth, googleProvider);
          try {
            const popupResult = await linkWithPopup(googleResult.user, githubProvider);
            const credential = GithubAuthProvider.credentialFromResult(popupResult);
            return { result: popupResult, githubAccessToken: credential?.accessToken ?? null };
          } catch {
            // Already linked, sign-in succeeded via Google
            return { result: googleResult, githubAccessToken: null };
          }
        }
        // If Google sign-in failed (user cancelled, wrong account), re-throw original
        if (linkAuthError.code === "auth/popup-closed-by-user" ||
            linkAuthError.code === "auth/cancelled-popup-request") {
          throw error;
        }
        throw linkError;
      }
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
