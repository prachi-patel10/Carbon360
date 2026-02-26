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
                var parameters = new[]
                {
            new SqlParameter("@vehicle_number", dto.vehicle_number),
            new SqlParameter("@vehicle_type_id", dto.vehicle_type_id),
            new SqlParameter("@fuel_id", dto.fuel_id),
            new SqlParameter("@department_id", dto.department_id),
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

        public async Task UpdateAsync(VehicleUpdateDto dto)
        {
            int decodedId = _idEncoder.Decode(dto.vehicle_id.ToString());

            var parameters = new[]
            {
                new SqlParameter("@vehicle_id", decodedId),
                new SqlParameter("@vehicle_number", dto.vehicle_number),
                new SqlParameter("@vehicle_type_id", dto.vehicle_type_id),
                new SqlParameter("@fuel_id", dto.fuel_id),
                new SqlParameter("@department_id", dto.department_id),
                new SqlParameter("@engine_capacity", dto.engine_capacity ?? (object)DBNull.Value),
                new SqlParameter("@emission_standard", dto.emission_standard ?? (object)DBNull.Value),
                new SqlParameter("@IsActive", dto.IsActive),
                new SqlParameter("@UpdatedBy", 1)
            };

            await _spService.ExecuteSpAsync("USP_CB_VehicleMasterUpdate", parameters);
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

        //        public async Task<PageResult> SearchAsync(VehicleSearchRequest request)
        //        {
        //            var parameters = new List<SqlParameter>
        //{
        //    new SqlParameter("@Search", request.Search ?? (object)DBNull.Value),
        //    new SqlParameter("@vehicle_type_id", request.vehicle_type_id ?? (object)DBNull.Value),
        //    new SqlParameter("@fuel_id", request.fuel_id ?? (object)DBNull.Value),
        //    new SqlParameter("@department_id", request.department_id ?? (object)DBNull.Value),
        //    new SqlParameter("@IsActive", request.IsActive ?? (object)DBNull.Value),
        //    new SqlParameter("@PageNumber", request.PageNumber),
        //    new SqlParameter("@PageSize", request.PageSize),
        //    new SqlParameter("@SortColumn", request.SortColumn),
        //    new SqlParameter("@SortDirection", request.SortDirection)
        //};

        //            var result = await _spService.ExecuteSpAsync(
        //                "USP_CB_VehicleMasterSearch",
        //                parameters.ToArray()
        //            );

        //            var dataList = (result.ContainsKey("Data") && result["Data"] != null)
        //    ? (result["Data"] as IEnumerable<object>)
        //        ?.Cast<Dictionary<string, object>>()
        //        .ToList()
        //    : new List<Dictionary<string, object>>();

        //            var vehicles = dataList.Select(MapToResponseDto).ToList();

        //            var pagination = result["Pagination"] as Dictionary<string, object>
        //                             ?? new Dictionary<string, object>();

        //            return new PageResult
        //            {
        //                Data = vehicles,
        //                TotalRecords = pagination.ContainsKey("TotalRecords") ? Convert.ToInt32(pagination["TotalRecords"]) : 0,
        //                TotalPages = pagination.ContainsKey("TotalPages") ? Convert.ToInt32(pagination["TotalPages"]) : 0,
        //                CurrentPage = pagination.ContainsKey("CurrentPage") ? Convert.ToInt32(pagination["CurrentPage"]) : 0
        //            };
        //        }
        public async Task<VehicleSearchResponse> SearchAsync(VehicleSearchRequest request)
        {
            var parameters = new List<SqlParameter>
    {
        new SqlParameter("@Search", request.Search ?? (object)DBNull.Value),
        new SqlParameter("@vehicle_type_id", request.vehicle_type_id ?? (object)DBNull.Value),
        new SqlParameter("@fuel_id", request.fuel_id ?? (object)DBNull.Value),
        new SqlParameter("@department_id", request.department_id ?? (object)DBNull.Value),
        new SqlParameter("@IsActive", request.IsActive ?? (object)DBNull.Value),
        new SqlParameter("@PageNumber", request.PageNumber),
        new SqlParameter("@PageSize", request.PageSize),
        new SqlParameter("@SortColumn", request.SortColumn ?? (object)DBNull.Value),
        new SqlParameter("@SortDirection", request.SortDirection ?? (object)DBNull.Value)
    };

            var result = await _spService.ExecuteSpAsync("USP_CB_VehicleMasterSearch", parameters.ToArray());

            var dataList = (result.ContainsKey("Data") && result["Data"] != null)
                ? (result["Data"] as IEnumerable<object>)?.Cast<Dictionary<string, object>>().ToList()
                : new List<Dictionary<string, object>>();

            var vehicles = dataList.Select(MapToResponseDto).ToList();

            var pagination = result.ContainsKey("Pagination")
                ? result["Pagination"] as Dictionary<string, object>
                : new Dictionary<string, object>();

            return new VehicleSearchResponse
            {
                Data = vehicles,
                TotalRecords = pagination.ContainsKey("TotalRecords") ? Convert.ToInt32(pagination["TotalRecords"]) : 0,
                TotalPages = pagination.ContainsKey("TotalPages") ? Convert.ToInt32(pagination["TotalPages"]) : 0,
                CurrentPage = pagination.ContainsKey("CurrentPage") ? Convert.ToInt32(pagination["CurrentPage"]) : request.PageNumber
            };
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

        private VehicleResponseDto MapToResponseDto(Dictionary<string, object> row)
        {
            int GetInt(string key)
                => row.ContainsKey(key) && row[key] != DBNull.Value
                    ? Convert.ToInt32(row[key])
                    : 0;

            string? GetString(string key)
                => row.ContainsKey(key) && row[key] != DBNull.Value
                    ? row[key].ToString()
                    : null;

            bool GetBool(string key)
                => row.ContainsKey(key) && row[key] != DBNull.Value
                    && Convert.ToBoolean(row[key]);

            int? GetNullableInt(string key)
                => row.ContainsKey(key) && row[key] != DBNull.Value
                    ? Convert.ToInt32(row[key])
                    : null;

            return new VehicleResponseDto
            {
                vehicle_id = _idEncoder.Encode(GetInt("vehicle_id")),
                vehicle_number = GetString("vehicle_number"),

                //  Encrypt foreign keys
                vehicle_type_id = _idEncoder.Encode(GetInt("vehicle_type_id")),
                fuel_id = _idEncoder.Encode(GetInt("fuel_id")),
                department_id = _idEncoder.Encode(GetInt("department_id")),

                engine_capacity = GetNullableInt("engine_capacity"),
                emission_standard = GetString("emission_standard"),
                IsActive = GetBool("IsActive")
            };
        }
    }
}