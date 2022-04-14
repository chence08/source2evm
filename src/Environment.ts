import { PUSH32, PUSH, LDCB, opCodes, PUSH4 } from "./Opcode";

export default class Environment {
  upper_scope: Environment;
  locals: Record<string, number>;
  pc_offset: number;
  frame_offset: number;
  total_var_count: number = 1;
  public constants: string[] = [];
  public funcs: Record<string, string[]>;
  public next_name: string;
  
  constructor(upper_scope?: Environment, pc_offset?: number) {
    if (upper_scope) {
      this.upper_scope = upper_scope;
      this.funcs = upper_scope.funcs;
    } else {
      this.funcs = {};
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

  insert(key: string) {
    if (!this.locals.hasOwnProperty(key)) {
      this.locals[key] = this.total_var_count * 32;
      this.total_var_count += 1;
    }
  }

  update_mem(name: string, value: number, offset_code: string): string {
    if(this.locals.hasOwnProperty(name)) {
      return PUSH4(value) + offset_code + opCodes.MSTORE;
    } else {
      return "";
    }
  }

  get_next_free(): string {
    const total_offset = PUSH32(this.total_var_count * 32);
    return PUSH(32) + opCodes.MLOAD + total_offset + opCodes.ADD;
  }
  
  update_stack(func: string): string {
    if(this.locals.hasOwnProperty(func)) {
      return this.extend_env();
    } else if(this.upper_scope != null) {
      return this.upper_scope.update_stack(func);
    } else {
      throw new Error("Function not found");
    }
  }

  extend_env(): string {
      // current stack pointer + 32 -> change to current heap offset
      // 0x00 change to new stack pointer
      return PUSH(0) + opCodes.MLOAD + PUSH(32) + opCodes.ADD + opCodes.DUP1 // 2 copies of new pointer to stack
        + PUSH(0) + opCodes.MSTORE // store to 0x0
        + this.get_next_free() + opCodes.DUP1 // + opCodes.DUP1 // 3 copies of new env pointer
        // + PUSH(32) + opCodes.MLOAD
        // + opCodes.SWAP1 + opCodes.MSTORE
        + opCodes.SWAP2 + opCodes.MSTORE // store new env pointer to new stack pointer
        + PUSH(32) + opCodes.MSTORE; // store new env pointer to 0x20
  }
  go_up_stack(): string {
    // return PUSH(32) + PUSH(0) + opCodes.MLOAD + opCodes.SUB + PUSH(0) + opCodes.MSTORE
    //      + PUSH(0) + opCodes.MLOAD + opCodes.MLOAD + PUSH(32) + opCodes.MSTORE;
    return PUSH(32) + PUSH(0) + opCodes.MLOAD + opCodes.SUB + opCodes.DUP1 + PUSH(0) + opCodes.MSTORE + opCodes.MLOAD + PUSH(32) + opCodes.MSTORE;
    // return PUSH(32) + opCodes.MLOAD + opCodes.MLOAD + PUSH(32) + opCodes.MSTORE + PUSH(32) + PUSH(0) + opCodes.MLOAD + opCodes.SUB + PUSH(0) + opCodes.MSTORE;
  }

  go_down_stack(): string {
    // return PUSH(32) + PUSH(0) + opCodes.MLOAD + opCodes.ADD + PUSH(0) + opCodes.MSTORE
    //      + PUSH(0) + opCodes.MLOAD + opCodes.MLOAD + PUSH(32) + opCodes.MSTORE;
    return PUSH(32) + PUSH(0) + opCodes.MLOAD + opCodes.ADD + opCodes.DUP1 + PUSH(0) + opCodes.MSTORE + opCodes.MLOAD + PUSH(32) + opCodes.MSTORE;
  }

  get_name_offset(name: string): string {
    // console.log(this.count_layers());
    if(this.locals.hasOwnProperty(name)) {
      // const layer = this.count_layers();
      // console.log(layer);
      // return PUSH(0x20) + PUSH4(layer * 32) + opCodes.ADD + opCodes.MLOAD + PUSH4(this.locals[name]) + opCodes.ADD
      return PUSH(32) + opCodes.MLOAD + PUSH4(this.locals[name]) + opCodes.ADD;
    // } else if(this.upper_scope !== null) {
    //   // return this.upper_scope.get_name_offset(name);
    //   // return PUSH4(0x220) + PUSH4(this.upper_scope.search(name)) + opCodes.ADD;
    //   return this.go_up_stack() + this.upper_scope.get_name_offset(name) + this.go_down_stack();
    } else {
      // console.log(name);
      throw new Error("Name not declared: " + name);
    }
  }

  count_layers(): number {
    if (this.upper_scope === null) {
      return 1;
    } else {
      return 1 + this.upper_scope.count_layers();
    }
  }

  get_locals(): string {
    let code = "";
    for (const x of Object.keys(this.locals)) {
      code = code + this.get_name_offset(x) + opCodes.MLOAD;
    }
    return code;
  }

  get_local_count(): string {
    return PUSH4(Object.keys(this.locals).length);
  }

  // consume_prev_locals(n: number): string {
  //   const get_free = this.get_next_free();

  //   let code = PUSH4(n * 32) + get_free + opCodes.MSTORE;

  //   for (let i = 0; i < n; i++) {
  //     code = code + 
  //   }
  // }
}