```
yarn install
yarn tsc
node src/evm_alt.ts
```

------

# Primer on hexadecimals

- Base 16 number system. It's the encoding used by EVM.
- Can represent 15 (2^4 - 1) values in one integer. Therefore is 4 bytes.
- `uint8` means unsigned integer of 8 bytes, which corresponds to 2 hexadecimal digits. (00 - FF)
- `uint256` corresponds to 256/4 = 64 hexadecimal digits.
- zeros padding is necessary.

# Critical Bytecodes Used

| uint8 | Mnemonic     | Stack Input            | Stack Output | Expression                            | Notes                                                        |
| ----- | ------------ | ---------------------- | ------------ | ------------------------------------- | ------------------------------------------------------------ |
| 00    | STOP         |                        |              |                                       |                                                              |
| 50    | POP          | _                      |              |                                       | pops a uint256 off the stack and discards it                 |
| 51    | MLOAD        | offset                 | value        | `value = memory[offset:offset+32]`    | reads a uint256 from memory                                  |
| 52    | MSTORE       | offset, value          |              | `memory[offset:offset+32] = value`    | writes a uint256 to memory                                   |
| 56    | JUMP         | destination            |              | `$pc = destination`                   | unconditional jump                                           |
| 57    | JUMPI        | destination, condition |              | `$pc = cond ? destination : $pc + 1`  | conditional jump if condition is truthy                      |
| 5B    | **JUMPDEST** |                        |              |                                       | metadata to annotate possible jump destinations. **Must append before pushing an integer!** |
| 58    | PC           |                        | `$pc`        | `PUSH(pc)`                            | program counter                                              |
| 60    | PUSH1        |                        |              |                                       |                                                              |
| 7F    | PUSH32       |                        | `uint256`    | `PUSH(uint256)`                       | pushes a 32-byte value onto the stack                        |
| F3    | RETURN       | offset, length         |              | `return memory[offset:offset+length]` | returns from this contract call                              |

**Other bytecodes:**

- `DUPx`: clones the last `x`-th value on the stack
- `SWAPx`: swaps the top of the stack with the `x+1`-th  last element

# Constant Bytecode Sequences

## Initialization

Reason: 

```
6000
```

<<<<<<< HEAD
## Return
=======
## Termination Step
>>>>>>> 49dfeee50921a296ade31f4459b93c57a03642e9

```
60005260206000F3
```

# Sample evm bytecodes

1. `4 + 5;`

  ```
  6000\
  7F\
  0000000000000000000000000000000000000000000000000000000000000004\
  7F\
  0000000000000000000000000000000000000000000000000000000000000005\
  01\
  60\
  01\
  52\
  60\
  20\
  60\
  01\
  F3
  ```

| Line | Translation | Stack (Top ... Bottom)    | Memory              |
| ---- | ----------- | ------------------------- | ------------------- |
| 1    | PUSH32      |                           |                     |
| 2    | (uint256) 4 | (uint256) 4;              |                     |
| 3    | PUSH32      | (uint256) 4;              |                     |
| 4    | (uint256) 5 | (uint256) 4; (uint256) 5; |                     |
| 5    | ADD         | (uint256) 9;              |                     |
| 6    | PUSH1       |                           |                     |
| 7    | (uint8) 0   | (uint8) 0; (uint256) 9;   |                     |
| 8    | MSTORE      |                           | [0:32]=(uint256) 9; |
| 9    | PUSH1       |                           |                     |
| 10   | (uint8) 32  | (uint8) 32;               |                     |
| 11   | PUSH1       |                           |                     |
| 12   | (uint8) 0   | (uint8) 0; (uint8) 32;    |                     |
| 13   | RETURN      |                           |                     |

  ```
  RETURN offset=0 length=3
  ```

  output: `0x0000000000000000000000000000000000000000000000000000000000000009`

