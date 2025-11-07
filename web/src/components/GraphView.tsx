import React, { useEffect, useRef } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import cytoscape from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";   // ← add
cytoscape.use(coseBilkent);  

type Props = {
  elements: any[];
  onSelectNode: (id: string) => void;
};

export default function GraphView({ elements, onSelectNode }: Props) {
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    cy.on("tap", "node", evt => {
      const id = evt.target.data("id");
      onSelectNode(id);
    });
  }, [onSelectNode]);

  return (
    <CytoscapeComponent
      cy={(cy) => (cyRef.current = cy)}
      style={{ width: "100%", height: "100%" }}
      elements={elements as any}
      layout={{ name: "cose", fit: true }}
      stylesheet={[
        {
          selector: "node",
          style: {
            "background-color": "#60a5fa",
            label: "data(label)",
            color: "#081018",
            "font-size": 10,
            "text-wrap": "wrap",
            "text-max-width": 150
          }
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#334155",
            "target-arrow-color": "#334155",
            "target-arrow-shape": "triangle"
          }
        }
      ]}
    />
  );
}
