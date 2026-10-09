<script setup lang="ts">
interface LastFmImage {
  size: string;
  "#text": string;
}

interface LastFmAlbum {
  name: string;
  artist: { name: string };
  playcount: string;
  url: string;
  image?: LastFmImage[];
}

interface LastFmTopAlbumsResponse {
  topalbums: { album: LastFmAlbum[] };
}

interface DiscogsRelease {
  id: number;
  title: string;
  artist: string;
  cover: string;
  url: string;
}

interface DiscogsCollectionResponse {
  releases: DiscogsRelease[];
}

interface AlbumResult extends LastFmAlbum {
  ownedRelease: DiscogsRelease | null;
  wantlisted: boolean;
  addingToWantlist: boolean;
  wantlistError: string;
}

const lastfmUsername = ref("");
const discogsUsername = ref("");
const albums = ref<AlbumResult[]>([]);
const isLoading = ref(false);
const isComparing = ref(false);
const errorMessage = ref("");
const comparisonMessage = ref("");
const hasCompared = ref(false);
const lastfm = useLastFm();
const api = useApi();

const ownedCount = computed(
  () => albums.value.filter((album) => album.ownedRelease).length,
);
const missingCount = computed(
  () => albums.value.filter((album) => !album.ownedRelease).length,
);

function coverFor(album: LastFmAlbum) {
  const images = album.image ?? [];
  return (
    images.find((image) => image.size === "extralarge")?.["#text"] ||
    images.find((image) => image.size === "large")?.["#text"] ||
    images.at(-1)?.["#text"] ||
    ""
  );
}

