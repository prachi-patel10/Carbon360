using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Masters.Tree
{
    public class TreeResponseDTO
    {
        public string TreeId { get; set; }
        public string TreeName { get; set; }
        public decimal Co2AbsorptionPerYear { get; set; }
        public decimal Co2AbsorptionPerMonth { get; set; }  
        public decimal Co2AbsorptionPerDaily { get; set; }
        public bool IsActive { get; set; }

    }
}
