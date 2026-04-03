using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Masters.Tree
{
    public class TreeMasterStatusUpdateDTO
    {
        public string TreeId { get; set; }
        public bool IsActive { get; set; }
    }
}