async function compareAlbums() {
  errorMessage.value = "";
  comparisonMessage.value = "";
  albums.value = [];
  hasCompared.value = false;
  isLoading.value = true;
  isComparing.value = false;

  try {
    const response = await lastfm<LastFmTopAlbumsResponse>(
      "user.gettopalbums",
      {
        user: lastfmUsername.value.trim(),
        period: "overall",
        limit: 20,
      },
    );
    const topAlbums = response.topalbums?.album ?? [];

    if (!topAlbums.length) {
      throw new Error("Last.fm heeft geen topalbums voor deze gebruiker gevonden.");
    }

    albums.value = topAlbums.map((album) => ({
      ...album,
      ownedRelease: null,
      wantlisted: false,
      addingToWantlist: false,
      wantlistError: "",
    }));
    hasCompared.value = true;
    isComparing.value = true;

    try {
      const collection = await api<DiscogsCollectionResponse>(
        "/discogs/collection",
        { query: { username: discogsUsername.value.trim() } },
      );
      const releasesByTitle = new Map(
        collection.releases.map((release) => [
          normalizeTitle(release.title),
          release,
        ]),
      );

      albums.value = albums.value.map((album) => ({
        ...album,
        ownedRelease: releasesByTitle.get(normalizeTitle(album.name)) ?? null,
      }));
    } catch (error) {
      comparisonMessage.value = getErrorMessage(
        error,
        "De Discogs-library kon niet worden opgehaald.",
      );
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(
      error,
      "De Last.fm-albums konden niet worden opgehaald.",
    );
  } finally {
    isLoading.value = false;
    isComparing.value = false;
  }
}

function normalizeTitle(title: string) {
  return title
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "data" in error) {
    const data = error.data;
    if (data && typeof data === "object" && "statusMessage" in data) {
      return String(data.statusMessage);
    }
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

async function addToWantlist(album: AlbumResult) {
  album.wantlistError = "";
  album.addingToWantlist = true;

  try {
    await api("/discogs/wantlist", {
      method: "POST",
      body: {
        username: discogsUsername.value.trim(),
        title: album.name,
        artist: album.artist.name,
      },
    });
    album.wantlisted = true;
  } catch (error) {
    album.wantlistError = getErrorMessage(
      error,
      "Toevoegen aan de wantlist is niet gelukt.",
    );
  } finally {
    album.addingToWantlist = false;
  }
}
</script>

<template>
  <main class="page-shell">
    <section v-if="!hasCompared && !isLoading" class="hero-section">
      <div class="hero-copy">
        <div class="eyebrow"><span class="eyebrow-dot"></span> YOUR MUSIC, IN THE GROOVE</div>
        <h1>Wat je luistert.<br /><span>Wat je verzamelt.</span></h1>
        <p class="hero-description">
          Ontdek welke albums uit jouw Last.fm-top 20 al in je Discogs-collectie
          staan — en zet de rest op je wantlist.
        </p>
        <div class="feature-notes">
          <span><span class="note-check">01</span> Jouw meest beluisterde albums</span>
          <span><span class="note-check">02</span> Vergeleken met je collectie</span>
          <span><span class="note-check">03</span> Ontbrekende albums op je wantlist</span>
        </div>
      </div>

      <form class="connect-card" @submit.prevent="compareAlbums">
        <div class="card-kicker">JOUW PLATENKAST, DIGITAAL</div>
        <h2>Maak de vergelijking</h2>
        <p class="card-description">Vul je gebruikersnamen in om te beginnen.</p>

        <label class="field-label" for="lastfm-username">Last.fm gebruikersnaam</label>
        <div class="input-wrap">
          <span class="input-at">@</span>
          <input
            id="lastfm-username"
            v-model="lastfmUsername"
            autocomplete="username"
            name="lastfm"
            placeholder="jouw-lastfm-naam"
            required
          />
          <span class="service-mark lastfm-mark">L</span>
        </div>

        <label class="field-label" for="discogs-username">Discogs gebruikersnaam</label>
        <div class="input-wrap">
          <span class="input-at">@</span>
          <input
            id="discogs-username"
            v-model="discogsUsername"
            autocomplete="username"
            name="discogs"
            placeholder="jouw-discogs-naam"
            required
          />
          <span class="service-mark discogs-mark">D</span>
        </div>

        <p class="privacy-note">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2M3.5 7h9v7h-9z" /></svg>
          Je namen worden gebruikt voor de vergelijking; wantlistacties gebeuren alleen op jouw verzoek.
        </p>

        <button class="submit-button" type="submit" :disabled="isLoading">
          Vergelijk mijn albums
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11m-4-4 4 4-4 4" /></svg>
        </button>

        <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
      </form>
    </section>

    <section v-else-if="isLoading" class="loading-section" aria-live="polite">
      <div class="loading-record" aria-hidden="true"><span></span></div>
      <div class="eyebrow"><span class="eyebrow-dot"></span> EVEN GEDULD</div>
      <h1>{{ isComparing ? "Je collecties verbinden..." : "Je muzieksmaak ophalen..." }}</h1>
      <p>We zoeken je meest beluisterde albums en leggen ze naast je platenkast.</p>
      <div class="loading-bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
    </section>

    <section v-else class="results-section">
      <div class="results-heading">
        <div>
          <button class="back-button" type="button" @click="hasCompared = false">
            <span aria-hidden="true">←</span> Nieuwe vergelijking
          </button>
          <div class="eyebrow"><span class="eyebrow-dot"></span> JOUW MUZIEK IN BEELD</div>
          <h1>Je draait ze.<br /><span>Heb je ze ook?</span></h1>
        </div>
        <div class="stats-panel">
          <div><strong>{{ albums.length }}</strong><span>albums beluisterd</span></div>
          <div>
            <strong>{{ comparisonMessage ? "—" : ownedCount }}</strong>
            <span>{{ comparisonMessage ? "collectie onbekend" : "al in je collectie" }}</span>
          </div>
          <div>
            <strong>{{ comparisonMessage ? "—" : missingCount }}</strong>
            <span>{{ comparisonMessage ? "vergelijking nodig" : "nog te ontdekken" }}</span>
          </div>
        </div>
      </div>

      <div v-if="comparisonMessage" class="comparison-warning" role="alert">
        <span class="warning-icon">!</span>
        <div>
          <strong>Discogs-vergelijking niet beschikbaar</strong>
          <p>{{ comparisonMessage }}</p>
          <p>Controleer of je Discogs-gebruikersnaam en server-token zijn ingesteld.</p>
        </div>
      </div>

      <div class="list-caption">
        <span>TOP 20 <span class="caption-divider">/</span> {{ lastfmUsername }}</span>
        <span>OP VOLGORDE VAN LUISTERGEDRAG</span>
      </div>

      <ol class="album-list">
        <li v-for="(album, index) in albums" :key="`${album.artist.name}-${album.name}`" class="album-row">
          <span class="album-rank">{{ String(index + 1).padStart(2, "0") }}</span>
          <div class="album-cover">
            <img
              v-if="album.ownedRelease?.cover || coverFor(album)"
              :src="album.ownedRelease?.cover || coverFor(album)"
              :alt="`${album.name} albumcover`"
            />
            <span v-else class="cover-placeholder" aria-hidden="true">♫</span>
          </div>
          <div class="album-meta">
            <a class="album-title" :href="album.url" target="_blank" rel="noreferrer">{{ album.name }}</a>
            <span class="album-artist">{{ album.artist.name }}</span>
          </div>
          <span class="play-count">{{ Number(album.playcount).toLocaleString() }} <small>plays</small></span>
          <div class="album-status">
            <template v-if="album.ownedRelease">
              <a
                class="status-pill status-owned"
                :href="album.ownedRelease.url"
                target="_blank"
                rel="noreferrer"
              ><span></span> In je collectie</a>
            </template>
            <template v-else-if="comparisonMessage">
              <span class="status-pill status-unknown"><span></span> Niet gecontroleerd</span>
            </template>
            <template v-else>
              <span class="status-pill status-missing"><span></span> Ontbreekt</span>
              <button
                class="wantlist-button"
                type="button"
                :disabled="album.addingToWantlist || album.wantlisted"
                @click="addToWantlist(album)"
              >
                {{ album.wantlisted ? "Op wantlist" : album.addingToWantlist ? "Toevoegen..." : "+ Wantlist" }}
              </button>
              <a
                class="discogs-search-link"
                :href="`https://www.discogs.com/search/?type=release&title=${encodeURIComponent(album.name)}&artist=${encodeURIComponent(album.artist.name)}`"
                target="_blank"
                rel="noreferrer"
                :aria-label="`Zoek ${album.name} op Discogs`"
                title="Bekijk op Discogs"
              >↗</a>
            </template>
            <span v-if="album.wantlistError" class="wantlist-error" role="alert">{{ album.wantlistError }}</span>
          </div>
        </li>
      </ol>
      <p class="results-footnote">Albumtitels worden vergeleken met je Discogs-collectie. Verschillende edities kunnen dezelfde titel hebben.</p>
    </section>
  </main>
</template>
