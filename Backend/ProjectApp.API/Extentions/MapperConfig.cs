using AutoMapper;
using ProjectApp.Core.DTOs.Account.GeneratorOperation;
using ProjectApp.Core.DTOs.Account.Role;
using ProjectApp.Core.DTOs.Account.User;
using ProjectApp.Core.DTOs.Account.VehicleTripEmission;
using ProjectApp.Core.DTOs.Masters.City;
using ProjectApp.Core.DTOs.Masters.Department;
using ProjectApp.Core.DTOs.Masters.EmissionFactor;
using ProjectApp.Core.DTOs.Masters.Fuel;
using ProjectApp.Core.DTOs.Masters.Generator;
using ProjectApp.Core.DTOs.Masters.SiteLocation;
using ProjectApp.Core.DTOs.Masters.Vehicle;
using ProjectApp.Core.DTOs.Masters.VehicleType;
using ProjectApp.Core.Models;
using System;

namespace ProjectApp.API.Extentions
{
    public class MapperConfig : Profile
    {
        public MapperConfig()
        {
            CreateMap<RoleDTO, CB_Role>().ReverseMap();
            CreateMap<RoleResponseDTO, CB_Role>().ReverseMap();
            CreateMap<UserDTO, CB_User>().ReverseMap();
            CreateMap<UserResDTO, CB_User>().ReverseMap();
            CreateMap<UserUpdateDTO, CB_User>().ReverseMap();
            CreateMap<CB_Department, DepartmentResponseDTO>()
     .ForMember(dest => dest.Id, opt => opt.Ignore());

            CreateMap<DepartmentCreateDTO, CB_Department>()
                .ForMember(dest => dest.DepartmentId, opt => opt.Ignore())
                .ForMember(dest => dest.IsDeleted, opt => opt.Ignore());

            CreateMap<DepartmentUpdateDTO, CB_Department>()
                .ForMember(dest => dest.DepartmentId, opt => opt.Ignore())
                .ForMember(dest => dest.IsDeleted, opt => opt.Ignore());

            CreateMap<CB_MasterFuelType, FuelResponseDTO>().ReverseMap();
            CreateMap<CB_MasterFuelType, FuelCreateUpdateDTO>().ReverseMap();

            CreateMap<CB_MasterVehicleType, VehicleTypeCreateDTO>().ReverseMap();
            CreateMap<CB_MasterVehicleType, VehicleTypeDTO>().ReverseMap();
            CreateMap<CB_MasterVehicleType, VehicleTypeResponseDTO>().ReverseMap();
            CreateMap<CB_MasterVehicleType, VehicleTypeUpdateDTO>().ReverseMap();

            // ================= VEHICLE MASTER =================
            CreateMap<CB_MasterVehicle, VehicleDto>().ReverseMap();
            CreateMap<CB_MasterVehicle, VehicleSearchRequest>().ReverseMap();
            CreateMap<CB_MasterVehicle, VehicleStatusDto>().ReverseMap();
            CreateMap<CB_MasterVehicle, VehicleUpdateDto>().ReverseMap();

            CreateMap<CB_MasterCity, CityResponseDTO>().ReverseMap();

            //----------------GENERATOR MASTER--------------
            CreateMap<CB_MasterGenerator, GeneratorCreateUpdateDTO>().ReverseMap();
            CreateMap<CB_MasterGenerator, GeneratorResponseDTO>().ReverseMap();
            CreateMap<CB_MasterGenerator, GeneratorSearchRequest>().ReverseMap();
            CreateMap<CB_MasterGenerator, GeneratorToggleStatusDTO>().ReverseMap();

            //-----------------SiteLocation Master---------------
            CreateMap<CB_MasterSiteLocation, SiteLocationCreateUpdateDTO>().ReverseMap();
            CreateMap<CB_MasterSiteLocation, SiteLocationResponseDTO>().ReverseMap();
            CreateMap<CB_MasterSiteLocation, SiteLocationSearchRequest>().ReverseMap();

            //----------------VEHICLE TRIP EMISSION--------------
            CreateMap<CB_VehicleTripEmission, CreateVehicleTripEmissionDTO>().ReverseMap();

            //---------------------Emission Factor----------------
            CreateMap<CB_EmissionFactor, EmissionFactorRequestDTO>().ReverseMap();
            CreateMap<CB_EmissionFactor, EmissionFactorResponseDTO>()
                .ForMember(dest => dest.Id,
                    opt => opt.MapFrom(src => src.EmissionFactorId));

            CreateMap<CB_GeneratorOperation, GeneratorOperationResponseDTO>().ReverseMap();

        }
    }
}
