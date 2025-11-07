using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using TraceLens.Api.Models;

namespace TraceLens.Api.Services;

public class RoslynParser
{
    public GraphBundle BuildGraph(string projectName, List<(string path, string text)> csFiles)
    {
        var bundle = new GraphBundle();

        // Index by fully qualified name to map edges later
        var nodeByFqn = new Dictionary<string, GraphNode>(StringComparer.OrdinalIgnoreCase);

        foreach (var (path, text) in csFiles)
        {
            var tree = CSharpSyntaxTree.ParseText(text);
            var root = tree.GetCompilationUnitRoot();

            var usings = root.Usings.Select(u => u.Name.ToString()).Distinct().ToList();
            var decls = root.DescendantNodes().OfType<BaseTypeDeclarationSyntax>();

            foreach (var decl in decls)
            {
                var ns = decl.Parent is NamespaceDeclarationSyntax nd ? nd.Name.ToString()
                       : decl.Parent is FileScopedNamespaceDeclarationSyntax fd ? fd.Name.ToString()
                       : "Global";

                var kind = decl.Kind() switch
                {
                    SyntaxKind.ClassDeclaration => "Class",
                    SyntaxKind.InterfaceDeclaration => "Interface",
                    SyntaxKind.StructDeclaration => "Struct",
                    SyntaxKind.EnumDeclaration => "Enum",
                    _ => "Type"
                };

                var name = decl is BaseTypeDeclarationSyntax b ? b.Identifier.Text : "Unknown";
                var fqn = $"{ns}.{name}";

                var id = $"{projectName}:{fqn}";
                var node = new GraphNode(id, name, ns, kind, path);
                bundle.Nodes.Add(node);
                nodeByFqn[fqn] = node;

                // store imports as edges to namespaces (resolved later best-effort)
                // here we add placeholder edges to be resolved: we will later try to match namespace prefix
                foreach (var u in usings)
                {
                    // temporarily store namespaced edges — resolution done below
                    bundle.Edges.Add(new GraphEdge(node.Id, $"ns::{u}", "IMPORTS"));
                }
            }
        }

        // Resolve import edges ns::X.* to actual nodes with matching namespace prefix
        var nsGroups = bundle.Nodes.GroupBy(n => n.Namespace).ToList();
        var resolved = new List<GraphEdge>();
        foreach (var e in bundle.Edges.Where(e => e.Type == "IMPORTS" && e.TargetId.StartsWith("ns::")))
        {
            var ns = e.TargetId.Substring("ns::".Length);
            var candidates = bundle.Nodes.Where(n => n.Namespace.StartsWith(ns)).Select(n => n.Id).Take(20);
            foreach (var c in candidates)
                resolved.Add(new GraphEdge(e.SourceId, c, "IMPORTS"));
        }
        // Replace unresolved with resolved (drop placeholders)
        bundle.Edges.RemoveAll(e => e.Type == "IMPORTS" && e.TargetId.StartsWith("ns::"));
        bundle.Edges.AddRange(resolved.DistinctBy(x => $"{x.SourceId}->{x.TargetId}:{x.Type}"));

        return bundle;
    }
}
