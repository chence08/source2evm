"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LDCB = exports.PUSH = exports.PUSH4 = exports.PUSH32 = exports.opCodes = void 0;
const misc_1 = require("./misc");
// functions to represent virtual machine code
exports.opCodes = {
    "PUSH32": "7F",
    "PUSH": "60",
    "PUSH4": "63",
    "ADD": "01",
    "MUL": "02",
    "SUB": "03",
    "DIV": "04",
    "EQ": "14",
    "LT": "10",
    "GT": "11",
    "MSTORE": "52",
    "MLOAD": "51",
    "RETURN": "F3",
    "PC": "58",
    "JUMP": "56",
    "JUMPI": "57",
    "JUMPDEST": "5B",
    "STOP": "00",
    "NOT": "19",
    "AND": "16",
    "OR": "17",
    "XOR": "18",
    "SWAP1": "90",
    "SWAP2": "91",
    "DUP1": "80",
    "POP": "50",
};
function PUSH32(i) {
    return exports.opCodes.PUSH32 + (0, misc_1.zeroPad)(i, 64);
}
exports.PUSH32 = PUSH32;
function PUSH4(i) {
    return exports.opCodes.PUSH4 + (0, misc_1.zeroPad)(i, 8);
}
exports.PUSH4 = PUSH4;
function PUSH(i) {
    return exports.opCodes.PUSH + (0, misc_1.zeroPad)(i, 2);
}
exports.PUSH = PUSH;
function LDCB(b) {
    return b ? PUSH(1) : PUSH(0);
}
exports.LDCB = LDCB;
