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

        // GET api/Chart/CombinedFuelChart?year=2024
        //[HttpGet("CombinedFuelChart")]
        //public async Task<IActionResult> CombinedFuelChart([FromQuery] int year)
        //{
        //    var data = await _service.GetCombinedFuelChartAsync(year);
        //    return Ok(new { status = true, data });
        //}
    }
}
