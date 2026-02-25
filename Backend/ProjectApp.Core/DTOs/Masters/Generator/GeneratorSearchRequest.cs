using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Masters.Generator
{
    public class GeneratorSearchRequest
    {
        public string? Search { get; set; }
        public string? FilterColumn { get; set; }
        public string? FilterValue { get; set; }
        public bool? IsActive { get; set; }

        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;

        public string SortColumn { get; set; } = "GeneratorName";
        public string SortDirection { get; set; } = "ASC";
    }
}
