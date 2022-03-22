import { pair, is_pair, head, tail, is_null, list, set_head, set_tail } from "js-slang/dist/stdlib/list";
import { zeroPad } from "./misc";

// functions to represent virtual machine code

export const opCodes = {
  "PUSH32": "7F",
  "PUSH" : "60",
  "ADD" : "01",
  "MUL" : "02",
  "SUB" : "03",
  "DIV" : "04",
  "EQ" : "14",
  "LT" : "10",
  "GT" : "11",
  "MSTORE" : "52",
  "MLOAD" : "51",
  "RETURN" : "F3",
  "PC" : "58",
  "JUMP" : "56",
  "JUMPI" : "57",
  "JUMPDEST" : "5B",
  "STOP" : "00",
  "NOT" : "19", 
  "AND" : "16", 
  "OR" : "17"
}

export function PUSH32(i: number): string {
  return opCodes.PUSH32 + zeroPad(i, 64);
}

export function PUSH(i: number): string {
  return opCodes.PUSH + zeroPad(i, 2);
}

export function LDCB(b: boolean): string {
  return b ? PUSH32(1) : PUSH32(0);
}

// export function op_code(instr) {
//   return head(instr);
// }

// export function arg(instr) {
//   return head(tail(instr));
// }

// export function make_simple_instruction(op_code) {
//   return list(op_code);
// }

// export function DONE() {
//   return list("STOP");
// }



// export function PUSH(i) {
//   return list("PUSH", i);
// }

// export function PLUS() {
//   return list("ADD");
// }

// export function MINUS() {
//   return list("SUB");
// }

// export function TIMES() {
//   return list("MUL");
// }

// export function DIV() {
//   return list("DIV");
// }

// export function AND() {
//   return list("AND");
// }

// export function OR() {
//   return list("OR");
// }

// export function NOT() {
//   return list("NOT");
// }

// export function LT() {
//   return list("LT");
// }

// export function GT() {
//   return list("GT");
// }

// export function EQ() {
//   return list("EQ");
// }

// export function MSTORE() {
//   return list("MSTORE");
// }

// export function MSTORE8() {
//   return list("MSTORE8");
// }

// export function MLOAD() {
//   return list("MLOAD");
// }

// export function PC() {
//   return list("PC");
// }

// export function JUMPI() {
//   return list("JUMPI");
// }

// export function JUMP() {
//   return list("JUMP");
// }

// export function JUMPDEST() {
//   return list("JUMPDEST");
// }

// export function RETURN() {
//   return list("RETURN");
// }