using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using ProjectApp.API.Extentions;
using ProjectApp.Core.Context;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.User;
using ProjectApp.Repository.Services.Permit;
using ProjectApp.Repository.Services.User;
using ProjectApp.Repository.Utilities.SP;
using PuppeteerSharp;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddDbContext<CBContext>(op =>
{
    op.UseSqlServer(builder.Configuration.GetConnectionString("DbString"));
   
});

builder.Services.Configure<EmailSettings>(
    builder.Configuration.GetSection("EmailSettings"));

builder.Services.AddHostedService<CorporatePendingGeneratorService>();

builder.Services.AddHostedService<CorporatePendingTripBackgroundService>();

//JWT
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["JwtSettings:Key"] ?? string.Empty)
        ),

        ValidateIssuer = true,
        ValidateAudience = true,

        ValidIssuer = builder.Configuration["JwtSettings:Issuer"],
        ValidAudience = builder.Configuration["JwtSettings:Audience"],

        ClockSkew = TimeSpan.Zero,
        
    };
});

builder.Services.AddAuthorization();

builder.Services.AddEndpointsApiExplorer();
//JWTSwagger
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "TaskPrac API",
        Version = "v1"
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter: Bearer {token}"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

Console.WriteLine(builder.Configuration.GetConnectionString("DbString"));

builder.Services.AddHttpContextAccessor();

//Mapper
builder.Services.AddAutoMapper(typeof(MapperConfig));

//DI
builder.Services.AddProjectServices(builder.Configuration);
//CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

await new BrowserFetcher().DownloadAsync();
Console.WriteLine("✅ Chromium ready.");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
