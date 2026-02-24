using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Masters.Fuel
{
    public class FuelResponseDTO
    {
        public string fuel_id { get; set; }

        public string fuel_name { get; set; }

        public decimal co2_factor { get; set; }

        public decimal nox_factor { get; set; }

        public decimal ch4_factor { get; set; }

        public bool IsActive { get; set; }
    }
}
