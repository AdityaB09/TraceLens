# TraceLens – AI-Enhanced Software Dependency Explorer

Dockerized stack:
- .NET 8 Web API (Roslyn, Neo4j.Driver v5)
- Neo4j 5.x (+ APOC)
- React + Vite + Cytoscape.js (with react-cytoscapejs@1.2.1)

## Quick start

```bash
cp .env.example .env   # put your LLM key
docker compose build
docker compose up -d
