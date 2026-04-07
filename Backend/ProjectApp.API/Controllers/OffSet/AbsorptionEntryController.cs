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

    // INSERT
    [HttpPost("insert")]
    public async Task<IActionResult> Insert([FromBody] OffsetEntryDto model)
    {
        try
        {
            // 🔥 Extract UserId from JWT
            var userIdClaim = User.FindFirst("UserId")?.Value;

            if (string.IsNullOrEmpty(userIdClaim))
                return Unauthorized("UserId not found in token");

            int userId = Convert.ToInt32(userIdClaim);

            // ✅ Set EntryBy here
            model.EntryBy = userId;

            var result = await _service.InsertOffsetEntry(model);

            return Ok(new { message = "Inserted successfully", id = result });
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    // GET ALL
    [HttpGet("list")]
    public async Task<IActionResult> GetAll(int pageNumber = 1, int pageSize = 10, string search = null)
    {
        var result = await _service.GetAll(pageNumber, pageSize, search);
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
}