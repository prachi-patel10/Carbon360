using Microsoft.AspNetCore.Mvc;
using ProjectApp.Core.DTOs;
using ProjectApp.Core.DTOs.Masters.EmissionFactor;
using ProjectApp.Repository.Interfaces.Masters.EmissionFactor;
using ProjectApp.Repository.Services;

namespace ProjectApp.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EmissionFactorController : ControllerBase
    {
        private readonly IEmissionFactorService _service;

        public EmissionFactorController(IEmissionFactorService service)
        {
            _service = service;
        }

        [HttpGet("List")]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllAsync();
            return StatusCode(result.StatusCode, result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var result = await _service.GetByIdAsync(id);
            return StatusCode(result.StatusCode, result);
        }

        [HttpPost("Create")]
        public async Task<IActionResult> Create([FromBody] EmissionFactorRequestDTO dto)
        {
            var result = await _service.CreateAsync(dto, 1);
            return StatusCode(result.StatusCode, result);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, EmissionFactorRequestDTO dto)
        {
            var result = await _service.UpdateAsync(id, dto, 1);
            return StatusCode(result.StatusCode, result);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var result = await _service.DeleteAsync(id, 1);
            return StatusCode(result.StatusCode, result);
        }

        [HttpPatch("{id}/status")]
        public async Task<IActionResult> UpdateStatus(string id, bool isActive)
        {
            var result = await _service.UpdateStatusAsync(id, isActive, 1);
            return StatusCode(result.StatusCode, result);
        }
    }
}