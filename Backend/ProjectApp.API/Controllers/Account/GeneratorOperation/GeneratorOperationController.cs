using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ProjectApp.Core.DTOs.Account.GeneratorOperation;
using ProjectApp.Core.DTOs.Masters.Generator;
using ProjectApp.Core.Entities;
using ProjectApp.Repository.Interfaces.GenerationOperation;
using ProjectApp.Repository.Services.GeneratorOperation;
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
            if (string.IsNullOrEmpty(id))
                return BadRequest("Invalid Id");

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
        public async Task<IActionResult> Create([FromBody] GeneratorOperationCreateDTO dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (dto == null)
                return BadRequest("Invalid data");

            var result = await _service.CreateAsync(dto);

            if (result == null)
            {
                _apiResponse.status = false;
                _apiResponse.StatusCode = HttpStatusCode.BadRequest;
                return BadRequest(_apiResponse);
            }

            _apiResponse.data = result;
            _apiResponse.status = true;
            _apiResponse.StatusCode = HttpStatusCode.Created;

            return StatusCode((int)HttpStatusCode.Created, _apiResponse);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] GeneratorOperationCreateDTO dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var result = await _service.UpdateAsync(id, dto);
                _apiResponse.data = result;
                _apiResponse.status = true;
                _apiResponse.StatusCode = HttpStatusCode.OK;
                return Ok(_apiResponse);
            }
            catch (Exception ex)
            {
                _apiResponse.status = false;
                _apiResponse.StatusCode = HttpStatusCode.BadRequest;
                _apiResponse.Message = ex.Message;
                return BadRequest(_apiResponse);
            }
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


        [HttpPatch("status/{id}")]
        public async Task<IActionResult> UpdateStatus(string id, int statusId)
        {
            var result = await _service.UpdateStatusAsync(id, statusId);

            _apiResponse.data = result;
            _apiResponse.status = result;
            _apiResponse.StatusCode = result
                ? HttpStatusCode.OK
                : HttpStatusCode.BadRequest;

            return StatusCode((int)_apiResponse.StatusCode, _apiResponse);
        }



        [HttpGet("search")]
        public async Task<IActionResult> Search(
    string? search,
    string? fuelType,
    string? generatorName,
    DateTime? startDate,
    DateTime? endDate,
    int? statusId,
        int pageNumber = 1,
    int pageSize = 10)
        {
            var result = await _service.SearchAsync(
                search,
                fuelType,
                generatorName,
                startDate,
                endDate,
                statusId,
                pageNumber,
                pageSize
            );

            return Ok(result);
        }
    }
}
