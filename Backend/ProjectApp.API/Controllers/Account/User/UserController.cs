using System.Net;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using ProjectApp.Core.DTOs.Account.User;
using ProjectApp.Repository.Interfaces.User;
using ProjectApp.Core.Entities;
using ProjectApp.Repository.Utilities.SP;

namespace ProjectApp.API.Controllers.Account.User
{
    [Authorize(Roles = "Admin,Corporate")]
    [Route("api/[controller]")]
    [ApiController]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;

        public UserController(IUserService userService)
        {
            _userService = userService;
        }

        [Authorize]
        [HttpGet("All")]
        public async Task<ActionResult<APIResponse>> GetAllUsersAsync()
        {
            var response = new APIResponse();
            try
            {
                var users = await _userService.GetUsersAsync();
                response.data = users;
                response.status = true;
                response.StatusCode = HttpStatusCode.OK;
                return Ok(response);
            }
            catch (Exception ex)
            {
                response.status = false;
                response.StatusCode = HttpStatusCode.InternalServerError;
                response.Errors.Add(ex.Message);
                return StatusCode(500, response);
            }
        }



        // ================= CREATE =================
        [Authorize]
        [HttpPost("Create")]
        public async Task<ActionResult<APIResponse>> CreateUserAsync([FromBody] UserDTO dto)
        {
            var response = new APIResponse();
            try
            {
                int? loggedInUserId = User.FindFirst(ClaimTypes.NameIdentifier) != null
                    ? Convert.ToInt32(User.FindFirst(ClaimTypes.NameIdentifier).Value)
                    : null;

                var userCreated = await _userService.CreateUserAsync(dto, loggedInUserId);

                response.status = true;
                response.StatusCode = HttpStatusCode.Created;
                response.data = userCreated;

                return StatusCode(201, response);
            }
            catch (Exception ex)
            {
                response.status = false;
                response.StatusCode = HttpStatusCode.InternalServerError;
                response.Errors.Add(ex.Message);
                return StatusCode(500, response);
            }
        }

        [Authorize]
        [HttpPatch("Status")]
        public async Task<ActionResult<APIResponse>> UpdateUserStatus([FromBody] UserStatusUpdateDTO dto)
        {
            var response = new APIResponse();
            try
            {
                await _userService.UpdateUserStatusAsync(dto);

                response.data = new { dto.UserId, dto.IsActive };
                response.status = true;
                response.StatusCode = System.Net.HttpStatusCode.OK;

                return Ok(response);
            }
            catch (Exception ex)
            {
                response.status = false;
                response.StatusCode = System.Net.HttpStatusCode.InternalServerError;
                response.Errors.Add(ex.Message);
                return StatusCode(500, response);
            }
        }


        // ================= OTHER CRUD =================
        [Authorize]
        [HttpGet("ById/{id}")]
        public async Task<ActionResult<APIResponse>> GetUserById(string id)
        {
            var response = new APIResponse();
            try
            {
                var user = await _userService.GetUserByIdAsync(id);
                response.data = user;
                response.status = true;
                response.StatusCode = HttpStatusCode.OK;
                return Ok(response);
            }
            catch (Exception ex)
            {
                response.status = false;
                response.StatusCode = HttpStatusCode.InternalServerError;
                response.Errors.Add(ex.Message);
                return StatusCode(500, response);
            }
        }

        [Authorize]
        [HttpGet("ByUsername/{username}")]
        public async Task<ActionResult<APIResponse>> GetUserByUsername(string username)
        {
            var response = new APIResponse();
            try
            {
                var user = await _userService.GetUserByUsernameAsync(username);
                response.data = user;
                response.status = true;
                response.StatusCode = HttpStatusCode.OK;
                return Ok(response);
            }
            catch (Exception ex)
            {
                response.status = false;
                response.StatusCode = HttpStatusCode.InternalServerError;
                response.Errors.Add(ex.Message);
                return StatusCode(500, response);
            }
        }

        [Authorize]
        [HttpPut("Update")]
        public async Task<ActionResult<APIResponse>> UpdateUserAsync([FromBody] UserUpdateDTO dto)
        {
            var response = new APIResponse();
            try
            {
                await _userService.UpdateUserAsync(dto);
                response.status = true;
                response.StatusCode = HttpStatusCode.OK;
                return Ok(response);
            }
            catch (Exception ex)
            {
                response.status = false;
                response.StatusCode = HttpStatusCode.InternalServerError;
                response.Errors.Add(ex.Message);
                return StatusCode(500, response);
            }
        }

        [Authorize]
        [HttpDelete("Delete/{id}")]
        public async Task<ActionResult<APIResponse>> DeleteUserAsync(string id)
        {
            var response = new APIResponse();
            try
            {
                await _userService.DeleteUserAsync(id);
                response.status = true;
                response.StatusCode = HttpStatusCode.OK;
                return Ok(response);
            }
            catch (Exception ex)
            {
                response.status = false;
                response.StatusCode = HttpStatusCode.InternalServerError;
                response.Errors.Add(ex.Message);
                return StatusCode(500, response);
            }
        }

        [Authorize]
        [HttpGet("Search")]
        public async Task<ActionResult<APIResponse>> SearchUsers(
    [FromQuery] string? searchText,
    [FromQuery] int pageNumber = 1,
    [FromQuery] int pageSize = 10,
    [FromQuery] string? sortColumn = null,
    [FromQuery] string? sortDirection = "asc",
    [FromQuery] bool? isActive = null
)
        {
            var response = new APIResponse();
            try
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

                var (users, totalRecords) = await _userService.SearchUsersPaginatedAsync(request);

                response.data = new PageResult
                {
                    Data = users,
                    TotalRecords = totalRecords,
                    CurrentPage = pageNumber,
                    TotalPages = (int)Math.Ceiling(totalRecords / (double)pageSize)
                };
                response.status = true;
                response.StatusCode = System.Net.HttpStatusCode.OK;

                return Ok(response);
            }
            catch (Exception ex)
            {
                response.status = false;
                response.StatusCode = System.Net.HttpStatusCode.InternalServerError;
                response.Errors.Add(ex.Message);
                return StatusCode(500, response);
            }
        }
    }
}
