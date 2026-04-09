using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Account.OffSet
{
    public class TreeItemDto
    {
        public string TreeId { get; set; }
        public int TreeCount { get; set; }
    }

    public class OffsetEntryDto
    {
        public int OffsetEntryId { get; set; }
        public string ProjectId { get; set; } 
        //public int? EntryBy { get; set; }
        public string FinancialYear { get; set; }
        public List<TreeItemDto> Trees { get; set; }
      
    }
}
