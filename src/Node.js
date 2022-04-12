"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const opcodes = require("./Opcode");
const misc_1 = require("./misc");
class Node {
    constructor(tag, size, firstChildOffset, lastChildOffset) {
        this.headerSize = 32;
        this.headers = [];
        this.headers.push((0, misc_1.zeroPad)(tag, 64));
        this.headers.push((0, misc_1.zeroPad)(this.headerSize + size, 64));
        this.headers.push((0, misc_1.zeroPad)(firstChildOffset, 64));
        this.headers.push((0, misc_1.zeroPad)(lastChildOffset, 64));
        this.size = this.headerSize + size;
    }
    storeHeader(offset) {
        let result = "";
        for (let i = 0; i < 4; i++) {
            result += opcodes.opCodes.PUSH32 +
                this.headers[i] +
                opcodes.opCodes.PUSH32 +
                (0, misc_1.zeroPad)(offset + 32 * i, 64) +
                opcodes.opCodes.MSTORE;
        }
        return result;
    }
    pushToMem(offset) {
        return [0, 0, "a"];
    }
    ;
}
exports.default = Node;
