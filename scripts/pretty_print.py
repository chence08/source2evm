#!/usr/bin/env python3

from subprocess import Popen, PIPE
from sys import stdout

p = Popen(["yarn", "compileRun"], stdout=PIPE)
bytecode = p.stdout.read().split()[-4].decode("utf-8")
evaluate = Popen(["evm", "--code", bytecode, "run"], stdout=PIPE)
output = evaluate.stdout.read().split()[0]
print(output)
print(int(output, 16))