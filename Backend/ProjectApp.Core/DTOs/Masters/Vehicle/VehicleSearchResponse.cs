using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Masters.Vehicle
{
    public class VehicleSearchResponse
    {
        public List<VehicleResponseDto> Data { get; set; } = new List<VehicleResponseDto>();
        public int TotalRecords { get; set; }
        public int TotalPages { get; set; }
        public int CurrentPage { get; set; }
    }
}
