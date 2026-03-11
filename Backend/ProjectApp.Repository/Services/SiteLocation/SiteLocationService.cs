using Microsoft.Data.SqlClient;
using ProjectApp.Core.DTOs.Masters.SiteLocation;
using ProjectApp.Repository.Interfaces.Common;
using ProjectApp.Repository.Interfaces.SiteLocation;
using ProjectApp.Repository.Utilities.Auth;
using ProjectApp.Repository.Utilities.SP;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ProjectApp.Repository.Services.SiteLocation
{
    public class SiteLocationService : ISiteLocationService
    {
        private readonly ISPService _spService;
        private readonly IdEncoder _idEncoder;

        public SiteLocationService(ISPService spService, IdEncoder idEncoder)
        {
            _spService = spService;
            _idEncoder = idEncoder;
        }

        // ================= CREATE =================
        public async Task<string> Create(SiteLocationCreateUpdateDTO dto, int userId)
        {
            var parameters = new[]
            {
            new SqlParameter("@SiteName", dto.SiteName),
            new SqlParameter("@BuildingName", dto.BuildingName ?? (object)DBNull.Value),
            new SqlParameter("@City", dto.City ?? (object)DBNull.Value),
            new SqlParameter("@State", dto.State ?? (object)DBNull.Value),
            new SqlParameter("@ShortCode", dto.ShortCode),
            new SqlParameter("@EntryBy", userId)
        };

            var result = await _spService.ExecuteSpAsync(
                "USP_CB_CreateSiteLocation",
                parameters
            );

            var data = (result["Data"] as IEnumerable<object>)
                        ?.Cast<Dictionary<string, object>>()
                        ?.FirstOrDefault();

            if (data == null)
                throw new Exception("SiteLocation insert failed.");

            int newId = Convert.ToInt32(data["SiteId"]);
            return _idEncoder.Encode(newId);
        }

        // ================= UPDATE =================
        public async Task Update(string encryptedId, SiteLocationCreateUpdateDTO dto, int userId)
        {
            int id = _idEncoder.Decode(encryptedId);

            var parameters = new[]
            {
            new SqlParameter("@SiteId", id),
            new SqlParameter("@SiteName", dto.SiteName),
            new SqlParameter("@BuildingName", dto.BuildingName ?? (object)DBNull.Value),
            new SqlParameter("@City", dto.City ?? (object)DBNull.Value),
            new SqlParameter("@State", dto.State ?? (object)DBNull.Value),
            new SqlParameter("@ShortCode", dto.ShortCode),
            new SqlParameter("@UpdatedBy", userId)
        };

            await _spService.ExecuteSpAsync(
                "USP_CB_UpdateSiteLocation",
                parameters
            );
        }

        // ================= DELETE =================
        public async Task Delete(string encryptedId)
        {
            int id = _idEncoder.Decode(encryptedId);
            await _spService.ExecuteSpAsync(
                "USP_CB_DeleteSiteLocation",
                new SqlParameter("@SiteId", id)
            );
        }

        // ================= TOGGLE STATUS =================
        public async Task ToggleStatus(string encryptedId, bool isActive)
        {
            int id = _idEncoder.Decode(encryptedId);
            await _spService.ExecuteSpAsync(
                "USP_CB_SiteLocationUpdateStatus",
                new SqlParameter("@SiteId", id),
                new SqlParameter("@IsActive", isActive)
            );
        }

        // ================= GET BY ID =================
        public async Task<SiteLocationResponseDTO?> GetById(string encryptedId)
        {
            int id = _idEncoder.Decode(encryptedId);
            var result = await _spService.ExecuteSpAsync(
                "USP_CB_GetSiteLocationById",
                new SqlParameter("@SiteId", id)
            );

            var data = (result["Data"] as IEnumerable<object>)
                        ?.Cast<Dictionary<string, object>>()
                        ?.FirstOrDefault();

            return data == null ? null : MapToResponseDto(data);
        }

        // ================= GET ALL =================
        public async Task<List<SiteLocationResponseDTO>> GetAll()
        {
            var result = await _spService.ExecuteSpAsync("USP_CB_GetAllSiteLocations");

            var dataList = (result["Data"] as IEnumerable<object>)
                            ?.Cast<Dictionary<string, object>>()
                            ?.ToList()
                            ?? new List<Dictionary<string, object>>();

            return dataList.Select(MapToResponseDto).ToList();
        }

        // ================= SEARCH =================
        public async Task<PageResult> SearchAsync(SiteLocationSearchRequest request)
        {
            var parameters = new[]
            {
            new SqlParameter("@Search", request.Search ?? (object)DBNull.Value),
            //new SqlParameter("@FilterColumn", request.FilterColumn ?? (object)DBNull.Value),
            //new SqlParameter("@FilterValue", request.FilterValue ?? (object)DBNull.Value),
            new SqlParameter("@IsActive", request.IsActive ?? (object)DBNull.Value),
            new SqlParameter("@PageNumber", request.PageNumber),
            new SqlParameter("@PageSize", request.PageSize),
            new SqlParameter("@SortColumn", request.SortColumn),
            new SqlParameter("@SortDirection", request.SortDirection)
        };

            var result = await _spService.ExecuteSpAsync("USP_CB_SearchSiteLocation", parameters);

            var dataList = (result["Data"] as IEnumerable<object>)
                            ?.Cast<Dictionary<string, object>>()
                            ?.ToList()
                            ?? new List<Dictionary<string, object>>();

            var sites = dataList.Select(MapToResponseDto).ToList();

            int totalRecords = dataList.Any()
                ? Convert.ToInt32(dataList.First()["TotalRecords"])
                : 0;

            return new PageResult
            {
                Data = sites,
                TotalRecords = totalRecords,
                TotalPages = (int)Math.Ceiling((double)totalRecords / request.PageSize),
                CurrentPage = request.PageNumber
            };
        }

        // ================= MAPPING =================
        private SiteLocationResponseDTO MapToResponseDto(Dictionary<string, object> row)
        {
            int GetInt(string key) =>
                row.ContainsKey(key) && row[key] != DBNull.Value
                ? Convert.ToInt32(row[key])
                : 0;

            string GetString(string key)
            {
                var foundKey = row.Keys.FirstOrDefault(k => string.Equals(k, key, StringComparison.OrdinalIgnoreCase));
                return foundKey != null && row[foundKey] != DBNull.Value
                       ? row[foundKey].ToString()!
                       : "N/A";
            }

            bool GetBool(string key) =>
                row.ContainsKey(key) && row[key] != DBNull.Value
                && Convert.ToBoolean(row[key]);

<<<<<<< Updated upstream
=======
            int siteId = GetInt("SiteId");
            int departmentId = GetInt("DepartmentId");

>>>>>>> Stashed changes
            return new SiteLocationResponseDTO
            {
                Id = siteId,   // ADD THIS LINE
                SiteId = _idEncoder.Encode(siteId),
                SiteName = GetString("SiteName"),
                BuildingName = GetString("BuildingName"),
                City = GetString("City"),
                State = GetString("State"),
                ShortCode = GetString("ShortCode"),
<<<<<<< Updated upstream
                IsActive = GetBool("IsActive")
            };
        }
=======
                DepartmentId = departmentId > 0
                                ? _idEncoder.Encode(departmentId)
                                : null,
                DepartmentName = GetString("DepartmentName"),
                IsActive = GetBool("IsActive")
            };
        }
        public async Task<string?> GetSiteNameByIdAsync(int siteId)
        {
            var result = await _spService.ExecuteSpAsync(
                "USP_CB_GetSiteNameById",
                new SqlParameter("@SiteId", siteId)
            );

            var data = (result["Data"] as IEnumerable<object>)
                        ?.Cast<Dictionary<string, object>>()
                        ?.FirstOrDefault();

            if (data != null && data.ContainsKey("SiteName") && data["SiteName"] != DBNull.Value)
                return data["SiteName"].ToString();

            return null;
        }
        public async Task<List<object>> GetDepartments()
        {
            var result = await _spService.ExecuteSpAsync("USP_CB_DepartmentGetAll");

            var dataList = (result["Data"] as IEnumerable<object>)
                ?.Cast<Dictionary<string, object>>()
                ?.Select(x => new
                {
                    departmentId = Convert.ToInt32(x["DepartmentId"]),
                    departmentName = x["DepartmentName"].ToString()
                })
                .ToList<object>()
                ?? new List<object>();

            return dataList;
        }

>>>>>>> Stashed changes
    }
}