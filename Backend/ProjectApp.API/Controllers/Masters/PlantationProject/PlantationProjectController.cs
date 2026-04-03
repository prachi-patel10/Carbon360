using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ProjectApp.Core.DTOs.Masters.Generator;
using ProjectApp.Core.DTOs.Masters.PlantationProject;
using ProjectApp.Repository.Interfaces.Masters.PlantationProject;
using ProjectApp.Repository.Services.Masters.PlantationProject;

namespace ProjectApp.API.Controllers.Masters.PlantationProject
{
    [Route("api/[controller]")]
    [ApiController]
    public class PlantationProjectController : ControllerBase
    {
        private readonly IPlantationProject _service;

        public PlantationProjectController(IPlantationProject service)
        {
            _service = service;
        }
        private int GetUserId()
        {
            return Convert.ToInt32(User.FindFirst("UserId")?.Value);
        }

        [HttpPost("insert")]
        public async Task<IActionResult> Insert([FromBody] PlantationProjectInsertDTO dto)
        {
            var newId = await _service.InsertAsync(dto, GetUserId());
            var data = await _service.GetByIdAsync(newId);   // fetch full record
            return Ok(data);
        }

    
        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] PlantationProjectUpdateDTO dto)
        {
            await _service.UpdateAsync(dto, GetUserId());
            var data = await _service.GetByIdAsync(dto.ProjectId);  // fetch updated record
            return Ok(data);
        }

       
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var result = await _service.DeleteAsync(id, GetUserId());
            return Ok(result);
        }

     
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var data = await _service.GetByIdAsync(id);
            return Ok(data);
        }

        [HttpGet("all")]
        public async Task<IActionResult> GetAll()
        {
            var data = await _service.GetAllAsync();
            return Ok(data);
        }

        [HttpGet("search")]
        public async Task<IActionResult> Search(
              string? searchText,
              string sortColumn = "ProjectId",
              string sortDirection = "DESC",
              int pageNumber = 1,
              int pageSize = 10)
        {
            var dto = new PlantationProjectSearchDTO
            {
                SearchText = searchText,
                SortColumn = sortColumn,
                SortDirection = sortDirection,
                PageNumber = pageNumber,
                PageSize = pageSize
            };

            var result = await _service.SearchAsync(dto);

         
            return Ok(new
            {
                totalCount = result.TotalCount,
                data = result.Data
            });
        }
    }
}
