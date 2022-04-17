*source2evm* is a Source to EVM bytecode compiler written in Typescript. This project comes bundled with standalone EVM binaries for both `arm64` and `x64` architecture that can be used to execute compiled code.

The compiler currently supports the compilation of a subset of Source to bytecode for the Ethereum Virtual Machine (EVM). Syntax follows that of Source. 

## Installation

To build: 

```bash
yarn add

yarn tsc
```

## Usage

The compiler can be used through the `NodeJS` script `source2evm.js`. If executed without compiled compiler code, the script will compile the compiler with `tsc`. 

```
./source2evm -i [input file] [option]
```

**Options**:  

  -r: Execute the code with bundled EVM after compilation. 

  -o: Write output bytecode to output file. 

  -h: Show help message. 

## Known Issues

Please switch to `Node v14` if there are any issues with running the compiler. Newer versions of Node could cause problems with dependencies. 



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
  - Ternary operator \& if-else statements
- While and for loops
  - Note that \code{break} and \code{continue} are not supported


## Test cases

A number of test programs can be found under `/tests`. The expected result of evaluation can be found at the end of each file. 


## Things to note

### Output

Similar to the Source interpreter, the compiled code will always return the result of the last statement of the given program that has return results. However, unlike the Source interpreter, if none of the statements in the program have return results, the code will return 0. 

### Unused return results

Due to the compiler's reliance on the EVM's stack for exiting from functions, **any** unused return values from any statements **within functions** will cause undefined behaviour, and will likely lead to EVM errors. Such statements can still be used outside of functions.

### Scoping

Note that ALL arguments are passed-by-value to functions, hence variables are NOT mutable across function scopes.

```javascript
  let y = 1;

  function f() { y = 2; return 0 };

  y;
```

The above code will return 1, as `f` only changed the value of the copy of `y` within its own scope.

## Compiler Error Messages

There is no static type checking in the compiler, but the compiler will check and throw exceptions for the following:

- Reassigning values to constants

```javascript
const x = 2;   x = 3; // reassigning const, compiler will throw exception here
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