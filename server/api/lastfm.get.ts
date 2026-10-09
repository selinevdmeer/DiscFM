import { getQuery } from "h3";

const allowedMethods = new Set([
  "album.getinfo",
  "album.search",
  "artist.getinfo",
  "track.getinfo",
  "user.getinfo",
  "user.getrecenttracks",
  "user.gettopalbums",
]);

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  if (!config.lastfmApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "Last.fm API key is not configured",
    });
  }

  const query = getQuery(event);
  const method = query.method;
  if (typeof method !== "string" || !allowedMethods.has(method)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Unsupported Last.fm API method",
    });
  }

  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (key === "method") continue;
    if (typeof value !== "string") {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid Last.fm parameter: ${key}`,
      });
    }
    params[key] = value;
  }

  const result = await $fetch<Record<string, unknown>>(config.lastfmApiBase, {
    query: {
      ...params,
      method,
      api_key: config.lastfmApiKey,
      format: "json",
    },
  });

  if (typeof result.error === "number") {
    throw createError({
      statusCode: 502,
      statusMessage: `Last.fm API error (${result.error}): ${String(result.message ?? "Unknown error")}`,
    });
  }

  return result;
});
