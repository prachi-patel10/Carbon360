using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Account.VehicleTripEmission
{
    public class CreateVehicleTripEmissionDTO
    {
        public int VehicleId { get; set; }
        public int FromCityId { get; set; }
        public int ToCityId { get; set; }
        public DateTime TripStartDateTime { get; set; }
        public DateTime? TripEndDateTime { get; set; }
        public decimal DistanceKm { get; set; }
        public string FuelType { get; set; }
        public decimal FuelConsumedLtr { get; set; }
    }
}
