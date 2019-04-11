using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Pacem.Js.CustomElements.Models;
using Pacem.Js.CustomElements.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;

namespace Pacem.Js.CustomElements.Controllers
{
    public class HomeController : Controller
    {
        private readonly MenuService _menu;
        private readonly SeoService _seo;
        private readonly VersionOptions _v;

        public HomeController(Services.MenuService menu, Services.SeoService seo, IOptions<VersionOptions> v)
        {
            _menu = menu;
            _seo = seo;
            _v = v.Value;
        }

        private MenuItem FindMenuEntry(string package, string view)
        {
            return _menu.GetMenu()
                .Where(p => string.Equals(p.Name, package, StringComparison.OrdinalIgnoreCase))
                .SelectMany(i => i.Items.Where(m => string.Equals(m.View, view, StringComparison.OrdinalIgnoreCase)))
                .FirstOrDefault();
        }

        public IActionResult Index(string package, string view, string prefix)
        {
            MenuItem menuItem = FindMenuEntry(package, view);
            string title = menuItem?.Title ?? menuItem?.Label;
            string master = string.IsNullOrEmpty(prefix) ? "/server/Views/Home/Index.cshtml" : "/server/Views/Home/CustomPrefix.cshtml";
            string htmlRaw = _seo.ParseView(package, view);

            // missing content file?
            // then render home.
            if (string.IsNullOrEmpty(htmlRaw))
            {
                package = view = default(string);
            }

            // return view
            return View(master, new ViewModel
            {
                Package = package,
                View = view,
                Title = title,

                // seo stuff
                HtmlContent = htmlRaw,

                Version = _v.Version,
                Refresh = _v.Refresh.ToString()
            });
        }
    }
}
