using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using ProjectApp.Core.DTOs.Masters.Tree;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.Masters.Tree;
using ProjectApp.Repository.Interfaces.User;
using ProjectApp.Repository.Utilities.Auth;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

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

    }

}
