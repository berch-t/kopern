"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  onSnapshot,
  query,
  orderBy,
  type CollectionReference,
  type DocumentReference,
  type DocumentData,
  type Query,
  getDocs,
  getDoc,
} from "firebase/firestore";

export function useCollection<T = DocumentData>(
  ref: CollectionReference<T> | null,
  orderField?: string
) {
  const [data, setData] = useState<(T & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Stabilize by path string to avoid infinite re-subscribe
  const refPath = ref?.path ?? null;

  useEffect(() => {
    if (!refPath || !ref) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = orderField
      ? query(ref, orderBy(orderField, "desc"))
      : ref;

    const unsubscribe = onSnapshot(
      q as Query<T>,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setData(items);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refPath, orderField]);

  return { data, loading, error };
}

export function useDocument<T = DocumentData>(ref: DocumentReference | null) {
  const [data, setData] = useState<(T & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Stabilize by path string
  const refPath = ref?.path ?? null;

  useEffect(() => {
    if (!refPath || !ref) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        if (snapshot.exists()) {
          setData({ id: snapshot.id, ...snapshot.data() } as T & { id: string });
        } else {
          setData(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refPath]);

  return { data, loading, error };
}

export async function fetchCollection<T = DocumentData>(
  ref: CollectionReference<T>
): Promise<(T & { id: string })[]> {
  const snapshot = await getDocs(ref);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function fetchDocument<T = DocumentData>(
  ref: DocumentReference
): Promise<(T & { id: string }) | null> {
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as T & { id: string };
}
