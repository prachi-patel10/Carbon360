using ProjectApp.Core.DTOs.Masters.SiteLocation;
using ProjectApp.Repository.Utilities.SP;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Repository.Interfaces.SiteLocation
{
    public interface ISiteLocationService
    {
        Task<string> Create(SiteLocationCreateUpdateDTO dto, int userId);
        Task Update(string encryptedId, SiteLocationCreateUpdateDTO dto, int userId);
        Task Delete(string encryptedId);
        Task ToggleStatus(string encryptedId, bool isActive);
        Task<SiteLocationResponseDTO?> GetById(string encryptedId);
        Task<List<SiteLocationResponseDTO>> GetAll();
        Task<PageResult> SearchAsync(SiteLocationSearchRequest request);


        Task<string?> GetSiteNameByIdAsync(int siteId);
        Task<List<object>> GetDepartments();
    }
}
