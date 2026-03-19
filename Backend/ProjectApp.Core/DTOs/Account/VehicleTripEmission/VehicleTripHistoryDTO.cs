using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Account.VehicleTripEmission
{
    public class VehicleTripHistoryDTO
    {
        public string Status { get; set; }
        public string ActionName { get; set; }
        public string ActionByRole { get; set; }
        public string EntryByUser { get; set; }
        public DateTime ActionDate { get; set; }
    }
}
