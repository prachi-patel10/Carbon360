using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ProjectApp.Core.DTOs.Masters.Generator;
using ProjectApp.Core.DTOs.Masters.SiteLocation;
using ProjectApp.Repository.Interfaces.SiteLocation;

namespace ProjectApp.API.Controllers.Masters.SiteLocation
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class SiteLocationController : ControllerBase
    {
        private readonly ISiteLocationService _service;

        public SiteLocationController(ISiteLocationService service)
        {
            _service = service;
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] SiteLocationCreateUpdateDTO dto)
        {
            int userId = Convert.ToInt32(User.FindFirst("UserId")?.Value);

            var encryptedId = await _service.Create(dto, userId);

            return Ok(new { SiteId = encryptedId });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] SiteLocationCreateUpdateDTO dto)
        {
            int userId = Convert.ToInt32(User.FindFirst("UserId")?.Value);

            await _service.Update(id, dto, userId);
            return Ok();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            await _service.Delete(id);
            return Ok();
        }

        [HttpPatch("{id}/toggle-status")]
        public async Task<IActionResult> ToggleStatus(string id, [FromQuery] bool isActive)
        {
            await _service.ToggleStatus(id, isActive);
            return Ok();
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var result = await _service.GetById(id);
            return Ok(result);
        }

        [HttpGet("all")]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAll();
            return Ok(result);
        }


        [HttpGet("search")]
        public async Task<IActionResult> Search(
    string? search,
    bool? isActive,
    string sortColumn = "SiteName",
    string sortDirection = "ASC",
    int pageNumber = 1,
    int pageSize = 10)
        {
            var request = new SiteLocationSearchRequest
            {
                Search = search,
                IsActive = isActive,
                SortColumn = sortColumn,
                SortDirection = sortDirection,
                PageNumber = pageNumber,
                PageSize = pageSize
            };

            var result = await _service.SearchAsync(request);
            return Ok(result);
        }

        [HttpGet("departments")]
        public async Task<IActionResult> GetDepartments()
        {
            var result = await _service.GetDepartments();
            return Ok(result);
        }
    }
}
