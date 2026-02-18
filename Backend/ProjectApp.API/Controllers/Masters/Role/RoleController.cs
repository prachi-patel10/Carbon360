using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ProjectApp.Core.DTOs.Account.Role;
using ProjectApp.Core.Entities;
using ProjectApp.Repository.Interfaces.Masters.Role;
using ProjectApp.Repository.Services.Masters.Role;
using System.Net;

namespace ProjectApp.API.Controllers.Masters.Role
{
    [Route("api/[controller]")]
    [ApiController]
    public class RoleController : ControllerBase
    {
        private readonly IRoleService _roleService;
        private APIResponse _apiResponse;
        public RoleController(IRoleService roleService)
        {
            _apiResponse = new();
            _roleService = roleService;

        }


        [HttpGet]
        [Route("All", Name = "GetAllRoles")]
        //[ProducesResponseType(StatusCodes.Status200OK)]
        //[ProducesResponseType(StatusCodes.Status400BadRequest)]
        //[ProducesResponseType(StatusCodes.Status401Unauthorized)]
        //[ProducesResponseType(StatusCodes.Status403Forbidden)]
        //[ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<APIResponse>> GetAllRoleAsync()
        {
            var result = await _roleService.GetAllRolesAsync();

            _apiResponse.status = true;
            _apiResponse.StatusCode = HttpStatusCode.OK;
            _apiResponse.data = result;

            return Ok(_apiResponse);

        }

        [HttpGet("{id:int}", Name = "GetRoleById")]
        public async Task<ActionResult<APIResponse>> GetRoleById(int id)
        {
            var role = await _roleService.GetRoleByIdAsync(id);

            if (role == null)
            {
                _apiResponse.status = false;
                _apiResponse.StatusCode = HttpStatusCode.NotFound;
                return NotFound(_apiResponse);
            }

            _apiResponse.data  = role;
            _apiResponse.StatusCode = HttpStatusCode.OK;
            _apiResponse.status = true;

            return Ok(_apiResponse);
        }

        [HttpPost]
        public async Task<ActionResult<APIResponse>> CreateRole([FromBody] RoleDTO dto)
        {
            if (!ModelState.IsValid)
            {
                _apiResponse.status = false;
                _apiResponse.StatusCode = HttpStatusCode.BadRequest;
                _apiResponse.Errors.Add("Invalid model state.");

                return BadRequest(_apiResponse);
            }

            var id = await _roleService.CreateRoleAsync(dto);

            _apiResponse.status = true;
            _apiResponse.StatusCode = HttpStatusCode.Created;
            _apiResponse.data = id;

            return Ok(_apiResponse);
        }

        [HttpPut]
        public async Task<ActionResult<APIResponse>> UpdateRole([FromBody] RoleDTO dto)
        {
            if (!ModelState.IsValid)
            {
                _apiResponse.status = false;
                _apiResponse.StatusCode = HttpStatusCode.BadRequest;
                _apiResponse.Errors.Add("Invalid model state.");

                return BadRequest(_apiResponse);
            }

            await _roleService.UpdateRoleAsync(dto);

            _apiResponse.status = true;
            _apiResponse.StatusCode = HttpStatusCode.OK;
            _apiResponse.data = "Role updated successfully.";
            return Ok(_apiResponse);
        }

        [HttpDelete("{id:int}")]
        public async Task<ActionResult<APIResponse>> DeleteRole(int id)
        {
            await _roleService.DeleteRoleAsync(id);

            _apiResponse.status = true;
            _apiResponse.StatusCode = HttpStatusCode.OK;
            _apiResponse.data = "Role deleted successfully.";

            return Ok(_apiResponse);
        }


    }
}
