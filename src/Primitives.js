"use strict";
// Tags
// Integer: 1
// Boolean: 2
// Character: 3
Object.defineProperty(exports, "__esModule", { value: true });
exports.Character = exports.Boolean = exports.Integer = void 0;
const Node_1 = require("./Node");
const misc_1 = require("./misc");
const Opcode_1 = require("./Opcode");
class Integer extends Node_1.default {
    constructor(value) {
        super(1, 32, 2, 1);
        this.value = value;
    }
    pushToMem(offset) {
        return [offset + super.size, offset,
            super.storeHeader(offset)
                + (0, Opcode_1.PUSH32)((0, misc_1.zeroPad)(this.value, 64))
                + (0, Opcode_1.PUSH32)((0, misc_1.zeroPad)(offset + 32 * 4, 64))
                + Opcode_1.opCodes.MSTORE];
    }
}
exports.Integer = Integer;
class Boolean extends Node_1.default {
    constructor(value) {
        super(2, 32, 2, 1);
        this.value = value ? 1 : 0;
    }
    pushToMem(offset) {
        return [offset + super.size, offset,
            super.storeHeader(offset)
                + (0, Opcode_1.PUSH32)((0, misc_1.zeroPad)(this.value, 64))
                + (0, Opcode_1.PUSH32)((0, misc_1.zeroPad)(offset + 32 * 4, 64))
                + Opcode_1.opCodes.MSTORE];
    }
}
exports.Boolean = Boolean;
class Character extends Node_1.default {
    constructor(value) {
        super(3, 32, 2, 1);
        this.value = value.charCodeAt(0);
    }
    pushToMem(offset) {
        return [offset + super.size, offset,
            super.storeHeader(offset)
                + (0, Opcode_1.PUSH32)((0, misc_1.zeroPad)(this.value, 64))
                + (0, Opcode_1.PUSH32)((0, misc_1.zeroPad)(offset + 32 * 4, 64))
                + Opcode_1.opCodes.MSTORE];
    }
}
exports.Character = Character;
