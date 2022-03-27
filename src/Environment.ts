import { PUSH32, PUSH, LDCB, opCodes } from "./Opcode";

export default class Environment {
  upper_scope: Environment;
  locals: Record<string, number>;
  pc_offset: number;
  frame_offset: number;
  public constants: string[] = [];
  
  constructor(upper_scope?: Environment, pc_offset?: number) {
    if (upper_scope) {
      this.upper_scope = upper_scope;
    } else {
      this.upper_scope = null;
    }
    this.locals = {};
    if (pc_offset) {
      this.pc_offset = pc_offset;
    } else {
      this.pc_offset = 1;
    }
  }

  
  search(key: string): number {
    if(this.locals.hasOwnProperty(key)) {
      return this.locals[key];
    } else {
      if(this.upper_scope) {
        return this.upper_scope.search(key);
      } else {
        return -1;
      }
    }
  }

  insert(key: string, val: number) {
    this.locals[key] = val;
  }

  update_mem(name: string, value: number, offset_code: string): string {
    console.log("UPDATE MEM");
    console.log(name);
    console.log(value);
    if(this.locals.hasOwnProperty(name)) {
      return PUSH(value) + offset_code + opCodes.MSTORE;
    } else {
      return "";
    }
  }

  get_next_free(): string {
    const total_offset = PUSH32(Object.keys(this.locals).length * 32);
    return PUSH(32) + opCodes.MLOAD + total_offset + opCodes.ADD;
  }
  
  update_stack(func: string): string {
    if(this.locals.hasOwnProperty(func)) {
      // current stack pointer + 32 -> change to current heap offset
      // 0x00 change to new stack pointer
      return PUSH(0) + opCodes.MLOAD + PUSH(32) + opCodes.ADD + opCodes.DUP1 + this.get_next_free() + opCodes.SWAP1 + opCodes.MSTORE + PUSH(0) + opCodes.MSTORE;
    } else {
      return "";
    }

  }
}