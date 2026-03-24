using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ProjectApp.Core.DTOs.Masters.Generator;
using ProjectApp.Repository.Interfaces.Masters.Generator;
using ProjectApp.Repository.Services.Masters.Generator;

namespace ProjectApp.API.Controllers.Masters.Generator
{
    [Authorize]
    [Route("api/generator")]
    [ApiController]
    public class GeneratorController : ControllerBase
    {
        private readonly IGeneratorService _service;

        public GeneratorController(IGeneratorService service)
        {
            _service = service;
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var result = await _service.GetById(id);
            return Ok(result);
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAll();
            return Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> Create(GeneratorCreateUpdateDTO dto)
        {
            int userId = Convert.ToInt32(User.FindFirst("UserId")?.Value);

            var id = await _service.Create(dto, userId);

            return Ok(new { EncryptedId = id });
        }

        [HttpPut]
        public async Task<IActionResult> Update([FromBody] GeneratorCreateUpdateDTO dto)
        {
            int userId = Convert.ToInt32(User.FindFirst("UserId")?.Value);

            await _service.Update(dto, userId);

            return Ok(new { Message = "Generator updated successfully" });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            await _service.Delete(id);
            return Ok();
        }

        [HttpPatch("toggle-status")]
        [Consumes("application/x-www-form-urlencoded")] // form-body style
        public async Task<IActionResult> ToggleStatus([FromForm] GeneratorToggleStatusDTO dto)
        {
            if (dto == null || string.IsNullOrEmpty(dto.GeneratorId))
                return BadRequest("Invalid request");

            await _service.ToggleStatus(dto.GeneratorId, dto.IsActive);
            return Ok(new { Message = $"Generator status updated to {(dto.IsActive ? "Active" : "Inactive")}" });
        }

        [HttpGet("search")]
        public async Task<IActionResult> Search(
    string? search, bool? isActive,
    string sortColumn = "generatorName",
    string sortDirection = "ASC",
    int pageNumber = 1, int pageSize = 10,
    string? fuelIds = null,  
    string? siteIds = null)   
        {
            var request = new GeneratorSearchRequest
            {
                Search = search,
                IsActive = isActive,
                SortColumn = sortColumn,
                SortDirection = sortDirection,
                PageNumber = pageNumber,
                PageSize = pageSize,
                FuelIds = fuelIds,   
                SiteIds = siteIds    
            };
            var result = await _service.SearchAsync(request);
            return Ok(result);
        }

        [HttpGet("site/{siteId}")]
        public async Task<IActionResult> GetGeneratorsBySite(string siteId)
        {
            if (string.IsNullOrWhiteSpace(siteId))
                return BadRequest("SiteId is required.");

            try
            {
                var result = await _service.GetBySiteIdAsync(siteId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
        }
    }


}
