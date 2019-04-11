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
    /// Quick and dirty sitemap middleware.
    /// </summary>
    public class SitemapMiddleware
    {
        private readonly MenuService _menu;
        private readonly RequestDelegate _next;

        public SitemapMiddleware(MenuService menu, RequestDelegate next)
        {
            _menu = menu;
            _next = next;
        }

        public Task Invoke(HttpContext httpContext)
        {
            StringBuilder sb = new StringBuilder("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">");
            foreach (Models.MenuPackage package in _menu.GetMenu())
            {
                foreach (var view in package.Items)
                {
                    string path = $"/{ package.Name }/{ view.View }";
                    sb.AppendFormat($"<url><loc>{ httpContext.ToAbsoluteUrl(path) }</loc></url>");
                }
            }
            sb.Append("</urlset>");
            httpContext.Response.ContentType = "application/xml";
            return httpContext.Response.WriteAsync(sb.ToString());
        }
    }
}
