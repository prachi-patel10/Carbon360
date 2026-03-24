using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Masters.VehicleType
{
    public class VehicleTypeSearchDTO
    {
        public string? Search { get; set; }
        public bool? IsActive { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;
        public string SortColumn { get; set; } = "vehicle_type_name";
        public string SortDirection { get; set; } = "ASC";

        // VehicleType specific
        public string? CategoryIds { get; set; }  
        public string? VehicleNames { get; set; }  
    }
}
