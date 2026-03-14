import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: 'symptom' | 'emotion' | 'root_cause' | string;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  label?: string;
}

interface TreeData {
  nodes: Node[];
  links: Link[];
}

export function TherapyTree({ data }: { data: TreeData }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!svgRef.current || !data || !data.nodes || data.nodes.length === 0) return;

    const width = 600;
    const height = 400;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Create a copy of the data to avoid mutating the props
    const nodes = data.nodes.map(d => ({ ...d }));
    const links = data.links.map(d => ({ ...d }));

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(40));

    // Define arrow markers for links
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('xoverflow', 'visible')
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#52525b') // zinc-600
      .style('stroke', 'none');

    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#52525b') // zinc-600
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrowhead)');

    const linkLabel = g.append('g')
      .selectAll('text')
      .data(links)
      .join('text')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .attr('fill', '#a1a1aa') // zinc-400
      .attr('text-anchor', 'middle')
      .style('text-shadow', '0px 1px 2px rgba(0,0,0,0.8)')
      .text(d => d.label || '');

    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(d3.drag<any, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Node colors based on type
    const getColor = (type: string) => {
      switch (type) {
        case 'root_cause': return '#ef4444'; // red-500
        case 'emotion': return '#3b82f6'; // blue-500
        case 'symptom': return '#10b981'; // emerald-500
        default: return '#a1a1aa'; // zinc-400
      }
    };

    node.append('circle')
      .attr('r', 16)
      .attr('fill', d => getColor(d.type))
      .attr('stroke', '#18181b') // zinc-900
      .attr('stroke-width', 3)
      .style('filter', 'drop-shadow(0px 4px 6px rgba(0,0,0,0.4))')
      .style('cursor', 'pointer')
      .on('mouseover', function() {
        d3.select(this).attr('stroke', '#e4e4e7').attr('stroke-width', 2);
      })
      .on('mouseout', function() {
        d3.select(this).attr('stroke', '#18181b').attr('stroke-width', 3);
      });

    node.append('text')
      .attr('dy', 30)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-size', '13px')
      .attr('font-weight', '500')
      .attr('fill', '#f4f4f5') // zinc-100
      .style('text-shadow', '0px 1px 3px rgba(0,0,0,0.8), 0px 2px 8px rgba(0,0,0,0.6)')
      .style('pointer-events', 'none')
      .text(d => d.label);

    node.on('click', (event, d) => {
      event.stopPropagation();
      setSelectedNode(d as Node);
      setTooltipPos({ x: event.clientX, y: event.clientY });
    });

    svg.on('click', () => {
      setSelectedNode(null);
    });

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      linkLabel
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2 - 5);

      node
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [data]);

  if (!data || !data.nodes || data.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
        <p className="text-zinc-500 text-sm">L'arbre thérapeutique se construira au fil des séances.</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-950/50 rounded-xl border border-zinc-800/50 overflow-hidden relative cursor-move">
      <div className="absolute top-4 left-4 flex flex-col gap-2 bg-zinc-900/80 p-3 rounded-lg border border-zinc-800 text-xs text-zinc-300 shadow-lg backdrop-blur-sm z-10">
        <div className="text-zinc-500 mb-1 pb-1 border-b border-zinc-800/50 font-medium tracking-wide uppercase text-[10px]">Légende & Navigation</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div> Cause Racine</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div> Symptôme</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div> Émotion</div>
        <div className="text-[10px] text-zinc-500 mt-1 pt-1 border-t border-zinc-800/50">Molette pour zoomer • Glisser pour déplacer</div>
      </div>
      <svg ref={svgRef} width="100%" height="400" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid meet" className="w-full h-full min-h-[400px]" />
      
      {selectedNode && (
        <div 
          className="fixed z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-4 max-w-xs transform -translate-x-1/2 -translate-y-full mt-[-10px]"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${
              selectedNode.type === 'root_cause' ? 'bg-red-500' :
              selectedNode.type === 'emotion' ? 'bg-blue-500' :
              selectedNode.type === 'symptom' ? 'bg-emerald-500' : 'bg-zinc-400'
            }`}></div>
            <h4 className="font-medium text-zinc-100">{selectedNode.label}</h4>
          </div>
          <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Type</div>
          <div className="text-sm text-zinc-300 mb-2 capitalize">
            {selectedNode.type === 'root_cause' ? 'Cause Racine' :
             selectedNode.type === 'emotion' ? 'Émotion' :
             selectedNode.type === 'symptom' ? 'Symptôme' : selectedNode.type}
          </div>
          <button 
            onClick={() => setSelectedNode(null)}
            className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-300"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
