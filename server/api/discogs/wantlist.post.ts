import { getHeader, getRequestURL, readBody } from "h3";
import {
  discogsRequest,
  normalizeDiscogsText,
  requireDiscogsToken,
  requireDiscogsUsername,
  verifyDiscogsUsername,
} from "../../utils/discogs";

interface DiscogsSearchResult {
  id: number;
  title: string;
  uri: string;
}

interface DiscogsSearchResponse {
  results: DiscogsSearchResult[];
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  requireDiscogsToken(config.discogsUserToken);

  const contentType = getHeader(event, "content-type")?.split(";")[0];
  if (contentType !== "application/json") {
    throw createError({
      statusCode: 415,
      statusMessage: "Content-Type must be application/json.",
    });
  }

  const origin = getHeader(event, "origin");
  if (origin && origin !== getRequestURL(event).origin) {
    throw createError({
      statusCode: 403,
      statusMessage: "Cross-origin wantlist requests are not allowed.",
    });
  }

  const body = await readBody<{
    username?: unknown;
    title?: unknown;
    artist?: unknown;
  }>(event);
  const username = requireDiscogsUsername(body?.username);

  if (
    typeof body?.title !== "string" ||
    body.title.trim().length < 1 ||
    body.title.length > 300 ||
    typeof body?.artist !== "string" ||
    body.artist.trim().length < 1 ||
    body.artist.length > 300
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "A valid album title and artist are required.",
    });
  }

  await verifyDiscogsUsername(config.discogsUserToken, username);

  const search = await discogsRequest<DiscogsSearchResponse>(
    config.discogsUserToken,
    "/database/search",
    {
      query: {
        type: "release",
        release_title: body.title.trim(),
        artist: body.artist.trim(),
        per_page: 10,
      },
    },
  );
  const normalizedArtist = normalizeDiscogsText(body.artist);
  const normalizedTitle = normalizeDiscogsText(body.title);
  const release = search.results.find((result) => {
    const normalizedResult = normalizeDiscogsText(result.title);
    return (
      normalizedResult.includes(normalizedArtist) &&
      normalizedResult.includes(normalizedTitle)
    );
  });

  if (!release) {
    throw createError({
      statusCode: 404,
      statusMessage:
        "No exact Discogs release was found for this album. Search Discogs to choose an edition manually.",
    });
  }

  await discogsRequest(
    config.discogsUserToken,
    `/users/${encodeURIComponent(username)}/wants`,
    {
      method: "POST",
      body: { release_id: release.id },
    },
  );

  return {
    id: release.id,
    url: `https://www.discogs.com${release.uri}`,
  };
});
