using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Masters.VehicleType
{
    public class VehicleTypeResponseDTO
    {
        public string vehicle_type_id { get; set; }
        public string vehicle_type_name { get; set; }
        public string vehicle_category { get; set; }
        public string? fuel_id { get; set; }
        public decimal? average_mileage_kmpl { get; set; }
        public string? description { get; set; }
        public bool IsActive { get; set; }
        public string? fuel_name { get; set; }

    }
}
