import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Heart, Leaf, Target, X } from 'lucide-react';
import { MindHeartLogo } from './MindHeartLogo';

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
    svg.selectAll('*').remove();

    // Respirelax inspired calming palette
    const getColor = (type: string) => {
      switch (type) {
        case 'root_cause': return '#F472B6'; // Soft Pink (more distinct)
        case 'emotion': return '#2DD4BF'; // Calming Teal
        case 'symptom': return '#818CF8'; // Soft Indigo (moved from root cause)
        default: return '#94A3B8'; // Slate
      }
    };

    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.9));

    const nodes = data.nodes.map(d => ({ ...d }));
    const links = data.links.map(d => ({ ...d }));

    // Gentle, slow forces for a floating, underwater feel
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(180))
      .force('charge', d3.forceManyBody().strength(-800))
      .force('center', d3.forceCenter(0, 0))
      .force('collide', d3.forceCollide().radius(90).iterations(3))
      .force('x', d3.forceX(0).strength(0.03))
      .force('y', d3.forceY(0).strength(0.03))
      .alphaDecay(0.015); // Slower settling

    // Links: Soft, glowing, dotted, flowing
    const link = g.append('g')
      .selectAll('path')
      .data(links)
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', 'rgba(255, 255, 255, 0.2)')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4 12')
      .attr('stroke-linecap', 'round')
      .style('animation', 'flowDots 30s linear infinite');

    const linkLabelGroup = g.append('g')
      .selectAll('g')
      .data(links)
      .join('g');

    const linkLabel = linkLabelGroup.append('text')
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .attr('font-size', '11px')
      .attr('font-weight', '400')
      .attr('fill', 'rgba(255,255,255,0.5)')
      .attr('text-anchor', 'middle')
      .attr('letter-spacing', '0.5px')
      .text(d => d.label || '');

    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .call(d3.drag<any, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    const innerNode = node.append('g')
      .style('animation', () => `float ${4 + Math.random() * 3}s ease-in-out infinite`);

    // Solid Core
    innerNode.append('circle')
      .attr('r', 16)
      .attr('fill', d => getColor(d.type))
      .attr('stroke', 'rgba(255,255,255,0.9)')
      .attr('stroke-width', 1.5)
      .style('transition', 'all 0.3s ease');

    node.on('mouseover', function(event, d) {
      d3.select(this).select('circle')
        .attr('r', 20);
    })
    .on('mouseout', function(event, d) {
      d3.select(this).select('circle')
        .attr('r', 16);
    })
    .on('click', (event, d) => {
      event.stopPropagation();
      setSelectedNode(d as Node);
      setTooltipPos({ x: event.clientX, y: event.clientY });
    });

    innerNode.append('text')
      .attr('dy', 55)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .attr('font-size', '13px')
      .attr('font-weight', '400')
      .attr('fill', 'rgba(255,255,255,0.8)')
      .attr('letter-spacing', '0.5px')
      .style('pointer-events', 'none')
      .text(d => d.label);

    svg.on('click', () => {
      setSelectedNode(null);
    });

    simulation.on('tick', () => {
      link.attr('d', (d: any) => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
        return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
      });

      linkLabel
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2 - 6);

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
      <div className="flex items-center justify-center h-full min-h-[400px] rounded-[24px] bg-slate-900/20 backdrop-blur-md border border-slate-800/50">
        <p className="text-slate-400 text-sm font-medium">L'arbre thérapeutique se construira au fil des séances.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[500px] relative overflow-hidden cursor-move font-sans rounded-[24px] bg-slate-900/20 backdrop-blur-md border border-slate-800/50">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.25); opacity: 0.1; }
        }
        @keyframes flowDots {
          to { stroke-dashoffset: -300; }
        }
      `}</style>
      
      {/* Ambient glowing orbs in background */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Legend */}
      <div className="absolute top-6 left-6 flex flex-col gap-3 bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-slate-700/30 z-10">
        <div className="flex items-center gap-2 mb-1">
          <MindHeartLogo className="w-4 h-4 text-slate-400" />
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest">Légende</h3>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 text-sm text-slate-200">
            <div className="w-3 h-3 rounded-full bg-[#F472B6]"></div>
            <span className="font-light">Cause Racine</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-200">
            <div className="w-3 h-3 rounded-full bg-[#818CF8]"></div>
            <span className="font-light">Symptôme</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-200">
            <div className="w-3 h-3 rounded-full bg-[#2DD4BF]"></div>
            <span className="font-light">Émotion</span>
          </div>
        </div>
      </div>

      <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet" className="w-full h-full z-0 relative" />
      
      {/* Tooltip */}
      {selectedNode && (
        <div 
          className="fixed z-50 bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-5 rounded-2xl max-w-sm transform -translate-x-1/2 -translate-y-full mt-[-20px] transition-all duration-300 ease-out"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div className="flex items-start gap-4 pr-6">
            <div className="mt-0.5 flex-shrink-0">
              {selectedNode.type === 'root_cause' ? <Target className="w-6 h-6" style={{ color: '#F472B6' }} /> :
               selectedNode.type === 'emotion' ? <Heart className="w-6 h-6" style={{ color: '#2DD4BF' }} /> :
               selectedNode.type === 'symptom' ? <Leaf className="w-6 h-6" style={{ color: '#818CF8' }} /> : 
               <MindHeartLogo className="w-6 h-6 text-slate-400" />}
            </div>
            <div>
              <div className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1.5">
                {selectedNode.type === 'root_cause' ? 'Cause Racine' :
                 selectedNode.type === 'emotion' ? 'Émotion' :
                 selectedNode.type === 'symptom' ? 'Symptôme' : selectedNode.type}
              </div>
              <h4 className="font-normal text-slate-100 text-lg leading-tight">
                {selectedNode.label}
              </h4>
            </div>
          </div>
          
          <button 
            onClick={() => setSelectedNode(null)}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
