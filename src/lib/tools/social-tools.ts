// Social Media tools — create posts, read feeds, track metrics, manage engagement
// Pattern: getXTools / isXTool / executeXTool (same as service-tools, bug-tools, memory-tools)

import type { ToolDefinition } from "@/lib/llm/client";
import { adminDb } from "@/lib/firebase/admin";
import { decrypt } from "@/lib/crypto/encrypt";
import {
  resolveSession,
  createPost,
  readFeed,
  getMetrics,
  searchMentions,
  replyToPost,
  deletePost,
  getProfile,
  DEFAULT_DAILY_LIMITS,
  type CreatePostParams,
} from "@/lib/services/social-provider";
import type { SocialPlatform, SocialConnectorDoc } from "@/lib/firebase/firestore";

// --- Tool definitions ---

const SOCIAL_TOOLS: ToolDefinition[] = [
  {
    name: "social_create_post",
    description:
      "Create and publish a new social media post. Supports text, optional images (base64), and link embeds. Daily limit enforced per platform (e.g. 30/day Bluesky, 17/day Twitter).",
    input_schema: {
      type: "object",
      properties: {
        platform: {
          type: "string",
          description: "Target platform (e.g. 'bluesky', 'linkedin', 'twitter').",
        },
        text: {
          type: "string",
          description: "Post text content. URLs and @mentions are auto-detected.",
        },
        embed_url: {
          type: "string",
          description: "Optional URL for a link card embed.",
        },
        embed_title: {
          type: "string",
          description: "Optional title for the link card.",
        },
        embed_description: {
          type: "string",
          description: "Optional description for the link card.",
        },
      },
      required: ["platform", "text"],
    },
  },
  {
    name: "social_create_thread",
    description:
      "Create a thread of multiple sequential posts (e.g. Twitter thread, Bluesky thread). Each post is published as a reply to the previous one.",
    input_schema: {
      type: "object",
      properties: {
        platform: {
          type: "string",
          description: "Target platform.",
        },
        posts: {
          type: "array",
          items: { type: "string" },
          description: "Array of post texts, in order. Each becomes a post in the thread.",
        },
      },
      required: ["platform", "posts"],
    },
  },
  {
    name: "social_read_feed",
    concurrencySafe: true,
    description:
      "Read recent posts from the authenticated user's feed. Returns post text, engagement metrics, and timestamps.",
    input_schema: {
      type: "object",
      properties: {
        platform: { type: "string", description: "Target platform." },
        limit: {
          type: "number",
          description: "Number of posts to fetch (1-50, default 10).",
        },
      },
      required: ["platform"],
    },
  },
  {
    name: "social_get_metrics",
    concurrencySafe: true,
    description:
      "Get engagement metrics (likes, reposts, replies, quotes) for a specific post.",
    input_schema: {
      type: "object",
      properties: {
        platform: { type: "string", description: "Target platform." },
        post_uri: {
          type: "string",
          description: "The post URI or ID (from social_read_feed or social_create_post results).",
        },
      },
      required: ["platform", "post_uri"],
    },
  },
  {
    name: "social_search_mentions",
    concurrencySafe: true,
    description:
      "Search for posts mentioning a keyword, brand, or topic. Useful for brand monitoring and engagement.",
    input_schema: {
      type: "object",
      properties: {
        platform: { type: "string", description: "Target platform." },
        query: {
          type: "string",
          description: "Search query (keyword, handle, hashtag).",
        },
        limit: {
          type: "number",
          description: "Max results (1-25, default 10).",
        },
      },
      required: ["platform", "query"],
    },
  },
  {
    name: "social_reply",
    description:
      "Reply to an existing post. Counts toward the daily post limit.",
    input_schema: {
      type: "object",
      properties: {
        platform: { type: "string", description: "Target platform." },
        post_uri: {
          type: "string",
          description: "The URI of the post to reply to.",
        },
        text: {
          type: "string",
          description: "Reply text content.",
        },
      },
      required: ["platform", "post_uri", "text"],
    },
  },
  {
    name: "social_delete_post",
    description:
      "Delete a previously published post. This action is destructive and may require approval.",
    input_schema: {
      type: "object",
      properties: {
        platform: { type: "string", description: "Target platform." },
        post_uri: {
          type: "string",
          description: "The URI of the post to delete.",
        },
      },
      required: ["platform", "post_uri"],
    },
  },
  {
    name: "social_get_profile",
    concurrencySafe: true,
    description:
      "Get the authenticated user's social media profile (handle, display name, bio, follower/following counts).",
    input_schema: {
      type: "object",
      properties: {
        platform: { type: "string", description: "Target platform." },
      },
      required: ["platform"],
    },
  },
  {
    name: "social_list_connected",
    concurrencySafe: true,
    description:
      "List all connected social media platforms with their status, handle, and daily usage.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
];

const ALL_SOCIAL_TOOL_NAMES = new Set(SOCIAL_TOOLS.map((t) => t.name));

// --- Public API ---

export function getSocialMediaTools(): ToolDefinition[] {
  return SOCIAL_TOOLS;
}

export function isSocialMediaTool(name: string): boolean {
  return ALL_SOCIAL_TOOL_NAMES.has(name);
}

// --- Daily limit helpers ---

async function checkAndIncrementDailyPost(
  userId: string,
  platform: SocialPlatform
): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);
  const ref = adminDb.doc(`users/${userId}/socialConnectors/${platform}`);
  const snap = await ref.get();
  if (!snap.exists) return false;
  const data = snap.data()! as SocialConnectorDoc;
  const limit = data.dailyPostLimit || DEFAULT_DAILY_LIMITS[platform] || 30;

  // Reset if new day
  if (data.dailyPostDate !== today) {
    await ref.update({ dailyPostDate: today, dailyPostCount: 1 });
    return true;
  }

  if ((data.dailyPostCount || 0) >= limit) return false;
  await ref.update({ dailyPostCount: (data.dailyPostCount || 0) + 1 });
  return true;
}

