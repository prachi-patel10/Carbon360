using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ProjectApp.Core.DTOs.Account.VehicleTripEmission;
using ProjectApp.Repository.Interfaces.VehicleTripEmission;
using ProjectApp.Repository.Services.VehicleTripEmission;

namespace ProjectApp.API.Controllers.Account.VehicleTripEmission
{
    [Route("api/[controller]")]
    [ApiController]
    public class VehicleTripEmissionController : ControllerBase
    {
        private readonly IVehicleTripEmissionService _service;

        public VehicleTripEmissionController(IVehicleTripEmissionService service)
        {
            _service = service;
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateVehicleTripEmissionDTO dto)
        {
            //var result = await _service.CreateAsync(dto);
            //return Ok(result);
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var result = await _service.CreateAsync(dto);

            return CreatedAtAction(nameof(Get), new { hashId = result.TripId }, result);


        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllAsync();
            return Ok(result);
        }

        [HttpGet("{hashId}")]
        public async Task<IActionResult> Get(string hashId)
        {
            var result = await _service.GetByHashIdAsync(hashId);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpDelete("{hashId}")]
        public async Task<IActionResult> Delete(string hashId)
        {
            var result = await _service.DeleteAsync(hashId);

            if (!result)
                return NotFound(new { message = "Record not found" });

            return Ok(new { message = "Deleted Successfully" });
        }

        [HttpPut("{hashId}")]
        public async Task<IActionResult> Update(string hashId, [FromBody] UpdateVehicleTripEmissionDTO dto)
        {
            if (dto == null)
                return BadRequest("Invalid request.");

            dto.TripId = hashId;

            var result = await _service.UpdateAsync(dto);

            if (result == null)
                return NotFound("Trip not found.");

            return Ok(new
            {
                success = true,
                message = "Vehicle trip updated successfully.",
                data = result
            });
        }
    }
}
