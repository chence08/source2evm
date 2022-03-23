import { opCodes } from "./Opcode";

export const zeroPad = (num, length) => (num).toString(16).toUpperCase().padStart(length, '0');

export function getTagByteCode(offset: number): string {
  // const loader = opCodes.PUSH32 + zeroPad(offset, 32) + opCodes.MLOAD;
  // const getTag = opCodes.PUSH + zeroPad(7, 2) + opCodes.SIGNEXTEND;
  return opCodes.PUSH32 + zeroPad(offset, 64) + opCodes.MLOAD;
}

export function getSizeByteCode(offset: number): string {
  return opCodes.PUSH32 + zeroPad(offset + 32, 64) + opCodes.MLOAD;
}

// export function getFirstChildByteCode(offset: number): string {
//   return opCodes.PUSH32 + zeroPad(offset + 32 * 2, 64) + opCodes.MLOAD;
// }

// export function getLastChildByteCode(offset: number): string {
//   return opCodes.PUSH32 + zeroPad(offset + 32 * 3, 64) + opCodes.MLOAD;
// }

export function getSingleHeapValue(offset: number): string {
  return opCodes.PUSH32 + zeroPad(offset, 64) + opCodes.MLOAD;
}