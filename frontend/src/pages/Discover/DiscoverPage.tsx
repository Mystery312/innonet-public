import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { discoverApi } from '../../features/discover/api/discoverApi';
import { SwipeCard } from '../../features/discover/components/SwipeCard';
import { DiscoverStats } from '../../features/discover/components/DiscoverStats';
import type { DiscoverProfileCard, DiscoverStats as DiscoverStatsType, DiscoverFilters } from '../../features/discover/types/discover';

const PAGE_SIZE = 20;

export const DiscoverPage: React.FC = () => {
  const [profiles, setProfiles] = useState<DiscoverProfileCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stats, setStats] = useState<DiscoverStatsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Connect dialog
  const [pendingConnect, setPendingConnect] = useState<string | null>(null);
  const [connectMessage, setConnectMessage] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  // Filters dialog
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<DiscoverFilters>({
    location: '',
    min_similarity: 0.5,
    strategy: 'mixed',
  });
  const [pendingFilters, setPendingFilters] = useState<DiscoverFilters>(filters);

  const fetchMore = useCallback(async (currentOffset: number, reset = false) => {
    try {
      const feed = await discoverApi.getFeed({
        limit: PAGE_SIZE,
        offset: currentOffset,
        location: filters.location || undefined,
        min_similarity: filters.min_similarity,
        strategy: filters.strategy,
      });
      setProfiles((prev) => reset ? feed.profiles : [...prev, ...feed.profiles]);
      setHasMore(feed.has_more);
      setOffset(currentOffset + feed.profiles.length);
    } catch (err) {
      console.error('Failed to fetch discover feed:', err);
    }
  }, [filters]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      setProfiles([]);
      setCurrentIndex(0);
      setOffset(0);
      await Promise.all([
        fetchMore(0, true),
        discoverApi.getStats().then(setStats).catch(() => {}),
      ]);
      setIsLoading(false);
    };
    init();
  }, [filters, fetchMore]);

  // Prefetch next page when 3 cards from end
  useEffect(() => {
    if (!isLoading && hasMore && currentIndex >= profiles.length - 3) {
      fetchMore(offset);
    }
  }, [currentIndex, profiles.length, isLoading, hasMore, offset, fetchMore]);

  const handleSwipe = useCallback((action: 'pass' | 'connect') => {
    if (action === 'connect') {
      setPendingConnect(profiles[currentIndex]?.user_id ?? null);
      return;
    }
    const profile = profiles[currentIndex];
    if (!profile) return;
    discoverApi.swipe({ target_user_id: profile.user_id, action }).catch(console.error);
    setCurrentIndex((i) => i + 1);
    discoverApi.getStats().then(setStats).catch(() => {});
  }, [profiles, currentIndex]);

  const handleConfirmConnect = useCallback(async () => {
    if (!pendingConnect) return;
    setIsConnecting(true);
    try {
      await discoverApi.swipe({
        target_user_id: pendingConnect,
        action: 'connect',
        message: connectMessage.trim() || undefined,
      });
      setCurrentIndex((i) => i + 1);
      discoverApi.getStats().then(setStats).catch(() => {});
    } catch (err) {
      console.error('Swipe failed:', err);
    } finally {
      setPendingConnect(null);
      setConnectMessage('');
      setIsConnecting(false);
    }
  }, [pendingConnect, connectMessage]);

  const handleApplyFilters = () => {
    setFilters(pendingFilters);
    setShowFilters(false);
  };

  const isDone = !isLoading && (profiles.length === 0 || currentIndex >= profiles.length);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b sticky top-0 z-10">
        <h1 className="text-lg font-bold text-foreground">Discover</h1>
        <button
          onClick={() => { setPendingFilters(filters); setShowFilters(true); }}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          Filters
        </button>
      </div>

      {/* Stats */}
      <DiscoverStats stats={stats} />

      {/* Card area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        {isLoading ? (
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm">Finding people for you…</p>
          </div>
        ) : isDone ? (
          <div className="text-center max-w-xs">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-foreground mb-2">You're all caught up!</h2>
            <p className="text-sm text-muted-foreground mb-6">
              No more profiles right now. Check back later or adjust your filters.
            </p>
            {stats && (
              <div className="flex justify-center gap-6 text-sm">
                <div className="text-center">
                  <div className="font-bold text-foreground">{stats.total_connection_requests}</div>
                  <div className="text-muted-foreground">Requests sent</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-foreground">{Math.round(stats.success_rate)}%</div>
                  <div className="text-muted-foreground">Success rate</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="relative w-full max-w-sm">
            {/* Background card (next profile) */}
            {currentIndex + 1 < profiles.length && (
              <div className="absolute inset-0">
                <SwipeCard
                  profile={profiles[currentIndex + 1]}
                  onSwipe={() => {}}
                  isActive={false}
                />
              </div>
            )}
            {/* Active card */}
            <div className="relative">
              <SwipeCard
                profile={profiles[currentIndex]}
                onSwipe={handleSwipe}
                isActive={true}
              />
            </div>
          </div>
        )}
      </div>

      {/* Connect message dialog */}
      <Dialog open={!!pendingConnect} onOpenChange={() => { setPendingConnect(null); setConnectMessage(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send a connection request</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={connectMessage}
              onChange={(e) => setConnectMessage(e.target.value)}
              placeholder="Add a message (optional)"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1.5 text-right">{connectMessage.length}/500</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setPendingConnect(null); setConnectMessage(''); }}
              disabled={isConnecting}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmConnect} isLoading={isConnecting}>
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filters dialog */}
      <Dialog open={showFilters} onOpenChange={setShowFilters}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discovery Filters</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Location</label>
              <Input
                value={pendingFilters.location}
                onChange={(e) => setPendingFilters((f) => ({ ...f, location: e.target.value }))}
                placeholder="e.g. San Francisco"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Minimum match score: {Math.round(pendingFilters.min_similarity * 100)}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={Math.round(pendingFilters.min_similarity * 100)}
                onChange={(e) =>
                  setPendingFilters((f) => ({ ...f, min_similarity: Number(e.target.value) / 100 }))
                }
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0%</span><span>50%</span><span>100%</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Matching strategy</label>
              <div className="flex gap-2">
                {(['mixed', 'semantic', 'skills'] as const).map((s) => (
                  <Button
                    key={s}
                    variant={pendingFilters.strategy === s ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setPendingFilters((f) => ({ ...f, strategy: s }))}
                    className="capitalize flex-1"
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFilters(false)}>Cancel</Button>
            <Button onClick={handleApplyFilters}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DiscoverPage;
