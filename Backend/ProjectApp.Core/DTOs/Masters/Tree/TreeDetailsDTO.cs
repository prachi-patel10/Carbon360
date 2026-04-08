using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Masters.Tree
{
    public class TreeDetailsDTO
    {
        public string TreeId { get; set; }
        public string TreeName { get; set; }
        public decimal Co2PerTree { get; set; }
        public int TreeCount { get; set; }
        public decimal TotalCo2 { get; set; }
    }
}
