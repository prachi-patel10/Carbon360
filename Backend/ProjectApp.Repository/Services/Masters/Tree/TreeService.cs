using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using ProjectApp.Core.DTOs.Masters.Tree;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.Masters.Tree;
using ProjectApp.Repository.Interfaces.User;
using ProjectApp.Repository.Utilities.Auth;
using ProjectApp.Repository.Utilities.SP;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Org.BouncyCastle.Math.EC.ECCurve;

namespace ProjectApp.Repository.Services.Masters.Tree
{
    public class TreeService : ITreeService
    {
        private readonly CBContext _context;
        private readonly IUserContext _userContext;
        private readonly IdEncoder _idEncoder;

        public TreeService(CBContext context, IUserContext userContext, IdEncoder idEncoder)
        {
            _context = context;
            _userContext = userContext;
            _idEncoder = idEncoder;
        }

        private int GetCurrentUserId() => _userContext.UserId;

        // ✅ GET ALL
        public async Task<List<TreeResponseDTO>> GetAllTreesAsync()
        {
            var list = new List<TreeResponseDTO>();

            using var conn = _context.Database.GetDbConnection();
            await conn.OpenAsync();

            using var cmd = conn.CreateCommand();
            cmd.CommandText = "USP_CB_TreeMasterGetAllList";
            cmd.CommandType = CommandType.StoredProcedure;

            using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                list.Add(new TreeResponseDTO
                {
                    TreeId = _idEncoder.Encode(Convert.ToInt32(reader["TreeId"])),
                    TreeName = reader["TreeName"].ToString(),
                    Co2AbsorptionPerYear = Convert.ToDecimal(reader["Co2AbsorptionPerYear"]),
                    IsActive = Convert.ToBoolean(reader["IsActive"])
                });
            }

            return list;
        }

        // ✅ GET BY ID
        public async Task<TreeResponseDTO> GetTreeByIdAsync(string encryptedId)
        {
            int id = _idEncoder.Decode(encryptedId);

            using var conn = _context.Database.GetDbConnection();
            await conn.OpenAsync();

            using var cmd = conn.CreateCommand();
            cmd.CommandText = "USP_CB_TreeMasterGetById";
            cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.Add(new SqlParameter("@TreeId", id));

            using var reader = await cmd.ExecuteReaderAsync();

            if (await reader.ReadAsync())
            {
                return new TreeResponseDTO
                {
                    TreeId = encryptedId,
                    TreeName = reader["TreeName"].ToString(),
                    Co2AbsorptionPerYear = Convert.ToDecimal(reader["Co2AbsorptionPerYear"]),
                    IsActive = Convert.ToBoolean(reader["IsActive"])
                };
            }

            return null;
        }

        // ✅ CREATE
        public async Task<TreeResponseDTO> CreateTreeAsync(TreeCreateDTO dto)
        {
            var insertedId = _context.Database
                .SqlQueryRaw<int>(
                    "EXEC USP_CB_TreeMasterInsert @TreeName, @Co2AbsorptionPerYear, @EntryBy",
                    new SqlParameter("@TreeName", dto.TreeName),
                    new SqlParameter("@Co2AbsorptionPerYear", dto.Co2AbsorptionPerYear),
                    new SqlParameter("@EntryBy", GetCurrentUserId())
                )
                .AsEnumerable().First();

            return new TreeResponseDTO
            {
                TreeId = _idEncoder.Encode(insertedId),
                TreeName = dto.TreeName,
                Co2AbsorptionPerYear = dto.Co2AbsorptionPerYear,
                IsActive = true
            };
        }

        // ✅ UPDATE
        public async Task<bool> UpdateTreeAsync(TreeUpdateDTO dto)
        {
            int id = _idEncoder.Decode(dto.TreeId);

            await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_TreeMasterUpdate @TreeId, @TreeName, @Co2AbsorptionPerYear, @IsActive, @UpdatedBy",
                new SqlParameter("@TreeId", id),
                new SqlParameter("@TreeName", dto.TreeName),
                new SqlParameter("@Co2AbsorptionPerYear", dto.Co2AbsorptionPerYear),
                new SqlParameter("@IsActive", dto.IsActive),
                new SqlParameter("@UpdatedBy", GetCurrentUserId())
            );

