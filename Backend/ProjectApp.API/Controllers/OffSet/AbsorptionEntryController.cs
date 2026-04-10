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
        var username = User.Identity?.Name;

        var result = await _service.InsertOffsetEntry(model, username, false); // ✅ FINAL

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
    public async Task<IActionResult> SaveDraft([FromBody] OffsetEntryDto model)
    {
        var username = User.Identity?.Name;

        var result = await _service.InsertOffsetEntry(model, username, true); // ✅ DRAFT

        return Ok(result);
    }

    [HttpGet("get-by-project/{projectId}")]

    public async Task<IActionResult> GetByProject(string projectId)

    {

        var result = await _service.GetPlannedData(projectId);

        return Ok(result);

    }


    [HttpGet("check/{projectId}")]
    public async Task<IActionResult> Check(string projectId)
    {
        var result = await _service.CheckByProject(projectId);
        return Ok(result);
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search(
    int pageNumber = 1,
    int pageSize = 10,
    string? search = null,
    int? projectId = null,
    int? financialYear = null)
    {
        var result = await _service.Search(
            pageNumber,
            pageSize,
            search,
            projectId,
            financialYear
        );

        return Ok(new
        {
            status = true,
            data = result
        });
    }
}