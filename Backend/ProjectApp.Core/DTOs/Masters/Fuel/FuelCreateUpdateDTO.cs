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
        public string? fuel_Desc { get; set; }

        public bool IsActive { get; set; }

        public bool isapplicable { get; set; }
    }
}
