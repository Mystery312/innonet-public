import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { GraphNode, NodeType } from '../../types/graph';
import { NODE_COLORS } from '../../types/graph';
import styles from './GraphSidebar.module.css';

interface GraphSidebarProps {
  node: GraphNode | null;
  onClose: () => void;
  onConnect?: (userId: string) => void;
  onViewProfile?: (userId: string) => void;
  onSelectRelated?: (node: GraphNode) => void;
  relatedNodes?: GraphNode[];
}

/** Capitalised label for the kind-tag pill. */
const KIND_LABEL: Record<string, string> = {
  user:      'Builder',
  skill:     'Skill',
  community: 'Community',
  event:     'Event',
  company:   'Company',
  project:   'Project',
  search:    'Search',
};

/** A relationship label for a related node (best-effort from properties). */
const relLabel = (n: GraphNode): string => {
  if (n.properties?.relationship) return String(n.properties.relationship);
  if (n.type) return KIND_LABEL[n.type] || n.type;
  return '';
};

// ─────────────────────────────────────────────────────────────────
// Tiny inline icons (16px, currentColor)
// ─────────────────────────────────────────────────────────────────
const I = {
  pin: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0a5.53 5.53 0 0 0-5.5 5.5c0 4.25 5.5 10.5 5.5 10.5s5.5-6.25 5.5-10.5A5.53 5.53 0 0 0 8 0Zm0 8a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
    </svg>
  ),
  close: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
    </svg>
  ),
  focus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </svg>
  ),
};

