import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import type { MiniGraphProps, GraphNode } from '../../types/graph';
import { NODE_COLORS } from '../../types/graph';
import styles from './MiniGraph.module.css';

export const MiniGraph: React.FC<MiniGraphProps> = ({
  data,
  viewport,
  onViewportChange,
  width = 200,
  height = 150,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate bounds of all nodes
  const bounds = useMemo(() => {
    if (!data.nodes.length) return { minX: 0, maxX: 100, minY: 0, maxY: 100 };

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    data.nodes.forEach((node) => {
      if (node.x !== undefined && node.y !== undefined) {
        minX = Math.min(minX, node.x);
        maxX = Math.max(maxX, node.x);
        minY = Math.min(minY, node.y);
        maxY = Math.max(maxY, node.y);
      }
    });

    // Add padding
    const padding = 50;
    return {
      minX: minX - padding,
      maxX: maxX + padding,
      minY: minY - padding,
      maxY: maxY + padding,
    };
  }, [data.nodes]);

  // Scale functions
  const scaleX = useMemo(() => {
    return d3
      .scaleLinear()
      .domain([bounds.minX, bounds.maxX])
      .range([0, width]);
  }, [bounds, width]);

  const scaleY = useMemo(() => {
    return d3
      .scaleLinear()
      .domain([bounds.minY, bounds.maxY])
      .range([0, height]);
  }, [bounds, height]);

  // Draw the mini graph
  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Draw edges
    svg
      .append('g')
      .attr('class', 'edges')
      .selectAll('line')
      .data(data.edges)
      .enter()
      .append('line')
      .attr('x1', (d) => {
        const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
        const node = data.nodes.find((n) => n.id === sourceId);
        return node?.x !== undefined ? scaleX(node.x) : 0;
      })
      .attr('y1', (d) => {
        const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
        const node = data.nodes.find((n) => n.id === sourceId);
        return node?.y !== undefined ? scaleY(node.y) : 0;
      })
      .attr('x2', (d) => {
        const targetId = typeof d.target === 'string' ? d.target : d.target.id;
        const node = data.nodes.find((n) => n.id === targetId);
        return node?.x !== undefined ? scaleX(node.x) : 0;
      })
      .attr('y2', (d) => {
        const targetId = typeof d.target === 'string' ? d.target : d.target.id;
        const node = data.nodes.find((n) => n.id === targetId);
        return node?.y !== undefined ? scaleY(node.y) : 0;
      })
      .attr('stroke', '#d0d7de')
      .attr('stroke-width', 0.5)
      .attr('stroke-opacity', 0.5);

    // Draw nodes
    svg
      .append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(data.nodes)
      .enter()
      .append('circle')
      .attr('cx', (d) => (d.x !== undefined ? scaleX(d.x) : 0))
      .attr('cy', (d) => (d.y !== undefined ? scaleY(d.y) : 0))
      .attr('r', 3)
      .attr('fill', (d) => NODE_COLORS[d.type] || '#57606a')
      .attr('opacity', 0.8);

    // Draw viewport rectangle
    const viewportRect = svg
      .append('rect')
      .attr('class', 'viewport')
      .attr('x', scaleX(viewport.x))
      .attr('y', scaleY(viewport.y))
      .attr('width', scaleX(viewport.x + viewport.width) - scaleX(viewport.x))
      .attr('height', scaleY(viewport.y + viewport.height) - scaleY(viewport.y))
      .attr('fill', 'rgba(9, 105, 218, 0.1)')
      .attr('stroke', '#0969da')
      .attr('stroke-width', 1.5)
      .attr('rx', 2)
      .style('cursor', 'move');

    // Make viewport draggable
    const drag = d3.drag<SVGRectElement, unknown>().on('drag', (event) => {
      const newX = scaleX.invert(event.x - (scaleX(viewport.width) - scaleX(0)) / 2);
      const newY = scaleY.invert(event.y - (scaleY(viewport.height) - scaleY(0)) / 2);

      // Clamp to bounds
      const clampedX = Math.max(
        bounds.minX,
        Math.min(bounds.maxX - viewport.width, newX)
      );
      const clampedY = Math.max(
        bounds.minY,
        Math.min(bounds.maxY - viewport.height, newY)
      );

      onViewportChange({ x: clampedX, y: clampedY });
    });

    viewportRect.call(drag as any);

    // Click to move viewport
    svg.on('click', (event) => {
      const [mouseX, mouseY] = d3.pointer(event);
      const newX = scaleX.invert(mouseX) - viewport.width / 2;
      const newY = scaleY.invert(mouseY) - viewport.height / 2;

      // Clamp to bounds
      const clampedX = Math.max(
        bounds.minX,
        Math.min(bounds.maxX - viewport.width, newX)
      );
      const clampedY = Math.max(
        bounds.minY,
        Math.min(bounds.maxY - viewport.height, newY)
      );

      onViewportChange({ x: clampedX, y: clampedY });
    });
  }, [data, viewport, scaleX, scaleY, bounds, onViewportChange]);

  // Update viewport position without redrawing everything
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg
      .select('.viewport')
      .attr('x', scaleX(viewport.x))
      .attr('y', scaleY(viewport.y))
      .attr('width', Math.abs(scaleX(viewport.x + viewport.width) - scaleX(viewport.x)))
      .attr('height', Math.abs(scaleY(viewport.y + viewport.height) - scaleY(viewport.y)));
  }, [viewport, scaleX, scaleY]);

  if (!data.nodes.length) {
    return null;
  }

  return (
    <div ref={containerRef} className={styles.container}>
      <div className={styles.header}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
        <span>Overview</span>
      </div>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className={styles.miniGraph}
      />
      <div className={styles.stats}>
        <span>{data.nodes.length} nodes</span>
        <span>{data.edges.length} edges</span>
      </div>
    </div>
  );
};

export default MiniGraph;
