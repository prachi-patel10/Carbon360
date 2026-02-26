using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ProjectApp.Core.DTOs.Masters.City;
using ProjectApp.Core.Entities;
using ProjectApp.Repository.Interfaces.Masters.City;
using ProjectApp.Repository.Utilities.SP;
using System.Net;

namespace ProjectApp.API.Controllers.Masters.City
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class CityController : ControllerBase
    {
        private readonly ICityService _cityService;
        private APIResponse _apiResponse;

        public CityController(ICityService cityService)
        {
            _cityService = cityService;
            _apiResponse = new();
        }

        // ================= GET ALL =================

        [HttpGet("All")]
        public async Task<ActionResult<APIResponse>> GetAll()
        {
            var cities = await _cityService.GetAllCitiesAsync();

            _apiResponse.data = cities;
            _apiResponse.status = true;
            _apiResponse.StatusCode = HttpStatusCode.OK;
            _apiResponse.Message = "Cities retrieved successfully.";

            return Ok(_apiResponse);
        }

        // ================= CREATE =================

        [HttpPost]
        public async Task<IActionResult> Create(CityCreateDTO dto)
        {
            var city = await _cityService.CreateCityAsync(dto);

            if (city == null)
                return BadRequest();

            _apiResponse.data = city;
            _apiResponse.status = true;
            _apiResponse.StatusCode = HttpStatusCode.Created;

            return StatusCode((int)_apiResponse.StatusCode, _apiResponse);
        }

        // ================= UPDATE =================

        //[HttpPut]
        //public async Task<IActionResult> Update(CityUpdateDTO dto)
        //{
        //    var success = await _cityService.UpdateCityAsync(dto);

        //    _apiResponse.data = success;
        //    _apiResponse.status = success;
        //    _apiResponse.StatusCode = success
        //        ? HttpStatusCode.OK
        //        : HttpStatusCode.BadRequest;

        //    return StatusCode((int)_apiResponse.StatusCode, _apiResponse);
        //}

        [HttpPut("UpdateCity")]
        public async Task<IActionResult> Update([FromBody] CityUpdateDTO dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var success = await _cityService.UpdateCityAsync(dto);

            if (!success)
                return Ok(new { status = false, message = "No rows updated" });

            return Ok(new
            {
                status = true,
                message = "City updated successfully."
            });
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
                SortColumn = sortColumn,
                SortDirection = sortDirection,
                IsActive = isActive
            };

            var result = await _cityService.SearchCitiesAsync(request);

            _apiResponse.data = result;
            _apiResponse.status = true;
            _apiResponse.StatusCode = HttpStatusCode.OK;
            _apiResponse.Message = "Cities retrieved successfully.";

            return Ok(_apiResponse);
        }

        [HttpPatch("{id}/toggle-status")]
        public async Task<IActionResult> ToggleStatus(string id)
        {
            var success = await _cityService.ToggleStatusAsync(id);

            if (!success)
            {
                _apiResponse.status = false;
                _apiResponse.StatusCode = HttpStatusCode.NotFound;
                _apiResponse.Errors = new List<string> { "City not found." };

                return NotFound(_apiResponse);
            }

            _apiResponse.status = true;
            _apiResponse.StatusCode = HttpStatusCode.OK;
            _apiResponse.Message = "City status toggled successfully.";
            _apiResponse.data = true;

            return Ok(_apiResponse);
        }

        // ================= SOFT DELETE =================

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var success = await _cityService.DeleteCityAsync(id);

            if (!success)
            {
                _apiResponse.status = false;
                _apiResponse.StatusCode = HttpStatusCode.NotFound;
                _apiResponse.Errors = new List<string> { "City not found or already deleted." };

                return NotFound(_apiResponse);
            }

            _apiResponse.status = true;
            _apiResponse.StatusCode = HttpStatusCode.OK;
            _apiResponse.Message = "City deleted successfully.";
            _apiResponse.data = true;

            return Ok(_apiResponse);
        }

    }
}
