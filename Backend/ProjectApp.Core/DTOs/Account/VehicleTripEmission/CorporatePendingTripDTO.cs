using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Account.VehicleTripEmission
{
    public class CorporatePendingTripDTO
    {
        public string TripId { get; set; }
        public string ReportId { get; set; }
        public string VehicleId { get; set; }
        public DateTime EntryDate { get; set; }
        public int StatusId { get; set; }
        public int BlinkFlag { get; set; }
    }
}
