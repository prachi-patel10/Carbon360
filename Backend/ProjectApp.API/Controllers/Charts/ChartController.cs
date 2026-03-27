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

        // ── Fuel Consumption Charts ───────────────────────────────────────
        // SP: USP_CB_VehicleFuelMonthlyConsumption
        // Returns: List<FuelTypeMonthlyConsumptionDto>
        // Shows:   Stacked/grouped bar — vehicle fuel usage by fuel type per month
        [HttpGet("VehicleMonthly")]
        public async Task<IActionResult> VehicleMonthly([FromQuery] int year)
        {
            var data = await _service.GetVehicleFuelMonthlyConsumptionAsync(year);
            return Ok(new { status = true, data });
        }

        // SP: USP_CB_GeneratorFuelMonthlyConsumption
        // Returns: List<FuelTypeMonthlyConsumptionDto>
        // Shows:   Stacked/grouped bar — generator fuel usage by fuel type per month
        [HttpGet("GeneratorMonthly")]
        public async Task<IActionResult> GeneratorMonthly([FromQuery] int year)
        {
            var data = await _service.GetGeneratorFuelMonthlyConsumptionAsync(year);
            return Ok(new { status = true, data });
        }

        // SP: USP_CB_CombinedFuelMonthlyConsumption
        // Returns: FuelCombinedChartResponseDto  (labels + stacked datasets)
        // Shows:   Stacked bar — both vehicle & generator fuel side-by-side per month
        [HttpGet("CombinedFuelChart")]
        public async Task<IActionResult> CombinedFuelChart([FromQuery] int year)
        {
            var data = await _service.GetCombinedFuelChartAsync(year);
            return Ok(new { status = true, data });
        }

        // ── Emission Charts ───────────────────────────────────────────────
        // SP: USP_CB_VehicleEmissionMonthlyChart
        // Returns: MonthlyEmissionChartResponseDto  (4 line datasets)
        // Shows:   Multi-line chart — TotalCO2e, CO2, NO2, CH4 per month for vehicles
        [HttpGet("VehicleEmissionChart")]
        public async Task<IActionResult> VehicleEmissionChart([FromQuery] int year)
        {
            var data = await _service.GetVehicleEmissionChartAsync(year);
            return Ok(new { status = true, data });
        }

        // SP: USP_CB_GeneratorEmissionMonthlyChart
        // Returns: MonthlyEmissionChartResponseDto  (4 line datasets)
        // Shows:   Multi-line chart — TotalCO2e, CO2, NO2, CH4 per month for generators
        [HttpGet("GeneratorEmissionChart")]
        public async Task<IActionResult> GeneratorEmissionChart([FromQuery] int year)
        {
            var data = await _service.GetGeneratorEmissionChartAsync(year);
            return Ok(new { status = true, data });
        }

        // ── Generator Run Hours ───────────────────────────────────────────
        // SP: USP_CB_GeneratorRunHoursByBase
        // Returns: GeneratorRunHoursChartResponseDto
        // Shows:   Pie/donut chart — share of run hours per generator for the year
        [HttpGet("GeneratorRunHours")]
        public async Task<IActionResult> GeneratorRunHours([FromQuery] int year)
        {
            var data = await _service.GetGeneratorRunHoursByBaseAsync(year);
            return Ok(new { status = true, data });
        }

        // SP: USP_CB_GeneratorRunHoursMonthly
        // Returns: GeneratorRunHoursMonthlyPivotDto
        // Shows:   Grouped bar / pivot table — run hours per generator per month
        //          Also carries fuel consumed & power output per generator per month
        [HttpGet("GeneratorRunHoursMonthly")]
        public async Task<IActionResult> GeneratorRunHoursMonthly([FromQuery] int year)
        {
            var data = await _service.GetGeneratorRunHoursMonthlyAsync(year);
            return Ok(new { status = true, data });
        }

        // ── Generator Load Factor ─────────────────────────────────────────
        // SP: USP_CB_GeneratorLoadFactorMonthly
        // Returns: GeneratorLoadFactorChartResponseDto
        // Shows:   Multi-line chart — Avg/Max/Min load factor per generator per month
        [HttpGet("GeneratorLoadFactor")]
        public async Task<IActionResult> GeneratorLoadFactor([FromQuery] int year)
        {
            var data = await _service.GetGeneratorLoadFactorMonthlyAsync(year);
            return Ok(new { status = true, data });
        }

        // ── Vehicle Distance Charts ───────────────────────────────────────
        // SP: USP_CB_VehicleTotalDistanceMonthly
        // Returns: VehicleDistanceChartResponseDto
        // Shows:   Bar chart — total KM driven per month (also carries trips & fuel)
        [HttpGet("VehicleDistanceMonthly")]
        public async Task<IActionResult> VehicleDistanceMonthly([FromQuery] int year)
        {
            var data = await _service.GetVehicleTotalDistanceMonthlyAsync(year);
            return Ok(new { status = true, data });
        }

        // SP: USP_CB_VehicleTypeWiseDistance
        // Returns: VehicleTypeDistancePivotDto
        // Shows:   Stacked bar / pivot — distance per vehicle type per month
        //          Also carries trips & fuel consumed per type per month
        [HttpGet("VehicleTypeDistance")]
        public async Task<IActionResult> VehicleTypeDistance([FromQuery] int year)
        {
            var data = await _service.GetVehicleTypeWiseDistanceAsync(year);
            return Ok(new { status = true, data });
        }

        // ── City / Site Emission Charts ───────────────────────────────────
        // SP: USP_CB_VehicleCityWiseEmissions
        // Returns: List<CityEmissionDto>
        // Shows:   Horizontal bar / map chart — vehicle emissions per departure city
        [HttpGet("VehicleCityEmissions")]
        public async Task<IActionResult> VehicleCityEmissions([FromQuery] int year)
        {
            var data = await _service.GetVehicleCityWiseEmissionsAsync(year);
            return Ok(new { status = true, data });
        }

        // SP: USP_CB_GeneratorSiteWiseEmissions
        // Returns: List<SiteEmissionDto>
        // Shows:   Horizontal bar / map chart — generator emissions per site
        [HttpGet("GeneratorSiteEmissions")]
        public async Task<IActionResult> GeneratorSiteEmissions([FromQuery] int year)
        {
            var data = await _service.GetGeneratorSiteWiseEmissionsAsync(year);
            return Ok(new { status = true, data });
        }

        // ── Dashboard KPI Summaries ───────────────────────────────────────
        // SP: USP_CB_VehicleSummary
        // Returns: VehicleSummaryDto  (single row)
        // Shows:   KPI cards — total CO2e, fuel consumed, distance, trips for the year
        [HttpGet("VehicleSummary")]
        public async Task<IActionResult> VehicleSummary([FromQuery] int year)
        {
            var data = await _service.GetVehicleSummaryAsync(year);
            return Ok(new { status = true, data });
        }

        // SP: USP_CB_GeneratorSummary
        // Returns: GeneratorSummaryDto  (single row)
        // Shows:   KPI cards — total CO2e, fuel consumed, run hours, power output for the year
        [HttpGet("GeneratorSummary")]
        public async Task<IActionResult> GeneratorSummary([FromQuery] int year)
        {
            var data = await _service.GetGeneratorSummaryAsync(year);
            return Ok(new { status = true, data });
        }

        // SP: USP_CB_DashboardEmissionSummary
        // Returns: DashboardSummaryDto  (single row — combined vehicle + generator)
        // Shows:   Top-level KPI cards — combined CO2e, CO2, CH4, NO2, fuel, distance
        [HttpGet("DashboardSummary")]
        public async Task<IActionResult> DashboardSummary([FromQuery] int year)
        {
            var data = await _service.GetDashboardSummaryAsync(year);
            return Ok(new { status = true, data });
        }

        [HttpGet("ExportVehicleFuel")]
        public async Task<IActionResult> ExportVehicleFuel([FromQuery] int year)
        {
            var fileBytes = await _service.ExportVehicleFuelExcelAsync(year);

            return File(
                fileBytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"VehicleFuel_{year}.xlsx"
            );
        }

        [HttpGet("ExportVehicleEmission")]
        public async Task<IActionResult> ExportVehicleEmission([FromQuery] int year)
        {
            var fileBytes = await _service.ExportVehicleEmissionExcelAsync(year);
            return File(
                fileBytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"VehicleEmission_{year}.xlsx"
            );
        }

        //[HttpGet("ExportVehicleDistance")]
        //public async Task<IActionResult> ExportVehicleDistance([FromQuery] int year)
        //{
        //    var fileBytes = await _service.ExportVehicleDistanceExcelAsync(year);
        //    return File(
        //        fileBytes,
        //        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        //        $"VehicleDistance_{year}.xlsx"
        //    );
        //}

        //[HttpGet("ExportVehicleTypeDistance")]
        //public async Task<IActionResult> ExportVehicleTypeDistance([FromQuery] int year)
        //{
        //    var fileBytes = await _service.ExportVehicleTypeDistanceExcelAsync(year);

        //    return File(
        //        fileBytes,
        //        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        //        $"VehicleTypeDistance_{year}.xlsx"
        //    );
        }


        //[HttpGet("ExportVehicleTypeDistancePieChart")]
        //public async Task<IActionResult> ExportVehicleTypeDistancePieChart([FromQuery] int year)
        //{
        //    var fileBytes = await _service.ExportVehicleTypeDistanceExcelAsync(year);
        //    return File(
        //        fileBytes,
        //        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        //        $"VehicleTypeDistance_{year}.xlsx"
        //    );
        //}

    }
