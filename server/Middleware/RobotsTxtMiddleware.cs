using Microsoft.AspNetCore.Http;
using Pacem.Js.CustomElements.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Pacem.Js.CustomElements.Middleware
{
    /// <summary>
    /// Quick and dirty robots.txt middleware.
    /// </summary>
    public class RobotsTxtMiddleware
    {
        private readonly RequestDelegate _next;

        public RobotsTxtMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public Task Invoke(HttpContext httpContext)
        {
            string sitemapUrl = httpContext.ToAbsoluteUrl("/sitemap");
            httpContext.Response.ContentType = "text/plain";
            return httpContext.Response.WriteAsync($@"user-agent: *
sitemap: { sitemapUrl }");
        }
    }
}
