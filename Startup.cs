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

namespace Pacem.Js.CustomElements
{
    public class Startup
    {
        private readonly IConfigurationRoot _configuration;

        public Startup(IHostingEnvironment env)
        {
            var builder = new ConfigurationBuilder()
            .SetBasePath(env.ContentRootPath)
            .AddJsonFile("config.json", optional: false, reloadOnChange: true)
            .AddJsonFile("config.local.json", optional: true, reloadOnChange: true);

            _configuration = builder.Build();
        }

        // This method gets called by the runtime. Use this method to add services to the container.
        // For more information on how to configure your application, visit https://go.microsoft.com/fwlink/?LinkID=398940
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddOptions<VersionOptions>().Bind(_configuration.GetSection("pacemjs"));
            services.AddSignalR();
            services.AddMemoryCache();
            services.AddSingleton<Services.MenuService>();
            services.AddSingleton<Services.SeoService>();
            services.AddMvc().SetCompatibilityVersion(Microsoft.AspNetCore.Mvc.CompatibilityVersion.Version_2_2);            
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IHostingEnvironment env, ILoggerFactory loggerFactory)
        {
            loggerFactory.AddConsole();

            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }

            app.UseStaticFiles();
            app.Map("/robots.txt", branch => branch.UseMiddleware<Middleware.RobotsTxtMiddleware>());
            app.Map("/sitemap", branch => branch.UseMiddleware<Middleware.SitemapMiddleware>());
            app.UseSignalR(routes =>
            {
                routes.MapHub<Hubs.Lobby>("/lobby");
            });
            app.UseMvc(routes =>
            {
                #region default route
                routes.MapRoute("default", "{package}/{view}/{id?}",
                        new { controller = "Home", action = "Index", package = "intro", view = "welcome" });
                #endregion

            });
        }
    }
}
