import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Brain, Heart, Leaf, Target, X } from 'lucide-react';

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

    const width = 800;
    const height = 600;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    // Airbnb-inspired Color Palette
    const getColor = (type: string) => {
      switch (type) {
        case 'root_cause': return '#FF385C'; // Airbnb Red
        case 'emotion': return '#00A699'; // Airbnb Teal
        case 'symptom': return '#FFB400'; // Airbnb Yellow
        default: return '#71717A'; // Zinc 500
      }
    };

    // --- MAIN GROUP & ZOOM ---
    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);
    // Initial transform to center the graph
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.9));

    // Create a copy of the data
    const nodes = data.nodes.map(d => ({ ...d }));
    const links = data.links.map(d => ({ ...d }));

    // --- FORCES ---
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(160))
      .force('charge', d3.forceManyBody().strength(-1000)) // Strong repulsion for clean spacing
      .force('center', d3.forceCenter(0, 0))
      .force('collide', d3.forceCollide().radius(80).iterations(3))
      .force('x', d3.forceX(0).strength(0.05))
      .force('y', d3.forceY(0).strength(0.05));

    // --- LINKS (Clean Solid Lines) ---
    const link = g.append('g')
      .selectAll('path')
      .data(links)
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', '#3F3F46') // zinc-700
      .attr('stroke-width', 2)
      .style('transition', 'stroke 0.3s ease');

    // Link Labels (Pill-shaped backgrounds)
    const linkLabelGroup = g.append('g')
      .selectAll('g')
      .data(links)
      .join('g');

    // We use a simple text with a thick stroke for a halo effect (cleaner than rects in d3)
    const linkLabel = linkLabelGroup.append('text')
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .attr('fill', '#A1A1AA') // zinc-400
      .attr('stroke', '#09090B') // zinc-950 halo
      .attr('stroke-width', 4)
      .attr('stroke-linejoin', 'round')
      .attr('paint-order', 'stroke')
      .attr('text-anchor', 'middle')
      .text(d => d.label || '');

    // --- NODES ---
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .call(d3.drag<any, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Node Background (Solid Color, Airbnb style)
    node.append('circle')
      .attr('r', 28)
      .attr('fill', d => getColor(d.type))
      .attr('class', 'node-bg')
      .style('filter', 'drop-shadow(0px 4px 12px rgba(0,0,0,0.4))')
      .style('transition', 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)');

    // Inner white circle for contrast
    node.append('circle')
      .attr('r', 10)
      .attr('fill', '#ffffff')
      .attr('class', 'node-inner')
      .style('transition', 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)');

    // Node Interactions
    node.on('mouseover', function(event, d) {
      d3.select(this).select('.node-bg').attr('r', 32).style('filter', 'drop-shadow(0px 8px 16px rgba(0,0,0,0.5))');
      d3.select(this).select('.node-inner').attr('r', 12);
    })
    .on('mouseout', function(event, d) {
      d3.select(this).select('.node-bg').attr('r', 28).style('filter', 'drop-shadow(0px 4px 12px rgba(0,0,0,0.4))');
      d3.select(this).select('.node-inner').attr('r', 10);
    })
    .on('click', (event, d) => {
      event.stopPropagation();
      setSelectedNode(d as Node);
      setTooltipPos({ x: event.clientX, y: event.clientY });
    });

    // --- LABELS (Clean & Legible) ---
    node.append('text')
      .attr('dy', 48)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .attr('fill', '#F4F4F5') // zinc-100
      .attr('stroke', '#09090B') // zinc-950 halo
      .attr('stroke-width', 5)
      .attr('stroke-linejoin', 'round')
      .attr('paint-order', 'stroke')
      .style('pointer-events', 'none')
      .text(d => d.label);

    svg.on('click', () => {
      setSelectedNode(null);
    });

    // --- TICK FUNCTION ---
    simulation.on('tick', () => {
      // Smooth curved paths
      link.attr('d', (d: any) => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy) * 1.2; // Gentle curve
        return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
      });

      // Position link labels
      linkLabel
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2 - 6);

      // Position nodes
      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
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
      <div className="flex items-center justify-center h-full min-h-[400px] bg-zinc-950 rounded-[24px]">
        <p className="text-zinc-500 text-sm font-medium">L'arbre thérapeutique se construira au fil des séances.</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-950 w-full h-full min-h-[500px] relative overflow-hidden cursor-move font-sans">
      {/* Soft radial gradient background for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_100%)] pointer-events-none"></div>

      {/* Explicit Legend Card */}
      <div className="absolute top-6 left-6 flex flex-col gap-3 bg-zinc-900/90 backdrop-blur-xl p-5 rounded-2xl border border-zinc-800/60 shadow-[0_8px_30px_rgb(0,0,0,0.4)] z-10">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="w-4 h-4 text-zinc-400" />
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Légende</h3>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 text-sm font-medium text-zinc-200">
            <div className="w-4 h-4 rounded-full bg-[#FF385C] shadow-sm border border-white/10"></div>
            <span>Cause Racine</span>
          </div>
          <div className="flex items-center gap-3 text-sm font-medium text-zinc-200">
            <div className="w-4 h-4 rounded-full bg-[#FFB400] shadow-sm border border-white/10"></div>
            <span>Symptôme</span>
          </div>
          <div className="flex items-center gap-3 text-sm font-medium text-zinc-200">
            <div className="w-4 h-4 rounded-full bg-[#00A699] shadow-sm border border-white/10"></div>
            <span>Émotion</span>
          </div>
        </div>
      </div>

      <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet" className="w-full h-full z-0 relative" />
      
      {/* Clean Airbnb-style Tooltip (High Contrast White Card) */}
      {selectedNode && (
        <div 
          className="fixed z-50 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.2)] p-5 rounded-2xl max-w-sm transform -translate-x-1/2 -translate-y-full mt-[-20px] transition-all duration-200 ease-out"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div className="flex items-start gap-4 pr-6">
            <div className="mt-0.5 flex-shrink-0">
              {selectedNode.type === 'root_cause' ? <Target className="w-6 h-6" style={{ color: '#FF385C' }} /> :
               selectedNode.type === 'emotion' ? <Heart className="w-6 h-6" style={{ color: '#00A699' }} /> :
               selectedNode.type === 'symptom' ? <Leaf className="w-6 h-6" style={{ color: '#FFB400' }} /> : 
               <Brain className="w-6 h-6 text-zinc-400" />}
            </div>
            <div>
              <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                {selectedNode.type === 'root_cause' ? 'Cause Racine' :
                 selectedNode.type === 'emotion' ? 'Émotion' :
                 selectedNode.type === 'symptom' ? 'Symptôme' : selectedNode.type}
              </div>
              <h4 className="font-semibold text-zinc-900 text-lg leading-tight">
                {selectedNode.label}
              </h4>
            </div>
          </div>
          
          <button 
            onClick={() => setSelectedNode(null)}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
