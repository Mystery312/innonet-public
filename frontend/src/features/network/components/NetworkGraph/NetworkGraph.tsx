import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { NetworkGraphNode, NetworkGraph as NetworkGraphType } from '../../../../types/network';
import styles from './NetworkGraph.module.css';

interface NetworkGraphProps {
  data: NetworkGraphType;
  width?: number;
  height?: number;
  onNodeClick?: (node: NetworkGraphNode) => void;
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

export const NetworkGraph: React.FC<NetworkGraphProps> = ({
  data,
  width = 800,
  height = 600,
  onNodeClick,
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

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);

    const container = svg.append('g');

    // Prepare data for simulation
    const nodes: SimulationNode[] = data.nodes.map((node) => ({
      ...node,
      x: w / 2 + Math.random() * 100 - 50,
      y: h / 2 + Math.random() * 100 - 50,
    }));

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const links: SimulationLink[] = data.edges
      .map((edge) => {
        const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
        const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
        const source = nodeMap.get(sourceId);
        const target = nodeMap.get(targetId);
        if (source && target) {
          return { source, target, relationship: edge.relationship };
        }
        return null;
      })
      .filter((link): link is SimulationLink => link !== null);

    // Create simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink<SimulationNode, SimulationLink>(links)
        .id((d) => d.id)
        .distance(120))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(w / 2, h / 2))
      .force('collision', d3.forceCollide().radius(50));

    // Draw links
    const link = container.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#d0d7de')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6);

    // Draw nodes
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
        }));

    // Node circles
    node.append('circle')
      .attr('r', (d) => d.isCurrentUser ? 30 : 24)
      .attr('fill', (d) => d.isCurrentUser ? '#0969da' : '#f6f8fa')
      .attr('stroke', (d) => d.isCurrentUser ? '#0969da' : '#d0d7de')
      .attr('stroke-width', 2);

    // Profile images or initials
    node.each(function (d) {
      const g = d3.select(this);
      const radius = d.isCurrentUser ? 30 : 24;

      if (d.profile_image_url) {
        // Add clip path for circular image
        const clipId = `clip-${d.id}`;
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
        // Show initials
        const name = d.full_name || d.username;
        const initials = name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();

        g.append('text')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('font-size', d.isCurrentUser ? 14 : 12)
          .attr('font-weight', 600)
          .attr('fill', d.isCurrentUser ? '#fff' : '#57606a')
          .text(initials);
      }
    });

    // Labels
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => (d.isCurrentUser ? 48 : 40))
      .attr('font-size', 12)
      .attr('fill', '#24292f')
      .attr('font-weight', (d) => d.isCurrentUser ? 600 : 400)
      .text((d) => d.full_name || d.username);

    // Click handler
    if (onNodeClick) {
      node.on('click', (event, d) => {
        event.stopPropagation();
        onNodeClick(d);
      });
    }

    // Hover effects
    node.on('mouseover', function () {
      d3.select(this).select('circle')
        .transition()
        .duration(150)
        .attr('stroke-width', 3);
    }).on('mouseout', function () {
      d3.select(this).select('circle')
        .transition()
        .duration(150)
        .attr('stroke-width', 2);
    });

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [data, dimensions, onNodeClick]);

  if (!data.nodes.length) {
    return (
      <div className={styles.empty}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="5" r="3" />
          <circle cx="4" cy="19" r="3" />
          <circle cx="20" cy="19" r="3" />
          <path d="M12 8v4M8 16l-3 2M16 16l3 2" />
        </svg>
        <h3>No Network Data</h3>
        <p>Start connecting with professionals to see your network graph.</p>
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
      <div className={styles.controls}>
        <p>Drag nodes to rearrange. Scroll to zoom.</p>
      </div>
    </div>
  );
};

export default NetworkGraph;
