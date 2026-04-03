using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Masters.PlantationProject
{
    public class PlantationProjectDTO
    {
        public string ProjectId { get; set; }
        public string ProjectName { get; set; }
        public int FinancialYear { get; set; }
        //[NotMapped]
        public string FinancialYearDisplay { get; set; } // "2025-2026"

        public int? EntryBy { get; set; }
        public DateTime? EntryDate { get; set; }
        public int? UpdateBy { get; set; }
        public DateTime? UpdateDate { get; set; }
        public bool? IsActive { get; set; }
    }
}
