type LastFmParams = Record<string, string | number | boolean>;

export function useLastFm() {
  const api = useApi();

  return <T>(method: string, params: LastFmParams = {}) =>
    api<T>("/lastfm", {
      query: {
        ...params,
        method,
      },
    });
}
