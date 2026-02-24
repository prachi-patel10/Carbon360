using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Masters.VehicleType
{
    public class VehicleTypeStatusUpdateDTO
    {
        public string vehicle_type_id { get; set; }
        public bool IsActive { get; set; }
    }
}