// --- Credential resolution ---

async function resolveCredentials(
  userId: string,
  platform: SocialPlatform
): Promise<{ credentialsJson: string; handle: string } | null> {
  const snap = await adminDb.doc(`users/${userId}/socialConnectors/${platform}`).get();
  if (!snap.exists) return null;
  const data = snap.data()! as SocialConnectorDoc;
  if (!data.enabled || !data.credentials) return null;
  return {
    credentialsJson: decrypt(data.credentials),
    handle: data.handle,
  };
}

// --- Tool execution ---

export async function executeSocialMediaTool(
  toolName: string,
  args: Record<string, unknown>,
  userId: string
): Promise<{ result: string; isError: boolean }> {
  try {
    switch (toolName) {
      case "social_list_connected": {
        const snap = await adminDb.collection(`users/${userId}/socialConnectors`).get();
        if (snap.empty) {
          return {
            result: "No social media platforms connected. Ask the user to connect a platform in Settings > Social Connectors.",
            isError: false,
          };
        }
        const platforms = snap.docs.map((doc) => {
          const d = doc.data() as SocialConnectorDoc;
          const today = new Date().toISOString().slice(0, 10);
          const used = d.dailyPostDate === today ? d.dailyPostCount || 0 : 0;
          return `- **${d.platform}** (@${d.handle}) — ${d.enabled ? "Active" : "Disabled"} — ${used}/${d.dailyPostLimit || DEFAULT_DAILY_LIMITS[d.platform]} posts today`;
        });
        return { result: `Connected platforms:\n${platforms.join("\n")}`, isError: false };
      }

      case "social_create_post": {
        const platform = args.platform as SocialPlatform;
        const text = args.text as string;
        if (!platform || !text) {
          return { result: "Missing required fields: platform, text.", isError: true };
        }
        const creds = await resolveCredentials(userId, platform);
        if (!creds) {
          return { result: `No ${platform} account connected. Ask the user to connect it in Settings > Social Connectors.`, isError: true };
        }
        const allowed = await checkAndIncrementDailyPost(userId, platform);
        if (!allowed) {
          return { result: `Daily post limit reached for ${platform}. Try again tomorrow.`, isError: true };
        }
        const session = await resolveSession(platform, creds.credentialsJson);
        const params: CreatePostParams = { text };
        if (args.embed_url) {
          params.embed = {
            url: args.embed_url as string,
            title: args.embed_title as string | undefined,
            description: args.embed_description as string | undefined,
          };
        }
        const post = await createPost(platform, session, params);
        return {
          result: `Post published on ${platform}!\nURI: ${post.uri}\nText: ${post.text.slice(0, 200)}`,
          isError: false,
        };
      }

      case "social_create_thread": {
        const platform = args.platform as SocialPlatform;
        const posts = args.posts as string[];
        if (!platform || !posts?.length) {
          return { result: "Missing required fields: platform, posts (non-empty array).", isError: true };
        }
        if (posts.length > 20) {
          return { result: "Thread too long. Maximum 20 posts per thread.", isError: true };
        }
        const creds = await resolveCredentials(userId, platform);
        if (!creds) {
          return { result: `No ${platform} account connected.`, isError: true };
        }
        // Check daily limit for all posts in thread
        for (let i = 0; i < posts.length; i++) {
          const allowed = await checkAndIncrementDailyPost(userId, platform);
          if (!allowed) {
            return {
              result: `Daily limit reached after posting ${i} of ${posts.length} thread posts on ${platform}.`,
              isError: true,
            };
          }
        }
        const session = await resolveSession(platform, creds.credentialsJson);
        const results: string[] = [];
        let parentUri: string | undefined;
        for (const postText of posts) {
          if (!parentUri) {
            const post = await createPost(platform, session, { text: postText });
            parentUri = post.uri;
            results.push(`1. ${post.text.slice(0, 100)}... → ${post.uri}`);
          } else {
            const reply = await replyToPost(platform, session, parentUri, postText);
            parentUri = reply.uri;
            results.push(`${results.length + 1}. ${reply.text.slice(0, 100)}... → ${reply.uri}`);
          }
        }
        return {
          result: `Thread published on ${platform} (${posts.length} posts):\n${results.join("\n")}`,
          isError: false,
        };
      }

      case "social_read_feed": {
        const platform = args.platform as SocialPlatform;
        if (!platform) return { result: "Missing required field: platform.", isError: true };
        const creds = await resolveCredentials(userId, platform);
        if (!creds) {
          return { result: `No ${platform} account connected.`, isError: true };
        }
        const limit = Math.min(Math.max((args.limit as number) || 10, 1), 50);
        const session = await resolveSession(platform, creds.credentialsJson);
        const feed = await readFeed(platform, session, limit);
        if (feed.length === 0) return { result: "No posts found in feed.", isError: false };
        const formatted = feed
          .map(
            (p, i) =>
              `${i + 1}. @${p.author.handle} (${p.createdAt.slice(0, 10)})\n   ${p.text.slice(0, 200)}\n   URI: ${p.uri}\n   ❤️ ${p.likeCount} | 🔁 ${p.repostCount} | 💬 ${p.replyCount}`
          )
          .join("\n\n");
        return { result: `Feed (${feed.length} posts):\n\n${formatted}`, isError: false };
      }

      case "social_get_metrics": {
        const platform = args.platform as SocialPlatform;
        const postUri = args.post_uri as string;
        if (!platform || !postUri) {
          return { result: "Missing required fields: platform, post_uri.", isError: true };
        }
        const creds = await resolveCredentials(userId, platform);
        if (!creds) {
          return { result: `No ${platform} account connected.`, isError: true };
        }
        const session = await resolveSession(platform, creds.credentialsJson);
        const m = await getMetrics(platform, session, postUri);
        return {
          result: `Metrics for post:\n❤️ Likes: ${m.likeCount}\n🔁 Reposts: ${m.repostCount}\n💬 Replies: ${m.replyCount}\n📎 Quotes: ${m.quoteCount}`,
          isError: false,
        };
      }

      case "social_search_mentions": {
        const platform = args.platform as SocialPlatform;
        const query = args.query as string;
        if (!platform || !query) {
          return { result: "Missing required fields: platform, query.", isError: true };
        }
        const creds = await resolveCredentials(userId, platform);
        if (!creds) {
          return { result: `No ${platform} account connected.`, isError: true };
        }
        const limit = Math.min(Math.max((args.limit as number) || 10, 1), 25);
        const session = await resolveSession(platform, creds.credentialsJson);
        const posts = await searchMentions(platform, session, query, limit);
        if (posts.length === 0) return { result: `No posts found for "${query}".`, isError: false };
        const formatted = posts
          .map(
            (p, i) =>
              `${i + 1}. @${p.author.handle} (${p.createdAt.slice(0, 10)})\n   ${p.text.slice(0, 200)}\n   URI: ${p.uri}\n   ❤️ ${p.likeCount} | 🔁 ${p.repostCount} | 💬 ${p.replyCount}`
          )
          .join("\n\n");
        return { result: `Search results for "${query}" (${posts.length} posts):\n\n${formatted}`, isError: false };
      }

      case "social_reply": {
        const platform = args.platform as SocialPlatform;
        const postUri = args.post_uri as string;
        const text = args.text as string;
        if (!platform || !postUri || !text) {
          return { result: "Missing required fields: platform, post_uri, text.", isError: true };
        }
        const creds = await resolveCredentials(userId, platform);
        if (!creds) {
          return { result: `No ${platform} account connected.`, isError: true };
        }
        const allowed = await checkAndIncrementDailyPost(userId, platform);
        if (!allowed) {
          return { result: `Daily post limit reached for ${platform}.`, isError: true };
        }
        const session = await resolveSession(platform, creds.credentialsJson);
        const reply = await replyToPost(platform, session, postUri, text);
        return {
          result: `Reply posted on ${platform}!\nURI: ${reply.uri}\nText: ${reply.text.slice(0, 200)}`,
          isError: false,
        };
      }

      case "social_delete_post": {
        const platform = args.platform as SocialPlatform;
        const postUri = args.post_uri as string;
        if (!platform || !postUri) {
          return { result: "Missing required fields: platform, post_uri.", isError: true };
        }
        const creds = await resolveCredentials(userId, platform);
        if (!creds) {
          return { result: `No ${platform} account connected.`, isError: true };
        }
        const session = await resolveSession(platform, creds.credentialsJson);
        await deletePost(platform, session, postUri);
        return { result: `Post deleted from ${platform}. URI: ${postUri}`, isError: false };
      }

      case "social_get_profile": {
        const platform = args.platform as SocialPlatform;
        if (!platform) return { result: "Missing required field: platform.", isError: true };
        const creds = await resolveCredentials(userId, platform);
        if (!creds) {
          return { result: `No ${platform} account connected.`, isError: true };
        }
        const session = await resolveSession(platform, creds.credentialsJson);
        const p = await getProfile(platform, session);
        return {
          result: `Profile on ${platform}:\nHandle: @${p.handle}\nName: ${p.displayName}\nBio: ${p.description.slice(0, 300)}\nFollowers: ${p.followersCount}\nFollowing: ${p.followingCount}\nPosts: ${p.postsCount}`,
          isError: false,
        };
      }

      default:
        return { result: `Unknown social media tool: ${toolName}`, isError: true };
    }
  } catch (err) {
    return { result: `Social media tool error: ${(err as Error).message}`, isError: true };
  }
}
