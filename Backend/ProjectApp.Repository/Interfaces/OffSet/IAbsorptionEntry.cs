using ProjectApp.Core.DTOs.Account.OffSet;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Repository.Interfaces.OffSet
{
    public interface IAbsorptionEntry
    {
        //Task<AbsorptionEntrySearchDTO> SearchAsync(AbsorptionEntrySearchDTO request);


        Task<ServiceResponse<AbsorptionEntryDTO>> InsertAsync(AbsorptionEntryInsertDTO request);
    }
}
