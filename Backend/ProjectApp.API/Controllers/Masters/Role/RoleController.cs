using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ProjectApp.Core.Entities;
using ProjectApp.Repository.Interfaces.Masters.Role;

namespace ProjectApp.API.Controllers.Masters.Role
{
    [Route("api/[controller]")]
    [ApiController]
    public class RoleController : ControllerBase
    {
        private readonly IRoleService _roleSevice;
        private APIResponse _apiResponse;
        public RoleController(IRoleService roleService)
        {
            _apiResponse = new();
            _roleSevice = roleService;

        }


        [HttpGet]
        [Route("All", Name = "GetAllRoles")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<APIResponse>> GetAllRoleAsync()
        {
            try
            {
                var roles = await _roleSevice.GetAllRolesAsync();
                _apiResponse.data = roles;
                _apiResponse.status = true;
                _apiResponse.StatusCode = System.Net.HttpStatusCode.OK;

                return Ok(_apiResponse);


            }
            catch (Exception ex)
            {
                _apiResponse.status = false;
                _apiResponse.StatusCode = System.Net.HttpStatusCode.InternalServerError;
                _apiResponse.Errors.Add(ex.Message);
                return _apiResponse;
            }
        }
    }
}
