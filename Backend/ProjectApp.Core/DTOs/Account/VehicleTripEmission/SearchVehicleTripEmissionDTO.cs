using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Account.VehicleTripEmission
{
    public class SearchVehicleTripEmissionDTO
    {
        public string? TripId { get; set; }
        public string? VehicleNumber { get; set; }
        public string? VehicleType { get; set; }
        public string? FuelType { get; set; }
        public decimal? DistanceKm { get; set; }
        public decimal? FuelConsumedLtr { get; set; }
        public DateTime? TripStartDateTime { get; set; }
        public DateTime? TripEndDateTime { get; set; }
        public decimal? TotalCO2 { get; set; }
        public decimal? TotalNO2 { get; set; }
        public decimal? TotalCH4 { get; set; }
        public decimal? TotalEmission { get; set; }
        public int? StatusId { get; set; }
        public int PageNumber { get; set; } = 1;

        public int PageSize { get; set; } = 10;
    }
}
