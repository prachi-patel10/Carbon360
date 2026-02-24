using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Masters.Vehicle
{
    public class VehicleUpdateDto
    {
        public string vehicle_id { get; set; }   // encrypted
        public string vehicle_number { get; set; }
        public int vehicle_type_id { get; set; }
        public int fuel_id { get; set; }
        public int department_id { get; set; }
        public int? engine_capacity { get; set; }
        public string emission_standard { get; set; }
        public bool IsActive { get; set; }
    }
}
