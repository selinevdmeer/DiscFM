export default defineNuxtPlugin(() => {
  const api = $fetch.create({ baseURL: "/api" });

  return {
    provide: {
      api,
    },
  };
});
