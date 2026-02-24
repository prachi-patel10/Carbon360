using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Masters.Fuel
{
    public class FuelCreateUpdateDTO
    {
        public string? fuel_id { get; set; }

        [Required]
        public string fuel_name { get; set; }

        [Required]
        public decimal co2_factor { get; set; }

        [Required]
        public decimal nox_factor { get; set; }

        [Required]
        public decimal ch4_factor { get; set; }

        public bool IsActive { get; set; }
    }
}
