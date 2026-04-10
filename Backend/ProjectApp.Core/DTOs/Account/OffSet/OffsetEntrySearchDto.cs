using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Account.OffSet
{
    public class OffsetEntrySearchDto
    {
        public int OffsetEntryId { get; set; }
        public string ProjectName { get; set; }
        public int? FinancialYear { get; set; }
        public decimal? PreviousYearEmission { get; set; }
        public decimal? TotalOffset { get; set; }
        public decimal? RemainingEmission { get; set; }
        public string Status { get; set; }
        public string EntryBy { get; set; }
        public DateTime? EntryDate { get; set; }
    }
}
