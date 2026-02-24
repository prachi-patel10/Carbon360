using Microsoft.AspNetCore.Mvc;
using ProjectApp.Core.DTOs.Account.VehicleModule.VehicleTrip;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.Vehicle.VehicleTrip;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

[Route("api/[controller]")]
[ApiController]
public class VehicleTripController : ControllerBase
{
    private readonly IVehicleTripService _service;

    public VehicleTripController(IVehicleTripService service)
    {
        _service = service;
    }

    // GET ALL (SP)
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var data = await _service.GetAllTripsUsingSPAsync();
        return Ok(data);
    }

    // GET BY ID (SP)
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var data = await _service.GetTripByIdUsingSPAsync(id);

        if (data == null)
            return NotFound("Trip Not Found");

        return Ok(data);
    }

    
    // GET BY VEHICLE
  
    [HttpGet("vehicle/{vehicleId}")]
    public async Task<IActionResult> GetByVehicle(int vehicleId)
    {
        var data = await _service.GetTripsByVehicleIdAsync(vehicleId);
        return Ok(data);
    }

    // GET BY DEPARTMENT
    [HttpGet("department/{departmentId}")]
    public async Task<IActionResult> GetByDepartment(int departmentId)
    {
        var data = await _service.GetTripsByDepartmentIdAsync(departmentId);
        return Ok(data);
    }

    // GET BETWEEN DATES
    [HttpGet("daterange")]
    public async Task<IActionResult> GetByDateRange(DateTime fromDate, DateTime toDate)
    {
        var data = await _service.GetTripsBetweenDatesAsync(fromDate, toDate);
        return Ok(data);
    }

    // CREATE (SP)
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] VehicleTripDTO dto)
    {
        var entity = new CB_VehicleTrip
        {
            VehicleId = dto.VehicleId,
            FromCityId = dto.FromCityId,
            ToCityId = dto.ToCityId,
            TripStartDateTime = dto.TripStartDateTime,
            TripEndDateTime = dto.TripEndDateTime,
            DistanceKm = dto.DistanceKm,
            FuelConsumedLtr = dto.FuelConsumedLtr,
            EntryBy = dto.EntryBy // current user
        };

        var newTripId = await _service.InsertTripUsingSPAsync(entity);

        return Ok(new { Message = "Created Successfully", TripId = newTripId });
    }

    // UPDATE (SP)
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, VehicleTripDTO dto)
    {
        var entity = new CB_VehicleTrip
        {
            TripId = id,
            VehicleId = dto.VehicleId,
            FromCityId = dto.FromCityId,
            ToCityId = dto.ToCityId,
            TripStartDateTime = dto.TripStartDateTime,
            TripEndDateTime = dto.TripEndDateTime,
            DistanceKm = dto.DistanceKm,
            FuelConsumedLtr = dto.FuelConsumedLtr,
            UpdatedBy = dto.EntryBy // current user
        };

        await _service.UpdateTripUsingSPAsync(entity);

        return Ok("Updated Successfully");
    }

    // DELETE (SP)
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id, [FromQuery] int updatedBy)
    {
        await _service.DeleteTripUsingSPAsync(id, updatedBy);
        return Ok("Deleted Successfully");
    }
}