2. `1 < 2 ? 3 : 4;`

  > true statement is after the false statement.

  ```
  7F\
  0000000000000000000000000000000000000000000000000000000000000002\
  7F\
  0000000000000000000000000000000000000000000000000000000000000001\
  10\
  7F\
  0000000000000000000000000000000000000000000000000000000000000048\
  58\
  01\
  57\
  7F\
  0000000000000000000000000000000000000000000000000000000000000004\
  58\
  7F\
  0000000000000000000000000000000000000000000000000000000000000045\
  01\
  56\
  5B\
  7F\
  0000000000000000000000000000000000000000000000000000000000000003\
  5B\
  60005260206000F3
  ```

| Line | Translation               | Stack (Top ... Bottom)                    | Memory              | PC   | delta |
| ---- | ------------------------- | ----------------------------------------- | ------------------- | ---- | ----- |
| 1    | PUSH32                    |                                           |                     | 1    | 1     |
| 2    | 2                         | (uint256) 2;                              |                     | 33   | 32    |
| 3    | PUSH32                    |                                           |                     | 34   | 1     |
| 4    | 1                         | (uint256) 1; (uint256) 2;                 |                     | 66   | 32    |
| 5    | LT                        | (uint8) 1;                                |                     | 67   | 1     |
| 6    | PUSH32                    | (uint8) 1;                                |                     | 68   | 1     |
| 7    | (uint256) 72 (line 8-19?) | (uint8) 72; (uint8) 1;                    |                     | 100  | 32    |
| 8    | PC                        | (uint8) 100; (uint8) 72; (uint8) 1;       |                     | 101  | 1     |
| 9    | ADD                       | (uint8) 172; (uint8) 1;                   |                     | 102  | 1     |
| 10   | JUMPI                     |                                           |                     | 103  | 1     |
| 11   | PUSH32                    |                                           |                     | 104  | 1     |
| 12   | 4                         | (uint256) 4;                              |                     | 136  | 32    |
| 13   | PC                        | (uint256) 136; (uint256) 4;               |                     | 137  | 1     |
| 14   | PUSH32                    |                                           |                     | 138  | 1     |
| 15   | (uint256) 69 (line 13-21) | (uint256) 69; (uint256) 136; (uint256) 4; |                     | 170  | 32    |
| 16   | ADD                       | (uint256) 205; (uint256) 4;               |                     | 171  | 1     |
| 17   | JUMP (to the end)         | (uint256) 4; (discarded?)                 |                     | 172  | 1     |
| 18   | JUMPDEST                  |                                           |                     | 173  |       |
| 19   | PUSH32                    |                                           |                     | 174  | 1     |
| 20   | 3                         | (uint256) 3;                              |                     | 205  |       |
| 21   | JUMPDEST                  |                                           |                     | 206  |       |
|      | **return sequence!**      |                                           |                     |      |       |
| 22   | PUSH1                     |                                           |                     |      |       |
|      | (uint8) 0                 | (uint8) 0; (uint256) 9;                   |                     |      |       |
|      | MSTORE                    |                                           | [0:32]=(uint256) 9; |      |       |
|      | PUSH1                     |                                           |                     |      |       |
|      | (uint8) 32                | (uint8) 32;                               |                     |      |       |
|      | PUSH1                     |                                           |                     |      |       |
|      | (uint8) 0                 | (uint8) 0; (uint8) 32;                    |                     |      |       |
|      | RETURN                    |                                           |                     |      |       |

3. `let x = 3;`

  ```
  PUSH32 3
  PUSH32 global offset
  MSTORE
  ```

  ```
  6000\
  7F\
  0000000000000000000000000000000000000000000000000000000000000003\
  7F\
  0000000000000000000000000000000000000000000000000000000000000020\
  52\
  60005260206000F3
  ```

4. `let x = 3; x = x+x;`

5. ```javascript
	function f() {
	    return 3;
	}
	f();
	```

	```typescript
	offsetLookup = {
	    "f": 
	}
	```

	```
	6000\
	7F\
	\
	56\
	5B\
	7F\
	0000000000000000000000000000000000000000000000000000000000000003\
	58\
	00\
	51\
	56\
	5B\
	7F\
	0000000000000000000000000000000000000000000000000000000000000005\
	58\
	01\
	6000\
	52\
	7F\
	line 5\
	56\
	5B\
	60005260206000F3
	```

	| Line | Translation | Stack (Top ... Bottom) | Memory | PC   | delta |
	| ---- | ----------- | ---------------------- | ------ | ---- | ----- |
	| 2    |             |                        |        |      |       |
	|      |             |                        |        |      |       |
	|      |             |                        |        |      |       |

	

