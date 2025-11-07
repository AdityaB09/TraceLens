namespace TraceLens.Api.Utils;

public static class StreamHelpers
{
    public static async Task<string> ReadAllTextAsync(Stream s)
    {
        using var sr = new StreamReader(s);
        return await sr.ReadToEndAsync();
    }
}
