using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Masters.Vehicle
{
    public class VehicleResponseDto
    {
        public string vehicle_id { get; set; } = string.Empty;
        public string? vehicle_number { get; set; }

        public string? vehicle_type_name { get; set; }
        public string? fuel_name { get; set; }
        public string? department_name { get; set; }

        public int? engine_capacity { get; set; }
        public string? emission_standard { get; set; }
        public bool IsActive { get; set; }
    }
}
