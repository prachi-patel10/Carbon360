using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Account.OffSet
{
    public class AbsorptionEntryInsertDTO
    {
        [Required(ErrorMessage = "ProjectId is required")]
        public int ProjectId { get; set; }

        [Required(ErrorMessage = "TreeId is required")]
        public int TreeId { get; set; }

        [Required(ErrorMessage = "TreeCount is required")]
        [Range(1, int.MaxValue, ErrorMessage = "TreeCount must be greater than zero")]
        public int TreeCount { get; set; }

        public bool IsActive { get; set; } = true;
        public int? EntryBy { get; set; }
    }
}
