"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Opcode_1 = require("./Opcode");
class Environment {
    constructor(upper_scope, pc_offset) {
        this.total_var_count = 1;
        this.constants = [];
        if (upper_scope) {
            this.upper_scope = upper_scope;
        }
        else {
            this.upper_scope = null;
        }
        this.locals = {};
        if (pc_offset) {
            this.pc_offset = pc_offset;
        }
        else {
            this.pc_offset = 1;
        }
    }
    search(key) {
        if (this.locals.hasOwnProperty(key)) {
            return this.locals[key];
        }
        else {
            if (this.upper_scope) {
                return this.upper_scope.search(key);
            }
            else {
                return -1;
            }
        }
    }
    insert(key) {
        if (!this.locals.hasOwnProperty(key)) {
            this.locals[key] = this.total_var_count * 32;
            this.total_var_count += 1;
        }
    }
    update_mem(name, value, offset_code) {
        console.log("UPDATE MEM");
        console.log(name);
        console.log(value);
        if (this.locals.hasOwnProperty(name)) {
            return (0, Opcode_1.PUSH4)(value) + offset_code + Opcode_1.opCodes.MSTORE;
        }
        else {
            return "";
        }
    }
    get_next_free() {
        const total_offset = (0, Opcode_1.PUSH32)(this.total_var_count * 32);
        return (0, Opcode_1.PUSH)(32) + Opcode_1.opCodes.MLOAD + total_offset + Opcode_1.opCodes.ADD;
    }
    update_stack(func) {
        if (this.locals.hasOwnProperty(func)) {
            return this.extend_env();
        }
        else if (this.upper_scope != null) {
            return this.upper_scope.update_stack(func);
        }
        else {
            throw new Error("Function not found");
        }
    }
    extend_env() {
        // current stack pointer + 32 -> change to current heap offset
        // 0x00 change to new stack pointer
        return (0, Opcode_1.PUSH)(0) + Opcode_1.opCodes.MLOAD + (0, Opcode_1.PUSH)(32) + Opcode_1.opCodes.ADD + Opcode_1.opCodes.DUP1 // 2 copies of new pointer to stack
            + (0, Opcode_1.PUSH)(0) + Opcode_1.opCodes.MSTORE // store to 0x0
            + this.get_next_free() + Opcode_1.opCodes.DUP1 // 2 copies of new env pointer
            + Opcode_1.opCodes.SWAP2 + Opcode_1.opCodes.MSTORE // store new env pointer to new stack pointer
            + (0, Opcode_1.PUSH)(32) + Opcode_1.opCodes.MSTORE; // store new env pointer to 0x20
    }
    go_up_stack() {
        return (0, Opcode_1.PUSH)(32) + (0, Opcode_1.PUSH)(0) + Opcode_1.opCodes.MLOAD + Opcode_1.opCodes.SUB + Opcode_1.opCodes.DUP1 + (0, Opcode_1.PUSH)(0) + Opcode_1.opCodes.MSTORE + Opcode_1.opCodes.MLOAD + (0, Opcode_1.PUSH)(32) + Opcode_1.opCodes.MSTORE;
    }
    go_down_stack() {
        return (0, Opcode_1.PUSH)(32) + (0, Opcode_1.PUSH)(0) + Opcode_1.opCodes.MLOAD + Opcode_1.opCodes.ADD + Opcode_1.opCodes.DUP1 + (0, Opcode_1.PUSH)(0) + Opcode_1.opCodes.MSTORE + Opcode_1.opCodes.MLOAD + (0, Opcode_1.PUSH)(32) + Opcode_1.opCodes.MSTORE;
    }
    get_name_offset(name) {
        if (this.locals.hasOwnProperty(name)) {
            return (0, Opcode_1.PUSH)(32) + Opcode_1.opCodes.MLOAD + (0, Opcode_1.PUSH4)(this.locals[name]) + Opcode_1.opCodes.ADD;
        }
        else if (this.upper_scope != null) {
            // return PUSH4(0x220) + PUSH4(this.upper_scope.search(name)) + opCodes.ADD;
            return this.go_up_stack() + this.upper_scope.get_name_offset(name) + this.go_down_stack();
        }
        else {
            throw new Error("Name not declared: " + name);
        }
    }
}
exports.default = Environment;
