import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Heart, Leaf, Target, X } from 'lucide-react';

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
        case 'root_cause': return '#c4577e';
        case 'emotion': return '#2a8c86';
        case 'symptom': return '#5561c9';
        default: return '#8a8fa8';
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
      .attr('stroke', 'rgba(30, 33, 64, 0.28)')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '3 9')
      .attr('stroke-linecap', 'round')
      .style('animation', 'flowDots 30s linear infinite');

    const linkLabelGroup = g.append('g')
      .selectAll('g')
      .data(links)
      .join('g');

    const linkLabel = linkLabelGroup.append('text')
      .attr('font-family', '"Atkinson Hyperlegible Next", system-ui, sans-serif')
      .attr('font-size', '11px')
      .attr('font-weight', '400')
      .attr('fill', 'rgba(84,90,122,0.9)')
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
      .attr('stroke', '#f9f9fc')
      .attr('stroke-width', 3)
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
      .attr('dy', 38)
      .attr('text-anchor', 'middle')
      .attr('font-family', '"Atkinson Hyperlegible Next", system-ui, sans-serif')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .attr('fill', '#1e2140')
      .attr('paint-order', 'stroke')
      .attr('stroke', '#f9f9fc')
      .attr('stroke-width', 4)
      .attr('stroke-linejoin', 'round')
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
      <div className="flex items-center justify-center h-full min-h-[400px] rounded-2xl bg-mist">
        <p className="text-ink-soft text-sm">L'arbre thérapeutique se construira au fil des séances.</p>
      </div>
    );
  }

  const typeMeta = (type: string) =>
    type === 'root_cause'
      ? { label: 'Cause racine', color: '#c4577e', Icon: Target }
      : type === 'emotion'
        ? { label: 'Émotion', color: '#2a8c86', Icon: Heart }
        : type === 'symptom'
          ? { label: 'Symptôme', color: '#5561c9', Icon: Leaf }
          : { label: type, color: '#8a8fa8', Icon: Leaf };

  return (
    <div className="w-full h-full min-h-[460px] relative overflow-hidden cursor-grab active:cursor-grabbing rounded-2xl bg-[radial-gradient(circle_at_50%_45%,#f9f9fc_0%,#edeef4_75%)]">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes flowDots {
          to { stroke-dashoffset: -300; }
        }
      `}</style>

      <ul className="absolute top-4 left-4 z-10 flex flex-wrap gap-x-4 gap-y-2 rounded-2xl bg-paper/90 backdrop-blur px-4 py-3 border border-line text-sm" aria-label="Légende">
        {(['root_cause', 'symptom', 'emotion'] as const).map((t) => {
          const m = typeMeta(t);
          return (
            <li key={t} className="flex items-center gap-2 text-ink">
              <span className="w-3 h-3 rounded-full" style={{ background: m.color }} />
              {m.label}
            </li>
          );
        })}
      </ul>
      <p className="absolute bottom-3 right-4 z-10 text-xs text-ink-faint pointer-events-none">Glissez pour déplacer · molette ou pincement pour zoomer</p>

      <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet" className="w-full h-full relative" role="img" aria-label="Carte des émotions, symptômes et causes racines" />

      {selectedNode && (() => {
        const m = typeMeta(selectedNode.type);
        return (
          <div
            className="fixed z-[70] bg-paper border border-line shadow-[0_16px_40px_-16px_rgba(30,33,64,0.45)] p-4 pr-11 rounded-2xl max-w-xs -translate-x-1/2 -translate-y-full -mt-4"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
            <div className="flex items-start gap-3">
              <m.Icon className="w-5 h-5 mt-0.5 shrink-0" style={{ color: m.color }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: m.color }}>{m.label}</p>
                <p className="font-serif text-lg leading-snug text-ink mt-0.5">{selectedNode.label}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="absolute top-2.5 right-2.5 w-8 h-8 flex items-center justify-center rounded-full text-ink-faint hover:text-ink hover:bg-mist"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })()}
    </div>
  );
}
