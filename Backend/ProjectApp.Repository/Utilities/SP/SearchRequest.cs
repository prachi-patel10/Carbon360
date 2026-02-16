using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Repository.Utilities.SP
{
    public class SearchRequest
    {
        public string? Search { get; set; }
        public bool? IsActive { get; set; }

        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;

        public string SortColumn { get; set; } = "sectionName";
        public string SortDirection { get; set; } = "ASC";
    }
}
