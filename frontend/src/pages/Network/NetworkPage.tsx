import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { NetworkGraph } from '../../features/network/components/NetworkGraph';
import { BackButton } from '../../components/common/BackButton';
import { networkApi } from '../../features/network/api/networkApi';
import type { NetworkGraph as NetworkGraphType, NetworkGraphNode, NetworkStats } from '../../types/network';
import styles from './NetworkPage.module.css';

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

  const handleDepthChange = (newDepth: number) => {
    setDepth(newDepth);
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading your network...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={loadData} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.backNav}>
        <BackButton fallbackPath="/events" />
      </div>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>Your Network</h1>
          <p>Visualize your professional connections and discover paths to new contacts.</p>
        </div>
        {stats && (
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{stats.total_connections}</span>
              <span className={styles.statLabel}>Connections</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{stats.pending_requests}</span>
              <span className={styles.statLabel}>Pending</span>
            </div>
          </div>
        )}
      </div>

      <div className={styles.controls}>
        <label className={styles.depthControl}>
          <span>Network Depth:</span>
          <select value={depth} onChange={(e) => handleDepthChange(Number(e.target.value))}>
            <option value={1}>1st degree only</option>
            <option value={2}>Up to 2nd degree</option>
            <option value={3}>Up to 3rd degree</option>
          </select>
        </label>
      </div>

      <div className={styles.graphContainer}>
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
