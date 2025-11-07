using Microsoft.AspNetCore.Mvc;
using TraceLens.Api.Services;
using TraceLens.Api.Models;  
namespace TraceLens.Api.Controllers;

[ApiController]
[Route("explain")]
public class ExplainController : ControllerBase
{
    private readonly LlmService _llm;
    private readonly Neo4jService _neo;

    public ExplainController(LlmService llm, Neo4jService neo)
    {
        _llm = llm;
        _neo = neo;
    }

[HttpPost("module/{id}")]
public async Task<IActionResult> ExplainModule(string id)
{
    var module = await _neo.GetModuleWithRelations(id);
    if (module is null) return NotFound();

    // If no key, build a plausible local summary from facts we have.
    if (!_llm.HasReal)
    {
        var incoming = module.Incoming?.Count ?? 0;
        var outgoing = module.Outgoing?.Count ?? 0;
        var fanInOut = incoming + outgoing;
        string risk =
            fanInOut >= 25 ? "High coupling" :
            fanInOut >= 10 ? "Moderate coupling" :
            "Low coupling";

        var topImports = string.Join(", ",
            (module.Imports ?? new List<string>()).Take(6));

        var pkgLines = (module.PackageRisks ?? new List<PackageRisk>())
            .Take(8)
            .Select(p => $"- {p.Package} {(string.IsNullOrWhiteSpace(p.Version) ? "" : $"({p.Version})")} – {p.Risk}")
            .ToList();

        var local = $@"LLM disabled: deterministic local analysis.

Module: {module.Namespace}.{module.Name}  · Kind: {module.Kind}
File: {module.FilePath}

Direct imports (sample): { (string.IsNullOrWhiteSpace(topImports) ? "—" : topImports) }
Incoming refs: {incoming}   Outgoing refs: {outgoing}   Coupling: {risk}

Heuristics:
- If incoming >> outgoing: consider extracting interfaces to decouple callers.
- If outgoing >> incoming: this module performs orchestration; isolate side-effects.
- Watch for cyclic imports across namespaces with similar prefixes.
- Split long namespaces into sub-assemblies if deployment size grows.

Packages in project (sample):
{string.Join("\n", pkgLines)}";

        return Ok(new { id, explanation = local });
    }

    // Real LLM path (unchanged)
    var prompt = $"""
    You are a senior .NET architect. Explain the purpose of this C# module to a new teammate.
    Include: responsibilities, key dependencies, potential risks, and quick refactor ideas.
    Module:
    Name: {module.Name}
    Namespace: {module.Namespace}
    Kind: {module.Kind}
    File: {module.FilePath}
    Direct Imports: {string.Join(", ", module.Imports ?? new List<string>())}
    Outgoing: {string.Join(", ", module.Outgoing?.Select(o => o.TargetName) ?? Array.Empty<string>())}
    Incoming: {string.Join(", ", module.Incoming?.Select(i => i.SourceName) ?? Array.Empty<string>())}
    """;

    var summary = await _llm.Summarize(prompt);
    return Ok(new { id, explanation = summary });
}

}
