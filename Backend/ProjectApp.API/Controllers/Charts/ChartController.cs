using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ProjectApp.Repository.Interfaces.Charts;
using ProjectApp.Repository.Services.Common;

namespace ProjectApp.API.Controllers.Charts
{
    [Route("api/[controller]")]
    [ApiController]
    public class ChartController : ControllerBase
    {
        private readonly IChartService _service;

        public ChartController(IChartService service) => _service = service;

        // ── Helper: parse & validate date range from query ────────────────────
        private bool TryGetDateRange(
    string? from, string? to,
    out DateTime fromDate, out DateTime toDate, out IActionResult? error)
        {
            fromDate = default;
            toDate = default;
            error = null;

            if (!DateTime.TryParse(from, out fromDate) || !DateTime.TryParse(to, out toDate))
            {
                error = BadRequest(new { status = false, message = "Invalid date range. Use yyyy-MM-dd." });
                return false;
            }

            if (fromDate > toDate)
            {
                error = BadRequest(new { status = false, message = "fromDate must be <= toDate." });
                return false;
            }

            return true;
        }

        // ── Fuel ─────────────────────────────────────────────────────────────
        [HttpGet("VehicleMonthly")]
        public async Task<IActionResult> VehicleMonthly(
            [FromQuery] string fromDate, [FromQuery] string toDate)
        {
            if (!TryGetDateRange(fromDate, toDate, out var from, out var to, out var err)) return err!;
            var data = await _service.GetVehicleFuelMonthlyConsumptionAsync(from, to);
            return Ok(new { status = true, data });
        }

        [HttpGet("GeneratorMonthly")]
        public async Task<IActionResult> GeneratorMonthly(
            [FromQuery] string fromDate, [FromQuery] string toDate)
        {
            if (!TryGetDateRange(fromDate, toDate, out var from, out var to, out var err)) return err!;
            var data = await _service.GetGeneratorFuelMonthlyConsumptionAsync(from, to);
            return Ok(new { status = true, data });
        }

        [HttpGet("CombinedFuelChart")]
        public async Task<IActionResult> CombinedFuelChart(
            [FromQuery] string fromDate, [FromQuery] string toDate)
        {
            if (!TryGetDateRange(fromDate, toDate, out var from, out var to, out var err)) return err!;
            var data = await _service.GetCombinedFuelChartAsync(from, to);
            return Ok(new { status = true, data });
        }

        // ── Emissions ─────────────────────────────────────────────────────────
        [HttpGet("VehicleEmissionChart")]
        public async Task<IActionResult> VehicleEmissionChart(
            [FromQuery] string fromDate, [FromQuery] string toDate)
        {
            if (!TryGetDateRange(fromDate, toDate, out var from, out var to, out var err)) return err!;
            var data = await _service.GetVehicleEmissionChartAsync(from, to);
            return Ok(new { status = true, data });
        }

        [HttpGet("GeneratorEmissionChart")]
        public async Task<IActionResult> GeneratorEmissionChart(
            [FromQuery] string fromDate, [FromQuery] string toDate)
        {
            if (!TryGetDateRange(fromDate, toDate, out var from, out var to, out var err)) return err!;
            var data = await _service.GetGeneratorEmissionChartAsync(from, to);
            return Ok(new { status = true, data });
        }

        // ── Generator Run Hours ───────────────────────────────────────────────
        [HttpGet("GeneratorRunHours")]
        public async Task<IActionResult> GeneratorRunHours(
            [FromQuery] string fromDate, [FromQuery] string toDate)
        {
            if (!TryGetDateRange(fromDate, toDate, out var from, out var to, out var err)) return err!;
            var data = await _service.GetGeneratorRunHoursByBaseAsync(from, to);
            return Ok(new { status = true, data });
        }

        [HttpGet("GeneratorRunHoursMonthly")]
        public async Task<IActionResult> GeneratorRunHoursMonthly(
            [FromQuery] string fromDate, [FromQuery] string toDate)
        {
            if (!TryGetDateRange(fromDate, toDate, out var from, out var to, out var err)) return err!;
            var data = await _service.GetGeneratorRunHoursMonthlyAsync(from, to);
            return Ok(new { status = true, data });
        }

        // ── Vehicle Distance ──────────────────────────────────────────────────
        [HttpGet("VehicleDistanceMonthly")]
        public async Task<IActionResult> VehicleDistanceMonthly(
            [FromQuery] string fromDate, [FromQuery] string toDate)
        {
            if (!TryGetDateRange(fromDate, toDate, out var from, out var to, out var err)) return err!;
            var data = await _service.GetVehicleTotalDistanceMonthlyAsync(from, to);
            return Ok(new { status = true, data });
        }

