using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Masters.PlantationProject
{
    public class PlantationProjectSearchDTO
    {
        public string SearchText { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;
        public string SortColumn { get; set; } = "ProjectId";
        public string SortDirection { get; set; } = "DESC";
    }
}
