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

        //Task<object> SearchAsync(
        //    int? projectId,
        //    string financialYear,
        //    int pageNumber,
        //    int pageSize,
        //    string search,
        //    string sortColumn,
        //    string sortDirection);
        //Task<ServiceResponse<AbsorptionEntryDTO>> InsertAsync(AbsorptionEntryInsertDTO request);



        Task<OffsetEntrySaveDraftResponseDTO> SaveDraftAsync(OffsetEntrySaveDraftRequestDTO request);

        Task<int> InsertOffsetEntry(OffsetEntryDto model);
        Task<object> GetAll(
    int pageNumber,
    int pageSize,
    string search,
    int? projectId,
    int? financialYear
);
        Task<object> GetById(int offsetEntryId);
        Task<bool> Delete(int offsetEntryId);
    }
}
