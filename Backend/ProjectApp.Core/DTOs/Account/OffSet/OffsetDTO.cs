using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Account.OffSet
{
    public class TreeDto
    {
        public int TreeId { get; set; }
        public int TreeCount { get; set; }
    }

    public class OffsetEntryDto
    {
        public int ProjectId { get; set; }
        public int? EntryBy { get; set; }

        public List<TreeDto> Trees { get; set; }
    }
}
