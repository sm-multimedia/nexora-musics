import React from 'react';
import { useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { DetailsHeader, Error, Loader, RelatedSongs } from '../components';

import { setActiveSong, playPause } from '../redux/features/playerSlice';
import { useGetSongDetailsQuery, useGetSongRelatedQuery } from '../redux/services/shazamCore';

const SongDetails = () => {
  const dispatch = useDispatch();
  const { songid, id: artistId } = useParams();
  const { activeSong, isPlaying } = useSelector((state) => state.player);

  const { data, isFetching: isFetchingRelatedSongs, error: relatedSongsError } = useGetSongRelatedQuery({ songid });
  const {
    data: songData,
    isFetching: isFetchingSongDetails,
    error: songDetailsError,
  } = useGetSongDetailsQuery({ songid });

  if (isFetchingSongDetails || isFetchingRelatedSongs) return <Loader title="Searching song details" />;

  if (relatedSongsError || songDetailsError) return <Error />;
  if (!songData) return <Error />;

  const lyrics = songData.sections?.find((section) => section.type === 'LYRICS')?.text;

  const handlePauseClick = () => {
    dispatch(playPause(false));
  };

  const handlePlayClick = (song, i) => {
    dispatch(setActiveSong({ song, data, i }));
    dispatch(playPause(true));
  };

  return (
    <div className="flex flex-col">
      <DetailsHeader
        artistId={artistId}
        songData={songData}
      />

      <div className="mb-10">
        <h2 className="text-white text-3xl font-bold">Lyrics:</h2>

        <div className="mt-5">
          {lyrics
            ? lyrics.map((line, i) => (
              <p key={`lyrics-${line}-${i}`} className="text-gray-400 text-base my-1">{line}</p>
            ))
            : (
              <p className="text-gray-400 text-base my-1">Lyrics are not available for this track.</p>
            )}
        </div>
      </div>

      <RelatedSongs
        data={data}
        artistId={artistId}
        isPlaying={isPlaying}
        activeSong={activeSong}
        handlePauseClick={handlePauseClick}
        handlePlayClick={handlePlayClick}
      />

    </div>
  );
};

export default SongDetails;
