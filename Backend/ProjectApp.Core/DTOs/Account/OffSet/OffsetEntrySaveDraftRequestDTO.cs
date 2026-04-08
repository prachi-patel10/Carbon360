using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Account.OffSet
{
    public class OffsetEntrySaveDraftRequestDTO
    {
        public int ProjectId { get; set; }
        public string EntryBy { get; set; }

        public List<TreeItemDto> Trees { get; set; }

    }
    public class TreeItemDto
    {
        public int TreeId { get; set; }
        public int TreeCount { get; set; }
    }
}
