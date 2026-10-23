/* eslint-disable jsx-a11y/media-has-caption */
import React, { useEffect, useRef, useState } from 'react';

const Player = ({ activeSong, isPlaying, volume, seekTime, onEnded, onTimeUpdate, onLoadedData, repeat }) => {
  const ref = useRef(null);
  const [playbackError, setPlaybackError] = useState('');

  useEffect(() => {
    if (!ref.current) return;

    if (isPlaying) {
      setPlaybackError('');
      ref.current.play().catch((error) => {
        setPlaybackError(error instanceof Error ? error.message : 'The audio preview could not be played.');
      });
    } else {
      ref.current.pause();
    }
  }, [activeSong, isPlaying]);

  useEffect(() => {
    ref.current.volume = volume;
  }, [volume]);
  // updates audio element only on seekTime change (and not on each rerender):
  useEffect(() => {
    ref.current.currentTime = seekTime;
  }, [seekTime]);

  return (
    <>
      <audio
        ref={ref}
        src={activeSong?.hub?.actions[1]?.uri}
        loop={repeat}
        onEnded={onEnded}
        onTimeUpdate={onTimeUpdate}
        onLoadedData={onLoadedData}
        onError={(event) => {
          setPlaybackError(event.currentTarget.error?.message || 'The audio preview could not be loaded.');
        }}
      />

      {playbackError && <p className="text-xs text-red-300" role="alert">{playbackError}</p>}
    </>
  );
};

export default Player;
