# Last.fm API

The app proxies supported Last.fm read methods through `/api/lastfm`. The API
key is read from the server-only `NUXT_LASTFM_API_KEY` runtime variable and is
never sent to the browser. Set it in a local `.env` file or in the deployment
environment before starting the app. `.env.example` shows the expected
variable name.

## Album comparison and Discogs

The home page loads the user's 20 all-time top albums from Last.fm, then
compares normalized album titles with the Discogs collection. Discogs requests
run on the server using `NUXT_DISCOGS_USER_TOKEN`; the token must belong to the
Discogs username entered in the form. Set this personal access token in `.env`
or the deployment environment. Never expose it as a `NUXT_PUBLIC_*` variable.

Albums that are not in the collection can be searched on Discogs or added to
the user's wantlist. Wantlist additions search for a matching artist and title
first, and only add an exact result. If no exact edition can be identified,
the app asks the user to choose one on Discogs instead of adding an uncertain
release.

Use the composable from a page or component:

```ts
const lastfm = useLastFm()
const albums = await lastfm("user.gettopalbums", {
  user: "lastfm_username",
  period: "12month",
  limit: 50,
})
```

Supported methods are `user.gettopalbums`, `user.getrecenttracks`,
`user.getinfo`, `album.getinfo`, `album.search`, `artist.getinfo` and
`track.getinfo`. Add methods to the server allowlist when the app needs them.

The shared secret is not needed for these public read methods. Keep it out of
client-side code and only add a server-side signing flow if authenticated
Last.fm account actions are implemented.
