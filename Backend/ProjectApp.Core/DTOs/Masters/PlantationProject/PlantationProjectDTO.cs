using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Masters.PlantationProject
{
    public class PlantationProjectDTO
    {
        public string ProjectId { get; set; }
        public string NgoId { get; set; }
        public string ProjectName { get; set; }
        public string Address { get; set; }
        public int? CityId { get; set; }

        public string NgoName { get; set; }
        public string CityName { get; set; }
    }
}
}
