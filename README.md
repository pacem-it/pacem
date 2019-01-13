[![npm version](https://badge.fury.io/js/pacem.svg)](https://www.npmjs.com/pacem)

![Pacem JS](https://pacem.azureedge.net/marketing/logojs.svg) Pacem JS
========

[Pacem JS](https://js.pacem.it) is a [CustomElements-v1](http://www.w3.org/TR/custom-elements/) based ecosystem for 
reusable web components.

It is meant to run in a web page inside a browser.
More precisely, a **ES2015 compliant** browser (i.e. Chrome, Firefox, Opera, Edge, ...). No, 
IE11 is not supported.

It follows the **MVVM Pattern** and has its own binding syntax. 

It is built with [TypeScript](http://www.typescriptlang.org).

Furthermore, it does not need to be "fully componentized" 
(i.e. no all-inclusive root node) in order to work:
it comes with on-the-fly bindings and autonomous bootstrap.

Basic example:
```html
<html>
    <head>
        <!-- polyfills -->
        <script src="https://github.com/webcomponents/custom-elements/blob/master/custom-elements.min.js"></script>
        <script src="node_modules/pacem/dist/js/polyfills/documentfragment.edge.js"></script>
        <!-- scripts -->
        <script src="node_modules/pacem/dist/js/pacem-core.min.js"></script>
        <script src="node_modules/pacem/dist/js/pacem-ui.min.js"></script>
        <script src="node_modules/pacem/dist/js/pacem-scaffolding.min.js"></script>
        <!-- styles -->
        <style src="node_modules/pacem/dist/css/pacem.min.css"></style>
    </head>
    <body>
        <!-- 
        <pacem-data> is in `pacem-core` 
        <pacem-data> allows its `model` attribute to be evaluated
        -->
        <pacem-data id="myModel" 
                    model="{ text: 'foo' }" 
                    persist-as="demoText"></pacem-data>
        
        <!-- 
        <pacem-input-text> is in `pacem-scaffolding` 
        -->
        <pacem-input-text value="{{ #myModel.model.text, twoway }}"></pacem-input-text>
        
        <p>
            <!-- 
            <pacem-text> is in `pacem-core` 
            <pacem-text> is the fastest custom element for plain text rendering
            -->
            <pacem-text text="{{ #myModel.model.text }}"></pacem-text>
        </p>
    </body>
</html>
```

(Source code, documentation and demos are on their ways...)


> **Pacem JS** won't obey semantic versioning until **v1**.  
> i.e. breaking changes ahead.

### Road-map to v1
To-do (improvements):

- **Modularize**: ongoing POC for an ES6-module version (+ WebPack);
- **CSP compliancy**. Mumblings:
  - try binding syntax semplifications that may avoid `Function()`;
  - ~~`inline-styles`: deal with them~~;
- **Tests**: more.