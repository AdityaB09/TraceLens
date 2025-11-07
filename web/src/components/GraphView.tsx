import React, { useEffect, useRef } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import cytoscape, { Core } from "cytoscape";

type Props = {
  elements: any[];
  onSelectNode: (id: string | null) => void;
  layoutName: "cose" | "concentric" | "breadthfirst";
  highlightIds?: Set<string>;
};

const stylesheet = [
  {
    selector: "node",
    style: {
      "background-color": "#60a5fa",
      "border-color": "#93c5fd",
      "border-width": 2,
      label: "data(label)",
      "font-size": 10,
      color: "#e5e7eb",
      "text-wrap": "wrap",
      "text-max-width": 160,
      "text-background-color": "#0b1220",
      "text-background-opacity": 0.85,
      "text-background-padding": 2,
      "width": "mapData(deg, 0, 40, 8, 28)",
      "height": "mapData(deg, 0, 40, 8, 28)",
    },
  },
  {
    selector: "edge",
    style: {
      width: 1.1,
      "line-color": "#334155",
      "target-arrow-color": "#334155",
      "target-arrow-shape": "triangle",
      "curve-style": "bezier",
      opacity: 0.75,
    },
  },
  { selector: ".faded", style: { opacity: 0.15 } },
  { selector: ".selected", style: { "background-color": "#22d3ee", "border-color": "#06b6d4" } },
];

function layoutFor(name: "cose" | "concentric" | "breadthfirst") {
  if (name === "concentric")
    return { name, fit: true, padding: 30, avoidOverlap: true, minNodeSpacing: 24, concentric: (n:any)=>n.degree(), levelWidth: ()=>2 };
  if (name === "breadthfirst")
    return { name, fit: true, padding: 30, spacingFactor: 1.1, directed: false, avoidOverlap: true };
  return {
    name: "cose",
    fit: true, padding: 20, animate: true,
    nodeRepulsion: 9000, idealEdgeLength: 110, edgeElasticity: 0.2, gravity: 1, numIter: 1000,
  } as any;
}

export default function GraphView({ elements, onSelectNode, layoutName, highlightIds }: Props) {
  const cyRef = useRef<Core | null>(null);

  // safely replace elements & run layout
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    // rebuild graph
    cy.stop();
    cy.elements().remove();
    cy.add(elements as any);
    cy.layout(layoutFor(layoutName)).run();
    cy.fit(undefined, 32);

    // dim non-matches
    cy.elements().removeClass("faded");
    if (highlightIds && highlightIds.size > 0) {
      cy.nodes().forEach(n => {
        if (!highlightIds.has(n.id())) n.addClass("faded");
      });
      cy.edges().forEach(e => {
        if (!highlightIds.has(e.source().id()) && !highlightIds.has(e.target().id())) e.addClass("faded");
      });
    }
  }, [elements, layoutName, highlightIds]);

  // tap handlers (guarded)
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const onNodeTap = (evt: any) => {
      const n = evt?.target;
      if (!n || !n.id) return;
      cy.nodes().removeClass("selected");
      n.addClass("selected");
      onSelectNode(n.id());
    };

    const onBgTap = (evt: any) => {
      if (!evt || evt.target !== cy) return;
      cy.nodes().removeClass("selected");
      onSelectNode(null);
    };

    cy.on("tap", "node", onNodeTap);
    cy.on("tap", onBgTap);

    return () => {
      try { cy.off("tap", "node", onNodeTap); } catch {}
      try { cy.off("tap", onBgTap); } catch {}
    };
  }, [onSelectNode]);

  return (
    <CytoscapeComponent
      cy={(cy) => (cyRef.current = cy)}
      style={{ width: "100%", height: "100%" }}
      elements={[]} /* we add via effect */
      layout={layoutFor(layoutName) as any}
      stylesheet={stylesheet as any}
    />
  );
}
