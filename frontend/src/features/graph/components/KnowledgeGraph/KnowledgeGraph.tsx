import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import type {
  GraphNode,
  KnowledgeGraphProps,
} from '../../types/graph';
import { NODE_COLORS, CLUSTER_COLORS } from '../../types/graph';
import styles from './KnowledgeGraph.module.css';

interface SimulationNode extends GraphNode {
  x: number;
  y: number;
  fx?: number | null;
  fy?: number | null;
  // For local view filtering
  distanceFromFocus?: number;
  isInPath?: boolean;
}

interface SimulationLink {
  source: SimulationNode;
  target: SimulationNode;
  type: string;
  weight?: number;
  label?: string;
  isInPath?: boolean;
}

// Helper: Get connected node IDs from a node
function getConnectedNodeIds(
  nodeId: string,
  links: SimulationLink[],
  depth: number = 1
): Set<string> {
  const connected = new Set<string>([nodeId]);
  let frontier = new Set<string>([nodeId]);

  for (let i = 0; i < depth; i++) {
    const nextFrontier = new Set<string>();
    for (const link of links) {
      const sourceId = link.source.id;
      const targetId = link.target.id;

      if (frontier.has(sourceId) && !connected.has(targetId)) {
        connected.add(targetId);
        nextFrontier.add(targetId);
      }
      if (frontier.has(targetId) && !connected.has(sourceId)) {
        connected.add(sourceId);
        nextFrontier.add(sourceId);
      }
    }
    frontier = nextFrontier;
  }

  return connected;
}

// Helper: Calculate node distances from focus node using BFS
function calculateDistances(
  focusId: string,
  _nodes: SimulationNode[],
  links: SimulationLink[]
): Map<string, number> {
  const distances = new Map<string, number>();
  distances.set(focusId, 0);

  const queue: string[] = [focusId];
  const visited = new Set<string>([focusId]);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentDistance = distances.get(currentId)!;

    for (const link of links) {
      const sourceId = link.source.id;
      const targetId = link.target.id;

      let neighborId: string | null = null;
      if (sourceId === currentId && !visited.has(targetId)) {
        neighborId = targetId;
      } else if (targetId === currentId && !visited.has(sourceId)) {
        neighborId = sourceId;
      }

      if (neighborId) {
        visited.add(neighborId);
        distances.set(neighborId, currentDistance + 1);
        queue.push(neighborId);
      }
    }
  }

  return distances;
}

// Helper: Find path between two nodes using BFS
function findPath(
  sourceId: string,
  targetId: string,
  links: SimulationLink[]
): string[] | null {
  if (sourceId === targetId) return [sourceId];

  const queue: string[][] = [[sourceId]];
  const visited = new Set<string>([sourceId]);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];

    for (const link of links) {
      const linkSourceId = link.source.id;
      const linkTargetId = link.target.id;

      let neighborId: string | null = null;
      if (linkSourceId === current && !visited.has(linkTargetId)) {
        neighborId = linkTargetId;
      } else if (linkTargetId === current && !visited.has(linkSourceId)) {
        neighborId = linkSourceId;
      }

      if (neighborId) {
        const newPath = [...path, neighborId];
        if (neighborId === targetId) {
          return newPath;
        }
        visited.add(neighborId);
        queue.push(newPath);
      }
    }
  }

  return null;
}

