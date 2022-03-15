 // Tags
// Integer: 1
// Boolean: 2
// Character: 3

import Node from "./Node";
import { zeroPad } from "./misc";
import { opCodes, PUSH32 } from "./Opcode";

export class Integer extends Node {
  value: number;
  
  constructor(value: number) {
    super(1, 32, 2, 1);
    this.value = value;
  }

  pushToMem(offset: number): [number, number, string] {
    return [offset + super.size, offset, 
            super.storeHeader(offset) 
            + PUSH32(zeroPad(this.value, 64))
            + PUSH32(zeroPad(offset + 32 * 4, 64))
            + opCodes.MSTORE];
  }
}

export class Boolean extends Node {
  value: number;

  constructor(value: boolean) {
    super(2, 32, 2, 1);
    this.value = value ? 1 : 0;
  }

  pushToMem(offset: number): [number, number, string] {
    return [offset + super.size, offset, 
            super.storeHeader(offset) 
            + PUSH32(zeroPad(this.value, 64))
            + PUSH32(zeroPad(offset + 32 * 4, 64))
            + opCodes.MSTORE];
  }

}

export class Character extends Node {
  value: number;

  constructor(value: string) {
    super(3, 32, 2, 1);
    this.value = value.charCodeAt(0);
  }

  pushToMem(offset: number): [number, number, string] {
    return [offset + super.size, offset, 
            super.storeHeader(offset) 
            + PUSH32(zeroPad(this.value, 64))
            + PUSH32(zeroPad(offset + 32 * 4, 64))
            + opCodes.MSTORE];
  }

}