using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Masters.Vehicle
{
    public class VehicleStatusDto
    {
        public string vehicle_id { get; set; }   // encrypted
        public bool IsActive { get; set; }
    }
}
