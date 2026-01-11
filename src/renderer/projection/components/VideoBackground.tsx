import { useState, useRef, useEffect, useCallback } from 'react';

interface VideoBackgroundProps {
  videoPath: string | null;
  crossfadeDuration?: number;
}

export default function VideoBackground({
  videoPath,
  crossfadeDuration = 1000,
}: VideoBackgroundProps) {
  const [activeVideo, setActiveVideo] = useState<'A' | 'B'>('A');
  const [videoAPath, setVideoAPath] = useState<string | null>(null);
  const [videoBPath, setVideoBPath] = useState<string | null>(null);
  const [videoAOpacity, setVideoAOpacity] = useState(1);
  const [videoBOpacity, setVideoBOpacity] = useState(0);

  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);

  const crossfadeToVideo = useCallback(
    (newPath: string) => {
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
        setTimeout(() => {
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
        setTimeout(() => {
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

    // Convert file path to file:// URL for Electron
    // Properly encode the path to handle spaces and special characters
    let videoUrl: string;
    if (videoPath.startsWith('file://')) {
      videoUrl = videoPath;
    } else {
      // Encode path components but keep slashes
      const encodedPath = videoPath
        .split('/')
        .map((part) => encodeURIComponent(part))
        .join('/');
      videoUrl = `file://${encodedPath}`;
    }

    console.log('Video URL:', videoUrl);

    // If no video is currently playing, set initial video
    if (!videoAPath && !videoBPath) {
      console.log('Setting initial video A');
      setVideoAPath(videoUrl);
      setVideoAOpacity(1);
      setVideoBOpacity(0);
      setActiveVideo('A');
      // Small delay to ensure video element is ready
      setTimeout(() => {
        const videoA = videoARef.current;
        if (videoA) {
          console.log('Playing video A');
          videoA.load();
          videoA.play().catch((e) => {
            console.error('Video A autoplay failed:', e);
            // Try again with muted (required for some browsers)
            videoA.muted = true;
            videoA.play().catch(console.error);
          });
        }
      }, 100);
    } else if (videoUrl !== videoAPath && videoUrl !== videoBPath) {
      // Crossfade to new video only if it's different
      console.log('Crossfading to new video');
      crossfadeToVideo(videoUrl);
    }
  }, [videoPath]);

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

  return (
    <div className="absolute inset-0 bg-black">
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
    </div>
  );
}
