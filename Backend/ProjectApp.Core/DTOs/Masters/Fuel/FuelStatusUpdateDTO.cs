using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Masters.Fuel
{
    public class FuelStatusUpdateDTO
    {
        public int fuel_id { get; set; }

        public bool IsActive { get; set; }
    }
}