// ─────────────────────────────────────────────────────────────────
// GraphSidebar
// ─────────────────────────────────────────────────────────────────
export const GraphSidebar: React.FC<GraphSidebarProps> = ({
  node,
  onClose,
  onConnect,
  onViewProfile,
  onSelectRelated,
  relatedNodes = [],
}) => {
  const navigate = useNavigate();

  // ── Empty state ──
  if (!node) {
    return (
      <div className={styles.empty}>
        {I.focus}
        <h3>Nothing selected</h3>
        <p>Tap any node in the graph to see who they are, what they're connected to, and what they've shipped.</p>
      </div>
    );
  }

  const color = NODE_COLORS[node.type as NodeType] || NODE_COLORS.user || '#3232FF';
  const initial = (node.label || '?').trim().charAt(0).toUpperCase();
  const kindLabel = KIND_LABEL[node.type] || node.type;

  // ── Navigation per node type ──
  const handlePrimaryAction = () => {
    if (node.type === 'user') {
      if (onViewProfile) onViewProfile(node.id);
      else navigate(`/profile/${node.id}`);
    } else if (node.type === 'community') {
      navigate(`/communities/${node.id}`);
    } else if (node.type === 'event') {
      navigate(`/events/${node.id}`);
    } else if (node.type === 'skill') {
      navigate(`/roadmap?skill=${encodeURIComponent(node.label)}`);
    }
  };
  const primaryLabel: Record<string, string> = {
    user:      'View profile',
    community: 'View community',
    event:     'View event',
    skill:     'View roadmap',
    company:   'View company',
  };

  // ── Sub label per type ──
  const sub = (() => {
    if (node.type === 'user' && node.properties?.username) return `@${node.properties.username}`;
    if (node.type === 'user' && node.properties?.title)    return String(node.properties.title);
    if (node.type === 'community' && node.properties?.category) return String(node.properties.category);
    if (node.type === 'event' && node.properties?.event_type)   return String(node.properties.event_type);
    if (node.type === 'skill' && node.properties?.category)     return String(node.properties.category);
    return '';
  })();

  return (
    <div className={styles.container}>
      <button
        className={styles.closeButton}
        onClick={onClose}
        aria-label="Close selection"
      >
        {I.close}
      </button>

      {/* ── Head ── */}
      <div className={styles.head}>
        <div className={styles.dot} style={{ background: color }}>
          {node.image_url ? <img src={node.image_url} alt="" /> : initial}
        </div>
        <div className={styles.headInfo}>
          <h3 className={styles.name}>{node.label}</h3>
          {sub && <p className={styles.sub}>{sub}</p>}
          <span
            className={styles.kindTag}
            style={{
              background: `color-mix(in srgb, ${color} 18%, transparent)`,
              color,
            }}
          >
            {kindLabel}
          </span>
        </div>
      </div>

      {/* ── Type-specific meta ── */}
      {node.type === 'user' && Boolean(node.properties?.location) && (
        <p className={styles.meta}>
          {I.pin}
          {String(node.properties.location)}
        </p>
      )}

      {node.type === 'event' && Boolean(node.properties?.location_city) && (
        <p className={styles.meta}>
          {I.pin}
          {String(node.properties.location_city)}
        </p>
      )}

      {node.type === 'community' && node.properties?.member_count !== undefined && (
        <p className={styles.meta}>
          <strong>{Number(node.properties.member_count)}</strong> members
        </p>
      )}

      {node.properties?.similarity_score !== undefined && (
        <span className={styles.similarityBadge}>
          {Math.round(Number(node.properties.similarity_score) * 100)}% similar
        </span>
      )}

      {node.type === 'skill' && Boolean(node.properties?.is_current) && (
        <span className={`${styles.stateBadge} ${styles.success}`}>You have this skill</span>
      )}
      {node.type === 'skill' && Boolean(node.properties?.is_target) && (
        <span className={`${styles.stateBadge} ${styles.warning}`}>Target skill</span>
      )}

      {/* ── Shared skills ── */}
      {Array.isArray(node.properties?.shared_skills) && node.properties!.shared_skills.length > 0 && (
        <div className={styles.section}>
          <h4>Shared skills</h4>
          <div className={styles.tags}>
            {(node.properties!.shared_skills as string[]).map((skill: string) => (
              <span key={skill} className={styles.tag}>{skill}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── Shared communities ── */}
      {Array.isArray(node.properties?.shared_communities) && node.properties!.shared_communities.length > 0 && (
        <div className={styles.section}>
          <h4>Shared communities</h4>
          <div className={styles.tags}>
            {(node.properties!.shared_communities as string[]).map((c: string) => (
              <span key={c} className={styles.tag}>{c}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── Why similar ── */}
      {Array.isArray(node.properties?.reasons) && node.properties!.reasons.length > 0 && (
        <div className={styles.section}>
          <h4>Why similar</h4>
          <ul className={styles.reasonsList}>
            {(node.properties!.reasons as string[]).map((reason: string, i: number) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Actions ── */}
      <div className={styles.actions}>
        <button className={styles.primary} onClick={handlePrimaryAction}>
          {primaryLabel[node.type] || 'Open'}
        </button>
        {node.type === 'user' && !node.properties?.is_current_user && onConnect && (
          <button className={styles.secondary} onClick={() => onConnect(node.id)}>
            Connect
          </button>
        )}
      </div>

      {/* ── Related ── */}
      {relatedNodes.length > 0 && (
        <div className={styles.related}>
          <h4>Related</h4>
          <div className={styles.relatedList}>
            {relatedNodes.slice(0, 6).map((r) => (
              <button
                key={r.id}
                className={styles.relatedRow}
                onClick={() => onSelectRelated?.(r)}
                disabled={!onSelectRelated}
                style={!onSelectRelated ? { cursor: 'default' } : undefined}
              >
                <span
                  className={styles.swatch}
                  style={{ background: NODE_COLORS[r.type as NodeType] || NODE_COLORS.user }}
                />
                <span className={styles.label}>{r.label}</span>
                <span className={styles.rel}>{relLabel(r)}</span>
              </button>
            ))}
            {relatedNodes.length > 6 && (
              <div className={styles.relatedMore}>
                + {relatedNodes.length - 6} more
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphSidebar;
