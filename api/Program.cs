using Microsoft.AspNetCore.Http.Features;
using Neo4j.Driver;
using TraceLens.Api.Services;

var builder = WebApplication.CreateBuilder(args);


// CORS
builder.Services.AddCors(p => p.AddDefaultPolicy(policy =>
    policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

builder.Services.AddControllers();
builder.Services.Configure<FormOptions>(o =>
{
    o.MultipartBodyLengthLimit = 1024L * 1024L * 1024L; // 1GB
});

// Neo4j config (from env or defaults)
var neo4jUri = Environment.GetEnvironmentVariable("NEO4J_URI") ?? "bolt://localhost:7687";
var neo4jUser = Environment.GetEnvironmentVariable("NEO4J_USERNAME") ?? "neo4j";
var neo4jPass = Environment.GetEnvironmentVariable("NEO4J_PASSWORD") ?? "neo4j";
builder.Services.AddSingleton(GraphDatabase.Driver(neo4jUri, AuthTokens.Basic(neo4jUser, neo4jPass)));
builder.Services.AddSingleton<Neo4jService>();

// Services
builder.Services.AddSingleton<RoslynParser>();
builder.Services.AddSingleton<PackageScanner>();
builder.Services.AddHttpClient<LlmService>();

var app = builder.Build();
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
app.Urls.Add($"http://0.0.0.0:{port}");
app.UseCors();
app.MapControllers();
app.Run();
