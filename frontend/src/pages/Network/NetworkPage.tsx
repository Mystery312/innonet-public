import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { NetworkGraph } from '../../features/network/components/NetworkGraph';
import { BackButton } from '../../components/common/BackButton';
import { networkApi } from '../../features/network/api/networkApi';
import { Button } from '@/components/ui/button';
import type { NetworkGraph as NetworkGraphType, NetworkGraphNode, NetworkStats } from '../../types/network';

export const NetworkPage: React.FC = () => {
  const navigate = useNavigate();
  const [graphData, setGraphData] = useState<NetworkGraphType | null>(null);
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [depth, setDepth] = useState(2);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [graph, networkStats] = await Promise.all([
        networkApi.getNetworkGraph(depth),
        networkApi.getNetworkStats(),
      ]);
      setGraphData(graph);
      setStats(networkStats);
    } catch (error) {
      console.error('Failed to load network data:', error);
      setError('Failed to load network data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [depth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleNodeClick = useCallback((node: NetworkGraphNode) => {
    if (!node.isCurrentUser) {
      navigate(`/profile/${node.id}`);
    }
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm">Loading your network...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={loadData}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
        <div className="flex items-center gap-3">
          <BackButton fallbackPath="/events" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">Your Network</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Visualize your professional connections
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:block">Depth:</span>
          {[1, 2, 3].map((d) => (
            <Button
              key={d}
              variant={depth === d ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setDepth(d)}
              className="w-8 h-8 p-0 text-xs"
            >
              {d}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats strip */}
      {stats && (
        <div className="flex gap-6 px-4 py-2 border-b bg-muted/30 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-foreground">{stats.total_connections}</span>
            <span className="text-muted-foreground">Connections</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-foreground">{stats.pending_requests}</span>
            <span className="text-muted-foreground">Pending</span>
          </div>
        </div>
      )}

      {/* Graph canvas */}
      <div className="flex-1 relative overflow-hidden">
        {graphData && (
          <NetworkGraph
            data={graphData}
            onNodeClick={handleNodeClick}
          />
        )}
      </div>
    </div>
  );
};

export default NetworkPage;
