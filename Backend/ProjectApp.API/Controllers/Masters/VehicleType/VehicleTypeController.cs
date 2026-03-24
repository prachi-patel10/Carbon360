using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ProjectApp.Core.DTOs.Masters.Fuel;
using ProjectApp.Core.DTOs.Masters.VehicleType;
using ProjectApp.Repository.Interfaces.Masters.VehicleType;
using ProjectApp.Repository.Utilities.SP;

namespace ProjectApp.API.Controllers.Masters.VehicleType
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class VehicleTypeController : ControllerBase
    {
        private readonly IVehicleTypeService _vehicleTypeService;

        public VehicleTypeController(IVehicleTypeService vehicleTypeService)
        {
            _vehicleTypeService = vehicleTypeService;
        }
        [HttpPost("Create")]
        public async Task<IActionResult> Create([FromBody] VehicleTypeCreateDTO dto)
        {
            var result = await _vehicleTypeService.CreateVehicleTypeAsync(dto);
            return Ok(result);
        }

        [HttpPut("Update")]
        public async Task<IActionResult> Update([FromBody] VehicleTypeUpdateDTO dto)
        {
            var result = await _vehicleTypeService.UpdateVehicleTypeAsync(dto);

            if (!result)
                return BadRequest("Update failed");

            return Ok("Updated Successfully");
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var result = await _vehicleTypeService.DeleteVehicleTypeAsync(id);

            if (!result)
                return BadRequest("Delete failed");

            return Ok("Deleted Successfully");
        }

        [HttpGet("All")]
        public async Task<IActionResult> GetAll()
        {
            var result = await _vehicleTypeService.GetAllVehicleTypesAsync();
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var result = await _vehicleTypeService.GetVehicleTypeByIdAsync(id);

            if (result == null)
                return NotFound("Vehicle Type not found");

            return Ok(result);
        }

        [HttpPatch("UpdateStatus")]
        public async Task<IActionResult> UpdateStatus([FromBody] VehicleTypeStatusUpdateDTO dto)
        {
            var result = await _vehicleTypeService.UpdateStatusAsync(dto);

            if (!result)
                return BadRequest("Status update failed");

            return Ok("Status updated successfully");
        }

        [HttpGet("Search")]
        public async Task<IActionResult> Search(
    [FromQuery] string? searchText,
    [FromQuery] int pageNumber = 1,
    [FromQuery] int pageSize = 10,
    [FromQuery] string? sortColumn = null,
    [FromQuery] string? sortDirection = "ASC",
    [FromQuery] bool? isActive = null,
    [FromQuery] string? categoryIds = null,
    [FromQuery] string? vehicleNames = null)
        {
            var dto = new VehicleTypeSearchDTO
            {
                Search = searchText,
                PageNumber = pageNumber,
                PageSize = pageSize,
                SortColumn = sortColumn ?? "vehicle_type_name",
                SortDirection = sortDirection ?? "ASC",
                IsActive = isActive,
                CategoryIds = categoryIds,
                VehicleNames = vehicleNames
            };

            var result = await _vehicleTypeService.SearchVehicleTypesAsync(dto);
            return Ok(result);
        }

        [HttpPatch("{id}/toggle-status")]
        public async Task<IActionResult> ToggleStatus(string id)
        {
            var success = await _vehicleTypeService.ToggleStatusAsync(id);

            if (!success)
                return NotFound("Vehicle Type not found");

            return Ok("Vehicle Type status toggled successfully");
        }

        //[HttpGet("ByName/{name}")]
        //public async Task<IActionResult> GetByName(string name)
        //{
        //    var result = await _vehicleTypeService.GetVehicleTypeByNameAsync(name);

        //    if (result == null)
        //        return NotFound("Vehicle Type not found");

        //    return Ok(result);
        //}
    }

}

