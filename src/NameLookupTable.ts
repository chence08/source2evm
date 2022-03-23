class CompileTimeEnv {
  constructor(){}
}

export default class Environment {
  locals: Record<string, number>;
  constructor(localNames: [string]) {
    this.locals = {};
    localNames.forEach(x => this.locals[x] = -1);
  }

  addRecord(name: string, offset: number): boolean {
    if (this.locals[name] > 0) {
      return false;
    }
    
    this.locals[name] = offset;
    return true;
  }

  getRecord(name: string): number {
    return this.locals[name];
  }
}