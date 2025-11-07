namespace TraceLens.Api.Models;

public record GraphNode(
    string Id,
    string Name,
    string Namespace,
    string Kind,          // Class / Interface / Struct / Enum
    string FilePath
);

public record GraphEdge(
    string SourceId,
    string TargetId,
    string Type          // "IMPORTS" | "REFERENCES"
);

public class GraphBundle
{
    public List<GraphNode> Nodes { get; } = new();
    public List<GraphEdge> Edges { get; } = new();
}

public class ModuleDetail
{
    public string Id { get; set; } = default!;
    public string Name { get; set; } = default!;
    public string Namespace { get; set; } = default!;
    public string Kind { get; set; } = default!;
    public string FilePath { get; set; } = default!;
    public List<string>? Imports { get; set; }
    public List<Rel>? Outgoing { get; set; }
    public List<Rel>? Incoming { get; set; }
    public List<PackageRisk>? PackageRisks { get; set; }
}

public class Rel
{
    public string NodeId { get; set; } = default!;
    public string SourceName { get; set; } = default!;
    public string TargetName { get; set; } = default!;
}

public class PackageRisk
{
    public string Package { get; set; } = default!;
    public string Version { get; set; } = default!;
    public string Risk { get; set; } = default!;
    public string? License { get; set; }
}
