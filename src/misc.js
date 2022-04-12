"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getValueBasedOnValOnStack = exports.getSingleHeapValue = exports.getSizeByteCode = exports.getTagByteCode = exports.zeroPad = void 0;
const Opcode_1 = require("./Opcode");
const zeroPad = (num, length) => (num).toString(16).toUpperCase().padStart(length, '0');
exports.zeroPad = zeroPad;
function getTagByteCode(offset) {
    // const loader = opCodes.PUSH32 + zeroPad(offset, 32) + opCodes.MLOAD;
    // const getTag = opCodes.PUSH + zeroPad(7, 2) + opCodes.SIGNEXTEND;
    return Opcode_1.opCodes.PUSH32 + (0, exports.zeroPad)(offset, 64) + Opcode_1.opCodes.MLOAD;
}
exports.getTagByteCode = getTagByteCode;
function getSizeByteCode(offset) {
    return Opcode_1.opCodes.PUSH32 + (0, exports.zeroPad)(offset + 32, 64) + Opcode_1.opCodes.MLOAD;
}
exports.getSizeByteCode = getSizeByteCode;
// export function getFirstChildByteCode(offset: number): string {
//   return opCodes.PUSH32 + zeroPad(offset + 32 * 2, 64) + opCodes.MLOAD;
// }
// export function getLastChildByteCode(offset: number): string {
//   return opCodes.PUSH32 + zeroPad(offset + 32 * 3, 64) + opCodes.MLOAD;
// }
function getSingleHeapValue(offset) {
    return Opcode_1.opCodes.PUSH32 + (0, exports.zeroPad)(offset, 64) + Opcode_1.opCodes.MLOAD;
}
exports.getSingleHeapValue = getSingleHeapValue;
function getValueBasedOnValOnStack(offset) {
    return offset + Opcode_1.opCodes.MLOAD;
}
exports.getValueBasedOnValOnStack = getValueBasedOnValOnStack;
