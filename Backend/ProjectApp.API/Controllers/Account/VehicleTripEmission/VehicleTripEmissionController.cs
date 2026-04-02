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


        [HttpGet("search")]
        public async Task<IActionResult> Search(
    [FromQuery] string? search = null,
    [FromQuery] string? vehicleNumber = null,
    [FromQuery] List<string>? fuelType = null,
    [FromQuery] List<string>? vehicleCategory = null,
    [FromQuery] List<string>? vehicleType = null,
    [FromQuery] DateTime? opStart = null,       
    [FromQuery] DateTime? opEnd = null,          
    [FromQuery] DateTime? entryStart = null,     
    [FromQuery] DateTime? entryEnd = null,       
    [FromQuery] int? statusId = null,
    [FromQuery] int page = 1,                    
    [FromQuery] int pageSize = 10,
    [FromQuery] string sortColumn = "EntryDate",
    [FromQuery] string sortDirection = "DESC")
        {
            var (data, totalRecords) = await _service.SearchVehicleTrips(
                search,
                vehicleNumber,
                fuelType,
                vehicleCategory,
                vehicleType,
                opStart,          // startDate
                opEnd,            // endDate
                entryStart,       // entryStartDate
                entryEnd,         // entryEndDate
                statusId,
                null,
                page,
                pageSize,
                sortColumn,
                sortDirection
            );

            return Ok(new
            {
                success = true,
                data,
                totalRecords,
                pageNumber = page,
                pageSize
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
    [FromQuery] string? search = null,
    [FromQuery] List<string>? fuelType = null,
    [FromQuery] List<string>? vehicleCategory = null,
    [FromQuery] List<string>? vehicleType = null,
    [FromQuery] DateTime? opStart = null,
    [FromQuery] DateTime? opEnd = null,
    [FromQuery] DateTime? entryStart = null,
    [FromQuery] DateTime? entryEnd = null,
    [FromQuery] string sortColumn = "EntryDate",
    [FromQuery] string sortDirection = "DESC")        // ✅ make sure this param exists
        {
            var fileBytes = await _service.ExportVehicleTripsExcel(
                search,
                fuelType,
                vehicleCategory,
                vehicleType,
                opStart,
                opEnd,
                entryStart,
                entryEnd,
                sortColumn,
                sortDirection    // ✅ make sure this is passed
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

                return File(pdf, "application/pdf", $"Search_Fleet&TransportReport_{DateTime.Now:ddMMyyyy}.pdf");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"PDF ERROR: {ex}"); // log full stack trace
                return StatusCode(500, new { message = ex.Message, detail = ex.StackTrace });
            }
        }


    }
}
