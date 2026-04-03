using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Account.OffSet
{
    public class AbsorptionEntrySearchDTO
    {
        public int? ProjectId { get; set; }
        public string FinancialYear { get; set; }
        public string Search { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "PageNumber must be >= 1")]
        public int PageNumber { get; set; } = 1;

        [Range(1, 100, ErrorMessage = "PageSize must be between 1 and 100")]
        public int PageSize { get; set; } = 10;

        public string SortColumn { get; set; } = "TreeName";
        public string SortDirection { get; set; } = "ASC";

        public int TotalRecords { get; set; }
        public List<AbsorptionEntryDTO> Data { get; set; }
    }
}
