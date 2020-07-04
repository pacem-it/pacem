using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace Pacem.Js.CustomElements
{
    public class Startup
    {
        private readonly IConfigurationRoot _configuration;
        private readonly IWebHostEnvironment _env;

        public Startup(IWebHostEnvironment env)
        {
            _env = env;
            var builder = new ConfigurationBuilder()
            .SetBasePath(env.ContentRootPath)
            .AddJsonFile("config.json", optional: false, reloadOnChange: true)
            .AddJsonFile("config.local.json", optional: true, reloadOnChange: true)
            .AddEnvironmentVariables();

            _configuration = builder.Build();
        }

        // This method gets called by the runtime. Use this method to add services to the container.
        // For more information on how to configure your application, visit https://go.microsoft.com/fwlink/?LinkID=398940
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddOptions<VersionOptions>().Bind(_configuration.GetSection("pacemjs"));
            if (!_env.IsDevelopment())
            {
                services.AddLogging(options =>
                {
                    options.ClearProviders();
                });
            }
            services.AddSignalR();
            services.AddMemoryCache();
            services.AddSingleton<Services.MenuService>();
            services.AddSingleton<Services.SeoService>();
            services.AddSingleton<Mvc.Uploading.IUploader, Services.UploadService>();
            services.AddMvc().SetCompatibilityVersion(Microsoft.AspNetCore.Mvc.CompatibilityVersion.Latest);

            // letsencrypt acme http challenge
            services.AddPacemAcmeHttpChallenge(options =>
            {
                options.ConnectionString = _configuration.GetConnectionString("storage");
            });
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            // letsencrypt acme http challenge
            app.UsePacemAcmeHttpChallenge();

            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }
            else
            {
                app.UseHttpsRedirection();
            }

            app.UseStaticFiles();
            app.Map("/robots.txt", branch => branch.UseMiddleware<Middleware.RobotsTxtMiddleware>());
            app.Map("/sitemap", branch => branch.UseMiddleware<Middleware.SitemapMiddleware>());
            
            app.UseRouting();
            app.UseEndpoints(routes =>
            {
                #region signalR
                routes.MapHub<Hubs.Lobby>("/lobby");
                #endregion

                #region default route
                routes.MapControllerRoute("default", "{package}/{view}/{id?}",
                        new { controller = "Home", action = "Index", package = "intro", view = "welcome" });
                #endregion

            });
        }
    }
}
