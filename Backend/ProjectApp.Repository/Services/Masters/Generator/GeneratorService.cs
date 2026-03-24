using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using ProjectApp.Core.DTOs.Account.GeneratorOperation;
using ProjectApp.Core.DTOs.Masters.Generator;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.Common;
using ProjectApp.Repository.Interfaces.Masters.Generator;
using ProjectApp.Repository.Utilities.Auth;
using ProjectApp.Repository.Utilities.SP;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory.Database;

namespace ProjectApp.Repository.Services.Masters.Generator
{
    public class GeneratorService : IGeneratorService
    {
        private readonly ISPService _spService;
        private readonly IdEncoder _idEncoder;

        public GeneratorService(
            ISPService spService,
            IdEncoder idEncoder)
        {
            _spService = spService;
            _idEncoder = idEncoder;
        }

        // ================= CREATE =================
        public async Task<string> Create(GeneratorCreateUpdateDTO dto, int userId)
        {
            // Decode FK IDs before passing to SP
            var parameters = new[]
            {
        new SqlParameter("@GeneratorName", dto.GeneratorName),
        new SqlParameter("@RatedCapacityKW", dto.RatedCapacityKW),
        new SqlParameter("@FuelId", _idEncoder.Decode(dto.FuelId)),
        new SqlParameter("@SiteId", _idEncoder.Decode(dto.SiteId)),
        new SqlParameter("@DepartmentId", _idEncoder.Decode(dto.DepartmentId)),
        new SqlParameter("@EntryBy", userId)
    };

            var result = await _spService.ExecuteSpAsync(
                "USP_CB_CreateGenerator",
                parameters
            );

            var data = (result["Data"] as IEnumerable<object>)
                        ?.Cast<Dictionary<string, object>>()
                        ?.FirstOrDefault();

            if (data == null)
                throw new Exception("Generator insert failed.");

            int newId = Convert.ToInt32(data["GeneratorId"]);

            // Return encoded ID
            return _idEncoder.Encode(newId);
        }

        // ================= UPDATE =================
        public async Task Update(GeneratorCreateUpdateDTO dto, int userId)
        {
            if (string.IsNullOrEmpty(dto.GeneratorId))
                throw new Exception("GeneratorId is required for update.");

            int generatorId = _idEncoder.Decode(dto.GeneratorId);

            var parameters = new[]
            {
        new SqlParameter("@GeneratorId", generatorId),
        new SqlParameter("@GeneratorName", dto.GeneratorName),
        new SqlParameter("@RatedCapacityKW", dto.RatedCapacityKW),
        new SqlParameter("@FuelId", _idEncoder.Decode(dto.FuelId)),
        new SqlParameter("@SiteId", _idEncoder.Decode(dto.SiteId)),
        new SqlParameter("@DepartmentId", _idEncoder.Decode(dto.DepartmentId)),
        new SqlParameter("@UpdatedBy", userId)
    };

            await _spService.ExecuteSpAsync(
                "USP_CB_UpdateGenerator",
                parameters
            );
        }

        // ================= DELETE =================
        public async Task Delete(string encryptedId)
        {
            int id = _idEncoder.Decode(encryptedId);

            await _spService.ExecuteSpAsync(
                "USP_CB_DeleteGenerator",
                new SqlParameter("@GeneratorId", id)
            );
        }

        // ================= GET BY ID =================
        public async Task<GeneratorResponseDTO?> GetById(string encryptedId)
        {
            int id = _idEncoder.Decode(encryptedId);

            var result = await _spService.ExecuteSpAsync(
                "USP_CB_GetGeneratorById",
                new SqlParameter("@GeneratorId", id)
            );

            var data = (result["Data"] as IEnumerable<object>)
                        ?.Cast<Dictionary<string, object>>()
                        ?.FirstOrDefault();

            return data == null ? null : MapToResponseDto(data);
        }

        // ================= GET ALL =================
        public async Task<List<GeneratorResponseDTO>> GetAll()
        {
            var result = await _spService.ExecuteSpAsync(
                "USP_CB_GetAllGenerators"
            );

            var dataList = (result["Data"] as IEnumerable<object>)
                            ?.Cast<Dictionary<string, object>>()
                            ?.ToList()
                            ?? new List<Dictionary<string, object>>();

            return dataList.Select(MapToResponseDto).ToList();
        }

