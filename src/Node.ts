import * as opcodes from "./Opcode";
import { zeroPad } from "./misc";

export default class Node{
  headers: string[];
  size: number;

  private readonly headerSize = 32;
  
  constructor(tag: number, size: number, firstChildOffset: number, lastChildOffset: number){
    this.headers = [];
    this.headers.push(zeroPad(tag, 64));
    this.headers.push(zeroPad(this.headerSize + size, 64));
    this.headers.push(zeroPad(firstChildOffset, 64));
    this.headers.push(zeroPad(lastChildOffset, 64));
    this.size = this.headerSize + size;
  }
  
  storeHeader(offset: number): string {
    let result = "";
    for (let i = 0; i < 4; i++) {
      result += opcodes.opCodes.PUSH32 +
                this.headers[i] + 
                opcodes.opCodes.PUSH32 +
                zeroPad(offset + 32 * i, 64) +
                opcodes.opCodes.MSTORE
    }
    return result;
  }

  pushToMem(offset: number) : [number, number, string] {
    return [0, 0, "a"];
  };
}