            return true;
        }

        // ✅ DELETE (Soft Delete)
        public async Task<bool> DeleteTreeAsync(string encryptedId)
        {
            int id = _idEncoder.Decode(encryptedId);

            await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_TreeMasterDelete @TreeId, @UpdatedBy",
                new SqlParameter("@TreeId", id),
                new SqlParameter("@UpdatedBy", GetCurrentUserId())
            );

            return true;
        }

        // ✅ SEARCH
        public async Task<PageResult> SearchTreesAsync(TreeSearchDTO dto)
        {
            var parameters = new List<SqlParameter>
        {
            new SqlParameter("@Search", dto.Search ?? (object)DBNull.Value),
            new SqlParameter("@IsActive", dto.IsActive ?? (object)DBNull.Value),
            new SqlParameter("@PageNumber", dto.PageNumber),
            new SqlParameter("@PageSize", dto.PageSize),
            new SqlParameter("@SortColumn", dto.SortColumn),
            new SqlParameter("@SortDirection", dto.SortDirection)
        };

            var conn = _context.Database.GetDbConnection();
            await conn.OpenAsync();

            using var cmd = conn.CreateCommand();
            cmd.CommandText = "USP_CB_TreeMasterSearch";
            cmd.CommandType = CommandType.StoredProcedure;

            foreach (var p in parameters)
                cmd.Parameters.Add(p);

            using var reader = await cmd.ExecuteReaderAsync();

            int totalRecords = 0;
            if (await reader.ReadAsync())
                totalRecords = reader.GetInt32(0);

            await reader.NextResultAsync();

            var list = new List<TreeResponseDTO>();

            while (await reader.ReadAsync())
            {
                list.Add(new TreeResponseDTO
                {
                    TreeId = _idEncoder.Encode(Convert.ToInt32(reader["TreeId"])),
                    TreeName = reader["TreeName"].ToString(),
                    Co2AbsorptionPerYear = Convert.ToDecimal(reader["Co2AbsorptionPerYear"]),
                    IsActive = Convert.ToBoolean(reader["IsActive"])
                });
            }

            return new PageResult
            {
                Data = list,
                TotalRecords = totalRecords,
                CurrentPage = dto.PageNumber,
                TotalPages = (int)Math.Ceiling((double)totalRecords / dto.PageSize)
            };
        }


        public async Task<bool> UpdateStatusAsync(TreeMasterStatusUpdateDTO dto)
        {
            int id = _idEncoder.Decode(dto.TreeId);

            await _context.Database.ExecuteSqlRawAsync(
                "UPDATE CB_MasterTree SET IsActive=@IsActive, UpdateBy=@UpdateBy, UpdateDate=GETDATE() WHERE TreeId=@TreeId",
                new SqlParameter("@IsActive", dto.IsActive),
                new SqlParameter("@TreeId", id),
                new SqlParameter("@UpdateBy", GetCurrentUserId())
            );

            return true;
        }

        public async Task<TreeDetailsDTO> GetTreeDetailsAsync(TreeRequestDTO request)
        {
            TreeDetailsDTO result = null;

            using var conn = _context.Database.GetDbConnection();
            await conn.OpenAsync();

            using var cmd = conn.CreateCommand();
            cmd.CommandText = "USP_CB_GetTreeDetailsSummary";
            cmd.CommandType = CommandType.StoredProcedure;

            // ✅ SQL PARAMETERS (NEW SqlParameter)
            var treeIdParam = cmd.CreateParameter();
            treeIdParam.ParameterName = "@TreeId";
            treeIdParam.DbType = DbType.Int32;
            treeIdParam.Value = request.TreeId;
            cmd.Parameters.Add(treeIdParam);

            var treeCountParam = cmd.CreateParameter();
            treeCountParam.ParameterName = "@TreeCount";
            treeCountParam.DbType = DbType.Int32;
            treeCountParam.Value = request.TreeCount;
            cmd.Parameters.Add(treeCountParam);

            using var reader = await cmd.ExecuteReaderAsync();

            if (await reader.ReadAsync())
            {
                result = new TreeDetailsDTO
                {
                    TreeId = Convert.ToInt32(reader["TreeId"]),
                    TreeName = reader["TreeName"].ToString(),
                    Co2PerTree = Convert.ToDecimal(reader["Co2PerTree"]),
                    TreeCount = Convert.ToInt32(reader["TreeCount"]),
                    TotalCo2 = Convert.ToDecimal(reader["TotalCo2"])
                };
            }

            return result;
        }
    }
    

}
