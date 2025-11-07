using Microsoft.AspNetCore.Mvc;

namespace TraceLens.Api.Controllers;

[ApiController]
[Route("[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new { status = "ok", service = "api" });
}
