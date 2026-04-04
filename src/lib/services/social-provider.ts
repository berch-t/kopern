// Provider abstraction for social media operations
// V1: Bluesky (AT Protocol). Other platforms added as OAuth routes are built.

import type { SocialPlatform } from "@/lib/firebase/firestore";

// --- Types ---

export interface SocialPost {
  id: string;
  uri: string;
  text: string;
  createdAt: string;
  likeCount: number;
  repostCount: number;
  replyCount: number;
  author: { handle: string; displayName: string; avatar?: string };
}

export interface SocialProfile {
  handle: string;
  displayName: string;
  description: string;
  avatar?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

export interface PostMetrics {
  likeCount: number;
  repostCount: number;
  replyCount: number;
  quoteCount: number;
}

export interface CreatePostParams {
  text: string;
  images?: { data: string; alt: string }[];
  embed?: { url: string; title?: string; description?: string };
}

export interface BlueskyCredentials {
  handle: string;
  appPassword: string;
}

// --- Bluesky Session ---

interface BlueskySession {
  accessJwt: string;
  did: string;
  handle: string;
}

const BSKY_API = "https://bsky.social/xrpc";

async function createBlueskySession(creds: BlueskyCredentials): Promise<BlueskySession> {
  const res = await fetch(`${BSKY_API}/com.atproto.server.createSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: creds.handle, password: creds.appPassword }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Bluesky auth failed: ${err}`);
  }
  return res.json();
}

// --- Facets (auto-detect URLs and mentions) ---

interface Facet {
  index: { byteStart: number; byteEnd: number };
  features: { $type: string; uri?: string; did?: string }[];
}

function detectFacets(text: string): Facet[] {
  const facets: Facet[] = [];
  const encoder = new TextEncoder();

  // URLs
  const urlRegex = /https?:\/\/[^\s<>)"']+/g;
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    const before = encoder.encode(text.slice(0, match.index));
    const url = encoder.encode(match[0]);
    facets.push({
      index: { byteStart: before.length, byteEnd: before.length + url.length },
      features: [{ $type: "app.bsky.richtext.facet#link", uri: match[0] }],
    });
  }

  // Mentions (@handle.bsky.social)
  const mentionRegex = /@([a-zA-Z0-9.-]+\.[a-zA-Z]+)/g;
  while ((match = mentionRegex.exec(text)) !== null) {
    const before = encoder.encode(text.slice(0, match.index));
    const mention = encoder.encode(match[0]);
    facets.push({
      index: { byteStart: before.length, byteEnd: before.length + mention.length },
      features: [{ $type: "app.bsky.richtext.facet#mention", did: match[1] }],
    });
  }

  return facets;
}

// --- Bluesky Implementation ---

async function bskyCreatePost(session: BlueskySession, params: CreatePostParams): Promise<SocialPost> {
  const record: Record<string, unknown> = {
    $type: "app.bsky.feed.post",
    text: params.text.slice(0, 300), // Bluesky 300 char limit
    createdAt: new Date().toISOString(),
    facets: detectFacets(params.text),
  };

  // External embed (link card)
  if (params.embed?.url) {
    record.embed = {
      $type: "app.bsky.embed.external",
      external: {
        uri: params.embed.url,
        title: params.embed.title || params.embed.url,
        description: params.embed.description || "",
      },
    };
  }

  const res = await fetch(`${BSKY_API}/com.atproto.repo.createRecord`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.accessJwt}`,
    },
    body: JSON.stringify({
      repo: session.did,
      collection: "app.bsky.feed.post",
      record,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Bluesky post failed: ${err}`);
  }

  const data = await res.json();
  return {
    id: data.uri?.split("/").pop() || data.cid || "",
    uri: data.uri || "",
    text: params.text,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    repostCount: 0,
    replyCount: 0,
    author: { handle: session.handle, displayName: session.handle },
  };
}

