using Microsoft.AspNetCore.Authorization;
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

        //[Authorize(Roles = "Reporter")]
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
        //[Authorize(Roles = "Reporter,Corporate")]

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            //var result = await _service.GetAllAsync();
            //return Ok(result);
            var (data, totalRecords) = await _service.GetAllAsync();

            return Ok(new
            {
                Data = data,
                TotalRecords = totalRecords
            });
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
        //[Authorize(Roles = "Reporter")]

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTrip(string id, [FromBody] UpdateVehicleTripEmissionDTO dto)
        {
            dto.TripId = id;

            var result = await _service.UpdateAsync(dto);

            return Ok(result);
        }

        //[Authorize(Roles = "Corporate")]

        [HttpPatch("status")]
        public async Task<IActionResult> UpdateStatus([FromBody] VehicleTripStatusUpdateDTO dto)
        {
            var result = await _service.UpdateStatusAsync(dto);

            if (!result)
                return NotFound();

            return Ok(new
            {
                success = true,
                message = "Status updated successfully."
            });
        }

        //    [HttpGet("search")]
        //    public async Task<IActionResult> SearchVehicleTrips(
        //[FromQuery] string? search,
        //[FromQuery] string? vehicleNumber,
        //[FromQuery] string? fuelType,
        //[FromQuery] string? vehicleType,
        //[FromQuery] DateTime? startDate,
        //[FromQuery] DateTime? endDate,
        //[FromQuery] int? statusId,
        //[FromQuery] int pageNumber = 1,
        //[FromQuery] int pageSize = 10)
        //    {
        //        string role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;

        //        var result = await _service.SearchVehicleTrips(
        //            search,
        //            vehicleNumber,
        //            fuelType,
        //            vehicleType,
        //            startDate,
        //            endDate,
        //            statusId,
        //            role,
        //            pageNumber,
        //            pageSize);

        //        return Ok(new
        //        {
        //            success = true,
        //            data = result.Item1,
        //            totalRecords = result.Item2,
        //            pageNumber,
        //            pageSize
        //        });
        //    }

        [HttpGet("search")]
        public async Task<IActionResult> Search(
           string? search = null,
           string? vehicleNumber = null,
           [FromQuery] List<string>? fuelType = null,
           string? vehicleType = null,
           DateTime? startDate = null,
           DateTime? endDate = null,
           int? statusId = null,
           int pageNumber = 1,
           int pageSize = 10,
           string sortColumn = "tripstartdatetime",
           string sortDirection = "DESC")
        {
            // Convert list to CSV e.g. "Petrol,CNG" — SP handles splitting via CB_SplitString
            string? fuelTypeCsv = (fuelType != null && fuelType.Any())
                ? string.Join(",", fuelType)
                : null;

            var (data, totalRecords) = await _service.SearchVehicleTrips(
                search,
                vehicleNumber,
                fuelTypeCsv,
                vehicleType,
                startDate,
                endDate,
                statusId,
                null,
                pageNumber,
                pageSize,
                sortColumn,
                sortDirection
            );

            return Ok(new
            {
                success = true,
                data,
                totalRecords,
                pageNumber,
                pageSize
            });
        }

        //        [HttpGet("my-actions")]
        //        public async Task<IActionResult> GetMyActions(int pageNumber = 1, int pageSize = 10, string sortColumn = "fromCity",
        //string sortDirection = "ASC")
        //        {
        //            var result = await _service.GetMyActionTripsAsync(pageNumber, pageSize);
        //            return Ok(result);
        //        }

        //[Authorize(Roles = "Reporter,Corporate")]

        [HttpGet("my-actions")]
        public async Task<IActionResult> GetMyActions(
          int pageNumber = 1,
          int pageSize = 10,
          string sortColumn = "EntryDate",
          string sortDirection = "ASC")
        {
            var result = await _service.GetMyActionTripsAsync(
                pageNumber,
                pageSize,
                sortColumn,
                sortDirection
            );

            return Ok(result);
        }

        [HttpGet("{id}/actions")]
        public async Task<IActionResult> GetWorkflowActions(string id)
        {
            var actions = await _service.GetWorkflowActionsAsync(id);

            if (actions == null || !actions.Any())
            {
                return Ok(new
                {
                    status = true,
                    statusCode = 200,
                    message = "No workflow actions available for this trip.",
                    data = new List<object>()
                });
            }

            return Ok(new
            {
                status = true,
                statusCode = 200,
                message = "Workflow actions fetched successfully.",
                data = actions
            });
        }

        [HttpGet("pdf/{hashId}")]
        public async Task<IActionResult> GetTripDetailsForPDF(string hashId)
        {
            var data = await _service.GetByHashIdAsyncPDF(hashId);
            return data == null || data.Count == 0
                ? NotFound("Trip not found")
                : Ok(data);
        }

        [HttpGet("export-excel")]
        public async Task<IActionResult> ExportExcel(
   string? search,
   string? fuelType,
   DateTime? startDate,
   DateTime? endDate,
   DateTime? entryStartDate,
   DateTime? entryEndDate,
   string sortColumn = "entrydate",
   string sortDirection = "DESC")
        {
            var fileBytes = await _service.ExportVehicleTripsExcel(
                search,
                fuelType,
                startDate,
                endDate,
                entryStartDate,
                entryEndDate,
                sortColumn,
                sortDirection
            );

            return File(
                fileBytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "VehicleTripEmission.xlsx"
            );
        }
        [HttpGet("trip-pdf/{tripId}")]
        public async Task<IActionResult> DownloadTripPdf(string tripId)
        {
            try
            {
                var pdf = await _service.GenerateVehicleTripPdf(tripId);

                if (pdf == null || pdf.Length == 0)
                    return BadRequest("PDF generation returned empty content.");

                return File(pdf, "application/pdf", $"VehicleTrip_{tripId}.pdf");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"PDF ERROR: {ex}"); // log full stack trace
                return StatusCode(500, new { message = ex.Message, detail = ex.StackTrace });
            }
        }


    }
}
