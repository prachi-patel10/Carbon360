using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ProjectApp.Core.DTOs.Account.GeneratorOperation;
using ProjectApp.Core.Entities;
using ProjectApp.Repository.Interfaces.GenerationOperation;
using System.Net;

namespace ProjectApp.API.Controllers.Account.GeneratorOperation
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class GeneratorOperationController : ControllerBase
    {
        private readonly IGeneratorOperationService _service;
        private APIResponse _apiResponse;

        public GeneratorOperationController(
            IGeneratorOperationService service)
        {
            _service = service;
            _apiResponse = new();
        }

        [HttpGet("All")]
        public async Task<IActionResult> GetAll()
        {
            var data = await _service.GetAllAsync();

            _apiResponse.data = data;
            _apiResponse.status = true;
            _apiResponse.StatusCode = HttpStatusCode.OK;

            return Ok(_apiResponse);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var data = await _service.GetByIdAsync(id);

            if (data == null)
            {
                _apiResponse.status = false;
                _apiResponse.StatusCode = HttpStatusCode.NotFound;
                return NotFound(_apiResponse);
            }

            _apiResponse.data = data;
            _apiResponse.status = true;
            _apiResponse.StatusCode = HttpStatusCode.OK;

            return Ok(_apiResponse);
        }

        [HttpPost]
        public async Task<IActionResult> Create(
            GeneratorOperationCreateDTO dto)
        {
            var result = await _service.CreateAsync(dto);

            if (result == null)
                return BadRequest();

            _apiResponse.data = result;
            _apiResponse.status = true;
            _apiResponse.StatusCode = HttpStatusCode.Created;

            return StatusCode((int)HttpStatusCode.Created, _apiResponse);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var success = await _service.DeleteAsync(id);

            _apiResponse.data = success;
            _apiResponse.status = success;
            _apiResponse.StatusCode = success
                ? HttpStatusCode.OK
                : HttpStatusCode.BadRequest;

            return StatusCode((int)_apiResponse.StatusCode, _apiResponse);
        }
    }
}
