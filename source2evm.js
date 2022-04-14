const fs = require('fs')
const process = require('process');
const { exit } = require("process");
const execSync = require('child_process').execSync;

// check if compiled
if (!fs.existsSync("output/evm_alt.js")) {
  console.log("Compiler file not found, compiling from source...");
  execSync("yarn tsc");
  console.log("Succesfully compiled! ");
}

const arch_type = require('os').arch();

let evm = "";

if (arch_type === 'x64') {
  evm = "bin/evm";
} else if (arch_type === 'arm') {
  evm = "bin/evm_arm"
} else{
  console.log(arch_type + " not supported");
  exit(1);
}

const compiler = require("./output/evm_alt");

const args = process.argv.slice(2);
let input_file = null;
let output_file = null;
let execute = false;
let debug = false;

const USAGE = 'node source2evm -i file [options]';

const HELP_MSG = USAGE + `
\n
Options: \n
-o      Path to write compiled EVM bytecode to \n
-r      Execute the compiled bytecode on EVM \n
-d      Execute the compiled bytecode in debug mode, showing the stack \n
-h      Show this message \n
`;
let i = 0;

while (i < args.length) {
  switch (args[i]) {
    case '-i': 
      input_file = args[i + 1];
      i = i + 2;
      break;
    case '-o': 
      output_file = args[i + 1];
      i = i + 2;
      break;
    case '-r': 
      execute = true;
      i = i + 1;
      break;
    case '-d': 
      execute = true;
      debug = true;
      break;
    case '-h': 
      console.log(HELP_MSG);
      exit();
    default: 
      console.log("Unknown input: " + args[i]);
      console.log(USAGE);
      exit();
  }
}

if (input_file === null) {
  console.log('No input provided');
  console.log(USAGE);
  exit(1);
}

try {
  const data = fs.readFileSync(input_file, 'utf8')
  console.log('Compiling...');
  compiled = compiler.parse_and_compile(data);
  if (output_file !== null) {
    fs.writeFile(output_file, compiler, err => {
      if (err) {
        console.error(err)
        return
      }
      console.log('Compiled bytecode written to ' + output_file);
    });
  } else if (!execute) {
    console.log(compiled);
  }
  if (execute) {
    let res = execSync(evm + (debug ? " --debug" : "") + " --code " + compiled + " run");
    const output = Number(res);
    if (isNaN(output)) {
      console.log("EVM error!");
      console.log(String(res));
    } else {
      console.log(output);
    }
  }
} catch (err) {
  console.error(err)
  exit(1);
}