async function bskyReadFeed(session: BlueskySession, limit: number): Promise<SocialPost[]> {
  const res = await fetch(
    `${BSKY_API}/app.bsky.feed.getAuthorFeed?actor=${session.did}&limit=${Math.min(limit, 50)}`,
    { headers: { Authorization: `Bearer ${session.accessJwt}` } }
  );
  if (!res.ok) throw new Error(`Bluesky feed failed: ${res.status}`);
  const data = await res.json();

  return (data.feed || []).map((item: Record<string, unknown>) => {
    const post = item.post as Record<string, unknown>;
    const record = post.record as Record<string, unknown>;
    const author = post.author as Record<string, unknown>;
    return {
      id: (post.uri as string)?.split("/").pop() || "",
      uri: (post.uri as string) || "",
      text: (record.text as string) || "",
      createdAt: (record.createdAt as string) || "",
      likeCount: (post.likeCount as number) || 0,
      repostCount: (post.repostCount as number) || 0,
      replyCount: (post.replyCount as number) || 0,
      author: {
        handle: (author.handle as string) || "",
        displayName: (author.displayName as string) || "",
        avatar: author.avatar as string | undefined,
      },
    };
  });
}

async function bskyGetMetrics(session: BlueskySession, postUri: string): Promise<PostMetrics> {
  const res = await fetch(
    `${BSKY_API}/app.bsky.feed.getPostThread?uri=${encodeURIComponent(postUri)}&depth=0`,
    { headers: { Authorization: `Bearer ${session.accessJwt}` } }
  );
  if (!res.ok) throw new Error(`Bluesky metrics failed: ${res.status}`);
  const data = await res.json();
  const post = data.thread?.post;
  return {
    likeCount: post?.likeCount || 0,
    repostCount: post?.repostCount || 0,
    replyCount: post?.replyCount || 0,
    quoteCount: post?.quoteCount || 0,
  };
}

async function bskySearchMentions(session: BlueskySession, query: string, limit: number): Promise<SocialPost[]> {
  const res = await fetch(
    `${BSKY_API}/app.bsky.feed.searchPosts?q=${encodeURIComponent(query)}&limit=${Math.min(limit, 25)}`,
    { headers: { Authorization: `Bearer ${session.accessJwt}` } }
  );
  if (!res.ok) throw new Error(`Bluesky search failed: ${res.status}`);
  const data = await res.json();

  return (data.posts || []).map((post: Record<string, unknown>) => {
    const record = post.record as Record<string, unknown>;
    const author = post.author as Record<string, unknown>;
    return {
      id: (post.uri as string)?.split("/").pop() || "",
      uri: (post.uri as string) || "",
      text: (record.text as string) || "",
      createdAt: (record.createdAt as string) || "",
      likeCount: (post.likeCount as number) || 0,
      repostCount: (post.repostCount as number) || 0,
      replyCount: (post.replyCount as number) || 0,
      author: {
        handle: (author.handle as string) || "",
        displayName: (author.displayName as string) || "",
        avatar: author.avatar as string | undefined,
      },
    };
  });
}

async function bskyReply(session: BlueskySession, postUri: string, text: string): Promise<SocialPost> {
  // Get parent post for reply ref
  const threadRes = await fetch(
    `${BSKY_API}/app.bsky.feed.getPostThread?uri=${encodeURIComponent(postUri)}&depth=0`,
    { headers: { Authorization: `Bearer ${session.accessJwt}` } }
  );
  if (!threadRes.ok) throw new Error(`Bluesky reply: parent not found`);
  const threadData = await threadRes.json();
  const parent = threadData.thread?.post;

  const record: Record<string, unknown> = {
    $type: "app.bsky.feed.post",
    text: text.slice(0, 300),
    createdAt: new Date().toISOString(),
    facets: detectFacets(text),
    reply: {
      root: { uri: parent?.uri, cid: parent?.cid },
      parent: { uri: parent?.uri, cid: parent?.cid },
    },
  };

  const res = await fetch(`${BSKY_API}/com.atproto.repo.createRecord`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.accessJwt}`,
    },
    body: JSON.stringify({
      repo: session.did,
      collection: "app.bsky.feed.post",
      record,
    }),
  });
  if (!res.ok) throw new Error(`Bluesky reply failed: ${await res.text()}`);
  const data = await res.json();

  return {
    id: data.uri?.split("/").pop() || "",
    uri: data.uri || "",
    text,
    createdAt: new Date().toISOString(),
    likeCount: 0, repostCount: 0, replyCount: 0,
    author: { handle: session.handle, displayName: session.handle },
  };
}

async function bskyDeletePost(session: BlueskySession, postUri: string): Promise<void> {
  const rkey = postUri.split("/").pop();
  const res = await fetch(`${BSKY_API}/com.atproto.repo.deleteRecord`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.accessJwt}`,
    },
    body: JSON.stringify({
      repo: session.did,
      collection: "app.bsky.feed.post",
      rkey,
    }),
  });
  if (!res.ok) throw new Error(`Bluesky delete failed: ${await res.text()}`);
}

