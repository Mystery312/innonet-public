import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabPanel } from '../../components/common/Tabs';
import { ConnectionCard } from '../../features/network/components/ConnectionCard';
import { networkApi } from '../../features/network/api/networkApi';
import type { Connection, PendingRequest } from '../../types/network';
import styles from './ConnectionsPage.module.css';

export const ConnectionsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('connections');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<PendingRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<PendingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [connectionsData, pendingData] = await Promise.all([
        networkApi.getConnections(),
        networkApi.getPendingRequests(),
      ]);
      setConnections(connectionsData.connections);
      setReceivedRequests(pendingData.received);
      setSentRequests(pendingData.sent);
    } catch (error) {
      console.error('Failed to load connections:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAccept = async (connectionId: string) => {
    setActionLoading(connectionId);
    try {
      await networkApi.acceptConnection(connectionId);
      await loadData();
    } catch (error) {
      console.error('Failed to accept connection:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (connectionId: string) => {
    setActionLoading(connectionId);
    try {
      await networkApi.declineConnection(connectionId);
      setReceivedRequests((prev) => prev.filter((r) => r.connection_id !== connectionId));
    } catch (error) {
      console.error('Failed to decline connection:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (connectionId: string) => {
    setActionLoading(connectionId);
    try {
      await networkApi.removeConnection(connectionId);
      setConnections((prev) => prev.filter((c) => c.connection_id !== connectionId));
    } catch (error) {
      console.error('Failed to remove connection:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (connectionId: string) => {
    setActionLoading(connectionId);
    try {
      await networkApi.removeConnection(connectionId);
      setSentRequests((prev) => prev.filter((r) => r.connection_id !== connectionId));
    } catch (error) {
      console.error('Failed to cancel request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const tabs = [
    { id: 'connections', label: 'Connections', count: connections.length },
    { id: 'received', label: 'Received', count: receivedRequests.length },
    { id: 'sent', label: 'Sent', count: sentRequests.length },
  ];

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading connections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Connections</h1>
        <p>Manage your professional network and pending requests.</p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <TabPanel id="connections" activeTab={activeTab}>
        {connections.length === 0 ? (
          <div className={styles.empty}>
            <h3>No connections yet</h3>
            <p>Start building your network by connecting with professionals.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {connections.map((connection) => (
              <ConnectionCard
                key={connection.connection_id}
                connection={connection}
                type="connected"
                onRemove={handleRemove}
                isLoading={actionLoading === connection.connection_id}
              />
            ))}
          </div>
        )}
      </TabPanel>

      <TabPanel id="received" activeTab={activeTab}>
        {receivedRequests.length === 0 ? (
          <div className={styles.empty}>
            <h3>No pending requests</h3>
            <p>You don't have any connection requests to review.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {receivedRequests.map((request) => (
              <ConnectionCard
                key={request.connection_id}
                connection={request}
                type="received"
                onAccept={handleAccept}
                onDecline={handleDecline}
                isLoading={actionLoading === request.connection_id}
              />
            ))}
          </div>
        )}
      </TabPanel>

      <TabPanel id="sent" activeTab={activeTab}>
        {sentRequests.length === 0 ? (
          <div className={styles.empty}>
            <h3>No sent requests</h3>
            <p>You haven't sent any connection requests.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {sentRequests.map((request) => (
              <ConnectionCard
                key={request.connection_id}
                connection={request}
                type="sent"
                onCancel={handleCancel}
                isLoading={actionLoading === request.connection_id}
              />
            ))}
          </div>
        )}
      </TabPanel>
    </div>
  );
};

export default ConnectionsPage;
