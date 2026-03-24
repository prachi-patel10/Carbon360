using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Account.VehicleTripEmission
{
    public class ResponseVehicleTripEmissionDTO
    {
        public string ReportId { get; set; }
        public string TripId { get; set; }
        public string VehicleId { get; set; }
        public string FromCityId { get; set; }
        public string ToCityId { get; set; }
        public DateTime TripStartDateTime { get; set; }
        public DateTime? TripEndDateTime { get; set; }
        public decimal DistanceKm { get; set; }
        //public string FuelType { get; set; }
        public decimal FuelConsumedLtr { get; set; }
        public decimal? CO2 { get; set; }
        public decimal? NO2 { get; set; }
        public decimal? CH4 { get; set; }
        public decimal? TotalCO2 { get; set; }
        public decimal? TotalNO2 { get; set; }
        public decimal? TotalCH4 { get; set; }
        public decimal? TotalEmission { get; set; }
        public int StatusId { get; set; }
        public string FromCity { get; set; }

        public string ToCity { get; set; }

        public string FuelType { get; set; }

        public string? VehicleNumber { get; set; }
        public string? VehicleType { get; set; }
        public int? EntryBy { get; set; }
        public DateTime? EntryDate { get; set; }

        //public decimal? CO2Factor { get; set; }

        //public decimal? NO2Factor { get; set; }

        //public decimal? CH4Factor { get; set; }


    }
}
