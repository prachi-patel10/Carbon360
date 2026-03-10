using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using ProjectApp.Core.DTOs.Masters.SiteLocation;
using ProjectApp.Repository.Interfaces.Common;
using ProjectApp.Repository.Interfaces.SiteLocation;
using ProjectApp.Repository.Services.Common;
using ProjectApp.Repository.Utilities.Auth;
using ProjectApp.Repository.Utilities.SP;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
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
            int departmentId = int.Parse(dto.DepartmentId);

            // Check if ShortCode is unique
            var existing = await _spService.ExecuteSpAsync("SELECT COUNT(*) AS Count FROM CB_MasterSiteLocation WHERE ShortCode = @ShortCode AND IsDeleted = 0",
                new SqlParameter("@ShortCode", dto.ShortCode));

            if (Convert.ToInt32(((IEnumerable<Dictionary<string, object>>)existing["Data"]).First()["Count"]) > 0)
                throw new Exception("ShortCode already exists. Please use a different one.");

            var parameters = new[]
            {
                new SqlParameter("@SiteName", dto.SiteName),
                new SqlParameter("@BuildingName", dto.BuildingName ?? (object)DBNull.Value),
                new SqlParameter("@City", dto.City ?? (object)DBNull.Value),
                new SqlParameter("@State", dto.State ?? (object)DBNull.Value),
                new SqlParameter("@DepartmentId", departmentId),
                new SqlParameter("@EntryBy", userId),
                new SqlParameter("@ShortCode", dto.ShortCode)
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
            int departmentId = int.Parse(dto.DepartmentId);

            // Check if ShortCode is unique for other records
            var existing = await _spService.ExecuteSpAsync(
                "SELECT COUNT(*) AS Count FROM CB_MasterSiteLocation WHERE ShortCode = @ShortCode AND SiteId != @SiteId AND IsDeleted = 0",
                new SqlParameter("@ShortCode", dto.ShortCode),
                new SqlParameter("@SiteId", id));

            if (Convert.ToInt32(((IEnumerable<Dictionary<string, object>>)existing["Data"]).First()["Count"]) > 0)
                throw new Exception("ShortCode already exists. Please use a different one.");

            var parameters = new[]
            {
                new SqlParameter("@SiteId", id),
                new SqlParameter("@SiteName", dto.SiteName),
                new SqlParameter("@BuildingName", dto.BuildingName ?? (object)DBNull.Value),
                new SqlParameter("@City", dto.City ?? (object)DBNull.Value),
                new SqlParameter("@State", dto.State ?? (object)DBNull.Value),
                new SqlParameter("@DepartmentId", departmentId),
                new SqlParameter("@UpdatedBy", userId),
                new SqlParameter("@ShortCode", dto.ShortCode)
            };

            await _spService.ExecuteSpAsync("USP_CB_UpdateSiteLocation", parameters);
        }

        // ================= DELETE (Soft Delete) =================
        public async Task Delete(string encryptedId)
        {
            int id = _idEncoder.Decode(encryptedId);
            await _spService.ExecuteSpAsync("USP_CB_DeleteSiteLocation",
                new SqlParameter("@SiteId", id));
        }

        // ================= PATCH: Active / Inactive =================
        public async Task ToggleStatus(string siteId, bool isActive)
        {
            int id = _idEncoder.Decode(siteId);
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
            var result = await _spService.ExecuteSpAsync("USP_CB_GetSiteLocationById",
                new SqlParameter("@SiteId", id));

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
        new SqlParameter("@FilterColumn", request.FilterColumn ?? (object)DBNull.Value),
        new SqlParameter("@FilterValue", request.FilterValue ?? (object)DBNull.Value),
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

        //Mapping
        private SiteLocationResponseDTO MapToResponseDto(Dictionary<string, object> row)
        {
            int GetInt(string key) =>
                row.ContainsKey(key) && row[key] != DBNull.Value
                ? Convert.ToInt32(row[key])
                : 0;

            string GetString(string key) =>
                row.ContainsKey(key) && row[key] != DBNull.Value
                ? row[key].ToString()!
                : "N/A";

            bool GetBool(string key) =>
                row.ContainsKey(key) && row[key] != DBNull.Value
                && Convert.ToBoolean(row[key]);

            int departmentId = GetInt("DepartmentId");

            return new SiteLocationResponseDTO
            {
                SiteId = _idEncoder.Encode(GetInt("SiteId")),
                SiteName = GetString("SiteName"),
                BuildingName = GetString("BuildingName"),
                City = GetString("City"),
                State = GetString("State"),
                ShortCode = GetString("ShortCode"),  // Added
                DepartmentId = departmentId > 0
                                ? _idEncoder.Encode(departmentId)
                                : null,
                DepartmentName = GetString("DepartmentName"),
                IsActive = GetBool("IsActive")
            };
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

    }
}