        [HttpGet("VehicleTypeDistance")]
        public async Task<IActionResult> VehicleTypeDistance(
            [FromQuery] string fromDate, [FromQuery] string toDate)
        {
            if (!TryGetDateRange(fromDate, toDate, out var from, out var to, out var err)) return err!;
            var data = await _service.GetVehicleTypeWiseDistanceAsync(from, to);
            return Ok(new { status = true, data });
        }

        // ── City / Site ───────────────────────────────────────────────────────
        [HttpGet("VehicleCityEmissions")]
        public async Task<IActionResult> VehicleCityEmissions(
            [FromQuery] string fromDate, [FromQuery] string toDate)
        {
            if (!TryGetDateRange(fromDate, toDate, out var from, out var to, out var err)) return err!;
            var data = await _service.GetVehicleCityWiseEmissionsAsync(from, to);
            return Ok(new { status = true, data });
        }

        [HttpGet("GeneratorSiteEmissions")]
        public async Task<IActionResult> GeneratorSiteEmissions(
            [FromQuery] string fromDate, [FromQuery] string toDate)
        {
            if (!TryGetDateRange(fromDate, toDate, out var from, out var to, out var err)) return err!;
            var data = await _service.GetGeneratorSiteWiseEmissionsAsync(from, to);
            return Ok(new { status = true, data });
        }

        // ── Summaries ─────────────────────────────────────────────────────────
        [HttpGet("VehicleSummary")]
        public async Task<IActionResult> VehicleSummary(
            [FromQuery] string fromDate, [FromQuery] string toDate)
        {
            if (!TryGetDateRange(fromDate, toDate, out var from, out var to, out var err)) return err!;
            var data = await _service.GetVehicleSummaryAsync(from, to);
            return Ok(new { status = true, data });
        }

        [HttpGet("GeneratorSummary")]
        public async Task<IActionResult> GeneratorSummary(
            [FromQuery] string fromDate, [FromQuery] string toDate)
        {
            if (!TryGetDateRange(fromDate, toDate, out var from, out var to, out var err)) return err!;
            var data = await _service.GetGeneratorSummaryAsync(from, to);
            return Ok(new { status = true, data });
        }

        // ── Category ──────────────────────────────────────────────────────────
        [HttpGet("VehicleCategoryEmission")]
        public async Task<IActionResult> VehicleCategoryEmission(
            [FromQuery] string fromDate, [FromQuery] string toDate)
        {
            if (!TryGetDateRange(fromDate, toDate, out var from, out var to, out var err)) return err!;
            var data = await _service.GetVehicleCategoryWiseEmissionAsync(from, to);
            return Ok(new { status = true, data });
        }

        // ── Exports ───────────────────────────────────────────────────────────
        [HttpGet("ExportVehicleFuel")]
        public async Task<IActionResult> ExportVehicleFuel(
            [FromQuery] string fromDate, [FromQuery] string toDate)
        {
            if (!TryGetDateRange(fromDate, toDate, out var from, out var to, out var err)) return err!;
            var fileBytes = await _service.ExportVehicleFuelExcelAsync(from, to);
            return File(fileBytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"VehicleFuel_{from:yyyy-MM-dd}_to_{to:yyyy-MM-dd}.xlsx");
        }

        [HttpGet("ExportVehicleEmission")]
        public async Task<IActionResult> ExportVehicleEmission(
            [FromQuery] string fromDate, [FromQuery] string toDate)
        {
            if (!TryGetDateRange(fromDate, toDate, out var from, out var to, out var err)) return err!;
            var fileBytes = await _service.ExportVehicleEmissionExcelAsync(from, to);
            return File(fileBytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"VehicleEmission_{from:yyyy-MM-dd}_to_{to:yyyy-MM-dd}.xlsx");
        }

        [HttpGet("ExportVehicleDistance")]
        public async Task<IActionResult> ExportVehicleDistance(
            [FromQuery] string fromDate, [FromQuery] string toDate)
        {
            if (!TryGetDateRange(fromDate, toDate, out var from, out var to, out var err)) return err!;
            var fileBytes = await _service.ExportVehicleDistanceExcelAsync(from, to);
            return File(fileBytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"VehicleDistance_{from:yyyy-MM-dd}_to_{to:yyyy-MM-dd}.xlsx");
        }

        [HttpGet("ExportVehicleTypeDistance")]
        public async Task<IActionResult> ExportVehicleTypeDistance(
            [FromQuery] string fromDate, [FromQuery] string toDate)
        {
            if (!TryGetDateRange(fromDate, toDate, out var from, out var to, out var err)) return err!;
            var fileBytes = await _service.ExportVehicleTypeDistanceExcelAsync(from, to);
            return File(fileBytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"VehicleTypeDistance_{from:yyyy-MM-dd}_to_{to:yyyy-MM-dd}.xlsx");
        }

