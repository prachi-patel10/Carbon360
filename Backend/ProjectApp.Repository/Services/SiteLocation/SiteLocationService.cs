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
                new SqlParameter("@SiteName",     dto.SiteName),     
                new SqlParameter("@City",         dto.City        ?? (object)DBNull.Value),
                new SqlParameter("@State",        dto.State       ?? (object)DBNull.Value),
                new SqlParameter("@ShortCode",    dto.ShortCode),
                new SqlParameter("@EntryBy",      userId)
            };

            var result = await _spService.ExecuteSpAsync("USP_CB_CreateSiteLocation", parameters);

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
                new SqlParameter("@SiteId",       id),
                new SqlParameter("@SiteName",     dto.SiteName),      
                new SqlParameter("@City",         dto.City        ?? (object)DBNull.Value),
                new SqlParameter("@State",        dto.State       ?? (object)DBNull.Value),
                new SqlParameter("@ShortCode",    dto.ShortCode),
                new SqlParameter("@UpdatedBy",    userId)
            };

            await _spService.ExecuteSpAsync("USP_CB_UpdateSiteLocation", parameters);
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
        new SqlParameter("@Search",
            string.IsNullOrWhiteSpace(request.Search)
                ? (object)DBNull.Value : request.Search),

        new SqlParameter("@IsActive",
            request.IsActive.HasValue
                ? (object)request.IsActive.Value : DBNull.Value),

        new SqlParameter("@PageNumber",    request.PageNumber),
        new SqlParameter("@PageSize",      request.PageSize),
        new SqlParameter("@SortColumn",    request.SortColumn),
        new SqlParameter("@SortDirection", request.SortDirection),

        // ✅ ADDED: SiteNames filter
        new SqlParameter("@SiteNames",
            string.IsNullOrWhiteSpace(request.SiteNames)
                ? (object)DBNull.Value : request.SiteNames),

        new SqlParameter("@Cities",
            string.IsNullOrWhiteSpace(request.Cities)
                ? (object)DBNull.Value : request.Cities),

        new SqlParameter("@States",
            string.IsNullOrWhiteSpace(request.States)
                ? (object)DBNull.Value : request.States),
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
                    ? Convert.ToInt32(row[key]) : 0;

            string GetString(string key)
            {
                var foundKey = row.Keys.FirstOrDefault(
                    k => string.Equals(k, key, StringComparison.OrdinalIgnoreCase));
                return foundKey != null && row[foundKey] != DBNull.Value
                    ? row[foundKey].ToString()! : "N/A";
            }

            bool GetBool(string key) =>
                row.ContainsKey(key) && row[key] != DBNull.Value
                && Convert.ToBoolean(row[key]);

            int siteId = GetInt("SiteId");

            return new SiteLocationResponseDTO
            {
                Id = siteId,
                SiteId = _idEncoder.Encode(siteId),
                SiteName = GetString("SiteName"),
                City = GetString("City"),
                State = GetString("State"),
                ShortCode = GetString("ShortCode"),
                IsActive = GetBool("IsActive")
            };
        }

        // ================= GET SITE NAME BY ID =================
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

        // ================= GET DEPARTMENTS =================
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
    }
}