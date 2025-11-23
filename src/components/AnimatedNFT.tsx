import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface AnimatedNFTProps {
  src: string;
  alt: string;
  rarity: string;
  className?: string;
  autoplay?: boolean;
  controls?: boolean;
  poster?: string;
}

const ANIMATION_URLS: { [key: string]: string } = {
  'pepe': 'https://media.giphy.com/media/VbnUQpnihPSIgIXuZv/giphy.gif',
  'wojak': 'https://media.giphy.com/media/8ymvg6pl1Lzy0/giphy.gif',
  'doge': 'https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif',
  'chad': 'https://media.giphy.com/media/CAYVZA5NRb529kKQUc/giphy.gif',
  'default': 'https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif',
};

const RARITY_EFFECTS: { [key: string]: string } = {
  'common': 'brightness-100',
  'uncommon': 'brightness-110',
  'rare': 'brightness-125 drop-shadow-lg',
  'epic': 'brightness-150 drop-shadow-xl saturate-150',
  'legendary': 'brightness-200 drop-shadow-2xl saturate-200 hue-rotate-15',
};

export default function AnimatedNFT({
  src,
  alt,
  rarity,
  className = '',
  autoplay = true,
  controls = false,
  poster
}: AnimatedNFTProps) {
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [isVideo, setIsVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [animationSrc, setAnimationSrc] = useState(src);

  useEffect(() => {
    const isVideoFile = src.match(/\.(mp4|webm|mov)$/i);
    setIsVideo(!!isVideoFile);

    if (!isVideoFile && !src.match(/\.(gif)$/i)) {
      const itemName = alt.toLowerCase().replace(/\s+/g, '');
      setAnimationSrc(ANIMATION_URLS[itemName] || ANIMATION_URLS.default);
    }
  }, [src, alt]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleError = () => {
    if (!src.match(/\.(gif)$/i)) {
      setAnimationSrc(ANIMATION_URLS.default);
    }
  };

  const rarityEffect = RARITY_EFFECTS[rarity] || RARITY_EFFECTS.common;

  return (
    <div className={`relative group ${className}`}>
      <div className={`relative overflow-hidden rounded-lg ${rarityEffect}`}>
        {isVideo ? (
          <video
            ref={videoRef}
            autoPlay={autoplay}
            muted
            loop
            playsInline
            preload="auto"
            poster={poster}
            onError={handleError}
            className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110"
          >
            <source src={animationSrc} type="video/mp4" />
            <source src={animationSrc.replace('.mp4', '.webm')} type="video/webm" />
            <img src={poster || src} alt={alt} className="w-full h-full object-cover" />
          </video>
        ) : (
          <img
            src={animationSrc}
            alt={alt}
            onError={handleError}
            className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110"
          />
        )}

        {rarity === 'legendary' && (
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 animate-pulse pointer-events-none" />
        )}

        {rarity === 'epic' && (
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20 animate-pulse pointer-events-none" />
        )}

        {rarity === 'rare' && (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-blue-500/10 pointer-events-none" />
        )}
      </div>

      {controls && isVideo && (
        <button
          onClick={togglePlay}
          className="absolute bottom-2 right-2 bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
      )}

      <div className="absolute inset-0 border-2 border-transparent group-hover:border-white/20 rounded-lg pointer-events-none transition-all" />

      {rarity === 'legendary' && (
        <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 rounded-lg opacity-50 blur-lg animate-pulse pointer-events-none" />
      )}

      {rarity === 'epic' && (
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-lg opacity-30 blur-md animate-pulse pointer-events-none" />
      )}
    </div>
  );
}
