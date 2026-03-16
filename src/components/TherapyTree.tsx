import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Brain, Heart, Leaf, Target } from 'lucide-react';

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

    // Color Palette
    const getColor = (type: string) => {
      switch (type) {
        case 'root_cause': return '#e11d48'; // Rose
        case 'emotion': return '#3b82f6'; // Blue
        case 'symptom': return '#10b981'; // Emerald
        default: return '#a1a1aa'; // Muted Zinc
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
    // Adjusted for better spacing, preventing overlap, and improving readability
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(180)) // Increased link distance
      .force('charge', d3.forceManyBody().strength(-800)) // Stronger repulsion to spread nodes out
      .force('center', d3.forceCenter(0, 0))
      .force('collide', d3.forceCollide().radius(90).iterations(2)) // Larger collision radius to protect labels from overlapping
      .force('x', d3.forceX(0).strength(0.04)) // Gentle pull towards center X
      .force('y', d3.forceY(0).strength(0.04)); // Gentle pull towards center Y

    // --- LINKS (Smooth Curves) ---
    const link = g.append('g')
      .selectAll('path')
      .data(links)
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', 'rgba(255, 255, 255, 0.25)') // Semi-transparent white
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4 6'); // Dotted lines as requested

    // Link Labels
    const linkLabel = g.append('g')
      .selectAll('text')
      .data(links)
      .join('text')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-size', '11px')
      .attr('fill', '#a1a1aa')
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

    // Outer ring
    node.append('circle')
      .attr('r', 26)
      .attr('fill', '#050505') // Dark center
      .attr('stroke', d => getColor(d.type))
      .attr('stroke-width', 2.5)
      .attr('class', 'node-ring')
      .style('transition', 'all 0.3s ease');

    // Inner subtle ring (adds detail like the image)
    node.append('circle')
      .attr('r', 18)
      .attr('fill', 'none')
      .attr('stroke', d => getColor(d.type))
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2 4')
      .attr('opacity', 0.5)
      .attr('class', 'node-inner-ring')
      .style('transition', 'all 0.3s ease');

    // Node Interactions
    node.on('mouseover', function(event, d) {
      d3.select(this).select('.node-ring').attr('stroke-width', 4).attr('r', 28);
      d3.select(this).select('.node-inner-ring').attr('r', 20);
    })
    .on('mouseout', function(event, d) {
      d3.select(this).select('.node-ring').attr('stroke-width', 2.5).attr('r', 26);
      d3.select(this).select('.node-inner-ring').attr('r', 18);
    })
    .on('click', (event, d) => {
      event.stopPropagation();
      setSelectedNode(d as Node);
      setTooltipPos({ x: event.clientX, y: event.clientY });
    });

    // --- LABELS (Clean & Legible) ---
    node.append('text')
      .attr('dy', 46)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-size', '13px')
      .attr('font-weight', '600')
      .attr('fill', '#ffffff')
      .style('text-shadow', '0px 2px 4px rgba(0,0,0,0.8)')
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
        const dr = Math.sqrt(dx * dx + dy * dy) * 1.5; // Gentle curve
        return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
      });

      // Position link labels
      linkLabel
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2 - 8);

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
      <div className="flex items-center justify-center h-64 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
        <p className="text-zinc-500 text-sm">L'arbre thérapeutique se construira au fil des séances.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#050505] rounded-2xl border border-zinc-800/60 overflow-hidden relative cursor-move shadow-inner">
      {/* Soft radial gradient background for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0%,transparent_100%)] pointer-events-none"></div>

      {/* Clean Legend */}
      <div className="absolute top-4 left-4 flex flex-col gap-3 bg-zinc-900/60 backdrop-blur-xl p-4 rounded-xl border border-zinc-800/50 shadow-lg z-10">
        <div className="text-xs text-zinc-400 font-medium tracking-wide flex items-center gap-2 mb-1">
          <Brain className="w-4 h-4" />
          Légende
        </div>
        
        <div className="flex items-center gap-3 text-sm text-zinc-300">
          <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: '#e11d48', backgroundColor: '#050505' }}></div>
          <span>Cause Racine</span>
        </div>
        
        <div className="flex items-center gap-3 text-sm text-zinc-300">
          <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: '#10b981', backgroundColor: '#050505' }}></div>
          <span>Symptôme</span>
        </div>
        
        <div className="flex items-center gap-3 text-sm text-zinc-300">
          <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: '#3b82f6', backgroundColor: '#050505' }}></div>
          <span>Émotion</span>
        </div>

        <div className="text-[11px] text-zinc-500 mt-2 pt-3 border-t border-zinc-800/50">
          Molette pour zoomer • Glisser pour déplacer
        </div>
      </div>

      <svg ref={svgRef} width="100%" height="400" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet" className="w-full h-full min-h-[500px] z-0 relative" />
      
      {/* Serene Tooltip */}
      {selectedNode && (
        <div 
          className="fixed z-50 bg-zinc-900/95 backdrop-blur-md border border-zinc-800 shadow-2xl p-5 rounded-2xl max-w-sm transform -translate-x-1/2 -translate-y-full mt-[-16px]"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="mt-1">
              {selectedNode.type === 'root_cause' ? <Target className="w-5 h-5" style={{ color: '#e11d48' }} /> :
               selectedNode.type === 'emotion' ? <Heart className="w-5 h-5" style={{ color: '#3b82f6' }} /> :
               selectedNode.type === 'symptom' ? <Leaf className="w-5 h-5" style={{ color: '#10b981' }} /> : 
               <Brain className="w-5 h-5 text-zinc-400" />}
            </div>
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                {selectedNode.type === 'root_cause' ? 'Cause Racine' :
                 selectedNode.type === 'emotion' ? 'Émotion' :
                 selectedNode.type === 'symptom' ? 'Symptôme' : selectedNode.type}
              </div>
              <h4 className="font-medium text-zinc-100 text-base leading-snug">
                {selectedNode.label}
              </h4>
            </div>
          </div>
          
          <button 
            onClick={() => setSelectedNode(null)}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800/50 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
