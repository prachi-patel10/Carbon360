using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.VisualBasic;
using ProjectApp.Core.DTOs.Masters.PlantationProject;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.Masters.PlantationProject;
using ProjectApp.Repository.Utilities.Auth;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Repository.Services.Masters.PlantationProject
{
    public class PlantationProjectService : IPlantationProject
    {
        private readonly CBContext _context;
        private readonly IdEncoder _encoder;

        public PlantationProjectService(CBContext context)
        {
            _context = context;
            _encoder = new IdEncoder();
        }

        private PlantationProjectDTO MapRow(System.Data.Common.DbDataReader r)
        {
            int id = r.GetInt32(0);
            int fy = r.GetInt32(2);
            return new PlantationProjectDTO
            {
                ProjectId = _encoder.Encode(id),
                ProjectName = r.GetString(1),
                FinancialYear = fy,
                FinancialYearDisplay = $"{fy}-{fy + 1}",
                EntryBy = r.IsDBNull(3) ? null : r.GetInt32(3),
                EntryDate = r.IsDBNull(4) ? null : r.GetDateTime(4),
                UpdateBy = r.IsDBNull(5) ? null : r.GetInt32(5),
                UpdateDate = r.IsDBNull(6) ? null : r.GetDateTime(6),
                IsActive = r.IsDBNull(7) ? null : r.GetBoolean(7)
            };
        }

        public async Task<bool> DeleteAsync(string projectId, int userId)
        {
            int decodedId = _encoder.Decode(projectId);

            var result = await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_PlantationProjectDelete @ProjectId, @UpdateBy",
                new SqlParameter("@ProjectId", decodedId),
                new SqlParameter("@UpdateBy", userId)
            );

            return true;
        }

        public async Task<List<PlantationProjectDTO>> GetAllAsync()
        {

            using var conn = _context.Database.GetDbConnection();
            await conn.OpenAsync();

            using var cmd = conn.CreateCommand();
            cmd.CommandText = "USP_CB_PlantationProjectGetAll";
            cmd.CommandType = System.Data.CommandType.StoredProcedure;

            using var reader = await cmd.ExecuteReaderAsync();

            var list = new List<PlantationProjectDTO>();
            while (await reader.ReadAsync())
                list.Add(MapRow(reader));

            return list;
        }
    
        public async Task<PlantationProjectDTO> GetByIdAsync(string projectId)
        {
            int decodedId = _encoder.Decode(projectId);

            using var conn = _context.Database.GetDbConnection();
            await conn.OpenAsync();

            using var cmd = conn.CreateCommand();
            cmd.CommandText = "USP_CB_PlantationProjectGetById";
            cmd.CommandType = System.Data.CommandType.StoredProcedure;
            cmd.Parameters.Add(new SqlParameter("@ProjectId", decodedId));

            using var reader = await cmd.ExecuteReaderAsync();

            if (await reader.ReadAsync())
                return MapRow(reader);

            return null;
        }

        public async Task<string> InsertAsync(PlantationProjectInsertDTO dto, int userId)
        {
            var newIdParam = new SqlParameter("@NewId", System.Data.SqlDbType.Int)
            {
                Direction = System.Data.ParameterDirection.Output
            };

            await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_PlantationProjectInsert @ProjectName, @FinancialYear, @EntryBy, @NewId OUTPUT",
                new SqlParameter("@ProjectName", dto.ProjectName),
                new SqlParameter("@FinancialYear", dto.FinancialYear),
                new SqlParameter("@EntryBy", userId),
                newIdParam
            );

            return _encoder.Encode((int)newIdParam.Value);
        }
        

        public async Task<(int TotalCount, List<PlantationProjectDTO> Data)> SearchAsync(PlantationProjectSearchDTO dto)
        {
            using var conn = _context.Database.GetDbConnection();
            await conn.OpenAsync();

            using var cmd = conn.CreateCommand();
            cmd.CommandText = "USP_CB_PlantationProjectSearch";
            cmd.CommandType = System.Data.CommandType.StoredProcedure;

            cmd.Parameters.Add(new SqlParameter("@SearchText", (object?)dto.SearchText ?? DBNull.Value));
            cmd.Parameters.Add(new SqlParameter("@PageNumber", dto.PageNumber));
            cmd.Parameters.Add(new SqlParameter("@PageSize", dto.PageSize));
            cmd.Parameters.Add(new SqlParameter("@SortColumn", dto.SortColumn));
            cmd.Parameters.Add(new SqlParameter("@SortDirection", dto.SortDirection));

            using var reader = await cmd.ExecuteReaderAsync();

            // First result set: TotalCount
            int totalCount = 0;
            if (await reader.ReadAsync())
                totalCount = reader.GetInt32(0);

            // Second result set: paged rows
            await reader.NextResultAsync();

            var list = new List<PlantationProjectDTO>();
            while (await reader.ReadAsync())
                list.Add(MapRow(reader));

            return (totalCount, list);
        }


        public async Task<bool> UpdateAsync(PlantationProjectUpdateDTO dto, int userId)
        {
            int decodedId = _encoder.Decode(dto.ProjectId);

            var result = await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_PlantationProjectUpdate @ProjectId, @ProjectName, @FinancialYear, @UpdateBy",
                new SqlParameter("@ProjectId", decodedId),
                new SqlParameter("@ProjectName", dto.ProjectName),
                new SqlParameter("@FinancialYear", dto.FinancialYear),
                new SqlParameter("@UpdateBy", userId)
            );

            return true;
        }

        public async Task<List<ProjectByYearDTO>> GetProjectsByYearAsync(ProjectByYearRequestDTO request)
        {
            var list = new List<ProjectByYearDTO>();

            using var conn = _context.Database.GetDbConnection();
            await conn.OpenAsync();

            using var cmd = conn.CreateCommand();
            cmd.CommandText = "USP_CB_ProjectByYear";
            cmd.CommandType = CommandType.StoredProcedure;

            var fyParam = cmd.CreateParameter();
            fyParam.ParameterName = "@FinancialYear";
            fyParam.DbType = DbType.String;
            fyParam.Value = request.FinancialYear;
            cmd.Parameters.Add(fyParam);

            using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                int rawId = Convert.ToInt32(reader["ProjectId"]);
                list.Add(new ProjectByYearDTO
                {
                    ProjectId = _encoder.Encode(rawId),
                    ProjectName = reader["ProjectName"].ToString(),
                    PreviousYearEmission = Convert.ToDecimal(reader["PreviousYearEmission"]),
                    CurrentYearEmission = Convert.ToDecimal(reader["CurrentYearEmission"])  // ← add this
                });
            }

            return list;
        }

    }
    
    
}
