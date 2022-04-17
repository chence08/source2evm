

# Source to EVM Compiler

Team Pontevedra.

*source2evm* is a Source to EVM bytecode compiler written in Typescript. This project comes bundled with standalone EVM binaries for both `arm64` and `x64` architecture that can be used to execute compiled code.

The compiler currently supports the compilation of a subset of Source to bytecode for the Ethereum Virtual Machine (EVM). Syntax follows that of Source. 

------

To build:

```
yarn install
yarn tsc
```

**Node requirements: v14.17.2**

> node v16 is not compatible as of last testing.

the evm binary provided is sourced from [Go Ethereum](https://geth.ethereum.org/).

------

## Usage

```
$ ./source2evm -i [input file] [option]
```

```
$ ./source2evm -h
Options: 
    -r: Execute the code with bundled EVM after compilation. 
    -o: Write output bytecode to output file. 
    -h: Show help message. 
```

Some example files you can run can be found in the [tests](./tests) folder.

------

## Things to note

### Execution Output

Similar to the Source interpreter, the compiled code will always return the result of the last statement of the given program that has return results. However, unlike the Source interpreter, if none of the statements in the program have return results, the code will return 0. 

### Unused Return Results

Due to the compiler's reliance on the EVM's stack for exiting from functions, **any** unused return values from any statements **within functions** will cause undefined behaviour, and will likely lead to EVM errors. Such statements can still be used outside of functions.

### Scoping

Note that ALL arguments are passed-by-value to functions, hence variables are NOT mutable across function scopes.

```javascript
let y = 1;
function f() {
    y = 2;
    return 0
}
y;
```

The above code will return 1, as `f` only changed the value of the copy of `y` within its own scope.

### Compiler Error Messages

There is no static type checking in the compiler, but the compiler will check and throw exceptions for the following:

- Reassigning values to constants

```javascript
const x = 2;
x = 3; // reassigning const, compiler will throw exception here
```

- Referring to undeclared name

```javascript
y + 4; // y not declared, compiler will throw exception here
```

- Using an unknown operator

```javascript
1 $ 2; // $ is not a supported operator
```

Note that there will not be any line number information in the error messages. 

------

## Supported Features

- Integer arithmetic
- Boolean operations
- Declaration of variables and constants
- Functions
  - Function declarations and applications of named and anonymous functions
  - Nested functions
  - Recursion, tail call optimisation, mutual recursion
  - Functions as parameters and return values
- Conditionals
  - Ternary operator \& `if-else` statements
- While and for loops
  - Note that `break` and `continue` are not supported
