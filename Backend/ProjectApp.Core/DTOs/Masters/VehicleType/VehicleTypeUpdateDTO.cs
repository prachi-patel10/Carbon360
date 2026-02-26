using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Masters.VehicleType
{
    public class VehicleTypeUpdateDTO
    {
        public string vehicle_type_id { get; set; }
        public string vehicle_type_name { get; set; }
        public int CategoryId { get; set; }
        public string? description { get; set; }
    }
}
