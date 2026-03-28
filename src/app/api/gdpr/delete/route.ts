import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { checkRateLimit, gdprRateLimit } from "@/lib/security/rate-limit";

/**
 * DELETE /api/gdpr/delete — GDPR Art. 17 Right to Erasure
 * Permanently deletes all user data from Firestore and Firebase Auth.
 * Auth: Firebase ID token in Authorization header.
 */
export async function DELETE(request: Request) {
  try {
    // Verify auth
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const decoded = await adminAuth.verifyIdToken(token);
    const userId = decoded.uid;

    // Rate limiting
    const rl = await checkRateLimit(gdprRateLimit, userId);
    if (rl) return rl;

    // Delete all subcollections recursively
    const batch = adminDb.batch();

    // Helper to delete a collection
    async function deleteCollection(path: string) {
      const snap = await adminDb.collection(path).listDocuments();
      for (const docRef of snap) {
        // Delete known subcollections first
        const subcollections = await docRef.listCollections();
        for (const sub of subcollections) {
          const subDocs = await sub.listDocuments();
          for (const subDoc of subDocs) {
            // Go one more level deep for nested subcollections
            const subSubCollections = await subDoc.listCollections();
            for (const subSub of subSubCollections) {
              const subSubDocs = await subSub.listDocuments();
              for (const ssd of subSubDocs) {
                batch.delete(ssd);
              }
            }
            batch.delete(subDoc);
          }
        }
        batch.delete(docRef);
      }
    }

    // Delete all user subcollections
    await deleteCollection(`users/${userId}/agents`);
    await deleteCollection(`users/${userId}/agentTeams`);
    await deleteCollection(`users/${userId}/usage`);
    await deleteCollection(`users/${userId}/bugs`);
    await deleteCollection(`users/${userId}/serviceConnectors`);
    await deleteCollection(`users/${userId}/consent`);

    // Delete the user document itself
    batch.delete(adminDb.doc(`users/${userId}`));

    // Delete any slackTeams index entries for this user
    const slackTeamsSnap = await adminDb.collection("slackTeams")
      .where("userId", "==", userId)
      .get();
    slackTeamsSnap.docs.forEach((d) => batch.delete(d.ref));

    // Delete any apiKeys index entries for this user
    // (API keys are indexed by hash, so we need to scan — but this is rare)
    const apiKeysSnap = await adminDb.collection("apiKeys")
      .where("userId", "==", userId)
      .get();
    apiKeysSnap.docs.forEach((d) => batch.delete(d.ref));

    // Commit all deletes
    await batch.commit();

    // Delete the Firebase Auth account
    await adminAuth.deleteUser(userId);

    return NextResponse.json({ success: true, message: "Account and all data deleted" });
  } catch (err) {
    console.error("GDPR delete error:", err);
    return NextResponse.json({ error: "Deletion failed" }, { status: 500 });
  }
}
