using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using ProjectApp.Core.DTOs.Masters.EmissionFactor;
using ProjectApp.Repository.Interfaces.Masters.EmissionFactor;
using ProjectApp.Repository.Utilities.Auth;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Repository.Services.Masters.EmissionFactor
{
  
        public class EmissionFactorService : IEmissionFactorService
        {
            private readonly IConfiguration _config;
            private readonly IdEncoder _encoder;

            public EmissionFactorService(IConfiguration config)
            {
                _config = config;
                _encoder = new IdEncoder();
            }

            private SqlConnection GetConnection()
                => new SqlConnection(_config.GetConnectionString("DbString"));

        public async Task<ApiResponse<List<EmissionFactorResponseDTO>>> GetAllAsync()
        {
            var list = new List<EmissionFactorResponseDTO>();

            using var con = GetConnection();
            using var cmd = new SqlCommand("USP_CB_EmissionFactor_GetAll", con);
            cmd.CommandType = CommandType.StoredProcedure;

            await con.OpenAsync();
            using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                int id = Convert.ToInt32(reader["EmissionFactorId"]);

                list.Add(new EmissionFactorResponseDTO
                {
                    Id = _encoder.Encode(id),
                    FuelId = Convert.ToInt32(reader["FuelId"]),
                    FuelName = reader["fuel_name"]?.ToString(),
                    CO2_Factor_KgPerL = Convert.ToDecimal(reader["CO2_Factor_KgPerL"]),
                    NO2_Factor_KgPerKm = Convert.ToDecimal(reader["NO2_Factor_KgPerKm"]),
                    CH4_Factor_KgPerKm = Convert.ToDecimal(reader["CH4_Factor_KgPerKm"]),
                    IsActive = Convert.ToBoolean(reader["IsActive"])
                });
            }

            return new ApiResponse<List<EmissionFactorResponseDTO>>
            {
                Status = true,
                StatusCode = 200,
                Message = "Emission Factors retrieved successfully",
                Data = list
            };
        }

        public async Task<ApiResponse<EmissionFactorResponseDTO>> GetByIdAsync(string encryptedId)
            {
                int id = _encoder.Decode(encryptedId);

                using var con = GetConnection();
                using var cmd = new SqlCommand("USP_CB_EmissionFactor_GetById", con);
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("@EmissionFactorId", id);

                await con.OpenAsync();
                using var reader = await cmd.ExecuteReaderAsync();

                if (await reader.ReadAsync())
                {
                var dto = new EmissionFactorResponseDTO
                {
                    Id = encryptedId,
                    FuelId = Convert.ToInt32(reader["FuelId"]),
                    FuelName = reader["fuel_name"]?.ToString(),
                    CO2_Factor_KgPerL = Convert.ToDecimal(reader["CO2_Factor_KgPerL"]),
                    NO2_Factor_KgPerKm = Convert.ToDecimal(reader["NO2_Factor_KgPerKm"]),
                    CH4_Factor_KgPerKm = Convert.ToDecimal(reader["CH4_Factor_KgPerKm"]),
                    IsActive = Convert.ToBoolean(reader["IsActive"])
                };

                return new ApiResponse<EmissionFactorResponseDTO>
                    {
                        Status = true,
                        StatusCode = 200,
                        Message = "Record found",
                        Data = dto
                    };
                }

                return new ApiResponse<EmissionFactorResponseDTO>
                {
                    Status = false,
                    StatusCode = 404,
                    Message = "Record not found",
                    Data = null
                };
            }

            public async Task<ApiResponse<string>> CreateAsync(EmissionFactorRequestDTO dto, int userId)
            {
                using var con = GetConnection();
                using var cmd = new SqlCommand("USP_CB_EmissionFactor_Insert", con);
                cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.AddWithValue("@FuelId", dto.FuelId);
            cmd.Parameters.AddWithValue("@CO2_Factor_KgPerL", dto.CO2_Factor_KgPerL);
            cmd.Parameters.AddWithValue("@NO2_Factor_KgPerKm", dto.NO2_Factor_KgPerKm);
            cmd.Parameters.AddWithValue("@CH4_Factor_KgPerKm", dto.CH4_Factor_KgPerKm);
            cmd.Parameters.AddWithValue("@EntryBy", userId);

            await con.OpenAsync();
                int newId = Convert.ToInt32(await cmd.ExecuteScalarAsync());

                return new ApiResponse<string>
                {
                    Status = true,
                    StatusCode = 201,
                    Message = "Created successfully",
                    Data = _encoder.Encode(newId)
                };
            }

            public async Task<ApiResponse<string>> UpdateAsync(string encryptedId, EmissionFactorRequestDTO dto, int userId)
            {
                int id = _encoder.Decode(encryptedId);

                using var con = GetConnection();
                using var cmd = new SqlCommand("USP_CB_EmissionFactor_Update", con);
                cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.AddWithValue("@EmissionFactorId", id);
            cmd.Parameters.AddWithValue("@FuelId", dto.FuelId);
            cmd.Parameters.AddWithValue("@CO2_Factor_KgPerL", dto.CO2_Factor_KgPerL);
            cmd.Parameters.AddWithValue("@NO2_Factor_KgPerKm", dto.NO2_Factor_KgPerKm);
            cmd.Parameters.AddWithValue("@CH4_Factor_KgPerKm", dto.CH4_Factor_KgPerKm);
            cmd.Parameters.AddWithValue("@UpdatedBy", userId);

            await con.OpenAsync();
                await cmd.ExecuteNonQueryAsync();

                return new ApiResponse<string>
                {
                    Status = true,
                    StatusCode = 200,
                    Message = "Updated successfully",
                    Data = encryptedId
                };
            }

            public async Task<ApiResponse<string>> DeleteAsync(string encryptedId, int userId)
            {
                int id = _encoder.Decode(encryptedId);

                using var con = GetConnection();
                using var cmd = new SqlCommand("USP_CB_EmissionFactor_Delete", con);
                cmd.CommandType = CommandType.StoredProcedure;

                cmd.Parameters.AddWithValue("@EmissionFactorId", id);
                cmd.Parameters.AddWithValue("@UpdatedBy", userId);

                await con.OpenAsync();
                await cmd.ExecuteNonQueryAsync();

                return new ApiResponse<string>
                {
                    Status = true,
                    StatusCode = 200,
                    Message = "Deleted successfully",
                    Data = encryptedId
                };
            }

            public async Task<ApiResponse<string>> UpdateStatusAsync(string encryptedId, bool isActive, int userId)
            {
                int id = _encoder.Decode(encryptedId);

                using var con = GetConnection();
                using var cmd = new SqlCommand("USP_CB_EmissionFactor_UpdateStatus", con);
                cmd.CommandType = CommandType.StoredProcedure;

                cmd.Parameters.AddWithValue("@EmissionFactorId", id);
                cmd.Parameters.AddWithValue("@IsActive", isActive);
                cmd.Parameters.AddWithValue("@UpdatedBy", userId);

                await con.OpenAsync();
                await cmd.ExecuteNonQueryAsync();

                return new ApiResponse<string>
                {
                    Status = true,
                    StatusCode = 200,
                    Message = "Status updated successfully",
                    Data = encryptedId
                };
            }
        }
    
}
