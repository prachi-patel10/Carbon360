using Microsoft.Data.SqlClient;
using ProjectApp.Core.DTOs.Masters.Vehicle;
using ProjectApp.Repository.Interfaces.Common;
using ProjectApp.Repository.Interfaces.Masters.Vehicle;
using ProjectApp.Repository.Utilities.Auth;
using ProjectApp.Repository.Utilities.SP;

namespace ProjectApp.Repository.Services.Masters.Vehicle
{
    public class VehicleService : IVehicleService
    {
        private readonly ISPService _spService;
        private readonly IdEncoder _idEncoder;

        public VehicleService(ISPService spService, IdEncoder idEncoder)
        {
            _spService = spService;
            _idEncoder = idEncoder;
        }

        public async Task<VehicleResponseDto?> InsertAsync(VehicleDto dto)
        {
            try
            {
                // Decode the encrypted IDs to integer
                int vehicleTypeId = _idEncoder.Decode(dto.vehicle_type_id);
                int fuelId = _idEncoder.Decode(dto.fuel_id);
                int departmentId = _idEncoder.Decode(dto.department_id);

                var parameters = new[]
                {
            new SqlParameter("@vehicle_number", dto.vehicle_number),
            new SqlParameter("@vehicle_type_id", vehicleTypeId),
            new SqlParameter("@fuel_id", fuelId),
            new SqlParameter("@department_id", departmentId),
            new SqlParameter("@engine_capacity", dto.engine_capacity ?? (object)DBNull.Value),
            new SqlParameter("@emission_standard", dto.emission_standard ?? (object)DBNull.Value),
            new SqlParameter("@IsActive", dto.IsActive),
            new SqlParameter("@EntryBy", 1)
        };

                var insertResult = await _spService.ExecuteSpAsync(
                    "USP_CB_VehicleMasterInsert",
                    parameters
                );

                var dataList = (insertResult["Data"] as IEnumerable<object>)
                                ?.Cast<Dictionary<string, object>>()
                                .ToList();

                if (dataList == null || !dataList.Any())
                    return null;

                int newId = Convert.ToInt32(dataList.First()["vehicle_id"]);

                return await GetById(_idEncoder.Encode(newId));
            }
            catch (SqlException ex) when (ex.Number == 2627) // Duplicate key
            {
                throw new Exception("Vehicle number already exists.");
            }
        }

        public async Task DeleteAsync(string encryptedId, int userId)
        {
            int decodedId = _idEncoder.Decode(encryptedId);

            await _spService.ExecuteSpAsync(
                "USP_CB_VehicleMasterDelete",
                new SqlParameter("@vehicle_id", decodedId),
                new SqlParameter("@UpdatedBy", userId)
            );
        }

        public async Task<VehicleResponseDto?> GetById(string encryptedId)
        {
            int decodedId = _idEncoder.Decode(encryptedId);

            var result = await _spService.ExecuteSpAsync(
                "USP_CB_VehicleMasterGetById",
                new SqlParameter("@vehicle_id", decodedId)
            );

            if (!result.ContainsKey("Data") || result["Data"] == null)
                return null;

            var dataList = (result["Data"] as IEnumerable<object>)
                            ?.Cast<Dictionary<string, object>>()
                            .ToList();

            if (dataList == null || !dataList.Any())
                return null;

            return MapToResponseDto(dataList.First());
        }

        public async Task<List<VehicleResponseDto>> GetAllList()
        {
            var result = await _spService.ExecuteSpAsync("USP_CB_VehicleMasterGetAllList");

            if (!result.ContainsKey("Data") || result["Data"] == null)
                return new List<VehicleResponseDto>();

            var dataList = (result["Data"] as IEnumerable<object>)
                            ?.Cast<Dictionary<string, object>>()
                            .ToList()
                            ?? new List<Dictionary<string, object>>();

            return dataList.Select(MapToResponseDto).ToList();
        }

        public async Task UpdateAsync(VehicleUpdateDto dto)
        {
            // Decode encrypted IDs to integer for SP
            int decodedVehicleId = _idEncoder.Decode(dto.vehicle_id);
            int vehicleTypeId = _idEncoder.Decode(dto.vehicle_type_id);
            int fuelId = _idEncoder.Decode(dto.fuel_id);
            int departmentId = _idEncoder.Decode(dto.department_id);

            var parameters = new[]
            {
        new SqlParameter("@vehicle_id", decodedVehicleId),
        new SqlParameter("@vehicle_number", dto.vehicle_number),
        new SqlParameter("@vehicle_type_id", vehicleTypeId),
        new SqlParameter("@fuel_id", fuelId),
        new SqlParameter("@department_id", departmentId),
        new SqlParameter("@engine_capacity", dto.engine_capacity ?? (object)DBNull.Value),
        new SqlParameter("@emission_standard", dto.emission_standard ?? (object)DBNull.Value),
        new SqlParameter("@IsActive", dto.IsActive),
        new SqlParameter("@UpdatedBy", 1) // Replace with actual user ID
    };

            await _spService.ExecuteSpAsync("USP_CB_VehicleMasterUpdate", parameters);
        }

        public async Task UpdateStatusAsync(string encryptedId, bool isActive, int userId)
        {
            int decodedId = _idEncoder.Decode(encryptedId);

            await _spService.ExecuteSpAsync(
                "USP_CB_VehicleMasterUpdateStatus",
                new SqlParameter("@vehicle_id", decodedId),
                new SqlParameter("@IsActive", isActive),
                new SqlParameter("@UpdatedBy", userId)
            );
        }

