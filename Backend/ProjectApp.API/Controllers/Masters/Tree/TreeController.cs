using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ProjectApp.Core.DTOs.Masters.Tree;
using ProjectApp.Core.DTOs.Masters.VehicleType;
using ProjectApp.Repository.Interfaces.Masters.Tree;

namespace ProjectApp.API.Controllers.Masters.Tree
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TreeController : ControllerBase
    {
        private readonly ITreeService _treeService;

        public TreeController(ITreeService treeService)
        {
            _treeService = treeService;
        }

        [HttpGet("All")]
        public async Task<IActionResult> GetAll()
        {
            var result = await _treeService.GetAllTreesAsync();
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var result = await _treeService.GetTreeByIdAsync(id);

            if (result == null)
                return NotFound("Tree not found");

            return Ok(result);
        }

        [HttpPost("Create")]
        public async Task<IActionResult> Create([FromBody] TreeCreateDTO dto)
        {
            var result = await _treeService.CreateTreeAsync(dto);
            return Ok(result);
        }

        [HttpPut("Update")]
        public async Task<IActionResult> Update([FromBody] TreeUpdateDTO dto)
        {
            var result = await _treeService.UpdateTreeAsync(dto);

            if (!result)
                return BadRequest("Update failed");

            return Ok("Updated Successfully");
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var result = await _treeService.DeleteTreeAsync(id);

            if (!result)
                return BadRequest("Delete failed");

            return Ok("Deleted Successfully");
        }


        [HttpGet("Search")]
        public async Task<IActionResult> Search(
            [FromQuery] string? searchText,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? sortColumn = "TreeName",
            [FromQuery] string? sortDirection = "ASC",
            [FromQuery] bool? isActive = null)
        {
            var dto = new TreeSearchDTO
            {
                Search = searchText,
                PageNumber = pageNumber,
                PageSize = pageSize,
                SortColumn = sortColumn,
                SortDirection = sortDirection,
                IsActive = isActive
            };

            var result = await _treeService.SearchTreesAsync(dto);
            return Ok(result);
        }

        [HttpPatch("UpdateStatus")]
        public async Task<IActionResult> UpdateStatus([FromBody] TreeMasterStatusUpdateDTO dto)
        {
            var result = await _treeService.UpdateStatusAsync(dto);

            if (!result)
                return BadRequest("Status update failed");

            return Ok("Status updated successfully");
        }

    }
}
