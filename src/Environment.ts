export class Environment {
  upper_scope: Environment | boolean;
  locals: Record<string, number>;
  pc_offset: number;
  
  constructor(upper_scope?: Environment, pc_offset?: number) {
    if (upper_scope) {
      this.upper_scope = upper_scope;
    } else {
      this.upper_scope = false;
    }
    this.locals = {};
    if (pc_offset) {
      this.pc_offset = pc_offset;
    } else {
      this.pc_offset = 1;
    }
  }

  
  search(key: string): number {
    if(this.locals.hasOwnProperty(key)) {
      return this.locals[key];
    } else {
      if this.upper_scope {
        return this.upper_scope.search(key);
      } else {
        return -1;
      }
    }
  }

  insert(key: string, val: number) {
    this.locals[key] = val;
  }
}