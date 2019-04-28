# Pacem LESS

[Pacem JS](https://www.npmjs.com/package/pacem) theme templating, it uses LESS to obtain css files.

### Install

```
$ npm i pacem-less
```

### Usage

Pick the files **_/pacem/theme-empty.less_** and **_/pacem/fonts-empty.less_** 
in the node sub-folder and copy it locally (e.g. as **_my-theme.less_** and **_my-fonts.less_**), then play around with variables.

Once ready, launch:

```
lessc --modify-var="fonts=[path]/my-fonts" --modify-var="theme=[path]/my-theme" node_modules/pacem-less/pacem/pacem.less dist/css/my-theme.css
```

Where `[path]` is the relative path from _node_modules/pacem-less/pacem/pacem.less_ to
reach _my-theme.less_ and _my-fonts.less_.