// Helper: Generate convex hull points for cluster
function getConvexHull(points: [number, number][]): [number, number][] | null {
  if (points.length < 3) return null;
  return d3.polygonHull(points);
}

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  data,
  width = 900,
  height = 600,
  onNodeClick,
  onNodeHover,
  selectedNodeId,
  showLabels = true,
  showEdgeLabels = false,
  // Obsidian-like features
  viewMode = 'full',
  localOptions,
  pathOptions,
  clusterOptions,
  customGroups = [],
  highlightConnectedOnHover = true,
  enableClustering = false,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width, height });
  const [_hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [transform, setTransform] = useState<d3.ZoomTransform | null>(null);

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current?.parentElement) {
        const parent = svgRef.current.parentElement;
        setDimensions({
          width: parent.clientWidth || width,
          height: Math.max(500, parent.clientHeight || height),
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [width, height]);

  // Get node radius based on type, size, and centrality
  const getNodeRadius = useCallback((node: GraphNode): number => {
    const baseRadius = node.type === 'user' ? 24 : node.type === 'search' ? 28 : 18;
    const sizeMultiplier = node.size || 1;
    // Centrality affects size (larger = more important)
    const centralityBonus = node.centrality ? 1 + node.centrality * 0.5 : 1;
    return baseRadius * Math.sqrt(sizeMultiplier) * centralityBonus;
  }, []);

  // Get node color (with custom group support)
  const getNodeColor = useCallback(
    (node: GraphNode): string => {
      // Check custom groups first
      for (const group of customGroups) {
        if (group.nodeIds?.includes(node.id)) {
          return group.color;
        }
      }
      // Check cluster color
      if (enableClustering && node.cluster !== undefined) {
        return CLUSTER_COLORS[node.cluster % CLUSTER_COLORS.length];
      }
      if (node.color) return node.color;
      return NODE_COLORS[node.type] || '#57606a';
    },
    [customGroups, enableClustering]
  );

  // Memoize path calculation
  const pathNodeIds = useMemo(() => {
    if (viewMode !== 'path' || !pathOptions) return new Set<string>();

    // Build temporary links for path finding
    const tempLinks: SimulationLink[] = data.edges.map((edge) => ({
      source: { id: typeof edge.source === 'string' ? edge.source : edge.source.id } as SimulationNode,
      target: { id: typeof edge.target === 'string' ? edge.target : edge.target.id } as SimulationNode,
      type: edge.type,
    }));

    const path = findPath(pathOptions.sourceId, pathOptions.targetId, tempLinks);
    return path ? new Set(path) : new Set<string>();
  }, [data.edges, viewMode, pathOptions]);

  // Draw the graph
  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width: w, height: h } = dimensions;

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
        setTransform(event.transform);
      });

    svg.call(zoom);

    // Restore previous transform if exists
    if (transform) {
      svg.call(zoom.transform, transform);
    }

    // Add defs for gradients, markers, and filters
    const defs = svg.append('defs');

    // Arrow marker
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#d0d7de');

    // Glow filter for highlighted nodes
    const glowFilter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur');

    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Path highlight filter
    const pathGlow = defs.append('filter')
      .attr('id', 'pathGlow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    pathGlow.append('feGaussianBlur')
      .attr('stdDeviation', '4')
      .attr('result', 'coloredBlur');

    const pathMerge = pathGlow.append('feMerge');
    pathMerge.append('feMergeNode').attr('in', 'coloredBlur');
    pathMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const container = svg.append('g');

    // Prepare data for simulation
    const nodes: SimulationNode[] = data.nodes.map((node) => ({
      ...node,
      x: w / 2 + (Math.random() - 0.5) * 200,
      y: h / 2 + (Math.random() - 0.5) * 200,
      isInPath: pathNodeIds.has(node.id),
    }));

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const links: SimulationLink[] = data.edges
      .reduce<SimulationLink[]>((acc, edge) => {
        const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
        const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
        const source = nodeMap.get(sourceId);
        const target = nodeMap.get(targetId);
        if (source && target) {
          acc.push({
            source,
            target,
            type: edge.type,
            weight: edge.weight,
            label: edge.label,
            isInPath: pathNodeIds.has(sourceId) && pathNodeIds.has(targetId),
          });
        }
        return acc;
      }, []);

    // Calculate distances for local view
    if (viewMode === 'local' && localOptions?.focusNodeId) {
      const distances = calculateDistances(localOptions.focusNodeId, nodes, links);
      nodes.forEach((node) => {
        node.distanceFromFocus = distances.get(node.id) ?? Infinity;
      });
    }

    // Filter nodes for local view
    let visibleNodes = nodes;
    let visibleLinks = links;

    if (viewMode === 'local' && localOptions) {
      const { focusNodeId, depth, fadeDistant } = localOptions;
      const connectedIds = getConnectedNodeIds(focusNodeId, links, depth);

      if (!fadeDistant) {
        // Hide distant nodes completely
        visibleNodes = nodes.filter((n) => connectedIds.has(n.id));
        visibleLinks = links.filter(
          (l) => connectedIds.has(l.source.id) && connectedIds.has(l.target.id)
        );
      }
    }

    // Create simulation
    const simulation = d3.forceSimulation(visibleNodes)
      .force(
        'link',
        d3.forceLink<SimulationNode, SimulationLink>(visibleLinks)
          .id((d) => d.id)
          .distance((d) => {
            const baseDistance = 150;
            return d.weight ? baseDistance * (1 - d.weight * 0.5) : baseDistance;
          })
      )
      .force(
        'charge',
        d3.forceManyBody().strength((d) => {
          // Search nodes attract results
          const node = d as SimulationNode;
          if (node.type === 'search') return -600;
          return node.type === 'user' ? -400 : -200;
        })
      )
      .force('center', d3.forceCenter(w / 2, h / 2))
      .force(
        'collision',
        d3.forceCollide().radius((d) => getNodeRadius(d as SimulationNode) + 10)
      );

    // Draw cluster hulls if clustering enabled
    let clusterHulls: d3.Selection<SVGPathElement, number, SVGGElement, unknown> | null = null;
    if (enableClustering && clusterOptions?.showHulls) {
      const clusterGroups = new Map<number, SimulationNode[]>();
      visibleNodes.forEach((node) => {
        if (node.cluster !== undefined) {
          if (!clusterGroups.has(node.cluster)) {
            clusterGroups.set(node.cluster, []);
          }
          clusterGroups.get(node.cluster)!.push(node);
        }
      });

      const hullsContainer = container.append('g').attr('class', 'cluster-hulls');

      clusterHulls = hullsContainer
        .selectAll('path')
        .data(Array.from(clusterGroups.keys()))
        .enter()
        .append('path')
        .attr('fill', (clusterId) => CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length])
        .attr('fill-opacity', 0.1)
        .attr('stroke', (clusterId) => CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length])
        .attr('stroke-opacity', 0.3)
        .attr('stroke-width', 2);
    }

    // Draw links
    const link = container
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(visibleLinks)
      .enter()
      .append('line')
      .attr('stroke', (d) => {
        if (d.isInPath) return '#cf222e'; // Red for path
        if (d.type === 'SIMILAR_TO' || d.type === 'SIMILAR_SKILLS') return '#2da44e';
        if (d.type === 'HAS_SKILL') return '#bf8700';
        return '#d0d7de';
      })
      .attr('stroke-width', (d) => {
        if (d.isInPath) return 4;
        return d.weight ? 1 + d.weight * 2 : 1.5;
      })
      .attr('stroke-opacity', (d) => (d.isInPath ? 1 : 0.6))
      .attr('stroke-dasharray', (d) => {
        if (d.type.includes('SIMILAR')) return '4,4';
        return null;
      })
      .attr('filter', (d) => (d.isInPath ? 'url(#pathGlow)' : null));

    // Draw edge labels if enabled
    let linkLabels: d3.Selection<SVGTextElement, SimulationLink, SVGGElement, unknown> | null = null;
    if (showEdgeLabels) {
      linkLabels = container
        .append('g')
        .attr('class', 'link-labels')
        .selectAll('text')
        .data(visibleLinks.filter((l) => l.label))
        .enter()
        .append('text')
        .attr('font-size', 10)
        .attr('fill', '#57606a')
        .attr('text-anchor', 'middle')
        .text((d) => d.label || '');
    }

    // Draw nodes
    const node = container
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(visibleNodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .attr('class', (d) => `node-${d.id}`)
      .call(
        d3.drag<SVGGElement, SimulationNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Calculate opacity based on view mode and local options
    const getNodeOpacity = (d: SimulationNode): number => {
      // Path mode: highlight path nodes
      if (viewMode === 'path' && pathOptions?.highlightPath) {
        return d.isInPath ? 1 : 0.3;
      }
      // Local mode with fade
      if (viewMode === 'local' && localOptions?.fadeDistant) {
        const maxDepth = localOptions.depth;
        const distance = d.distanceFromFocus ?? Infinity;
        if (distance > maxDepth) return 0.15;
        return 1 - (distance / (maxDepth + 2)) * 0.5;
      }
      return 1;
    };

    // Draw node shapes based on type
    node.each(function (d) {
      const g = d3.select(this);
      const radius = getNodeRadius(d);
      const color = getNodeColor(d);
      const isSelected = d.id === selectedNodeId;
      const isCurrentUser = d.properties?.is_current_user;
      const isFocusNode = viewMode === 'local' && d.id === localOptions?.focusNodeId;
      const opacity = getNodeOpacity(d);

      g.attr('opacity', opacity);

      if (d.type === 'user') {
        // Circle for users
        g.append('circle')
          .attr('r', radius)
          .attr('fill', isCurrentUser ? color : '#f6f8fa')
          .attr('stroke', color)
          .attr('stroke-width', isSelected || isFocusNode ? 4 : 2)
          .attr('filter', isFocusNode || d.isInPath ? 'url(#glow)' : null);

        // Profile image or initials
        if (d.image_url) {
          const clipId = `clip-${d.id.replace(/[^a-zA-Z0-9]/g, '')}`;
          g.append('clipPath')
            .attr('id', clipId)
            .append('circle')
            .attr('r', radius - 2);

          g.append('image')
            .attr('xlink:href', d.image_url)
            .attr('x', -(radius - 2))
            .attr('y', -(radius - 2))
            .attr('width', (radius - 2) * 2)
            .attr('height', (radius - 2) * 2)
            .attr('clip-path', `url(#${clipId})`);
        } else {
          const initials = d.label
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();

          g.append('text')
            .attr('class', 'node-initials')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .attr('font-size', radius * 0.6)
            .attr('font-weight', 600)
            .attr('fill', isCurrentUser ? '#fff' : '#57606a')
            .text(initials);
        }
      } else if (d.type === 'search') {
        // Special search query node (center of search results)
        g.append('circle')
          .attr('r', radius)
          .attr('fill', color)
          .attr('stroke', '#fff')
          .attr('stroke-width', 3)
          .attr('filter', 'url(#glow)');

        g.append('text')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('font-size', radius * 0.7)
          .attr('fill', '#fff')
          .text('🔍');
      } else if (d.type === 'skill') {
        // Hexagon for skills
        const hexPoints = d3.range(6).map((i) => {
          const angle = ((i * 60 - 30) * Math.PI) / 180;
          return [radius * Math.cos(angle), radius * Math.sin(angle)];
        });

        g.append('polygon')
          .attr('points', hexPoints.map((p) => p.join(',')).join(' '))
          .attr('fill', '#f6f8fa')
          .attr('stroke', color)
          .attr('stroke-width', isSelected ? 3 : 2)
          .attr('filter', d.isInPath ? 'url(#glow)' : null);

        g.append('text')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('font-size', radius * 0.8)
          .attr('fill', color)
          .text('⚡');
      } else if (d.type === 'community') {
        // Rounded rectangle for communities
        g.append('rect')
          .attr('x', -radius)
          .attr('y', -radius * 0.7)
          .attr('width', radius * 2)
          .attr('height', radius * 1.4)
          .attr('rx', 6)
          .attr('fill', '#f6f8fa')
          .attr('stroke', color)
          .attr('stroke-width', isSelected ? 3 : 2);

        g.append('text')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('font-size', radius * 0.6)
          .attr('fill', color)
          .text('👥');
      } else if (d.type === 'event') {
        // Diamond for events
        const diamondPoints = [
          [0, -radius],
          [radius, 0],
          [0, radius],
          [-radius, 0],
        ];

        g.append('polygon')
          .attr('points', diamondPoints.map((p) => p.join(',')).join(' '))
          .attr('fill', '#f6f8fa')
          .attr('stroke', color)
          .attr('stroke-width', isSelected ? 3 : 2);

        g.append('text')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('font-size', radius * 0.6)
          .attr('fill', color)
          .text('📅');
      } else {
        // Default: circle
        g.append('circle')
          .attr('r', radius)
          .attr('fill', '#f6f8fa')
          .attr('stroke', color)
          .attr('stroke-width', isSelected ? 3 : 2);
      }
    });

    // Labels
    if (showLabels) {
      node
        .append('text')
        .attr('class', 'node-label')
        .attr('text-anchor', 'middle')
        .attr('dy', (d) => getNodeRadius(d) + 14)
        .attr('font-size', 11)
        .attr('fill', '#24292f')
        .attr('font-weight', (d) => (d.properties?.is_current_user ? 600 : 400))
        .text((d) => {
          const label = d.label;
          return label.length > 15 ? label.slice(0, 15) + '...' : label;
        });
    }

    // Click handler
    if (onNodeClick) {
      node.on('click', (event, d) => {
        event.stopPropagation();
        onNodeClick(d);
      });
    }

    // Enhanced hover handler with Obsidian-like highlighting
    node
      .on('mouseover', function (_event, d) {
        setHoveredNodeId(d.id);

        // Highlight current node
        d3.select(this)
          .select('circle, rect, polygon')
          .transition()
          .duration(150)
          .attr('stroke-width', 4);

        // Obsidian-like: highlight connected nodes, fade others
        if (highlightConnectedOnHover) {
          const connectedIds = getConnectedNodeIds(d.id, visibleLinks, 1);

          // Fade unconnected nodes
          node
            .transition()
            .duration(200)
            .attr('opacity', (n) => (connectedIds.has(n.id) ? 1 : 0.2));

          // Fade unconnected links
          link
            .transition()
            .duration(200)
            .attr('stroke-opacity', (l) =>
              l.source.id === d.id || l.target.id === d.id ? 1 : 0.1
            );
        }

        if (onNodeHover) onNodeHover(d);
      })
      .on('mouseout', function (_event, d) {
        setHoveredNodeId(null);

        const isSelected = d.id === selectedNodeId;
        const isFocusNode = viewMode === 'local' && d.id === localOptions?.focusNodeId;

        d3.select(this)
          .select('circle, rect, polygon')
          .transition()
          .duration(150)
          .attr('stroke-width', isSelected || isFocusNode ? 4 : 2);

        // Restore opacity
        if (highlightConnectedOnHover) {
          node
            .transition()
            .duration(200)
            .attr('opacity', (n) => getNodeOpacity(n));

          link
            .transition()
            .duration(200)
            .attr('stroke-opacity', (l) => (l.isInPath ? 1 : 0.6));
        }

        if (onNodeHover) onNodeHover(null);
      });

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);

      if (linkLabels) {
        linkLabels
          .attr('x', (d) => (d.source.x + d.target.x) / 2)
          .attr('y', (d) => (d.source.y + d.target.y) / 2);
      }

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);

      // Update cluster hulls
      if (clusterHulls && enableClustering) {
        const clusterGroups = new Map<number, SimulationNode[]>();
        visibleNodes.forEach((n) => {
          if (n.cluster !== undefined) {
            if (!clusterGroups.has(n.cluster)) {
              clusterGroups.set(n.cluster, []);
            }
            clusterGroups.get(n.cluster)!.push(n);
          }
        });

        clusterHulls.attr('d', (clusterId) => {
          const clusterNodes = clusterGroups.get(clusterId);
          if (!clusterNodes || clusterNodes.length < 3) return '';

          const points: [number, number][] = clusterNodes.map((n) => [n.x, n.y]);
          const hull = getConvexHull(points);
          if (!hull) return '';

          // Add padding to hull
          const centroid = d3.polygonCentroid(hull);
          const paddedHull = hull.map((point) => {
            const dx = point[0] - centroid[0];
            const dy = point[1] - centroid[1];
            const distance = Math.sqrt(dx * dx + dy * dy);
            const padding = 30;
            return [
              point[0] + (dx / distance) * padding,
              point[1] + (dy / distance) * padding,
            ] as [number, number];
          });

          return `M${paddedHull.map((p) => p.join(',')).join('L')}Z`;
        });
      }
    });

    // Click on background to deselect
    svg.on('click', () => {
      if (onNodeClick) onNodeClick(null);
    });

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [
    data,
    dimensions,
    selectedNodeId,
    showLabels,
    showEdgeLabels,
    onNodeClick,
    onNodeHover,
    getNodeRadius,
    getNodeColor,
    viewMode,
    localOptions,
    pathOptions,
    pathNodeIds,
    clusterOptions,
    enableClustering,
    highlightConnectedOnHover,
    customGroups,
  ]);

  if (!data.nodes.length) {
    return (
      <div className={styles.empty}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="5" r="3" />
          <circle cx="4" cy="19" r="3" />
          <circle cx="20" cy="19" r="3" />
          <path d="M12 8v4M8 16l-3 2M16 16l3 2" />
        </svg>
        <h3>No Graph Data</h3>
        <p>Start building your network to see your knowledge graph.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className={styles.graph}
      />

      {/* View mode indicator */}
      {viewMode !== 'full' && (
        <div className={styles.viewModeIndicator}>
          {viewMode === 'local' && localOptions && (
            <span>Local view: {localOptions.depth} hop{localOptions.depth > 1 ? 's' : ''}</span>
          )}
          {viewMode === 'path' && pathOptions && (
            <span>Path view</span>
          )}
          {viewMode === 'cluster' && (
            <span>Cluster view</span>
          )}
          {viewMode === 'search' && (
            <span>Search results</span>
          )}
        </div>
      )}

      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.legendColor} style={{ backgroundColor: NODE_COLORS.user }} />
          <span>People</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendColor} style={{ backgroundColor: NODE_COLORS.skill }} />
          <span>Skills</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendColor} style={{ backgroundColor: NODE_COLORS.community }} />
          <span>Communities</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendColor} style={{ backgroundColor: NODE_COLORS.event }} />
          <span>Events</span>
        </div>
      </div>

      <div className={styles.controls}>
        <p>Drag nodes to rearrange • Scroll to zoom • Click nodes for details • Hover to highlight connections</p>
      </div>
    </div>
  );
};

export default KnowledgeGraph;
