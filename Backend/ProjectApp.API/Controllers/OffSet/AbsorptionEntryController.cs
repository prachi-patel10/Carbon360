using Microsoft.AspNetCore.Mvc;
using ProjectApp.Core.DTOs.Account.OffSet;
using ProjectApp.Repository.Interfaces.OffSet;

[ApiController]
[Route("api/[controller]")]
public class OffsetEntryController : ControllerBase
{
    private readonly IAbsorptionEntry _service;

    public OffsetEntryController(IAbsorptionEntry service)
    {
        _service = service;
    }

    [HttpPost("insert")]
    public async Task<IActionResult> Insert([FromBody] OffsetEntryDto model)
    {
        var userIdClaim = User.FindFirst("UserId")?.Value;

        if (string.IsNullOrEmpty(userIdClaim))
            return Unauthorized();

        int userId = Convert.ToInt32(userIdClaim);

        var result = await _service.InsertOffsetEntry(model, userId);

        return Ok(result);
    }

    // GET ALL
    [HttpGet("list")]
    public async Task<IActionResult> GetAll(
       int pageNumber = 1,
       int pageSize = 10,
       string? search = null,        
       int? projectId = null,
       int? financialYear = null
   )
    {
        var result = await _service.GetAll(pageNumber, pageSize, search, projectId, financialYear);
        return Ok(result);
    }

    // GET BY ID
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _service.GetById(id);
        return Ok(result);
    }

    // DELETE
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _service.Delete(id);
        return Ok(new { Message = "Deleted Successfully" });
    }
    [HttpPost("save-draft")]
    public async Task<IActionResult> SaveDraft([FromBody] OffsetEntrySaveDraftRequestDTO request)
    {
        if (request == null)
            return BadRequest("Request body is null");

        var result = await _service.SaveDraftAsync(request);

        return Ok(result);
    }
}