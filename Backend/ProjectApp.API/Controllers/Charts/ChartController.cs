using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ProjectApp.Repository.Interfaces.Charts;

namespace ProjectApp.API.Controllers.Charts
{
    [Route("api/[controller]")]
    [ApiController]
    public class ChartController : ControllerBase
    {
        private readonly IChartService _service;

        public ChartController(IChartService service)
        {
            _service = service;
        }

        //FuelConsumption
        [HttpGet("VehicleMonthly")]
        public async Task<IActionResult> VehicleMonthly([FromQuery] int year)
        {
            var data = await _service.GetVehicleFuelMonthlyConsumptionAsync(year);
            return Ok(new { status = true, data });
        }

        //FuelConsumption
        [HttpGet("GeneratorMonthly")]
        public async Task<IActionResult> GeneratorMonthly([FromQuery] int year)
        {
            var data = await _service.GetGeneratorFuelMonthlyConsumptionAsync(year);
            return Ok(new { status = true, data });
        }

        [HttpGet("CombinedFuelChart")]
        public async Task<IActionResult> CombinedFuelChart([FromQuery] int year)
        {
            var data = await _service.GetCombinedFuelChartAsync(year);
            return Ok(new { status = true, data });
        }

        [HttpGet("VehicleEmissionChart")]
        public async Task<IActionResult> VehicleEmissionChart([FromQuery] int year)
        {
            var data = await _service.GetVehicleEmissionChartAsync(year);
            return Ok(new { status = true, data });
        }

        [HttpGet("GeneratorEmissionChart")]
        public async Task<IActionResult> GeneratorEmissionChart([FromQuery] int year)
        {
            var data = await _service.GetGeneratorEmissionChartAsync(year);
            return Ok(new { status = true, data });
        }

        // Generator Run Hours Pie Chart
        [HttpGet("GeneratorRunHours")]
        public async Task<IActionResult> GeneratorRunHours([FromQuery] int year)
        {
            var data = await _service.GetGeneratorRunHoursByBaseAsync(year);
            return Ok(new { status = true, data });
        }

        // NEW: Vehicle Total Distance Monthly Bar Chart 
        [HttpGet("VehicleDistanceMonthly")]
        public async Task<IActionResult> VehicleDistanceMonthly([FromQuery] int year)
        {
            var data = await _service.GetVehicleTotalDistanceMonthlyAsync(year);
            return Ok(new { status = true, data });
        }

        [HttpGet("GeneratorLoadFactor")]
        public async Task<IActionResult> GeneratorLoadFactor([FromQuery] int year)
        {
            var data = await _service.GetGeneratorLoadFactorMonthlyAsync(year);
            return Ok(new { status = true, data });
        }
    }
}

