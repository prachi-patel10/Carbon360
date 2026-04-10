using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using ProjectApp.Repository.Interfaces.GenerationOperation;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Repository.Utilities.SP
{
    public class CorporatePendingGeneratorService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;

        public CorporatePendingGeneratorService(IServiceScopeFactory scopeFactory)
        {
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                using var scope = _scopeFactory.CreateScope();

                var service = scope.ServiceProvider
                    .GetRequiredService<IGeneratorOperationService>();

                await service.GetCorporatePendingGeneratorAsync();

                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
            }
        }
    }
}
