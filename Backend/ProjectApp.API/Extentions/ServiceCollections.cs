using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using pr.Repository.Services.Auth;
using ProjectApp.Repository.Interfaces.Common;
using ProjectApp.Repository.Interfaces.Masters.City;
using ProjectApp.Repository.Interfaces.Masters.Department;
using ProjectApp.Repository.Interfaces.Masters.EmissionFactor;
using ProjectApp.Repository.Interfaces.Masters.Fuel;
using ProjectApp.Repository.Interfaces.Masters.Generator;
using ProjectApp.Repository.Interfaces.Masters.Role;
using ProjectApp.Repository.Interfaces.Masters.Vehicle;
using ProjectApp.Repository.Interfaces.Masters.VehicleType;
using ProjectApp.Repository.Interfaces.SiteLocation;
using ProjectApp.Repository.Interfaces.User;
using ProjectApp.Repository.Interfaces.VehicleTripEmission;
using ProjectApp.Repository.Services.Common;
using ProjectApp.Repository.Services.Masters.City;
using ProjectApp.Repository.Services.Masters.Department;
using ProjectApp.Repository.Services.Masters.EmissionFactor;
using ProjectApp.Repository.Services.Masters.Fuel;
using ProjectApp.Repository.Services.Masters.Generator;
using ProjectApp.Repository.Services.Masters.Role;
using ProjectApp.Repository.Services.Masters.Vehicle;
using ProjectApp.Repository.Services.Masters.VehicleType;
using ProjectApp.Repository.Services.SiteLocation;
using ProjectApp.Repository.Services.User;
using ProjectApp.Repository.Services.VehicleTripEmission;
using ProjectApp.Repository.Utilities.Auth;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.API.Extentions
{
    public static class ServiceCollections
    {
        public static IServiceCollection AddProjectServices(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddScoped<ISPService>(sp =>
                new SPService(configuration.GetConnectionString("DbString"))
            );
            services.AddScoped<IAuthService, AuthService>();
            services.AddScoped<IDepartmentService, DepartmentService>();
            services.AddScoped<JWTService>();
            services.AddSingleton<IdEncoder>();
            services.AddScoped<IUserService, UserService>();
            services.AddScoped<IRoleService, RoleService>();
            services.AddScoped<IUserContext, UserContext>();
            services.AddScoped(typeof(ICommonService<>), typeof(CommonService<>));
            services.AddHttpContextAccessor();
            services.AddScoped<IFuelService, FuelService>();
            services.AddScoped<IVehicleTypeService, VehicleTypeService>();
            services.AddScoped<ICityService, CityService>();    
            services.AddScoped<IVehicleService, VehicleService>();
            services.AddScoped<IGeneratorService, GeneratorService>();
            services.AddScoped<IVehicleTripEmissionService, VehicleTripEmissionService>();
            services.AddScoped<ISiteLocationService, SiteLocationService>();
            services.AddScoped<IEmissionFactorService, EmissionFactorService>();
            return services;
        }
    }
}
