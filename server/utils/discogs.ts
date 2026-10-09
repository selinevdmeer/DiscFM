const discogsApiBase = "https://api.discogs.com";

export async function discogsRequest<T>(
  token: string,
  path: string,
  options: {
    method?: "GET" | "POST";
    query?: Record<string, string | number>;
    body?: Record<string, string | number>;
  } = {},
) {
  return await $fetch<T>(`${discogsApiBase}${path}`, {
    ...options,
    headers: {
      Authorization: `Discogs token=${token}`,
      "User-Agent": "DiscFM/1.0",
    },
  });
}

export function requireDiscogsToken(token: string) {
  if (!token) {
    throw createError({
      statusCode: 503,
      statusMessage:
        "Discogs is not configured. Set NUXT_DISCOGS_USER_TOKEN on the server.",
    });
  }
}

export async function verifyDiscogsUsername(token: string, username: string) {
  const identity = await discogsRequest<{ username: string }>(
    token,
    "/oauth/identity",
  );

  if (identity.username.toLocaleLowerCase() !== username.toLocaleLowerCase()) {
    throw createError({
      statusCode: 403,
      statusMessage:
        "The Discogs token does not belong to the entered username.",
    });
  }
}

export function normalizeDiscogsText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

export function requireDiscogsUsername(username: unknown) {
  if (
    typeof username !== "string" ||
    username.trim().length < 1 ||
    username.trim().length > 64
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "Enter a valid Discogs username.",
    });
  }
  return username.trim();
}
