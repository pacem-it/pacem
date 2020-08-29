using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Pacem.Js.CustomElements
{
    internal static class HttpContextExtensions
    {
        public static string ToAbsoluteUrl(this HttpContext context, string path)
        {
            if (string.IsNullOrEmpty(path))
            {
                path = "/";
            }
            if (path?.StartsWith("http", StringComparison.OrdinalIgnoreCase) == true)
                return path;
            if (!path.StartsWith("/"))
            {
                path = string.Concat("/", path);
            }
            return $"{ context.Request.Scheme }://{ context.Request.Host }{ path }";
        }

    }
}
