import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type {
  NetworkGraphNode,
  NetworkGraph as NetworkGraphType,
} from '../../../../types/network';
import styles from './NetworkGraph.module.css';

interface NetworkGraphProps {
  data: NetworkGraphType;
  width?: number;
  height?: number;
  selectedNodeId?: string;
  onNodeClick?: (node: NetworkGraphNode) => void;
  /**
   * Built-in chrome (the "Drag nodes to rearrange…" hint). `false` hides it
   * when the host page provides its own floating widgets — e.g. RoadmapPage.
   */
  chrome?: boolean;
}

interface SimulationNode extends NetworkGraphNode {
  x: number;
  y: number;
  fx?: number | null;
  fy?: number | null;
}

interface SimulationLink {
  source: SimulationNode;
  target: SimulationNode;
  relationship: string;
}

/**
 * Read a CSS custom property off the container with a fallback.
 * Lets the graph adopt the design-system tokens without hardcoded hex.
 */
function readToken(el: Element | null, name: string, fallback: string): string {
  if (!el) return fallback;
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v || fallback;
}

export const NetworkGraph: React.FC<NetworkGraphProps> = ({
  data,
  width = 800,
  height = 600,
  selectedNodeId,
  onNodeClick,
  chrome = true,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width, height });

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current?.parentElement) {
        const parent = svgRef.current.parentElement;
        setDimensions({
          width: parent.clientWidth,
          height: Math.max(400, parent.clientHeight),
        });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width: w, height: h } = dimensions;

    // Pull theme tokens. These re-read each render, so a theme switch is
    // picked up the next time the simulation rebuilds.
    const root = svgRef.current;
    const tokens = {
      primary:  readToken(root, '--color-primary',     '#3232FF'),
      fg:       readToken(root, '--color-fg',          '#0E1116'),
      muted:    readToken(root, '--color-fg-secondary','#57606a'),
      surface:  readToken(root, '--color-surface',     '#ffffff'),
      border:   readToken(root, '--color-border',      '#d0d7de'),
    };

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });
    svg.call(zoom);

    // Defs — halo gradient + soft glow filter
    const defs = svg.append('defs');

    const halo = defs.append('radialGradient')
      .attr('id', 'netHalo')
      .attr('cx', '50%').attr('cy', '50%').attr('r', '50%');
    halo.append('stop').attr('offset', '0%')
      .attr('stop-color', tokens.primary).attr('stop-opacity', '0.5');
    halo.append('stop').attr('offset', '100%')
      .attr('stop-color', tokens.primary).attr('stop-opacity', '0');

    const glow = defs.append('filter')
      .attr('id', 'netGlow')
      .attr('x', '-50%').attr('y', '-50%')
      .attr('width', '200%').attr('height', '200%');
    glow.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'b');
    const merge = glow.append('feMerge');
    merge.append('feMergeNode').attr('in', 'b');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    const container = svg.append('g');

    // Data
    const nodes: SimulationNode[] = data.nodes.map((node) => ({
      ...node,
      x: w / 2 + Math.random() * 100 - 50,
      y: h / 2 + Math.random() * 100 - 50,
    }));
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const links: SimulationLink[] = data.edges
      .map((edge) => {
        const sId = typeof edge.source === 'string' ? edge.source : edge.source.id;
        const tId = typeof edge.target === 'string' ? edge.target : edge.target.id;
        const source = nodeMap.get(sId);
        const target = nodeMap.get(tId);
        return source && target ? { source, target, relationship: edge.relationship } : null;
      })
      .filter((l): l is SimulationLink => l !== null);

    // Simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink<SimulationNode, SimulationLink>(links)
        .id((d) => d.id)
        .distance(120))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(w / 2, h / 2))
      .force('collision', d3.forceCollide().radius(50));

    // Links
    const link = container.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', tokens.border)
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.6);

    // Nodes
    const node = container.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, SimulationNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null; d.fy = null;
        }));

    // Per-node draw — halo for me, ring, image/initial.
    node.each(function (d) {
      const g = d3.select(this);
      const isMe = d.isCurrentUser;
      const isSelected = selectedNodeId === d.id;
      const radius = isMe ? 30 : 24;

      // Halo behind "me"
      if (isMe) {
        g.append('circle')
          .attr('r', radius * 1.9)
          .attr('fill', 'url(#netHalo)')
          .attr('pointer-events', 'none');
      }

      // Main ring
      g.append('circle')
        .attr('class', 'ring')
        .attr('r', radius)
        .attr('fill', isMe ? tokens.primary : tokens.surface)
        .attr('stroke', isSelected ? tokens.surface : (isMe ? tokens.primary : tokens.border))
        .attr('stroke-width', isSelected ? 4 : 2)
        .attr('filter', isMe ? 'url(#netGlow)' : null);

      if (d.profile_image_url) {
        const clipId = `netclip-${d.id.replace(/[^a-zA-Z0-9]/g, '')}`;
        g.append('clipPath')
          .attr('id', clipId)
          .append('circle')
          .attr('r', radius - 2);
        g.append('image')
          .attr('xlink:href', d.profile_image_url)
          .attr('x', -(radius - 2))
          .attr('y', -(radius - 2))
          .attr('width', (radius - 2) * 2)
          .attr('height', (radius - 2) * 2)
          .attr('clip-path', `url(#${clipId})`);
      } else {
        const name = d.full_name || d.username || '?';
        const initials = name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();

        g.append('text')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('font-size', isMe ? 13 : 12)
          .attr('font-weight', 600)
          .attr('fill', isMe ? '#fff' : tokens.muted)
          .text(initials);
      }
    });

    // Labels
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => (d.isCurrentUser ? 48 : 40))
      .attr('font-size', 11)
      .attr('fill', tokens.fg)
      .attr('font-weight', (d) => (d.isCurrentUser ? 600 : 400))
      .text((d) => {
        const name = d.full_name || d.username || '';
        return name.length > 18 ? name.slice(0, 18) + '…' : name;
      });

    // Click + hover
    if (onNodeClick) {
      node.on('click', (event, d) => {
        event.stopPropagation();
        onNodeClick(d);
      });
    }

    node.on('mouseover', function () {
      d3.select(this).select<SVGCircleElement>('circle.ring')
        .transition().duration(150)
        .attr('stroke-width', 4);
    }).on('mouseout', function (_e, d) {
      const isSelected = selectedNodeId === d.id;
      d3.select(this).select<SVGCircleElement>('circle.ring')
        .transition().duration(150)
        .attr('stroke-width', isSelected ? 4 : 2);
    });

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x).attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x).attr('y2', (d) => d.target.y);
      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    return () => { simulation.stop(); };
  }, [data, dimensions, onNodeClick, selectedNodeId]);

  if (!data.nodes.length) {
    return (
      <div className={styles.empty}>
        <div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="3" />
            <circle cx="4" cy="19" r="3" />
            <circle cx="20" cy="19" r="3" />
            <path d="M12 8v4M8 16l-3 2M16 16l3 2" />
          </svg>
          <h3>No network yet</h3>
          <p>Start connecting with professionals to see your network graph.</p>
        </div>
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
      {chrome && (
        <div className={styles.controls}>
          <p>Drag nodes to rearrange · Scroll to zoom</p>
        </div>
      )}
    </div>
  );
};

export default NetworkGraph;