        public async Task<VehicleResponseDto?> GetByName(string name)
        {
            var result = await _spService.ExecuteSpAsync(
                "USP_CB_VehicleMasterGetByName",
                new SqlParameter("@vehicle_number", name)
            );

            if (!result.ContainsKey("Data") || result["Data"] == null)
                return null;

            var dataList = (result["Data"] as IEnumerable<object>)
                            ?.Cast<Dictionary<string, object>>()
                            .ToList();

            if (dataList == null || !dataList.Any())
                return null;

            return MapToResponseDto(dataList.First());
        }

        public async Task<VehicleSearchResponse> SearchAsync(VehicleSearchRequest request)
        {
            string? vehicleTypeIds = DecodeIds(request.vehicle_type_id);
            string? fuelIds = DecodeIds(request.fuel_id);
            string? departmentIds = DecodeIds(request.department_id);

            object DbValue(string? value) =>
                string.IsNullOrWhiteSpace(value) ? DBNull.Value : value;

            var parameters = new SqlParameter[]
            {
        new SqlParameter("@Search", DbValue(request.Search)),
        new SqlParameter("@vehicle_type_id", DbValue(vehicleTypeIds)),
        new SqlParameter("@fuel_id", DbValue(fuelIds)),
        new SqlParameter("@department_id", DbValue(departmentIds)),
        new SqlParameter("@IsActive", request.IsActive ?? (object)DBNull.Value),
        new SqlParameter("@PageNumber", request.PageNumber <= 0 ? 1 : request.PageNumber),
        new SqlParameter("@PageSize", request.PageSize <= 0 ? 10 : request.PageSize),
        new SqlParameter("@SortColumn", DbValue(request.SortColumn ?? "vehicle_number")),
        new SqlParameter("@SortDirection", DbValue(request.SortDirection ?? "ASC"))
            };

            var result = await _spService.ExecuteSpAsync(
                "USP_CB_VehicleMasterSearch",
                parameters
            );

            var vehicles = new List<VehicleResponseDto>();

            // ✅ RESULT SET 1 → DATA
            if (result.TryGetValue("Data", out var dataObj) && dataObj != null)
            {
                var rows = (dataObj as IEnumerable<object>)
                    ?.Cast<Dictionary<string, object>>()
                    .ToList();

                if (rows != null)
                    vehicles = rows.Select(MapToResponseDto).ToList();
            }

            // ✅ RESULT SET 2 → TOTALS (FIXED)
            int totalRecords = 0;
            int totalPages = 1;
            int currentPage = request.PageNumber;

            if (result.TryGetValue("Pagination", out var paginationObj) && paginationObj != null)
            {
                var pagination = paginationObj as Dictionary<string, object>;

                if (pagination != null)
                {
                    totalRecords = pagination.ContainsKey("TotalRecords")
                        ? Convert.ToInt32(pagination["TotalRecords"])
                        : 0;

                    totalPages = pagination.ContainsKey("TotalPages")
                        ? Convert.ToInt32(pagination["TotalPages"])
                        : 1;

                    currentPage = pagination.ContainsKey("CurrentPage")
                        ? Convert.ToInt32(pagination["CurrentPage"])
                        : request.PageNumber;
                }
            }

            return new VehicleSearchResponse
            {
                Data = vehicles,
                TotalRecords = totalRecords,
                TotalPages = totalPages,
                CurrentPage = currentPage
            };
        }
        // ── Decodes "YvnOD6Ao,0YJARnOR" → "3,7" ──────────────────────────
        private string? DecodeIds(string? encodedIds)
        {
            if (string.IsNullOrWhiteSpace(encodedIds))
                return null;
            var decodedList = new List<string>();
            foreach (var id in encodedIds.Split(',', StringSplitOptions.RemoveEmptyEntries))
            {
                try
                {
                    decodedList.Add(_idEncoder.Decode(id.Trim()).ToString());
                }
                catch
                {
                    continue;
                }
            }
            return decodedList.Count > 0 ? string.Join(",", decodedList) : null;
        }

        private VehicleResponseDto MapToResponseDto(Dictionary<string, object> row)
        {
            int GetInt(string key)
                => row.ContainsKey(key) && row[key] != DBNull.Value
                    ? Convert.ToInt32(row[key]) : 0;

            string? GetString(string key)
                => row.ContainsKey(key) && row[key] != DBNull.Value
                    ? row[key].ToString() : null;

            bool GetBool(string key)
                => row.ContainsKey(key) && row[key] != DBNull.Value
                    && Convert.ToBoolean(row[key]);

            int? GetNullableInt(string key)
                => row.ContainsKey(key) && row[key] != DBNull.Value
                    ? Convert.ToInt32(row[key]) : null;

            int vehicleId = GetInt("vehicle_id");
            int vehicleTypeId = GetInt("vehicle_type_id");
            int fuelId = GetInt("fuel_id");
            int departmentId = GetInt("department_id");

            return new VehicleResponseDto
            {
                vehicle_id = _idEncoder.Encode(vehicleId),
                vehicle_type_id = vehicleTypeId > 0 ? _idEncoder.Encode(vehicleTypeId) : null,
                fuel_id = fuelId > 0 ? _idEncoder.Encode(fuelId) : null,
                department_id = departmentId > 0 ? _idEncoder.Encode(departmentId) : null,

                vehicle_number = GetString("vehicle_number"),
                vehicle_type_name = GetString("vehicle_type_name"),
                fuel_name = GetString("fuel_name"),
                department_name = GetString("DepartmentName"),
                engine_capacity = GetNullableInt("engine_capacity"),
                emission_standard = GetString("emission_standard"),
                IsActive = GetBool("IsActive")
            };
        }
    }
}