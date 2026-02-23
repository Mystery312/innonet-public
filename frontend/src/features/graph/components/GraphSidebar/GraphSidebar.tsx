import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { GraphNode } from '../../types/graph';
import { NODE_COLORS } from '../../types/graph';
import styles from './GraphSidebar.module.css';

interface GraphSidebarProps {
  node: GraphNode | null;
  onClose: () => void;
  onConnect?: (userId: string) => void;
  onViewProfile?: (userId: string) => void;
  relatedNodes?: GraphNode[];
}

export const GraphSidebar: React.FC<GraphSidebarProps> = ({
  node,
  onClose,
  onConnect,
  onViewProfile: _onViewProfile,
  relatedNodes = [],
}) => {
  const navigate = useNavigate();

  if (!node) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <p>Click a node to view details</p>
        </div>
      </div>
    );
  }

  const handleViewProfile = () => {
    if (node.type === 'user') {
      navigate(`/profile/${node.id}`);
    } else if (node.type === 'community') {
      navigate(`/communities/${node.id}`);
    } else if (node.type === 'event') {
      navigate(`/events/${node.id}`);
    }
  };

  const renderUserDetails = () => (
    <>
      <div className={styles.header}>
        {node.image_url ? (
          <img src={node.image_url} alt={node.label} className={styles.avatar} />
        ) : (
          <div
            className={styles.avatarPlaceholder}
            style={{ backgroundColor: NODE_COLORS.user }}
          >
            {node.label.charAt(0).toUpperCase()}
          </div>
        )}
        <div className={styles.headerInfo}>
          <h3>{node.label}</h3>
          {node.properties?.username && (
            <p className={styles.username}>@{node.properties.username}</p>
          )}
        </div>
      </div>

      {node.properties?.location && (
        <p className={styles.location}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0a5.53 5.53 0 0 0-5.5 5.5c0 4.25 5.5 10.5 5.5 10.5s5.5-6.25 5.5-10.5A5.53 5.53 0 0 0 8 0Zm0 8a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z"/>
          </svg>
          {node.properties.location}
        </p>
      )}

      {node.properties?.similarity_score !== undefined && (
        <div className={styles.similarityBadge}>
          {Math.round(node.properties.similarity_score * 100)}% similar
        </div>
      )}

      {node.properties?.shared_skills?.length > 0 && (
        <div className={styles.section}>
          <h4>Shared Skills</h4>
          <div className={styles.tags}>
            {node.properties.shared_skills.map((skill: string) => (
              <span key={skill} className={styles.tag}>{skill}</span>
            ))}
          </div>
        </div>
      )}

      {node.properties?.shared_communities?.length > 0 && (
        <div className={styles.section}>
          <h4>Shared Communities</h4>
          <div className={styles.tags}>
            {node.properties.shared_communities.map((community: string) => (
              <span key={community} className={styles.tag}>{community}</span>
            ))}
          </div>
        </div>
      )}

      {node.properties?.reasons?.length > 0 && (
        <div className={styles.section}>
          <h4>Why Similar</h4>
          <ul className={styles.reasonsList}>
            {node.properties.reasons.map((reason: string, i: number) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.actions}>
        <button className={styles.primaryButton} onClick={handleViewProfile}>
          View Profile
        </button>
        {!node.properties?.is_current_user && onConnect && (
          <button className={styles.secondaryButton} onClick={() => onConnect(node.id)}>
            Connect
          </button>
        )}
      </div>
    </>
  );

  const renderSkillDetails = () => (
    <>
      <div className={styles.header}>
        <div
          className={styles.iconBadge}
          style={{ backgroundColor: NODE_COLORS.skill }}
        >
          ⚡
        </div>
        <div className={styles.headerInfo}>
          <h3>{node.label}</h3>
          <p className={styles.type}>Skill</p>
        </div>
      </div>

      {node.properties?.category && (
        <p className={styles.category}>Category: {node.properties.category}</p>
      )}

      {node.properties?.is_current && (
        <div className={styles.badge} style={{ backgroundColor: '#2da44e' }}>
          You have this skill
        </div>
      )}

      {node.properties?.is_target && (
        <div className={styles.badge} style={{ backgroundColor: '#bf8700' }}>
          Target skill
        </div>
      )}

      <div className={styles.actions}>
        <button
          className={styles.primaryButton}
          onClick={() => navigate(`/roadmap/skill/${encodeURIComponent(node.label)}`)}
        >
          View Skill Roadmap
        </button>
      </div>
    </>
  );

  const renderCommunityDetails = () => (
    <>
      <div className={styles.header}>
        {node.image_url ? (
          <img src={node.image_url} alt={node.label} className={styles.communityImage} />
        ) : (
          <div
            className={styles.iconBadge}
            style={{ backgroundColor: NODE_COLORS.community }}
          >
            👥
          </div>
        )}
        <div className={styles.headerInfo}>
          <h3>{node.label}</h3>
          <p className={styles.type}>Community</p>
        </div>
      </div>

      {node.properties?.category && (
        <p className={styles.category}>Category: {node.properties.category}</p>
      )}

      {node.properties?.member_count !== undefined && (
        <p className={styles.stat}>{node.properties.member_count} members</p>
      )}

      <div className={styles.actions}>
        <button className={styles.primaryButton} onClick={handleViewProfile}>
          View Community
        </button>
      </div>
    </>
  );

  const renderEventDetails = () => (
    <>
      <div className={styles.header}>
        <div
          className={styles.iconBadge}
          style={{ backgroundColor: NODE_COLORS.event }}
        >
          📅
        </div>
        <div className={styles.headerInfo}>
          <h3>{node.label}</h3>
          <p className={styles.type}>Event</p>
        </div>
      </div>

      {node.properties?.event_type && (
        <p className={styles.category}>Type: {node.properties.event_type}</p>
      )}

      {node.properties?.location_city && (
        <p className={styles.location}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0a5.53 5.53 0 0 0-5.5 5.5c0 4.25 5.5 10.5 5.5 10.5s5.5-6.25 5.5-10.5A5.53 5.53 0 0 0 8 0Zm0 8a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z"/>
          </svg>
          {node.properties.location_city}
        </p>
      )}

      <div className={styles.actions}>
        <button className={styles.primaryButton} onClick={handleViewProfile}>
          View Event
        </button>
      </div>
    </>
  );

  return (
    <div className={styles.container}>
      <button className={styles.closeButton} onClick={onClose}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"/>
        </svg>
      </button>

      <div className={styles.content}>
        {node.type === 'user' && renderUserDetails()}
        {node.type === 'skill' && renderSkillDetails()}
        {node.type === 'community' && renderCommunityDetails()}
        {node.type === 'event' && renderEventDetails()}
      </div>

      {relatedNodes.length > 0 && (
        <div className={styles.related}>
          <h4>Related</h4>
          <div className={styles.relatedList}>
            {relatedNodes.slice(0, 5).map((related) => (
              <div key={related.id} className={styles.relatedItem}>
                <span
                  className={styles.relatedDot}
                  style={{ backgroundColor: NODE_COLORS[related.type] }}
                />
                <span>{related.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphSidebar;
