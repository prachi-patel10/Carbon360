using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Masters.Generator
{
    public class GeneratorToggleStatusDTO
    {
        public string GeneratorId { get; set; }   // Encrypted ID
        public bool IsActive { get; set; }
    }
}