async function bskyGetProfile(session: BlueskySession): Promise<SocialProfile> {
  const res = await fetch(
    `${BSKY_API}/app.bsky.actor.getProfile?actor=${session.did}`,
    { headers: { Authorization: `Bearer ${session.accessJwt}` } }
  );
  if (!res.ok) throw new Error(`Bluesky profile failed: ${res.status}`);
  const p = await res.json();
  return {
    handle: p.handle || "",
    displayName: p.displayName || "",
    description: p.description || "",
    avatar: p.avatar,
    followersCount: p.followersCount || 0,
    followingCount: p.followsCount || 0,
    postsCount: p.postsCount || 0,
  };
}

// --- Public API (multi-platform dispatcher) ---

export async function resolveSession(platform: SocialPlatform, credentialsJson: string): Promise<BlueskySession> {
  if (platform !== "bluesky") {
    throw new Error(`Platform ${platform} not yet supported. Only Bluesky is available.`);
  }
  const creds: BlueskyCredentials = JSON.parse(credentialsJson);
  return createBlueskySession(creds);
}

export async function createPost(platform: SocialPlatform, session: BlueskySession, params: CreatePostParams): Promise<SocialPost> {
  if (platform === "bluesky") return bskyCreatePost(session, params);
  throw new Error(`Platform ${platform} not supported`);
}

export async function readFeed(platform: SocialPlatform, session: BlueskySession, limit: number): Promise<SocialPost[]> {
  if (platform === "bluesky") return bskyReadFeed(session, limit);
  throw new Error(`Platform ${platform} not supported`);
}

export async function getMetrics(platform: SocialPlatform, session: BlueskySession, postId: string): Promise<PostMetrics> {
  if (platform === "bluesky") return bskyGetMetrics(session, postId);
  throw new Error(`Platform ${platform} not supported`);
}

export async function searchMentions(platform: SocialPlatform, session: BlueskySession, query: string, limit: number): Promise<SocialPost[]> {
  if (platform === "bluesky") return bskySearchMentions(session, query, limit);
  throw new Error(`Platform ${platform} not supported`);
}

export async function replyToPost(platform: SocialPlatform, session: BlueskySession, postId: string, text: string): Promise<SocialPost> {
  if (platform === "bluesky") return bskyReply(session, postId, text);
  throw new Error(`Platform ${platform} not supported`);
}

export async function deletePost(platform: SocialPlatform, session: BlueskySession, postId: string): Promise<void> {
  if (platform === "bluesky") return bskyDeletePost(session, postId);
  throw new Error(`Platform ${platform} not supported`);
}

export async function getProfile(platform: SocialPlatform, session: BlueskySession): Promise<SocialProfile> {
  if (platform === "bluesky") return bskyGetProfile(session);
  throw new Error(`Platform ${platform} not supported`);
}

export const DEFAULT_DAILY_LIMITS: Record<SocialPlatform, number> = {
  bluesky: 30,
  linkedin: 10,
  twitter: 17,
  facebook: 25,
  instagram: 10,
  tiktok: 5,
};
