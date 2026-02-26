using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Masters.Fuel
{
    public class FuelTypeSearchDTO
    {
        public string? fuel_id { get; set; }

     
        public string? fuel_name { get; set; }
        public string? fuel_Desc { get; set; }
        public bool? IsActive { get; set; }
        public bool? IsApplicable { get; set; }

        
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;

        public string SortColumn { get; set; } = "fuel_name";
        public string SortDirection { get; set; } = "ASC";
    }
}
