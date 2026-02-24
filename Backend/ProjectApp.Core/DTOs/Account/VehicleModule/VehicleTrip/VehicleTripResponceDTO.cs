using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Account.VehicleModule.VehicleTrip
{
    public class VehicleTripResponseDTO
    {
        public int TripId { get; set; }

        public int VehicleId { get; set; }
        public string VehicleNumber { get; set; }

        public int FromCityId { get; set; }
        public string FromCity { get; set; }

        public int ToCityId { get; set; }
        public string ToCity { get; set; }

        public DateTime TripStartDateTime { get; set; }
        public DateTime TripEndDateTime { get; set; }

        public decimal DistanceKm { get; set; }
        public decimal FuelConsumedLtr { get; set; }

        public DateTime EntryDate { get; set; }
    }
}
