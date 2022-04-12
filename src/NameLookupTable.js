"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class CompileTimeEnv {
    constructor() { }
}
class Environment {
    constructor(localNames) {
        this.locals = {};
        localNames.forEach(x => this.locals[x] = -1);
    }
    addRecord(name, offset) {
        if (this.locals[name] > 0) {
            return false;
        }
        this.locals[name] = offset;
        return true;
    }
    getRecord(name) {
        return this.locals[name];
    }
}
exports.default = Environment;
