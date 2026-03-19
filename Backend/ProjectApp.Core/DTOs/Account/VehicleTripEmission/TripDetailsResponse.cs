using ProjectApp.Core.DTOs.Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Account.VehicleTripEmission
{
    public class TripDetailsResponse
    {
        public ResponseVehicleTripEmissionDTO Trip { get; set; }

        public List<WorkflowActionDTO> Actions { get; set; }

        public List<VehicleTripHistoryDTO> History { get; set; }
    }
}
