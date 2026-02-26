using ProjectApp.Core.DTOs.Masters.City;
using ProjectApp.Repository.Utilities.SP;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Repository.Interfaces.Masters.City
{
    public interface ICityService
    {
        Task<List<CityResponseDTO>> GetAllCitiesAsync();
        //Task<CityResponseDTO> GetCityByIdAsync(string encryptedId);
        Task<CityResponseDTO> CreateCityAsync(CityCreateDTO dto);
        Task<bool> UpdateCityAsync(CityUpdateDTO dto);

        // 🔥 ADD THESE
        Task<PageResult> SearchCitiesAsync(SearchRequest request);
        Task<bool> ToggleStatusAsync(string encryptedId);

        Task<bool> DeleteCityAsync(string encryptedId);
        //Task<bool> DeleteCityAsync(string encryptedId);
    }
}