        [HttpGet("ExportVehicleTypeDistancePieChart")]
        public async Task<IActionResult> ExportVehicleTypeDistancePie(
            [FromQuery] string fromDate, [FromQuery] string toDate)
        {
            if (!TryGetDateRange(fromDate, toDate, out var from, out var to, out var err)) return err!;
            var fileBytes = await _service.ExportVehicleTypeDistancePieExcelAsync(from, to);
            return File(fileBytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"VehicleTypeDistancePie_{from:yyyy-MM-dd}_to_{to:yyyy-MM-dd}.xlsx");
        }

        [HttpGet("ExportCityWiseEmissionChart")]
        public async Task<IActionResult> ExportCityWiseEmissionChart(
            [FromQuery] string fromDate, [FromQuery] string toDate)
        {
            if (!TryGetDateRange(fromDate, toDate, out var from, out var to, out var err)) return err!;
            var fileBytes = await _service.ExportCityWiseEmissionExcelAsync(from, to);
            if (fileBytes == null || fileBytes.Length == 0)
                return NotFound("No data found for the given range.");
            return File(fileBytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"CityWiseEmission_{from:yyyy-MM-dd}_to_{to:yyyy-MM-dd}.xlsx");
        }

        [HttpGet("ExportGeneratorFuel")]
        public async Task<IActionResult> ExportGeneratorFuel(
            [FromQuery] string fromDate, [FromQuery] string toDate)
        {
            if (!TryGetDateRange(fromDate, toDate, out var from, out var to, out var err)) return err!;
            var fileBytes = await _service.ExportCityWiseEmissionExcelGeneratorAsync(from, to);
            return File(fileBytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"GeneratorFuel_{from:yyyy-MM-dd}_to_{to:yyyy-MM-dd}.xlsx");
        }

        [HttpGet("ExportGeneratorEmissionLineChart")]
        public async Task<IActionResult> ExportGeneratorEmission(
            [FromQuery] string fromDate, [FromQuery] string toDate)
        {
            if (!TryGetDateRange(fromDate, toDate, out var from, out var to, out var err)) return err!;
            var fileBytes = await _service.ExportGeneratorEmissionExcelLineChartAsync(from, to);
            return File(fileBytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"GeneratorEmission_{from:yyyy-MM-dd}_to_{to:yyyy-MM-dd}.xlsx");
        }

        [HttpGet("ExportGeneratorPie")]
        public async Task<IActionResult> ExportGeneratorPie(
            [FromQuery] string fromDate, [FromQuery] string toDate)
        {
            if (!TryGetDateRange(fromDate, toDate, out var from, out var to, out var err)) return err!;
            var file = await _service.ExportGeneratorRunHoursPieChartAsync(from, to);
            return File(file,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "GeneratorPieChart.xlsx");
        }

        [HttpGet("ExportGeneratorRunHoursMonthWisePivotTbl")]
        public async Task<IActionResult> ExportGeneratorRunHoursMonthWisePivotTbl(
            [FromQuery] string fromDate, [FromQuery] string toDate)
        {
            if (!TryGetDateRange(fromDate, toDate, out var from, out var to, out var err)) return err!;
            var file = await _service.ExportGeneratorRunHoursMonthlyExcelAsync(from, to);
            return File(file,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "GeneratorRunHoursMonthWise.xlsx");
        }

        [HttpGet("export-site-emission-chart")]
        public async Task<IActionResult> ExportSiteEmissionChart(
            [FromQuery] string fromDate, [FromQuery] string toDate)
        {
            if (!TryGetDateRange(fromDate, toDate, out var from, out var to, out var err)) return err!;
            var file = await _service.ExportSiteEmissionChartAsync(from, to);
            return File(file,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "SiteEmissionChart.xlsx");
        }

        [HttpGet("ExportVehicleCategoryEmission")]
        public async Task<IActionResult> ExportVehicleCategoryEmission(
            [FromQuery] string fromDate, [FromQuery] string toDate)
        {
            if (!TryGetDateRange(fromDate, toDate, out var from, out var to, out var err)) return err!;
            var fileBytes = await _service.ExportVehicleCategoryEmissionExcelAsync(from, to);
            if (fileBytes == null || fileBytes.Length == 0)
                return NotFound("No data found for the given range.");
            return File(fileBytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"VehicleCategoryEmission_{from:yyyy-MM-dd}_to_{to:yyyy-MM-dd}.xlsx");
        }
    }
}
