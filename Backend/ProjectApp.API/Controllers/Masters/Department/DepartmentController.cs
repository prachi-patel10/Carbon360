using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using ProjectApp.Core.DTOs.Masters.Department;
using ProjectApp.Core.Entities;
using ProjectApp.Repository.Interfaces.Masters.Department;
using ProjectApp.Repository.Services.Common;
using ProjectApp.Repository.Utilities.SP;
using System.Net;

namespace ProjectApp.API.Controllers.Masters.Department
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class DepartmentController : ControllerBase
    {
        private readonly IDepartmentService _deptService;
        private APIResponse _apiResponse;
        public DepartmentController(IDepartmentService departmentService)
        {
            _apiResponse = new();
            _deptService = departmentService;

        }

        [HttpGet]
        [Route("All", Name = "GetAllDept")]
        public async Task<ActionResult<APIResponse>> GetAllDept()
        {
            var departments = await _deptService.GetAllDepartmentsAsync();

            _apiResponse.data = departments;
            _apiResponse.status = true;
            _apiResponse.StatusCode = HttpStatusCode.OK;
            _apiResponse.Message = "Departments retrieved successfully.";

            return Ok(_apiResponse);
        }


        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var department = await _deptService.GetDepartmentByIdAsync(id);

            if (department == null)
            {
                _apiResponse.status = false;
                _apiResponse.StatusCode = System.Net.HttpStatusCode.NotFound;
                _apiResponse.Errors = new List<string> { "Department not found." };

                return NotFound(_apiResponse);
            }

            _apiResponse.data = department;
            _apiResponse.status = true;
            _apiResponse.StatusCode = System.Net.HttpStatusCode.OK;

            return Ok(_apiResponse);
        }

        [HttpPost]
        public async Task<IActionResult> Create(DepartmentCreateDTO dto)
        {
            var department = await _deptService.CreateDepartmentAsync(dto);

            if (department == null)
                return BadRequest();

            _apiResponse.data = department;
            _apiResponse.status = true;
            _apiResponse.StatusCode = HttpStatusCode.Created;

            return StatusCode((int)_apiResponse.StatusCode, _apiResponse);
        }


        [HttpPut]
public async Task<IActionResult> Update(DepartmentUpdateDTO dto)
{
    var success = await _deptService.UpdateDepartmentAsync(dto);

    _apiResponse.data = success;
    _apiResponse.status = success;
    _apiResponse.StatusCode = success ? HttpStatusCode.OK : HttpStatusCode.BadRequest;

    return StatusCode((int)_apiResponse.StatusCode, _apiResponse);
}


        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
             var success = await _deptService.DeleteDepartmentAsync(id);

            _apiResponse.data = success;
            _apiResponse.status = success;
            _apiResponse.StatusCode = success
                ? HttpStatusCode.OK
                : HttpStatusCode.BadRequest;

            if (!success)
                _apiResponse.Errors = new List<string> { "Delete failed." };

            return StatusCode((int)_apiResponse.StatusCode, _apiResponse);
        }

        // ========================= SEARCH =========================
        // Use query parameters only: ?searchText=wa&pageNumber=1&pageSize=10
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

            var result = await _deptService.SearchDepartmentsAsync(request);

            _apiResponse.data = result; // result.Data contains list of DepartmentResponseDTO
            _apiResponse.status = true;
            _apiResponse.StatusCode = HttpStatusCode.OK;
            _apiResponse.Message = "Departments retrieved successfully.";

            return Ok(_apiResponse);
        }


        [HttpPatch("{id}/toggle-status")]
        public async Task<IActionResult> ToggleStatus([FromRoute] string id)
        {
            var success = await _deptService.ToggleStatusAsync(id);

            if (!success)
            {
                _apiResponse.status = false;
                _apiResponse.StatusCode = HttpStatusCode.NotFound;
                _apiResponse.Errors = new List<string> { "Department not found." };

                return NotFound(_apiResponse);
            }

            _apiResponse.status = true;
            _apiResponse.StatusCode = HttpStatusCode.OK;
            _apiResponse.Message = "Department status toggled successfully.";
            _apiResponse.data = true;

            return Ok(_apiResponse);
        }



        [HttpGet("ByName/{name}")]
        public async Task<IActionResult> GetByName(string name)
        {
            var department = await _deptService.GetDepartmentByNameAsync(name);

            if (department == null)
            {
                _apiResponse.status = false;
                _apiResponse.StatusCode = HttpStatusCode.NotFound;
                _apiResponse.Errors = new List<string> { "Department not found." };

                return NotFound(_apiResponse);
            }

            _apiResponse.data = department;
            _apiResponse.status = true;
            _apiResponse.StatusCode = HttpStatusCode.OK;

            return Ok(_apiResponse);
        }
    }
}
