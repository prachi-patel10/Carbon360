using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Account.VehicleModule.VehicleTrip
{
    public class VehicleTripUpdateDTO
    {
        public int TripId { get; set; }

        public int VehicleId { get; set; }
        public int FromCityId { get; set; }
        public int ToCityId { get; set; }

        public DateTime TripStartDateTime { get; set; }
        public DateTime TripEndDateTime { get; set; }

        public decimal DistanceKm { get; set; }
        public decimal FuelConsumedLtr { get; set; }

        public int UpdatedBy { get; set; }
    }
}
