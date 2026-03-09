using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Account.VehicleTripEmission
{
    public class ResponseVehicleTripEmissionDTO
    {
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


    }
}
