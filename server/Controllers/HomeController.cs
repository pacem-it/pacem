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

        public VersionOptions _v { get; }

        public HomeController(Services.MenuService menu, IOptions<VersionOptions> v)
        {
            _menu = menu;
            _v = v.Value;
        }

        private MenuItem FindMenuEntry(string package, string view)
        {
            return _menu.GetMenu()
                .Where(p => string.Equals(p.Name, package, StringComparison.OrdinalIgnoreCase))
                .SelectMany(i => i.Items.Where(m => string.Equals(m.View, view, StringComparison.OrdinalIgnoreCase)))
                .FirstOrDefault();
        }

        public IActionResult Index(string package, string view)
        {
            MenuItem menuItem = FindMenuEntry(package, view);
            string title = menuItem?.Title ?? menuItem?.Label;
            return View("/server/Views/Home/Index.cshtml", new ViewModel
            {
                Package = package,
                View = view,
                Title = title,

                Version = _v.Version,
                Refresh = _v.Refresh.ToString()
            });
        }
    }
}
