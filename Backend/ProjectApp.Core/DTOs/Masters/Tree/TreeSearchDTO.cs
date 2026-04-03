using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Masters.Tree
{
    public class TreeSearchDTO
    {
        public string? Search { get; set; }
        public bool? IsActive { get; set; }

        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;

        public string SortColumn { get; set; } = "TreeName";
        public string SortDirection { get; set; } = "ASC";
    }
}
