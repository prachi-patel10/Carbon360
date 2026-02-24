using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ProjectApp.Core.DTOs.Masters.Vehicle;
using ProjectApp.Repository.Interfaces.Masters.Vehicle;
using ProjectApp.Repository.Services.Masters.Vehicle;

namespace ProjectApp.API.Controllers.Masters.Vehicle
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class VehicleMasterController : ControllerBase
    {
        private readonly IVehicleService _service;

        public VehicleMasterController(IVehicleService service)
        {
            _service = service;
        }

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] VehicleDto dto)
        {
            var result = await _service.InsertAsync(dto);
            return Ok(result);
        }

        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] VehicleUpdateDto dto)
        {
            await _service.UpdateAsync(dto);
            return Ok("Updated Successfully");
        }

        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            await _service.DeleteAsync(id, 1);
            return Ok("Deleted Successfully");
        }

        [HttpPatch("status")]
        public async Task<IActionResult> UpdateStatus([FromBody] VehicleStatusDto dto)
        {
            await _service.UpdateStatusAsync(dto.vehicle_id, dto.IsActive, 1);
            return Ok("Status Updated Successfully");
        }

        [HttpGet("getalllist")]
        public async Task<IActionResult> GetAllList()
        {
            var result = await _service.GetAllList();
            return Ok(result);
        }

        [HttpGet("getbyid/{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var result = await _service.GetById(id);
            return Ok(result);
        }

        [HttpGet("getbyname/{name}")]
        public async Task<IActionResult> GetByName(string name)
        {
            var result = await _service.GetByName(name);
            return Ok(result);
        }

        [HttpGet("search")]
        public async Task<IActionResult> Search(
            string? search,
            bool? isActive,
            string sortColumn = "vehicle_number",
            string sortDirection = "ASC",
            int pageNumber = 1,
            int pageSize = 10)
        {
            var request = new VehicleSearchRequest
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
    }
}