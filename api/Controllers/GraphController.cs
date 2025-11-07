using Microsoft.AspNetCore.Mvc;
using System.IO.Compression;
using TraceLens.Api.Models;
using TraceLens.Api.Services;

namespace TraceLens.Api.Controllers;

[ApiController]
[Route("projects")]
public class GraphController : ControllerBase
{
    private readonly RoslynParser _parser;
    private readonly Neo4jService _neo;
    private readonly PackageScanner _pkg;

    public GraphController(RoslynParser parser, Neo4jService neo, PackageScanner pkg)
    {
        _parser = parser;
        _neo = neo;
        _pkg = pkg;
    }

    [HttpPost("upload")]
    [RequestSizeLimit(1_100_000_000)]
    public async Task<IActionResult> Upload([FromQuery] string projectName)
    {
        if (!Request.HasFormContentType || Request.Form.Files.Count == 0)
            return BadRequest("Upload a zip as multipart/form-data with key 'file'.");

        var file = Request.Form.Files[0];
        await using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        ms.Position = 0;

        var csFiles = new List<(string path, string text)>();
        var csprojFiles = new List<(string path, string text)>();

        using (var zip = new ZipArchive(ms, ZipArchiveMode.Read, leaveOpen: false))
        {
            foreach (var entry in zip.Entries)
            {
                if (string.IsNullOrEmpty(entry.Name)) continue; // folder
                await using var es = entry.Open();
                using var sr = new StreamReader(es);
                var text = await sr.ReadToEndAsync();

                if (entry.FullName.EndsWith(".cs", StringComparison.OrdinalIgnoreCase))
                    csFiles.Add((entry.FullName, text));
                else if (entry.FullName.EndsWith(".csproj", StringComparison.OrdinalIgnoreCase))
                    csprojFiles.Add((entry.FullName, text));
            }
        }

        var graph = _parser.BuildGraph(projectName, csFiles);
        var pkgRisks = _pkg.Scan(csprojFiles.Select(x => x.text).ToList());
        await _neo.Ingest(graph, pkgRisks);

        return Ok(new
        {
            ok = true,
            project = projectName,
            nodes = graph.Nodes.Count,
            edges = graph.Edges.Count,
            packages = pkgRisks.Count
        });
    }

    [HttpGet("/graph/nodes")]
    public async Task<IActionResult> Nodes() => Ok(await _neo.GetNodes());

    [HttpGet("/graph/edges")]
    public async Task<IActionResult> Edges() => Ok(await _neo.GetEdges());

    [HttpGet("/graph/search")]
    public async Task<IActionResult> Search([FromQuery] string q) => Ok(await _neo.SearchNodes(q));

    [HttpGet("/graph/module/{id}")]
    public async Task<IActionResult> Module(string id)
    {
        var module = await _neo.GetModuleWithRelations(id);
        return module is null ? NotFound() : Ok(module);
    }
}
