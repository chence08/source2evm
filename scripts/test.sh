#!/bin/bash

JS_SLANG_REPL="node_modules/js-slang/dist/repl/repl.js"
JS_SLANG="node $JS_SLANG_REPL"
SOURCE_PATH="src/evm.js"

if [ ! -f "$JS_SLANG_REPL" ]; then
    failwith "js-slang repl not found at $JS_SLANG_REPL - hint: run \"yarn install\" first"
fi

$JS_SLANG -e --chapter=4 "$(< $SOURCE_PATH)"