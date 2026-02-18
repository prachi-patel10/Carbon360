using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using ProjectApp.Core.DTOs.Masters.Department;
using ProjectApp.Core.Entities;
using ProjectApp.Repository.Interfaces.Masters.Department;
using ProjectApp.Repository.Services.Common;

namespace ProjectApp.API.Controllers.Masters.Department
{
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
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]

        public async Task<ActionResult<APIResponse>> GetAllDept()
        {
            //try
            //{
            //    var dept = await _depService.GetAllDepartmentsAsync();
            //    _apiResponse.data = dept;
            //    _apiResponse.status = true;
            //    _apiResponse.StatusCode = System.Net.HttpStatusCode.OK;
            //    return Ok(_apiResponse);
            //}
            //catch (Exception ex)
            //{
            //    if (_apiResponse.Errors == null)
            //        _apiResponse.Errors = new List<string>();

            //    _apiResponse.status = false;
            //    _apiResponse.StatusCode = System.Net.HttpStatusCode.InternalServerError;
            //    _apiResponse.Errors.Add(ex.Message);

            //    return _apiResponse;
            //}

            var departments = await _deptService.GetAllDepartmentsAsync();

            _apiResponse.data = departments;
            _apiResponse.status = true;
            _apiResponse.StatusCode = System.Net.HttpStatusCode.OK;

            return Ok(_apiResponse);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
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
        public async Task<IActionResult> Create(DepartmentDTO dto)
        {

            var id = await _deptService.CreateDepartmentAsync(dto);

            _apiResponse.data = id;
            _apiResponse.status = true;
            _apiResponse.StatusCode = System.Net.HttpStatusCode.OK;

            return Ok(_apiResponse);
        }

        [HttpPut]
        public async Task<IActionResult> Update(DepartmentDTO dto)
        {
            var success = await _deptService.UpdateDepartmentAsync(dto);

            if (!success)
            {
                _apiResponse.status = false;
                _apiResponse.StatusCode = System.Net.HttpStatusCode.BadRequest;
                _apiResponse.Errors = new List<string> { "Update failed." };

                return BadRequest(_apiResponse);
            }

            _apiResponse.status = true;
            _apiResponse.StatusCode = System.Net.HttpStatusCode.OK;

            return Ok(_apiResponse);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _deptService.DeleteDepartmentAsync(id);

            if (!success)
            {
                _apiResponse.status = false;
                _apiResponse.StatusCode = System.Net.HttpStatusCode.BadRequest;
                _apiResponse.Errors = new List<string> { "Delete failed." };

                return BadRequest(_apiResponse);
            }

            _apiResponse.status = true;
            _apiResponse.StatusCode = System.Net.HttpStatusCode.OK;

            return Ok(_apiResponse);
        }
    }
}
