import { createApi } from '@reduxjs/toolkit/query/react';

const genreIds = {
  POP: 132,
  HIP_HOP_RAP: 116,
  DANCE: 113,
  ELECTRONIC: 106,
  SOUL_RNB: 165,
  ALTERNATIVE: 85,
  ROCK: 152,
  LATIN: 197,
  FILM_TV: 173,
  REGGAE_DANCE_HALL: 144,
  HOUSE: 113,
  WORLDWIDE: 0,
};

const genreSearchTerms = {
  COUNTRY: 'country',
  K_POP: 'k-pop',
};

const genreNames = {
  85: 'Alternative',
  106: 'Electronic',
  113: 'Dance',
  116: 'Hip-Hop',
  132: 'Pop',
  144: 'Reggae',
  152: 'Rock',
  165: 'R&B',
  173: 'Soundtracks',
  197: 'Latin',
};

const deezerBaseQuery = ({ url, params = {} }, { signal }) => new Promise((resolve) => {
  const callbackName = `deezerCallback${Date.now()}${Math.random().toString(36).slice(2)}`;
  const script = document.createElement('script');
  const requestUrl = new URL(url, 'https://api.deezer.com/');
  let timeoutId;
  let settled = false;
  let finishRequest;

  Object.entries(params).forEach(([key, value]) => {
    requestUrl.searchParams.set(key, value);
  });
  requestUrl.searchParams.set('output', 'jsonp');
  requestUrl.searchParams.set('callback', callbackName);

  const onAbort = () => finishRequest({
    error: { status: 'CUSTOM_ERROR', error: 'The music request was cancelled.' },
  });

  finishRequest = (result) => {
    if (settled) return;
    settled = true;
    clearTimeout(timeoutId);
    signal.removeEventListener('abort', onAbort);
    delete window[callbackName];
    script.remove();
    resolve(result);
  };

  window[callbackName] = (response) => {
    if (response.error) {
      finishRequest({
        error: {
          status: response.error.code || 'CUSTOM_ERROR',
          error: response.error.message || 'The music service returned an error.',
          data: response.error,
        },
      });
      return;
    }

    finishRequest({ data: response });
  };

  script.onerror = () => finishRequest({
    error: { status: 'FETCH_ERROR', error: 'Unable to contact the music service.' },
  });

  signal.addEventListener('abort', onAbort, { once: true });
  timeoutId = setTimeout(() => finishRequest({
    error: { status: 'TIMEOUT_ERROR', error: 'The music service did not respond in time.' },
  }), 15000);
  script.src = requestUrl.toString();
  document.head.appendChild(script);
});

const normalizeTrack = (track) => {
  const coverArt = track.album?.cover_big || track.album?.cover_medium || track.artist?.picture_big;

  return {
    key: String(track.id),
    title: track.title,
    subtitle: track.artist?.name,
    artists: [{ adamid: String(track.artist?.id) }],
    images: {
      coverart: coverArt,
      background: track.artist?.picture_xl || track.artist?.picture_big || coverArt,
    },
    hub: {
      actions: [{}, { uri: track.preview }],
    },
    genres: { primary: genreNames[track.album?.genre_id] || 'Music' },
    sections: [],
    previewUrl: track.preview,
  };
};

const normalizeArtistDetails = (artist, tracks) => ({
  data: [{
    attributes: {
      name: artist.name,
      genreNames: [],
      artwork: { url: artist.picture_xl || artist.picture_big },
    },
    views: {
      'top-songs': {
        data: tracks.map((track) => ({
          attributes: {
            name: track.title,
            albumName: track.album?.title,
            artwork: { url: track.album?.cover_big || track.album?.cover_medium },
          },
        })),
      },
    },
  }],
});

const loadChart = async (baseQuery) => {
  const response = await baseQuery({ url: 'chart/0/tracks', params: { limit: 50 } });
  if (response.error) return response;

  return {
    data: (response.data.data || [])
      .filter((track) => track.preview)
      .map(normalizeTrack),
  };
};

