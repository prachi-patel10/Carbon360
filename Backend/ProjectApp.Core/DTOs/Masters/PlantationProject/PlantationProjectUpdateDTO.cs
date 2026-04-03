using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Masters.PlantationProject
{
    public class PlantationProjectUpdateDTO
    {
        public string? ProjectId { get; set; }
        public string ProjectName { get; set; }
        public int FinancialYear { get; set; }
    }
}
