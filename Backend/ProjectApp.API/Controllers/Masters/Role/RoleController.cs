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


        [HttpGet("All")]
        public async Task<ActionResult<APIResponse>> GetAllRoleAsync()
        {
            var result = await _roleService.GetAllRolesAsync();

            _apiResponse.status = true;
            _apiResponse.StatusCode = HttpStatusCode.OK;
            _apiResponse.data = result;

            return Ok(_apiResponse);
        }


        [HttpGet("{id}")]
        public async Task<ActionResult<APIResponse>> GetRoleById(string id)
        {
            var role = await _roleService.GetRoleByIdAsync(id);

            if (role == null)
                return NotFound();

            _apiResponse.status = true;
            _apiResponse.StatusCode = HttpStatusCode.OK;
            _apiResponse.data = role;

            return Ok(_apiResponse);
        }


        [HttpPost]
        public async Task<ActionResult<APIResponse>> CreateRole([FromBody] RoleDTO dto)
        {
            var id = await _roleService.CreateRoleAsync(dto);

            _apiResponse.status = true;
            _apiResponse.StatusCode = HttpStatusCode.Created;
            _apiResponse.data = id;

            return Ok(_apiResponse);
        }


        [HttpPut("{id}")]
        public async Task<ActionResult<APIResponse>> UpdateRole(string id, [FromBody] RoleDTO dto)
        {
            int decodedId = _roleService.DecodeId(id);
            dto.Id = decodedId;

            await _roleService.UpdateRoleAsync(dto);

            _apiResponse.status = true;
            _apiResponse.StatusCode = HttpStatusCode.OK;
            _apiResponse.data = "Role updated successfully.";

            return Ok(_apiResponse);
        }


        [HttpDelete("{id}")]
        public async Task<ActionResult<APIResponse>> DeleteRole(string id)
        {
            await _roleService.DeleteRoleAsync(id);

            _apiResponse.status = true;
            _apiResponse.StatusCode = HttpStatusCode.OK;
            _apiResponse.data = "Role deleted successfully.";

            return Ok(_apiResponse);
        }

    }
}
