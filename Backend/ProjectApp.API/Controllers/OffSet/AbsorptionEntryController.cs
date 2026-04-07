using Microsoft.AspNetCore.Mvc;
using ProjectApp.Core.DTOs.Account.OffSet;
using ProjectApp.Repository.Interfaces.OffSet;

namespace ProjectApp.API.Controllers.OffSet
{
    [Route("api/[controller]")]
    [ApiController]
    public class AbsorptionEntryController : ControllerBase
    {
        private readonly IAbsorptionEntry _service;

        public AbsorptionEntryController(IAbsorptionEntry service)
        {
            _service = service;
        }

        // ================= INSERT =================
        [HttpPost("save")]
        public async Task<IActionResult> Save([FromBody] AbsorptionEntryInsertDTO request)
        {
            var result = await _service.InsertAsync(request);

            if (!result.Success)
                return BadRequest(result);

            return Ok(result);
        }

        // ================= SEARCH =================
        [HttpGet("entries")]
        public async Task<IActionResult> GetEntries(
            int? ProjectId,
            string FinancialYear,
            int PageNumber = 1,
            int PageSize = 5,
            string Search = "",
            string SortColumn = "TreeName",
            string SortDirection = "asc")
        {
            var result = await _service.SearchAsync(
                ProjectId,
                FinancialYear,
                PageNumber,
                PageSize,
                Search,
                SortColumn,
                SortDirection
            );

            return Ok(result);
        }
    }
}