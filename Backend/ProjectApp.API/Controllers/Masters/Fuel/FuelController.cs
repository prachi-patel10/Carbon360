using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ProjectApp.Core.DTOs.Masters.Fuel;
using ProjectApp.Repository.Interfaces.Masters.Fuel;

namespace ProjectApp.API.Controllers.Masters.Fuel
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class FuelController : ControllerBase
    {
        private readonly IFuelService _fuelService;

        public FuelController(IFuelService fuelService)
        {
            _fuelService = fuelService;
        }

        [HttpPost("Create")]
        public async Task<IActionResult> Create([FromBody] FuelResponseDTO dto)
        {
            var result = await _fuelService.CreateAsync(dto);
            return Ok(result);
        }

        [HttpPut("Update")]
        public async Task<IActionResult> Update([FromBody] FuelResponseDTO dto)
        {
            var result = await _fuelService.UpdateAsync(dto);

            if (!result)
                return BadRequest("Update failed");

            return Ok("Updated Successfully");
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var result = await _fuelService.DeleteAsync(id);

            if (!result)
                return BadRequest("Delete failed");

            return Ok("Deleted Successfully");
        }

        [HttpGet("All")]
        public async Task<IActionResult> GetAll()
        {
            var result = await _fuelService.GetAllAsync();
            return Ok(result);
        }


        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var result = await _fuelService.GetByIdAsync(id);

            if (result == null)
                return NotFound("Fuel not found");

            return Ok(result);
        }

        [HttpPatch("UpdateStatus")]
        public async Task<IActionResult> UpdateStatus([FromBody] FuelStatusUpdateDTO dto)
        {
            var result = await _fuelService.UpdateStatusAsync(dto);

            if (!result)
                return BadRequest("Status update failed");

            return Ok("Status updated successfully");
        }

        [HttpPatch("UpdateGenerator")]
        public async Task<IActionResult> UpdateGenerator([FromBody] FuelGeneratorUpdateDTO dto)
        {
            var result = await _fuelService.UpdateGeneratorAsync(dto);

            if (!result)
                return BadRequest("Generator flag update failed");

            return Ok("Generator flag updated successfully");
        }
    }
}

