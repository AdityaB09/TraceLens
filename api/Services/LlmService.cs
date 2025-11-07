using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace TraceLens.Api.Services;

public class LlmService
{
    private readonly HttpClient _http;
    private readonly string _url;
    private readonly string _key;
    private readonly string _model;

    public LlmService(HttpClient http)
    {
        _http = http;
        _url = Environment.GetEnvironmentVariable("LLM_API_URL") ?? "https://api.openai.com/v1/chat/completions";
        _key = Environment.GetEnvironmentVariable("LLM_API_KEY") ?? "";
        _model = Environment.GetEnvironmentVariable("LLM_MODEL") ?? "gpt-4o-mini";
    }

    public async Task<string> Summarize(string prompt)
    {
        // Safe stub if no key provided
        if (string.IsNullOrWhiteSpace(_key))
        {
            return "LLM disabled: set LLM_API_KEY to enable real explanations.\n\n" +
                   "- Purpose: Module analyzed via Roslyn.\n" +
                   "- Dependencies: From using directives & IMPORTS edges.\n" +
                   "- Risks: Watch cycles / high fan-in/out.\n" +
                   "- Suggestions: Extract interfaces, split large namespaces, add tests.";
        }

        var req = new
        {
            model = _model,
            messages = new[]
            {
                new { role = "system", content = "You are a concise, accurate senior .NET architect." },
                new { role = "user", content = prompt }
            },
            temperature = 0.3
        };

        var json = JsonSerializer.Serialize(req);
        using var msg = new HttpRequestMessage(HttpMethod.Post, _url);
        msg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _key);
        msg.Content = new StringContent(json, Encoding.UTF8, "application/json");

        var resp = await _http.SendAsync(msg);
        resp.EnsureSuccessStatusCode();

        using var s = await resp.Content.ReadAsStreamAsync();
        using var doc = await JsonDocument.ParseAsync(s);
        var content = doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString();

        return content ?? "(no content)";
    }
}
