using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ProjectApp.Core.DTOs.Masters.Fuel;
using ProjectApp.Core.Entities;
using ProjectApp.Repository.Interfaces.Masters.City;
using ProjectApp.Repository.Interfaces.Masters.Fuel;
using ProjectApp.Repository.Utilities.SP;
using System.Net;

namespace ProjectApp.API.Controllers.Masters.Fuel
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class FuelController : ControllerBase
    {
        private readonly IFuelService _fuelService;
        private APIResponse _apiResponse;

        public FuelController(IFuelService fuelService)
        {
            _fuelService = fuelService;
            _apiResponse = new();
        }

        [HttpPost("Create")]
        public async Task<IActionResult> Create([FromBody] FuelCreateUpdateDTO dto)
        {
            var result = await _fuelService.CreateAsync(dto);
            return Ok(result);
        }

        [HttpPut("Update")]
        public async Task<IActionResult> Update([FromBody] FuelResponseDTO dto)
        {
            var result = await _fuelService.UpdateAsync(dto);

            if (!result)
                return BadRequest("Update failed");

            return Ok("Updated Successfully");
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var result = await _fuelService.DeleteAsync(id);

            if (!result)
                return BadRequest("Delete failed");

            return Ok("Deleted Successfully");
        }

        [HttpGet("All")]
        public async Task<IActionResult> GetAll()
        {
            var result = await _fuelService.GetAllAsync();
            return Ok(result);
        }


        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var result = await _fuelService.GetByIdAsync(id);

            if (result == null)
                return NotFound("Fuel not found");

            return Ok(result);
        }

        [HttpPatch("UpdateStatus")]
        public async Task<IActionResult> UpdateStatus([FromBody] FuelStatusUpdateDTO dto)
        {
            var result = await _fuelService.UpdateStatusAsync(dto);

            if (!result)
                return BadRequest("Status update failed");

            return Ok("Status updated successfully");
        }

        [HttpPatch("UpdateGenerator")]
        public async Task<IActionResult> UpdateGenerator([FromBody] FuelGeneratorUpdateDTO dto)
        {
            var result = await _fuelService.UpdateGeneratorAsync(dto);

            if (!result)
                return BadRequest("Generator flag update failed");

            return Ok("Generator flag updated successfully");
        }

        [HttpGet("Search")]
        public async Task<IActionResult> Search(
        [FromQuery] string? searchText,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? sortColumn = null,
        [FromQuery] string? sortDirection = "asc",
        [FromQuery] bool? isActive = null
)
        {
            var request = new SearchRequest
            {
                Search = searchText,
                PageNumber = pageNumber,
                PageSize = pageSize,
                SortColumn = sortColumn ?? "fuel_name",
                SortDirection = sortDirection ?? "ASC",
                IsActive = isActive
            };

            var result = await _fuelService.SearchFuelAsync(request);

            _apiResponse.data = result;
            _apiResponse.status = true;
            _apiResponse.StatusCode = HttpStatusCode.OK;
            _apiResponse.Message = "Fuel types retrieved successfully.";

            return Ok(_apiResponse);
        }
    }
        //    [HttpPost("search")]
        //    public async Task<IActionResult> Search(FuelTypeSearchDTO dto)
        //        => Ok(await _fuelService.SearchAsync(dto));
        //}
    }

