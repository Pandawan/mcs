# mcs: Minecraft Script

`mcs` is a simple and easy to use scripting language which compiles into Minecraft functions.


# Installing globally:

Installation via `npm`:

     npm install mcs -g

This will install `mcs` globally so that it may be run from the command line.

## Usage:

     mcs [input] [output (optional)]

`[input]` is required, while `[output]` defaults to `./`.

# Development

Checkout this repository locally, then:

```sh
$ npm i
$ node index.js [input] [output (optional)]
```

To test on the web:
- Copy the `mcs.js` file to `./test/web`
- Open the `index.html` file