const loadGenreTracks = async (baseQuery, genreId) => {
  if (!genreId) return loadChart(baseQuery);

  const artistsResponse = await baseQuery({
    url: `genre/${genreId}/artists`,
    params: { limit: 5 },
  });
  if (artistsResponse.error) return artistsResponse;

  const artists = (artistsResponse.data.data || []).slice(0, 5);
  const trackResponses = await Promise.all(artists.map((artist) => baseQuery({
    url: `artist/${artist.id}/top`,
    params: { limit: 10 },
  })));
  const failedResponse = trackResponses.find((response) => response.error);
  if (failedResponse) return failedResponse;

  const tracks = trackResponses.flatMap((response) => response.data.data || []);
  const uniqueTracks = Array.from(new Map(
    tracks
      .filter((track) => track.preview)
      .map((track) => [String(track.id), normalizeTrack(track)]),
  ).values());

  return { data: uniqueTracks };
};

export const shazamCoreApi = createApi({
  reducerPath: 'shazamCoreApi',
  baseQuery: deezerBaseQuery,
  endpoints: (builder) => ({
    getTopCharts: builder.query({
      queryFn: (_, api, extraOptions, baseQuery) => loadChart(baseQuery),
    }),
    getSongsByGenre: builder.query({
      queryFn: (genre, api, extraOptions, baseQuery) => {
        if (genreSearchTerms[genre]) {
          return baseQuery({
            url: 'search',
            params: { q: genreSearchTerms[genre], limit: 50 },
          }).then((response) => {
            if (response.error) return response;
            return {
              data: (response.data.data || [])
                .filter((track) => track.preview)
                .map(normalizeTrack),
            };
          });
        }

        return loadGenreTracks(baseQuery, genreIds[genre]);
      },
    }),
    getSongsAroundYou: builder.query({
      queryFn: (_, api, extraOptions, baseQuery) => loadChart(baseQuery),
    }),
    getSongsBySearch: builder.query({
      query: (searchTerm) => ({
        url: 'search',
        params: { q: searchTerm, limit: 50 },
      }),
      transformResponse: (response) => ({
        tracks: {
          hits: (response.data || [])
            .filter((track) => track.preview)
            .map((track) => ({ track: normalizeTrack(track) })),
        },
      }),
    }),
    getArtistDetails: builder.query({
      async queryFn(artistId, api, extraOptions, baseQuery) {
        const [artistResponse, tracksResponse] = await Promise.all([
          baseQuery({ url: `artist/${artistId}` }),
          baseQuery({ url: `artist/${artistId}/top`, params: { limit: 25 } }),
        ]);

        if (artistResponse.error) return artistResponse;
        if (tracksResponse.error) return tracksResponse;

        return { data: normalizeArtistDetails(artistResponse.data, tracksResponse.data.data || []) };
      },
    }),
    getSongDetails: builder.query({
      query: ({ songid }) => ({ url: `track/${songid}` }),
      transformResponse: normalizeTrack,
    }),
    getSongRelated: builder.query({
      async queryFn({ songid }, api, extraOptions, baseQuery) {
        const songResponse = await baseQuery({ url: `track/${songid}` });
        if (songResponse.error) return songResponse;

        const artistId = songResponse.data.artist?.id;
        if (!artistId) return { data: [] };

        const tracksResponse = await baseQuery({
          url: `artist/${artistId}/top`,
          params: { limit: 25 },
        });
        if (tracksResponse.error) return tracksResponse;

        return {
          data: (tracksResponse.data.data || [])
            .filter((track) => track.preview)
            .map(normalizeTrack),
        };
      },
    }),
  }),
});

export const {
  useGetTopChartsQuery,
  useGetSongsByGenreQuery,
  useGetSongsAroundYouQuery,
  useGetSongsBySearchQuery,
  useGetArtistDetailsQuery,
  useGetSongDetailsQuery,
  useGetSongRelatedQuery,
} = shazamCoreApi;
