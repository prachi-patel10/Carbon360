using AutoMapper;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using ProjectApp.Core.DTOs.Masters.Fuel;
using ProjectApp.Core.DTOs.Masters.VehicleType;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.Common;
using ProjectApp.Repository.Interfaces.Masters.VehicleType;
using ProjectApp.Repository.Interfaces.User;
using ProjectApp.Repository.Services.Common;
using ProjectApp.Repository.Utilities.Auth;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Repository.Services.Masters.VehicleType
{
    public class VehicleTypeService : IVehicleTypeService
    {
        private readonly CBContext _context;
        private readonly IMapper _mapper;
        private readonly IUserContext _userContext;
        private readonly IdEncoder _idEncoder;


        public VehicleTypeService(
            CBContext context,
            IMapper mapper,
            IUserContext userContext, IdEncoder idEncoder)
        {
            _context = context;
            _mapper = mapper;
            _userContext = userContext;
            _idEncoder = idEncoder;
        }

        private int GetCurrentUserId()
        {
            return _userContext.UserId;
        }

        public async Task<VehicleTypeResponseDTO> CreateVehicleTypeAsync(VehicleTypeCreateDTO dto)
        {
            var insertedId =  _context.Database
        .SqlQueryRaw<int>(
            "EXEC USP_CB_VehicleTypeInsert @VehicleTypeName, @VehicleCategory, @FuelId, @AverageMileage, @Description, @EntryBy",
            new SqlParameter("@VehicleTypeName", dto.vehicle_type_name),
            new SqlParameter("@VehicleCategory", dto.vehicle_category),
            new SqlParameter("@FuelId", dto.fuel_id ?? (object)DBNull.Value),
            new SqlParameter("@AverageMileage", dto.average_mileage_kmpl ?? (object)DBNull.Value),
            new SqlParameter("@Description", dto.description ?? (object)DBNull.Value),
            new SqlParameter("@EntryBy", GetCurrentUserId())
        )
           .AsEnumerable().First();

            return new VehicleTypeResponseDTO
            {
                vehicle_type_id = _idEncoder.Encode(insertedId),
                description = dto.description,
                IsActive = true
            };
        }
        

        public async Task<bool> DeleteVehicleTypeAsync(string encryptedId)
        {
            int id = _idEncoder.Decode(encryptedId);

            await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_VehicleTypeDelete @VehicleTypeId, @UpdatedBy",
                new SqlParameter("@VehicleTypeId", id),
                new SqlParameter("@UpdatedBy", GetCurrentUserId())
            );

            return true;
        }
    

        public async Task<List<VehicleTypeResponseDTO>> GetAllVehicleTypesAsync()
        {
            var result = new List<VehicleTypeResponseDTO>();

            using (var connection = _context.Database.GetDbConnection())
            {
                await connection.OpenAsync();

                using (var command = connection.CreateCommand())
                {
                    command.CommandText = "USP_CB_VehicleTypeGetAll";
                    command.CommandType = System.Data.CommandType.StoredProcedure;

                    using (var reader = await command.ExecuteReaderAsync())
                    {
                        while (await reader.ReadAsync())
                        {
                            var item = new VehicleTypeResponseDTO
                            {
                                vehicle_type_id = _idEncoder.Encode(
         Convert.ToInt32(reader["VehicleTypeId"])
     ),
                                vehicle_type_name = reader["VehicleTypeName"]?.ToString(),
                                IsActive = Convert.ToBoolean(reader["IsActive"]),
                                EntryBy = Convert.ToInt32(reader["EntryBy"])
                            };

                            result.Add(item);
                        }
                    }
                }
            }

            return result;
        }

        public async Task<VehicleTypeResponseDTO> GetVehicleTypeByIdAsync(string encryptedId)
        {
            int id = _idEncoder.Decode(encryptedId);

            using var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = "USP_CB_VehicleTypeGetById";
            command.CommandType = System.Data.CommandType.StoredProcedure;

            command.Parameters.Add(new SqlParameter("@VehicleTypeId", id));

            using var reader = await command.ExecuteReaderAsync();

            if (await reader.ReadAsync())
            {
                return new VehicleTypeResponseDTO
                {
                    vehicle_type_id = encryptedId,
                    vehicle_type_name = reader["vehicle_type_name"]?.ToString(),
                    description = reader["Description"]?.ToString(),
                    IsActive = Convert.ToBoolean(reader["IsActive"])
                };
            }

            return null;
        }

        //public async Task<VehicleTypeResponseDTO> GetVehicleTypeByNameAsync(string name)
        //{
        //    var data = await _context.Set<VehicleTypeResponseDTO>()
        //         .FromSqlRaw("EXEC USP_CB_VehicleTypeGetAll")
        //         .AsEnumerable()
        //         .FirstOrDefault(x => x.vehicle_type_name == name);

        //    if (data != null)
        //    {
        //        data.vehicle_type_id = _idEncoder.Encode(
        //            Convert.ToInt32(data.vehicle_type_id)
        //        );
        //    }

        //    return data;
        //}


        //public async Task<bool> UpdateVehicleTypeAsync(VehicleTypeUpdateDTO dto)
        //{
        //    int id = _idEncoder.Decode(dto.vehicle_type_id);

        //    await _context.Database.ExecuteSqlRawAsync(
        //        "EXEC USP_CB_VehicleTypeUpdate @VehicleTypeId, @VehicleTypeName, @VehicleCategory, @FuelId, @AverageMileage, @Description, @UpdatedBy",
        //        new SqlParameter("@VehicleTypeId", id),
        //        new SqlParameter("@VehicleTypeName", dto.vehicle_type_name),
        //        new SqlParameter("@VehicleCategory", dto.vehicle_category),
        //        new SqlParameter("@FuelId", dto.fuel_id ?? (object)DBNull.Value),
        //        new SqlParameter("@AverageMileage", dto.average_mileage_kmpl ?? (object)DBNull.Value),
        //        new SqlParameter("@Description", dto.description ?? (object)DBNull.Value),
        //        new SqlParameter("@UpdatedBy", GetCurrentUserId())
        //    );

        //    return true;

        //}
        public async Task<bool> UpdateVehicleTypeAsync(VehicleTypeUpdateDTO dto)
        {
            if (string.IsNullOrEmpty(dto.vehicle_type_id))
                throw new Exception("VehicleTypeId is required");

            if (string.IsNullOrEmpty(dto.fuel_id))
                throw new Exception("FuelId is required");

            int vehicleTypeId = _idEncoder.Decode(dto.vehicle_type_id);
            int fuelId = _idEncoder.Decode(dto.fuel_id);

            await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_VehicleTypeUpdate @VehicleTypeId, @VehicleTypeName, @VehicleCategory, @FuelId, @AverageMileage, @Description, @UpdatedBy",
                new SqlParameter("@VehicleTypeId", vehicleTypeId),
                new SqlParameter("@VehicleTypeName", dto.vehicle_type_name),
                new SqlParameter("@VehicleCategory", dto.vehicle_category),
                new SqlParameter("@FuelId", fuelId), // NO NULL POSSIBLE
                new SqlParameter("@AverageMileage", dto.average_mileage_kmpl ?? (object)DBNull.Value),
                new SqlParameter("@Description", dto.description ?? (object)DBNull.Value),
                new SqlParameter("@UpdatedBy", GetCurrentUserId())
            );

            return true;
        }

        public async Task<bool> UpdateStatusAsync(VehicleTypeStatusUpdateDTO dto)
        {
            int id = _idEncoder.Decode(dto.vehicle_type_id);

            await _context.Database.ExecuteSqlRawAsync(
                "UPDATE CB_MasterVehicleType SET IsActive=@IsActive, UpdatedBy=@UpdatedBy, UpdateDate=GETDATE() WHERE vehicle_type_id=@vehicle_type_id",
                new SqlParameter("@IsActive", dto.IsActive),
                new SqlParameter("@vehicle_type_id", id),
                new SqlParameter("@UpdatedBy", GetCurrentUserId())
            );

            return true;
        }
    }
}
