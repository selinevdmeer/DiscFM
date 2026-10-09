// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  css: ["~/style.css"],
  runtimeConfig: {
    lastfmApiKey: "",
    lastfmApiBase: "https://ws.audioscrobbler.com/2.0/",
    discogsUserToken: "",
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
