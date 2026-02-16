using System.Diagnostics;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ProjectApp.Core.DTOs.Masters.Section;
using ProjectApp.Core.Entities;
using ProjectApp.Repository.Interfaces.Masters.Section;
using ProjectApp.Repository.Utilities.Auth;
using ProjectApp.Repository.Utilities.SP;

namespace ProjectApp.API.Controllers.Masters.Section
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class SectionController : ControllerBase
    {
        private readonly ISectionService _sectService;
        private APIResponse _apiResponse;
        private readonly IdEncoder _hasService;

        public SectionController(ISectionService section, IdEncoder hashServie)
        {
            _apiResponse = new();
            _sectService = section;
            _hasService = hashServie;

        }



        [HttpGet("{Hashid}")]

        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<APIResponse>> GetSectionById(string Hashid)
        {
            try
            {
                int id = _hasService.Decode(Hashid);
                var section = await _sectService.GetSectionByIdAsync(id);

                if (section == null)
                    return NotFound();

                return Ok(section);
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

        [HttpPost("Create")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        //[ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<APIResponse>> CreateSection(SectionDTO dto)
        {
            try
            {

                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

                if (userIdClaim == null)
                    return Unauthorized("Invalid token");

                int Id = int.Parse(userIdClaim.Value);

                var addedUser = await _sectService.CreateAsync(dto, Id);

                _apiResponse.status = true;
                _apiResponse.StatusCode = System.Net.HttpStatusCode.OK;
                _apiResponse.data = addedUser;
                return Ok("Created");


            }
            catch (Exception ex)
            {
                if (_apiResponse.Errors == null)
                    _apiResponse.Errors = new List<string>();

                _apiResponse.status = false;
                _apiResponse.StatusCode = System.Net.HttpStatusCode.InternalServerError;
                _apiResponse.Errors.Add(ex.Message);

                return BadRequest(_apiResponse);
            }
        }

        [HttpPut("status/{Hasid}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<APIResponse>> UpdateSectionStatus(string Hasid, [FromBody] SectionStatusDTO data)
        {
            try
            {

                int id = _hasService.Decode(Hasid);
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

                if (userIdClaim == null)
                    return Unauthorized("Invalid token");

                int UserId = int.Parse(userIdClaim.Value);

                var newSection = await _sectService.UpdateSectionStatusAsync(id, UserId);
                return Ok("updated");

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

        [HttpPut("Update/{hashId}")]
        //[Route("Update")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        //[ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<APIResponse>> UpdateSectionAsync(string hashId, SectionDTO dto)
        {
            try
            {

                int id = _hasService.Decode(hashId);
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

                if (userIdClaim == null)
                    return Unauthorized("Invalid token");

                int userId = int.Parse(userIdClaim.Value);

                var updatedSection = await _sectService.UpdateAsync(id, dto, userId);

                if (updatedSection == null)
                    return NotFound("Section not found");

                _apiResponse.status = true;
                _apiResponse.StatusCode = System.Net.HttpStatusCode.OK;
                _apiResponse.data = updatedSection;

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


        [HttpGet("SecionByEntryId")]
        //[Route("{id:int}", Name = "GetRoleById")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<APIResponse>> GetSectionByEntryUser()
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null)
                    return Unauthorized("Invalid token");

                int userId = int.Parse(userIdClaim.Value);
                var section = await _sectService.GetSectionByEntryUserId(userId);

                return Ok(section);
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


        [HttpGet("GetAllSection")]
        //[Route("{id:int}", Name = "GetRoleById")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetAllSection([FromQuery] SearchRequest req)
        {
            try
            {
                var section = await _sectService.GetSectionSearch(req);
                return Ok(section);
            }
            catch (Exception ex)
            {
                throw new Exception(ex.Message);
            }
        }


        [HttpDelete]
        [Route("Delete/{hashSectId}", Name = "DeleteSectioById")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<APIResponse>> DeleteSection(string hashSectId)
        {
            try
            {
                int sectionId = _hasService.Decode(hashSectId);
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

                if (userIdClaim == null)
                    return Unauthorized("Invalid token");
                int userId = int.Parse(userIdClaim.Value);
                await _sectService.DeleteAsync(sectionId, userId);
                return Ok("Deleted Successfully");
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
