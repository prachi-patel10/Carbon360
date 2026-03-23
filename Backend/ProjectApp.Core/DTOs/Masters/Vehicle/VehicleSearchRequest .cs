using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
namespace ProjectApp.Core.DTOs.Masters.Vehicle
{
    public class VehicleSearchRequest 
    {
        public string? Search { get; set; }
        public bool? IsActive { get; set; }

        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;

        public string SortColumn { get; set; } = "vehicle_number";
        public string SortDirection { get; set; } = "ASC";

        public string? vehicle_type_id { get; set; }
        public string? fuel_id { get; set; }
        public string? department_id { get; set; }
    }
}
