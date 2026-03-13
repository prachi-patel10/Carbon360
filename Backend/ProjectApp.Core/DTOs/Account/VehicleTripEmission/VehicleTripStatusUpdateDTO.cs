using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Account.VehicleTripEmission
{
    public class VehicleTripStatusUpdateDTO
    {
        public string TripId { get; set; }
        public int WorkflowId { get; set; }
        public int UserId { get; set; }
    }
}

