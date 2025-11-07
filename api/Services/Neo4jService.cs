using Neo4j.Driver;
using TraceLens.Api.Models;

namespace TraceLens.Api.Services;

public class Neo4jService
{
    private readonly IDriver _driver;
    public Neo4jService(IDriver driver) => _driver = driver;

    public async Task Ingest(GraphBundle bundle, List<PackageRisk> packages)
{
    // 1) Ensure constraints in auto-commit queries (separate from writes)
    await using (var session = _driver.AsyncSession())
    {
        await session.RunAsync("CREATE CONSTRAINT IF NOT EXISTS FOR (n:Module) REQUIRE n.id IS UNIQUE");
        await session.RunAsync("CREATE CONSTRAINT IF NOT EXISTS FOR (p:Package) REQUIRE p.name IS UNIQUE");
    }

    // 2) Write nodes/edges/packages in a normal write tx
    await using (var session = _driver.AsyncSession())
    {
        await session.ExecuteWriteAsync(async tx =>
        {
            foreach (var n in bundle.Nodes)
            {
                await tx.RunAsync(
                    @"MERGE (m:Module {id:$id})
                      SET m.name=$name, m.namespace=$ns, m.kind=$kind, m.filePath=$file",
                    new { id = n.Id, name = n.Name, ns = n.Namespace, kind = n.Kind, file = n.FilePath });
            }

            foreach (var e in bundle.Edges)
            {
                await tx.RunAsync(
                    @"MATCH (a:Module {id:$a}), (b:Module {id:$b})
                      MERGE (a)-[:IMPORTS]->(b)",
                    new { a = e.SourceId, b = e.TargetId });
            }

            foreach (var p in packages)
            {
                await tx.RunAsync(
                    @"MERGE (pkg:Package {name:$name})
                      SET pkg.version=$ver, pkg.risk=$risk, pkg.license=$lic",
                    new { name = p.Package, ver = p.Version, risk = p.Risk, lic = p.License });
            }
        });
    }
}


    public async Task<List<object>> GetNodes()
    {
        await using var session = _driver.AsyncSession();
        var cur = await session.RunAsync(
            "MATCH (m:Module) RETURN m.id AS id, m.name AS name, m.namespace AS ns, m.kind AS kind, m.filePath AS file LIMIT 1000");
        return (await cur.ToListAsync(r => new
        {
            id = r["id"].As<string>(),
            name = r["name"].As<string>(),
            @namespace = r["ns"].As<string>(),
            kind = r["kind"].As<string>(),
            filePath = r["file"].As<string>()
        })).Cast<object>().ToList();
    }

    public async Task<List<object>> GetEdges()
    {
        await using var session = _driver.AsyncSession();
        var cur = await session.RunAsync(
            "MATCH (a:Module)-[:IMPORTS]->(b:Module) RETURN a.id AS s, b.id AS t LIMIT 5000");
        return (await cur.ToListAsync(r => new { source = r["s"].As<string>(), target = r["t"].As<string>(), type = "IMPORTS" }))
            .Cast<object>().ToList();
    }

    public async Task<List<object>> SearchNodes(string q)
    {
        await using var session = _driver.AsyncSession();
        var cur = await session.RunAsync(
            "MATCH (m:Module) " +
            "WHERE toLower(m.name) CONTAINS toLower($q) OR toLower(m.namespace) CONTAINS toLower($q) " +
            "RETURN m.id AS id, m.name AS name, m.namespace AS ns, m.kind AS kind LIMIT 50",
            new { q });
        return (await cur.ToListAsync(r => new
        {
            id = r["id"].As<string>(),
            name = r["name"].As<string>(),
            @namespace = r["ns"].As<string>(),
            kind = r["kind"].As<string>()
        })).Cast<object>().ToList();
    }

    public async Task<ModuleDetail?> GetModuleWithRelations(string id)
    {
        await using var session = _driver.AsyncSession();

        var nodeCur = await session.RunAsync(
            "MATCH (m:Module {id:$id}) RETURN m.id AS id, m.name AS name, m.namespace AS ns, m.kind AS kind, m.filePath AS fp",
            new { id });

        var nodeList = await nodeCur.ToListAsync();
        var one = nodeList.FirstOrDefault();
        if (one is null) return null;

        var detail = new ModuleDetail
        {
            Id = one["id"].As<string>(),
            Name = one["name"].As<string>(),
            Namespace = one["ns"].As<string>(),
            Kind = one["kind"].As<string>(),
            FilePath = one["fp"].As<string>(),
        };

        var importsCur = await session.RunAsync(
            "MATCH (m:Module {id:$id})-[:IMPORTS]->(t:Module) RETURN t.id AS id, t.name As name",
            new { id });
        detail.Outgoing = (await importsCur.ToListAsync(r => new Rel
        {
            NodeId = r["id"].As<string>(),
            SourceName = detail.Name,
            TargetName = r["name"].As<string>()
        })).ToList();

        var incomingCur = await session.RunAsync(
            "MATCH (s:Module)-[:IMPORTS]->(m:Module {id:$id}) RETURN s.id AS id, s.name AS name",
            new { id });
        detail.Incoming = (await incomingCur.ToListAsync(r => new Rel
        {
            NodeId = r["id"].As<string>(),
            SourceName = r["name"].As<string>(),
            TargetName = detail.Name
        })).ToList();

        var pkgCur = await session.RunAsync(
            "MATCH (p:Package) RETURN p.name AS name, p.version AS ver, p.risk AS risk, p.license AS lic LIMIT 50");
        detail.PackageRisks = (await pkgCur.ToListAsync(r => new PackageRisk
        {
            Package = r["name"].As<string>(),
            Version = r["ver"].As<string?>() ?? "",
            Risk = r["risk"].As<string?>() ?? "Unknown",
            License = r["lic"].As<string?>()
        })).ToList();

        detail.Imports = detail.Outgoing?.Select(o => o.TargetName).Distinct().ToList() ?? new();
        return detail;
    }
}