6. ```
	load 0
	jump to jumpdest 0
	jumpdest
	push 3
	mload pc
	jump
	JUMPDEST 0
	store pc
	jump line 3
	jumpdest
	return  sequence
	```

4. 

8. ```javascript
	function f() {
	    let w = g() + 1;
	    let x = 1;
	    function g(w) { // typescript points to the offsets in evm memory
	        let x = 5 + w;
	        let z2 = 6;
	        return x;
	    }
	    return x;
	}
	f();
	let y = 2;
	```

	lambda lifting

	```typescript
	Environment = {
	    locals: {
	        z : 0,
	        z2: 32
	    }
	    upper_scope : {
	        locals: {
	            w : 0, 
	            x : 32
	        }
	        upper_scope : {
	            locals : {
	                f : 0,
	                y : 32
	            }
	        }
	    }
	}
	```

	```
	6000\
	
	```

	| Line | Translation | Stack | Memory | PC   | delta |
	| ---- | ----------- | ----- | ------ | ---- | ----- |
	| 2    |             |       |        |      |       |
	|      |             |       |        |      |       |
	|      |             |       |        |      |       |

	

9. ```javascript
	function f() {
	    return x;
	}
	let y = 5;
	f();
	```

	TypeScript will print the error. Unable to find `x`.

10. ```javascript
	function f() {
	    return x;
	}
	let x = 5;
	f();
	```

11. 

5. 

# Implementation

## Memory Structure

All data are stored as 32 byte words on memory

| Offset        | Usage                                                        |
| ------------- | :----------------------------------------------------------- |
| 0x00          | Current stack pointer                                        |
| 0x20          | Current environment pointer                                  |
| 0x40 - 0x200  | Stack space, stores pointer to start of an environment, 0x40 always stores 0x220, grows downwards |
| 0x220 onwards | Heap space, all allocated variables and PC pointers          |

### Allocation of variables

1. During compilation, map name to local offset in compiler symbol lookup table, starting with 32 and increasing by 32 with every new name, based on variables' order of appearance
2. Load current environment offset from 0x20
3. Add local offset to environment offset to get actual offset for that name in memory
4. Store to memory at that offset

### Retrieval of variables

1. During compilation, get local offset from symbol lookup table
2. Load current environment offset from 0x20
3. Add local offset to environment offset to get actual offset for that name in memory
4. Load from memory at that offset

### Allocation of constants (including functions)

1. Compile constants as bytecode
2. Append jump instruction at end of bytecode
3. Put all constants bytecode at front of the entire program
4. Store PC offset to memory at memory offset of that constant

### Accessing constants

1. Put current PC on stack
2. Add a sufficient number to skip over later instructions
3. Load PC offset from memory
4. Jump to constant

### Function calls

1. Put return PC on stack
2. Put all arguments on stack
3. Get offset of next empty space on memory, and grow runtime stack by 1, putting the new offset on the newly assigned stack space
4. Update 0x00 and 0x20
5. Jump to function
6. Function stores all arguments to memory
7. *Function body*
8. Put evaluated return result on stack
   1. Top element on stack should be return value, 2nd value should be return PC
9. Decrease value in 0x00 by 32
10. Load from 0x00, and load from the loaded offset
11. Store the result to 0x20
12. Swap first two elements
13. Jump to return PC

### Tail Recursion

Only if a function call is a return statement, and is the only expression of the return statement. Same as a normal function call, but before jumping to function, shift stack pointer and environment pointer back to original caller, and do not put return PC of current function on stack. 

### Division by Zero Check within EVM

### Runtime Stack Overflow on EVM

### Nested Functions

### Loops

1. break
2. continue
3. for loop closures
4. 

