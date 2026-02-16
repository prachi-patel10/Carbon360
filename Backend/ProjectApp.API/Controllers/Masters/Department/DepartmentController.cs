using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using ProjectApp.Core.Entities;
using ProjectApp.Repository.Interfaces.Masters.Department;

namespace ProjectApp.API.Controllers.Masters.Department
{
    [Route("api/[controller]")]
    [ApiController]
    public class DepartmentController : ControllerBase
    {
        private readonly IDepartmentService _depService;
        private APIResponse _apiResponse;
        public DepartmentController(IDepartmentService departmentService)
        {
            _apiResponse = new();
            _depService = departmentService;

        }
        [HttpGet]
        [Route("All", Name = "GetAllDept")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]

        public async Task<ActionResult<APIResponse>> GetAllDept()
        {
            try
            {
                var dept = await _depService.GetAllDepartmentsAsync();
                _apiResponse.data = dept;
                _apiResponse.status = true;
                _apiResponse.StatusCode = System.Net.HttpStatusCode.OK;
                return Ok(_apiResponse);
            }
            catch (Exception ex)
            {
                if (_apiResponse.Errors == null)
                    _apiResponse.Errors = new List<string>();

                _apiResponse.status = false;
                _apiResponse.StatusCode = System.Net.HttpStatusCode.InternalServerError;
                _apiResponse.Errors.Add(ex.Message);

                return _apiResponse;
            }
        }

    }
}
