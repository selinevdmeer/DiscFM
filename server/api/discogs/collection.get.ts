import { getQuery } from "h3";
import {
  discogsRequest,
  requireDiscogsToken,
  requireDiscogsUsername,
  verifyDiscogsUsername,
} from "../../utils/discogs";

interface DiscogsCollectionPage {
  pagination: { pages: number };
  releases: Array<{
    id: number;
    basic_information: {
      title: string;
      artists: Array<{ name: string }>;
      cover_image?: string;
      resource_url?: string;
    };
  }>;
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  requireDiscogsToken(config.discogsUserToken);
  const username = requireDiscogsUsername(getQuery(event).username);

  await verifyDiscogsUsername(config.discogsUserToken, username);

  const firstPage = await discogsRequest<DiscogsCollectionPage>(
    config.discogsUserToken,
    `/users/${encodeURIComponent(username)}/collection/folders/0/releases`,
    { query: { per_page: 100, page: 1 } },
  );
  const releases = [...firstPage.releases];

  for (let page = 2; page <= firstPage.pagination.pages; page += 1) {
    const result = await discogsRequest<DiscogsCollectionPage>(
      config.discogsUserToken,
      `/users/${encodeURIComponent(username)}/collection/folders/0/releases`,
      { query: { per_page: 100, page } },
    );
    releases.push(...result.releases);
  }

  return {
    releases: releases.map(({ id, basic_information: release }) => ({
      id,
      title: release.title,
      artist: release.artists.map(({ name }) => name).join(", "),
      cover: release.cover_image ?? "",
      url: `https://www.discogs.com/release/${id}`,
    })),
  };
});
