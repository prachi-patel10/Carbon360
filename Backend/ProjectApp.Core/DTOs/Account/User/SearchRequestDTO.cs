using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Account.User
{
    public class SearchRequestDTO
    {
        public string? Search { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;
        public string? SortColumn { get; set; }
        public string? SortDirection { get; set; } = "asc";
        public bool? IsActive { get; set; }
        public string? DepartmentIds { get; set; }  // ← NEW e.g. "1,3"
        public string? RoleIds { get; set; }  // ← NEW e.g. "2,4"
    }
}
