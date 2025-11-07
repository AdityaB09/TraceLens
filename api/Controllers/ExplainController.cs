using Microsoft.AspNetCore.Mvc;
using TraceLens.Api.Services;

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

        var prompt = $"""
        You are a senior .NET architect. Explain the purpose of this C# module to a new teammate.
        Include: responsibilities, key dependencies, potential risks, and quick refactor ideas.
        Module:
        Name: {module.Name}
        Namespace: {module.Namespace}
        Kind: {module.Kind}
        Direct Imports: {string.Join(", ", module.Imports ?? new List<string>())}
        Outgoing: {string.Join(", ", module.Outgoing?.Select(o => o.TargetName) ?? Array.Empty<string>())}
        Incoming: {string.Join(", ", module.Incoming?.Select(i => i.SourceName) ?? Array.Empty<string>())}
        """;

        var summary = await _llm.Summarize(prompt); // returns stub text if no API key
        return Ok(new { id, explanation = summary });
    }
}
