using System.Xml.Linq;
using TraceLens.Api.Models;

namespace TraceLens.Api.Services;

public class PackageScanner
{
    private static readonly Dictionary<string, (string risk, string license)> Known = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Newtonsoft.Json"] = ("Low: keep updated", "MIT"),
        ["Dapper"] = ("Low", "Apache-2.0"),
        ["Some.Vuln.Package"] = ("High: CVE-XXXX-YYYY", "UNKNOWN")
    };

    public List<PackageRisk> Scan(List<string> csprojContents)
    {
        var results = new List<PackageRisk>();
        foreach (var xml in csprojContents)
        {
            try
            {
                var doc = XDocument.Parse(xml);
                var items = doc.Descendants().Where(x => x.Name.LocalName == "PackageReference");
                foreach (var pr in items)
                {
                    var name = pr.Attribute("Include")?.Value ?? "";
                    var ver = pr.Attribute("Version")?.Value ?? pr.Element(XName.Get("Version"))?.Value ?? "";
                    if (string.IsNullOrWhiteSpace(name)) continue;

                    var risk = Known.TryGetValue(name, out var inf)
                        ? new PackageRisk { Package = name, Version = ver, Risk = inf.risk, License = inf.license }
                        : new PackageRisk { Package = name, Version = ver, Risk = "Unknown", License = null };

                    results.Add(risk);
                }
            }
            catch { /* ignore malformed csproj */ }
        }
        return results;
    }
}
