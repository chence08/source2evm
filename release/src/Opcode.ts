import { pair, is_pair, head, tail, is_null, list, set_head, set_tail } from "js-slang/dist/stdlib/list";
import { zeroPad } from "./misc";

// functions to represent virtual machine code

export const opCodes = {
  "PUSH32": "7F",
  "PUSH" : "60",
  "PUSH4" : "63", 
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
  "OR" : "17", 
  "XOR" : "18", 
  "SWAP1" : "90", 
  "SWAP2" : "91", 
  "DUP1" : "80", 
  "POP" : "50", 
  "ISZERO" : "15", 
  "LOG0" : "A0"
}

export function PUSH32(i: number): string {
  return opCodes.PUSH32 + zeroPad(i, 64);
}

export function PUSH4(i: number): string {
  return opCodes.PUSH4 + zeroPad(i, 8);
}

export function PUSH(i: number): string {
  return opCodes.PUSH + zeroPad(i, 2);
}

export function LDCB(b: boolean): string {
  return b ? PUSH(1) : PUSH(0);
}