import React, { useRef, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DiscoverProfileCard } from '../types/discover';

interface SwipeCardProps {
  profile: DiscoverProfileCard;
  onSwipe: (action: 'pass' | 'connect') => void;
  isActive: boolean;
}

export const SwipeCard: React.FC<SwipeCardProps> = ({ profile, onSwipe, isActive }) => {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 80;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!isActive) return;
    setIsDragging(true);
    startX.current = e.clientX - dragX;
    cardRef.current?.setPointerCapture(e.pointerId);
  }, [isActive, dragX]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - startX.current;
    setDragX(Math.max(-160, Math.min(160, newX)));
  }, [isDragging]);

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragX > SWIPE_THRESHOLD) {
      onSwipe('connect');
    } else if (dragX < -SWIPE_THRESHOLD) {
      onSwipe('pass');
    } else {
      setDragX(0);
    }
  }, [isDragging, dragX, onSwipe]);

  const rotation = dragX * 0.08;
  const connectOpacity = Math.min(1, Math.max(0, (dragX - 20) / 60));
  const passOpacity = Math.min(1, Math.max(0, (-dragX - 20) / 60));

  return (
    <div
      className={cn(
        'relative w-full max-w-sm mx-auto',
        !isActive && 'pointer-events-none'
      )}
      style={{
        transform: isActive
          ? `translateX(${dragX}px) rotate(${rotation}deg)`
          : 'scale(0.95) translateY(12px)',
        transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        zIndex: isActive ? 1 : 0,
      }}
    >
      <div
        ref={cardRef}
        className="rounded-3xl overflow-hidden shadow-2xl bg-white dark:bg-gray-900 select-none cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Image / gradient area */}
        <div className="relative h-72 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600">
          {profile.profile_image_url && (
            <img
              src={profile.profile_image_url}
              alt={profile.full_name || profile.username}
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />
          )}

          {/* Connect overlay */}
          <div
            className="absolute inset-0 bg-green-500/30 flex items-center justify-center"
            style={{ opacity: connectOpacity }}
          >
            <span className="text-4xl font-black text-green-400 border-4 border-green-400 rounded-2xl px-4 py-1 rotate-[-15deg]">
              CONNECT
            </span>
          </div>

          {/* Pass overlay */}
          <div
            className="absolute inset-0 bg-red-500/30 flex items-center justify-center"
            style={{ opacity: passOpacity }}
          >
            <span className="text-4xl font-black text-red-400 border-4 border-red-400 rounded-2xl px-4 py-1 rotate-[15deg]">
              PASS
            </span>
          </div>

          {/* Bottom gradient + name */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-5">
            <h2 className="text-xl font-bold text-white leading-tight">
              {profile.full_name || profile.username}
            </h2>
            {profile.location && (
              <p className="text-sm text-white/80 flex items-center gap-1 mt-0.5">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                {profile.location}
              </p>
            )}
          </div>
        </div>

        {/* Info section */}
        <div className="p-4">
          {/* Similarity bar */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-green-500"
                style={{ width: `${profile.similarity_score * 100}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-muted-foreground shrink-0">
              {Math.round(profile.similarity_score * 100)}% match
            </span>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{profile.bio}</p>
          )}

          {/* Skills */}
          {profile.top_skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {profile.top_skills.slice(0, 5).map((skill) => (
                <Badge key={skill} variant="default" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          )}

          {/* Match reasons */}
          {profile.match_reasons.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {profile.match_reasons[0]}
            </p>
          )}
        </div>
      </div>

      {/* Action buttons — only shown on active card */}
      {isActive && (
        <div className="flex justify-center gap-8 mt-5">
          <button
            onClick={() => onSwipe('pass')}
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-md border-2 border-red-400 text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
            aria-label="Pass"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            onClick={() => onSwipe('connect')}
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-md border-2 border-green-500 text-green-500 hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
            aria-label="Connect"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default SwipeCard;
