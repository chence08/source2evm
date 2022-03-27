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

## Return

```
60005260206000F3
```

# Sample evm bytecodes

1. `return 4 + 5;`

  ```
  60007F\
  0000000000000000000000000000000000000000000000000000000000000004\
  7F\
  0000000000000000000000000000000000000000000000000000000000000005\
  01\
  60\
  00\
  52\
  60\
  20\
  60\
  00\
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

2. `return 1 < 2 ? 3 : 4;`

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

5. constant array


Memory structure: 
0x0: stack pointer
0x20: current env offset
0x20 - 0x220: stack
data at stack is offset to that env in memory
0x220 onwards: 
variables