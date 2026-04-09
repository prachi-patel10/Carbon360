using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using ProjectApp.Repository.Interfaces.VehicleTripEmission;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Repository.Services.Permit
{
    public class CorporatePendingTripBackgroundService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;

        public CorporatePendingTripBackgroundService(IServiceScopeFactory scopeFactory)
        {
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using (var scope = _scopeFactory.CreateScope())
                    {
                        var vehicleTripService = scope.ServiceProvider
                        .GetRequiredService<IVehicleTripEmissionService>();

                        await vehicleTripService.GetCorporatePendingTripsAsync();
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine(":x: Background Service Error: " + ex.Message);
                }

                //await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
                Console.WriteLine("Running Auto Permit Job: " + DateTime.Now);
            }
        }
    }
}