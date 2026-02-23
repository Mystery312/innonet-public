import React, { useState, useMemo } from 'react';
import type { GraphNode, PathFinderProps } from '../../types/graph';
import { NODE_COLORS } from '../../types/graph';
import styles from './PathFinder.module.css';

export const PathFinder: React.FC<PathFinderProps> = ({
  nodes,
  onPathFind,
  pathResult,
  isLoading = false,
  onClear,
}) => {
  const [sourceId, setSourceId] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter nodes for dropdown (only users typically)
  const selectableNodes = useMemo(() => {
    return nodes.filter(
      (node) => node.type === 'user' || node.type === 'skill' || node.type === 'community'
    );
  }, [nodes]);

  // Filter nodes based on search query
  const filteredNodes = useMemo(() => {
    if (!searchQuery) return selectableNodes;
    const query = searchQuery.toLowerCase();
    return selectableNodes.filter((node) =>
      node.label.toLowerCase().includes(query)
    );
  }, [selectableNodes, searchQuery]);

  const handleFindPath = () => {
    if (sourceId && targetId && sourceId !== targetId) {
      onPathFind(sourceId, targetId);
    }
  };

  const handleClear = () => {
    setSourceId('');
    setTargetId('');
    setSearchQuery('');
    onClear?.();
  };

  const handleSwap = () => {
    const temp = sourceId;
    setSourceId(targetId);
    setTargetId(temp);
  };

  const getNodeById = (id: string): GraphNode | undefined => {
    return nodes.find((n) => n.id === id);
  };

  const sourceNode = sourceId ? getNodeById(sourceId) : null;
  const targetNode = targetId ? getNodeById(targetId) : null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        <h3>Find Path</h3>
      </div>

      <p className={styles.description}>
        Discover how two people or entities are connected in the network.
      </p>

      <div className={styles.selectors}>
        {/* Source Node Selector */}
        <div className={styles.selectorGroup}>
          <label>From</label>
          <div className={styles.nodeSelect}>
            {sourceNode ? (
              <div className={styles.selectedNode}>
                <span
                  className={styles.nodeIndicator}
                  style={{ backgroundColor: NODE_COLORS[sourceNode.type] }}
                />
                <span className={styles.nodeName}>{sourceNode.label}</span>
                <button
                  className={styles.clearBtn}
                  onClick={() => setSourceId('')}
                  aria-label="Clear source"
                >
                  &times;
                </button>
              </div>
            ) : (
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className={styles.select}
              >
                <option value="">Select start node...</option>
                {filteredNodes.map((node) => (
                  <option key={node.id} value={node.id} disabled={node.id === targetId}>
                    {node.label} ({node.type})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Swap Button */}
        <button
          className={styles.swapBtn}
          onClick={handleSwap}
          disabled={!sourceId && !targetId}
          aria-label="Swap nodes"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>

        {/* Target Node Selector */}
        <div className={styles.selectorGroup}>
          <label>To</label>
          <div className={styles.nodeSelect}>
            {targetNode ? (
              <div className={styles.selectedNode}>
                <span
                  className={styles.nodeIndicator}
                  style={{ backgroundColor: NODE_COLORS[targetNode.type] }}
                />
                <span className={styles.nodeName}>{targetNode.label}</span>
                <button
                  className={styles.clearBtn}
                  onClick={() => setTargetId('')}
                  aria-label="Clear target"
                >
                  &times;
                </button>
              </div>
            ) : (
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className={styles.select}
              >
                <option value="">Select end node...</option>
                {filteredNodes.map((node) => (
                  <option key={node.id} value={node.id} disabled={node.id === sourceId}>
                    {node.label} ({node.type})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          className={styles.findBtn}
          onClick={handleFindPath}
          disabled={!sourceId || !targetId || sourceId === targetId || isLoading}
        >
          {isLoading ? (
            <>
              <span className={styles.spinner} />
              Finding...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              Find Path
            </>
          )}
        </button>

        {(sourceId || targetId || pathResult) && (
          <button className={styles.clearAllBtn} onClick={handleClear}>
            Clear
          </button>
        )}
      </div>

      {/* Path Result */}
      {pathResult && (
        <div className={styles.result}>
          {pathResult.found ? (
            <>
              <div className={styles.resultHeader}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>Path found! ({pathResult.length - 1} step{pathResult.length > 2 ? 's' : ''})</span>
              </div>

              <div className={styles.pathVisualization}>
                {pathResult.path.map((node, index) => (
                  <React.Fragment key={node.id}>
                    <div className={styles.pathNode}>
                      <span
                        className={styles.pathNodeIndicator}
                        style={{ backgroundColor: NODE_COLORS[node.type] }}
                      />
                      <div className={styles.pathNodeInfo}>
                        <span className={styles.pathNodeLabel}>{node.label}</span>
                        <span className={styles.pathNodeType}>{node.type}</span>
                      </div>
                    </div>
                    {index < pathResult.path.length - 1 && (
                      <div className={styles.pathConnector}>
                        <div className={styles.pathLine} />
                        {pathResult.edges[index] && (
                          <span className={styles.pathEdgeLabel}>
                            {pathResult.edges[index].type.replace(/_/g, ' ').toLowerCase()}
                          </span>
                        )}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 5v14M19 12l-7 7-7-7" />
                        </svg>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {pathResult.relationshipTypes.length > 0 && (
                <div className={styles.relationshipTypes}>
                  <span className={styles.relationshipLabel}>Relationships:</span>
                  {pathResult.relationshipTypes.map((type, i) => (
                    <span key={i} className={styles.relationshipBadge}>
                      {type.replace(/_/g, ' ').toLowerCase()}
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className={styles.noPath}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
              <span>No path found between these nodes.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PathFinder;
