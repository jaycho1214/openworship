/* eslint-disable no-console */
import { useState, useRef, useEffect, useCallback } from 'react';
import { toAppMediaUrl } from '@/shared/utils/fileUrl';
import type { BackgroundType } from '../../../shared/types';

interface VideoBackgroundProps {
  videoPath: string | null;
  imagePath?: string | null;
  backgroundColor?: string;
  backgroundType?: BackgroundType;
  crossfadeDuration?: number;
}

export default function VideoBackground({
  videoPath,
  imagePath,
  backgroundColor = '#000000',
  backgroundType = 'video',
  crossfadeDuration = 1000,
}: VideoBackgroundProps) {
  const [activeVideo, setActiveVideo] = useState<'A' | 'B'>('A');
  const [videoAPath, setVideoAPath] = useState<string | null>(null);
  const [videoBPath, setVideoBPath] = useState<string | null>(null);
  const [videoAOpacity, setVideoAOpacity] = useState(1);
  const [videoBOpacity, setVideoBOpacity] = useState(0);

  // Image state for crossfade
  const [activeImage, setActiveImage] = useState<'A' | 'B'>('A');
  const [imageAPath, setImageAPath] = useState<string | null>(null);
  const [imageBPath, setImageBPath] = useState<string | null>(null);
  const [imageAOpacity, setImageAOpacity] = useState(1);
  const [imageBOpacity, setImageBOpacity] = useState(0);

  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const crossfadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageCrossfadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const crossfadeToVideo = useCallback(
    (newPath: string) => {
      // Clear any pending crossfade timer
      if (crossfadeTimerRef.current) {
        clearTimeout(crossfadeTimerRef.current);
        crossfadeTimerRef.current = null;
      }

      if (activeVideo === 'A') {
        // Load new video into B, then crossfade
        setVideoBPath(newPath);
        const videoB = videoBRef.current;
        if (videoB) {
          videoB.load();
          videoB.play().catch(console.error);
        }

        // Start crossfade
        setVideoBOpacity(1);
        setVideoAOpacity(0);

        // After crossfade completes, switch active video
        crossfadeTimerRef.current = setTimeout(() => {
          crossfadeTimerRef.current = null;
          setActiveVideo('B');
          // Pause inactive video to save resources
          const videoA = videoARef.current;
          if (videoA) {
            videoA.pause();
          }
        }, crossfadeDuration);
      } else {
        // Load new video into A, then crossfade
        setVideoAPath(newPath);
        const videoA = videoARef.current;
        if (videoA) {
          videoA.load();
          videoA.play().catch(console.error);
        }

        // Start crossfade
        setVideoAOpacity(1);
        setVideoBOpacity(0);

        // After crossfade completes, switch active video
        crossfadeTimerRef.current = setTimeout(() => {
          crossfadeTimerRef.current = null;
          setActiveVideo('A');
          // Pause inactive video to save resources
          const videoB = videoBRef.current;
          if (videoB) {
            videoB.pause();
          }
        }, crossfadeDuration);
      }
    },
    [activeVideo, crossfadeDuration],
  );

  // Handle video path changes
  useEffect(() => {
    console.log('VideoBackground received path:', videoPath);
    if (!videoPath) return;

    // Convert file path to app://media/ URL for Electron
    const videoUrl = toAppMediaUrl(videoPath);

    console.log('Video URL:', videoUrl);

    // If no video is currently playing, set initial video
    if (!videoAPath && !videoBPath) {
      console.log('Setting initial video A');
      setVideoAPath(videoUrl);
      setVideoAOpacity(1);
      setVideoBOpacity(0);
      setActiveVideo('A');
      // Small delay to ensure video element is ready
      if (initTimerRef.current) {
        clearTimeout(initTimerRef.current);
      }
      initTimerRef.current = setTimeout(() => {
        initTimerRef.current = null;
        const videoA = videoARef.current;
        if (videoA) {
          console.log('Playing video A');
          videoA.load();
          videoA.play().catch((e) => {
            console.error('Video A autoplay failed:', e);
            // Try again with muted (required for some browsers)
            videoA.muted = true;
            videoA.play().catch(() => {}); // eslint-disable-line promise/no-nesting -- retry with muted
          });
        }
      }, 100);
    } else if (videoUrl !== videoAPath && videoUrl !== videoBPath) {
      // Crossfade to new video only if it's different
      console.log('Crossfading to new video');
      crossfadeToVideo(videoUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- videoAPath/videoBPath are refs used for comparison, not deps
  }, [videoPath, crossfadeToVideo]);

  const handleVideoError =
    (videoName: string) =>
    (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
      const video = e.currentTarget;
      console.error(`Video ${videoName} error:`, {
        error: video.error,
        errorCode: video.error?.code,
        errorMessage: video.error?.message,
        src: video.src,
      });
    };

  const handleVideoLoaded = (videoName: string) => () => {
    console.log(`Video ${videoName} loaded successfully`);
  };

  // Crossfade to new image
  const crossfadeToImage = useCallback(
    (newPath: string) => {
      // Clear any pending image crossfade timer
      if (imageCrossfadeTimerRef.current) {
        clearTimeout(imageCrossfadeTimerRef.current);
        imageCrossfadeTimerRef.current = null;
      }

      if (activeImage === 'A') {
        setImageBPath(newPath);
        setImageBOpacity(1);
        setImageAOpacity(0);

        imageCrossfadeTimerRef.current = setTimeout(() => {
          imageCrossfadeTimerRef.current = null;
          setActiveImage('B');
        }, crossfadeDuration);
      } else {
        setImageAPath(newPath);
        setImageAOpacity(1);
        setImageBOpacity(0);

        imageCrossfadeTimerRef.current = setTimeout(() => {
          imageCrossfadeTimerRef.current = null;
          setActiveImage('A');
        }, crossfadeDuration);
      }
    },
    [activeImage, crossfadeDuration],
  );

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      if (crossfadeTimerRef.current) clearTimeout(crossfadeTimerRef.current);
      if (initTimerRef.current) clearTimeout(initTimerRef.current);
      if (imageCrossfadeTimerRef.current)
        clearTimeout(imageCrossfadeTimerRef.current);
    };
  }, []);

  // Handle image path changes
  useEffect(() => {
    console.log('VideoBackground received image path:', imagePath);
    if (!imagePath) return;

    // Convert file path to app://media/ URL for Electron
    const imageUrl = toAppMediaUrl(imagePath);

    console.log('Image URL:', imageUrl);

    // If no image is currently showing, set initial image
    if (!imageAPath && !imageBPath) {
      console.log('Setting initial image A');
      setImageAPath(imageUrl);
      setImageAOpacity(1);
      setImageBOpacity(0);
      setActiveImage('A');
    } else if (imageUrl !== imageAPath && imageUrl !== imageBPath) {
      // Crossfade to new image only if it's different
      console.log('Crossfading to new image');
      crossfadeToImage(imageUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- imageAPath/imageBPath are refs used for comparison, not deps
  }, [imagePath, crossfadeToImage]);

  return (
    <div className="absolute inset-0 bg-black">
      {/* Solid Color Background */}
      {backgroundType === 'color' && (
        <div className="absolute inset-0" style={{ backgroundColor }} />
      )}

      {/* Image Background with crossfade */}
      {backgroundType === 'image' && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: imageAPath ? `url(${imageAPath})` : undefined,
              opacity: imageAOpacity,
              transition: `opacity ${crossfadeDuration}ms ease-in-out`,
            }}
          />
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: imageBPath ? `url(${imageBPath})` : undefined,
              opacity: imageBOpacity,
              transition: `opacity ${crossfadeDuration}ms ease-in-out`,
            }}
          />
        </>
      )}

      {/* Video Background with crossfade */}
      {backgroundType === 'video' && (
        <>
          {/* Video A */}
          <video
            ref={videoARef}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              opacity: videoAOpacity,
              transition: `opacity ${crossfadeDuration}ms ease-in-out`,
            }}
            src={videoAPath || undefined}
            loop
            muted
            playsInline
            autoPlay
            onError={handleVideoError('A')}
            onLoadedData={handleVideoLoaded('A')}
            onCanPlay={() => console.log('Video A can play')}
          />

          {/* Video B */}
          <video
            ref={videoBRef}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              opacity: videoBOpacity,
              transition: `opacity ${crossfadeDuration}ms ease-in-out`,
            }}
            src={videoBPath || undefined}
            loop
            muted
            playsInline
            autoPlay
            onError={handleVideoError('B')}
            onLoadedData={handleVideoLoaded('B')}
            onCanPlay={() => console.log('Video B can play')}
          />
        </>
      )}
    </div>
  );
}
