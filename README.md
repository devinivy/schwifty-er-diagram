# schwifty-er-diagram
generate ER diagrams w/ schwifty

[![Build Status](https://travis-ci.org/devinivy/schwifty-er-diagram.svg?branch=master)](https://travis-ci.org/devinivy/schwifty-er-diagram) [![Coverage Status](https://coveralls.io/repos/devinivy/schwifty-er-diagram/badge.svg?branch=master&service=github)](https://coveralls.io/github/devinivy/schwifty-er-diagram?branch=master)

Lead Maintainer - [Devin Ivy](https://github.com/devinivy)

## Installation
```sh
npm install schwifty-er-diagram
```

## Usage

In order to enable the `schwifty-er-diagram` [hpal](https://github.com/hapipal/hpal) command, register this module as a hapi plugin on your hapi server:

```js
await server.register(require('schwifty-er-diagram'));
```

Running `hpal run schwifty-er-diagram` will output [Mermaid](https://mermaid-js.github.io/mermaid/#/) markup for an ER diagram of the models on your hapi server registered using [schwifty](https://github.com/hapipal/schwifty).

### CLI Options
```
Usage: hpal run schwifty-er-diagram

Options:

  -h, --help        Show help
  -p, --plugin      Only include models from this plugin
  -m, --model       Allow list of models
  -M, --no-model    Disallow list of models
  -b, --between     Only look at relations between two models (ModelA..ModelB)
  -l, --link        Output a link to mermaid.live rather than markup
```
