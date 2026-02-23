using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Masters.VehicleType
{
    public class VehicleTypeDTO
    {
        public int vehicle_type_id { get; set; }

        public string vehicle_type_name { get; set; }

        public string vehicle_category { get; set; }

        public int? fuel_id { get; set; }

        public decimal? average_mileage_kmpl { get; set; }

        public string? description { get; set; }

        public bool IsActive { get; set; }

        public int EntryBy { get; set; }

        public DateTime EntryDate { get; set; }

        public int? UpdatedBy { get; set; }

        public DateTime? UpdateDate { get; set; }

        public bool IsDeleted { get; set; }
    }
}