        // ================= SEARCH =================
        public async Task<PageResult> SearchAsync(GeneratorSearchRequest request)
        {
            var parameters = new[]
            {
        new SqlParameter("@Search", request.Search ?? (object)DBNull.Value),
        new SqlParameter("@FilterColumn", request.FilterColumn ?? (object)DBNull.Value),
        new SqlParameter("@FilterValue", request.FilterValue ?? (object)DBNull.Value),
        new SqlParameter("@IsActive", request.IsActive ?? (object)DBNull.Value),
        new SqlParameter("@FuelIds",
    string.IsNullOrWhiteSpace(request.FuelIds)
        ? (object)DBNull.Value : request.FuelIds),

new SqlParameter("@SiteIds",
    string.IsNullOrWhiteSpace(request.SiteIds)
        ? (object)DBNull.Value : request.SiteIds),
        new SqlParameter("@PageNumber", request.PageNumber),
        new SqlParameter("@PageSize", request.PageSize),
        new SqlParameter("@SortColumn", request.SortColumn),
        new SqlParameter("@SortDirection", request.SortDirection)
    };

            var result = await _spService.ExecuteSpAsync(
                "USP_CB_SearchGenerator",
                parameters
            );

            var dataList = (result["Data"] as IEnumerable<object>)
                            ?.Cast<Dictionary<string, object>>()
                            ?.ToList()
                            ?? new List<Dictionary<string, object>>();

            var generators = dataList.Select(MapToResponseDto).ToList();

            int totalRecords = dataList.Any()
                ? Convert.ToInt32(dataList.First()["TotalRecords"])
                : 0;

            return new PageResult
            {
                Data = generators,
                TotalRecords = totalRecords,
                TotalPages = (int)Math.Ceiling((double)totalRecords / request.PageSize),
                CurrentPage = request.PageNumber
            };
        }

        // ================= TOGGLE STATUS =================
        public async Task ToggleStatus(string encryptedId, bool isActive)
        {
            int id = _idEncoder.Decode(encryptedId);

            await _spService.ExecuteSpAsync(
                "USP_CB_GeneratorUpdateStatus",
                new SqlParameter("@GeneratorId", id),
                new SqlParameter("@IsActive", isActive)
            );
        }

        // ================= MAPPING =================
        private GeneratorResponseDTO MapToResponseDto(Dictionary<string, object> row)
        {
            int GetInt(string key)
                => row.ContainsKey(key) && row[key] != DBNull.Value
                    ? Convert.ToInt32(row[key])
                    : 0;

            string? GetString(string key)
                => row.ContainsKey(key) && row[key] != DBNull.Value
                    ? row[key].ToString()
                    : "N/A";

            bool GetBool(string key)
                => row.ContainsKey(key) && row[key] != DBNull.Value
                    && Convert.ToBoolean(row[key]);

            return new GeneratorResponseDTO
            {
                GeneratorId = _idEncoder.Encode(GetInt("GeneratorId")),
                GeneratorName = GetString("GeneratorName"),
                RatedCapacityKW = GetInt("RatedCapacityKW"),
                FuelName = GetString("FuelName"),
                SiteName = GetString("SiteName"),
                DepartmentName = GetString("DepartmentName"),
                IsActive = GetBool("IsActive")
            };
        }

        public async Task<List<GeneratorResponseDTO>> GetBySiteIdAsync(string encryptedSiteId)
        {
            if (string.IsNullOrWhiteSpace(encryptedSiteId))
                throw new Exception("SiteId is required.");

            int siteId = _idEncoder.Decode(encryptedSiteId);

            Console.WriteLine($"Decoded SiteId: {siteId}");

            var result = await _spService.ExecuteSpAsync(
                "USP_CB_GetGeneratorBySiteId",
                new SqlParameter("@SiteId", siteId)
            );

            var dataList = (result["Data"] as IEnumerable<object>)
                ?.Cast<Dictionary<string, object>>()
                ?.ToList()
                ?? new List<Dictionary<string, object>>();

            return dataList.Select(x => new GeneratorResponseDTO
            {
                GeneratorId = _idEncoder.Encode(Convert.ToInt32(x["GeneratorId"])),
                GeneratorName = x["GeneratorName"]?.ToString()
            }).ToList();
        }
    }
}