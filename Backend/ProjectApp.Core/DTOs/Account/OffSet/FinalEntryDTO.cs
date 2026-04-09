using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Account.OffSet
{
    public class FinalEntryDTO
    {
        public string ProjectId { get; set; }   // encoded
        public int EntryBy { get; set; }

        public List<TreeItemDto> Trees { get; set; }
    }
}
