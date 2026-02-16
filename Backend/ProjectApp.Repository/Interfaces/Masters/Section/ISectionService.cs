using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using ProjectApp.Core.DTOs.Masters.Section;
using ProjectApp.Core.Entities;
using ProjectApp.Repository.Utilities.SP;

namespace ProjectApp.Repository.Interfaces.Masters.Section
{
    public interface ISectionService
    {
        Task<bool> CreateAsync(SectionDTO data, int loggedInUserId);
        Task<bool> UpdateAsync(int sectionId, SectionDTO data, int loggedInUserId);
        Task<bool> DeleteAsync(int sectionId, int loggedInUserId);


        Task<SectionUpdateDTO> GetSectionByIdAsync(int Id);
        Task<bool> UpdateSectionStatusAsync(int sectionId, int loggedInUserId);
        Task<List<SectionViewDTO>> GetSectionByEntryUserId(int userId);
        Task<Sections> GetSectionById(int Id, bool isNoTracking = false);
        Task<Dictionary<string, object>> GetSectionSearch(SearchRequest req);
    }

}
