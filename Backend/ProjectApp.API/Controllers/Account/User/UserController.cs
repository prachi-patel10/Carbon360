using System.Net;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ProjectApp.Core.DTOs.Account.User;
using ProjectApp.Core.Entities;
using ProjectApp.Repository.Interfaces.User;

namespace ProjectApp.API.Controllers.Account.User
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;
        private APIResponse _apiResponse;
        public UserController(IUserService userService)
        {
            _apiResponse = new APIResponse();
            _userService = userService;

        }

        [HttpGet]
        [Route("All", Name = "GetAllUsers")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<APIResponse>> GetAllRolesAsync()
        {
            try
            {
                var users = await _userService.GetUsersAsync();
                _apiResponse.data = users;
                _apiResponse.status = true;
                _apiResponse.StatusCode = HttpStatusCode.OK;
                return Ok(_apiResponse);
            }
            catch (Exception ex)
            {
                _apiResponse.status = false;
                _apiResponse.StatusCode = HttpStatusCode.InternalServerError;
                _apiResponse.Errors.Add(ex.Message);
                return _apiResponse;
            }
        }

        [Authorize]
        [HttpPost("Create")]
        public async Task<ActionResult<APIResponse>> CreateUserAsync([FromBody] UserDTO dto)
        {
            try
            {
                int? loggedInUserId = null;

                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

                if (userIdClaim != null)
                    loggedInUserId = Convert.ToInt32(userIdClaim.Value);

                var userCreated = await _userService.CreateUserAsync(dto, loggedInUserId);

                _apiResponse.status = true;
                _apiResponse.StatusCode = HttpStatusCode.Created;
                _apiResponse.data = userCreated;

                return StatusCode(201, _apiResponse);
            }
            catch (Exception ex)
            {
                _apiResponse.status = false;
                _apiResponse.StatusCode = HttpStatusCode.InternalServerError;
                _apiResponse.Errors.Add(ex.Message);

                return StatusCode(500, _apiResponse);
            }
        }




        [HttpGet]
        [Route("{name:alpha}", Name = "GetUserByName")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<APIResponse>> GetUserByUsername(string name)
        {
            try
            {
                var user = await _userService.GetUserByUsernameAsync(name);
                _apiResponse.data = user;
                _apiResponse.status = true;
                _apiResponse.StatusCode = HttpStatusCode.OK;
                return Ok(_apiResponse);
            }
            catch (Exception ex)
            {
                _apiResponse.status = false;
                _apiResponse.StatusCode = HttpStatusCode.InternalServerError;
                _apiResponse.Errors.Add(ex.Message);
                return _apiResponse;
            }
        }

        [HttpGet]
        [Route("{id:int}", Name = "GetUserById")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<APIResponse>> GetUserById(int id)
        {
            try
            {

                var user = await _userService.GetUserByIdAsync(id);
                _apiResponse.data = user;
                _apiResponse.status = true;
                _apiResponse.StatusCode = HttpStatusCode.OK;
                return Ok(_apiResponse);
            }
            catch (Exception ex)
            {
                _apiResponse.status = false;
                _apiResponse.StatusCode = HttpStatusCode.InternalServerError;
                _apiResponse.Errors.Add(ex.Message);
                return _apiResponse;
            }
        }



        [HttpDelete]
        [Route("Delete/{id:int}", Name = "DeleteUserById")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<APIResponse>> DeleteUserAsync(int id)
        {
            try
            {
                await _userService.DeleteUserAsync(id);
                _apiResponse.status = true;
                _apiResponse.StatusCode = HttpStatusCode.OK;
                return Ok(_apiResponse);
            }
            catch (Exception ex)
            {
                _apiResponse.status = false;
                _apiResponse.StatusCode = HttpStatusCode.InternalServerError;
                _apiResponse.Errors.Add(ex.Message);

                return _apiResponse;
            }

        }

        [HttpPut("Update")]
        public async Task<ActionResult<APIResponse>> UpdateUserAsync([FromBody] UserUpdateDTO dto)
        {
            try
            {
                await _userService.UpdateUserAsync(dto);

                _apiResponse.status = true;
                _apiResponse.StatusCode = HttpStatusCode.OK;

                return Ok(_apiResponse);
            }
            catch (Exception ex)
            {
                _apiResponse.status = false;
                _apiResponse.StatusCode = HttpStatusCode.InternalServerError;
                _apiResponse.Errors.Add(ex.Message);

                return StatusCode(500, _apiResponse);
            }
        }

    }
}
