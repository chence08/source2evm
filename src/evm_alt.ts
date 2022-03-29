// import { parse } from "js-slang/dist/stdlib/parser.js";
import createContext from "js-slang/dist/createContext.js";
import { pair, is_pair, head, tail, is_null, list, set_head, set_tail } from "js-slang/dist/stdlib/list";
import { parse } from "js-slang/dist/stdlib/parser";

import { PUSH32, PUSH, PUSH4, LDCB, opCodes } from "./Opcode";

import Node from "./Node";
import { Integer, Boolean, Character } from "./Primitives";

import NameLookupTable from "./NameLookupTable";

import { getSingleHeapValue } from "./misc";

import Environment from "./Environment";


// console.log(parse('x => x * x;', createContext(4)));

// start of env, starting at 0x220
let GLOBAL_OFFSET = 0x220;
let LOOKUP_TABLE = {};
const INIT_CODE_LENGTH = 13;
let CONST_OFFSET = INIT_CODE_LENGTH;
let constants = "";

function parseNew(x) {
  const res = parse(x, createContext());
  return res;
}

function list_to_arr(x) {
  let arr = [];
  while (!is_null(x)) {
    arr.push(head(x));
    x = tail(x);
  }
  return arr;
}

function list_ref(items, n) {
    return n === 0
           ? head(items)
           : list_ref(tail(items), n - 1);
}

function append(x, y) {
  return is_null(x)
         ? y
         : pair(head(x), append(tail(x), y));
}

function accumulate(op, initial, sequence) {
  return is_null(sequence)
          ? initial
          : op(head(sequence), 
              accumulate(op, initial, tail(sequence)));
}

function map(f, lst) {
  return is_null(lst)
        ? lst
        : pair(f(head(lst)), map(f, tail(lst)));
}

function is_number(x) {
  return typeof x === 'number'
}

function is_boolean(x) {
  return 'boolean' === typeof x;
}

function is_tagged_list(expr, the_tag) {
  return is_pair(expr) && head(expr) === the_tag;
}

function make_literal(value) {
  return list("literal", value);
}

function is_literal(expr) {
  return is_tagged_list(expr, "literal");
}

function literal_value(expr) {
  return head(tail(expr));
}

function is_name(stmt) {
  return is_tagged_list(stmt, "name");
}

function symbol_of_name(stmt) {
    return head(tail(stmt));
}

function is_operator_combination(expr) {
 return is_unary_operator_combination(expr) ||
        is_binary_operator_combination(expr);
}

function is_unary_operator_combination(expr) {
 return is_tagged_list(expr, "unary_operator_combination");
}

// logical composition (&&, ||) is treated as binary operator combination
function is_binary_operator_combination(expr) {
 return is_tagged_list(expr, "binary_operator_combination") ||
        is_tagged_list(expr, "logical_composition");
}

function is_sequence(stmt) {
 return is_tagged_list(stmt, "sequence");
}

function make_sequence(stmt) {
  return list("sequence", list(stmt));
}

function sequence_statements(stmt) {   
 return head(tail(stmt));
}

function is_empty_sequence(stmts) {
 return is_null(stmts);
}

function is_last_statement(stmts) {
 return is_null(tail(stmts));
}

function first_statement(stmts) {
 return head(stmts);
}

function rest_statements(stmts) {
 return tail(stmts);
}

function is_conditional_combination(expr) {
return is_tagged_list(expr, "conditional_expression");
}

function is_conditional_statement(expr) {
  return is_tagged_list(expr, "conditional_statement");
}

function conditional_statement_to_expression(expr) {
  set_head(expr, "conditional_expression");
  return expr;
}

function operator(expr) {
 return head(tail(expr));
}

function first_operand(expr) {
 return head(tail(tail(expr)));
}

function second_operand(expr) {
 return head(tail(tail(tail(expr))));
}

// two new functions, not in 4.1.2

function is_boolean_literal(expr) {
  return is_tagged_list(expr, "literal") && 
         is_boolean(literal_value(expr));
}

function is_number_literal(expr) {
  return is_tagged_list(expr, "literal") && 
         is_number(literal_value(expr));
}

function is_lambda_expression(component) {
 return is_tagged_list(component, "lambda_expression");
}
function lambda_parameter_symbols(component) {
 return map(symbol_of_name, head(tail(component)));
}
function lambda_body(component) {
 return head(tail(tail(component)));
}
function make_lambda_expression(parameters, body) {
  return list("lambda_expression", parameters, body);
}

function is_block(component) {
  return is_tagged_list(component, "block");
}
function block_body(component) {
  return head(tail(component));
}

function function_declaration_name(component) {
  return list_ref(component, 1);
}
function function_declaration_parameters(component) {
  return list_ref(component, 2);
}
function function_declaration_body(component) {
  return list_ref(component, 3);
}
function make_constant_declaration(name, value_expression) {
  return list("constant_declaration", name, value_expression);
}
function function_decl_to_constant_decl(component) {
  return make_constant_declaration(
             function_declaration_name(component),
             make_lambda_expression(
                 function_declaration_parameters(component),
                 function_declaration_body(component)));
}

function final_return() {
  return PUSH32(0) + opCodes.MSTORE + PUSH32(32) + PUSH32(0) + opCodes.RETURN;
}

function compile_program(program) {
  let closure_lookup = new Environment();
  const body = compile_expression(program, closure_lookup) + final_return();
  const length_of_constants = constants.length / 2 + 13;
  return PUSH(0) + PUSH4(length_of_constants) + opCodes.JUMP + constants + opCodes.JUMPDEST + body;
  
}

function make_jump_immediate(offset) {
  return opCodes.PC + PUSH4(offset + 7) + opCodes.ADD + opCodes.JUMP;
}

function make_jump_condition(offset, condition) {
  return condition + opCodes.PC + PUSH4(offset + 7) + opCodes.ADD + opCodes.JUMPI;
}

function scan_out_declarations(component) {
  return is_sequence(component)
  ? accumulate(
    append,
    null,
    map(scan_out_declarations,
    sequence_statements(component)))
    : is_declaration(component)
    ? list(declaration_symbol(component))
    : null;
}

// DECLARATIONS

function is_constant_declaration(stmt) {
   return is_tagged_list(stmt, "constant_declaration");
}
function is_function_declaration(component) {	    
  return is_tagged_list(component, "function_declaration");
}
function is_variable_declaration(component) {
    return is_tagged_list(component, "variable_declaration");
}
function is_declaration(component) {
  return is_tagged_list(component, "constant_declaration") ||
         is_tagged_list(component, "variable_declaration") ||
         is_tagged_list(component, "function_declaration");
}
function declaration_symbol(component) {
   return symbol_of_name(head(tail(component)));
}
function declaration_value(stmt) {
   return head(tail(head(tail(tail(stmt)))));
}
function constant_declaration_value(stmt) {
 return head(tail(tail(stmt)));
}

// applications are tagged with "application"
// and have "operator" and "operands"

function is_application(component) {
 return is_tagged_list(component, "application");
}
function function_expression(component) {
 return head(tail(component));
}
function arg_expressions(component) {
 return head(tail(tail(component)));
}

// Return statements
function is_return_statement(stmt) {
  return is_tagged_list(stmt, "return_statement");
}
function return_statement_expression(stmt) {
  return head(tail(stmt));
}

// Mutable assignments
function is_assignment(stmt) {
  return is_tagged_list(stmt, "assignment");
}

// loops
function is_while_loop(expr) {
  return is_tagged_list(expr, "while_loop");
}
function loop_body(expr) {
  return head(tail(tail(expr)));
}
function loop_condition(expr) {
  return head(tail(expr));
}
 
function compile_sequence(expr, closure_lookup) {
  // compile for each statement, starting from 1st
  const statements = sequence_statements(expr);
  const declarations = list_to_arr(scan_out_declarations(expr));

  console.log(declarations);
  
  for (let i = 0; i < declarations.length; i++) {
    closure_lookup.insert(declarations[i], (i+1) * 32);
  }
  
  closure_lookup.frame_offset = GLOBAL_OFFSET;
  
  const code = map(x => compile_expression(x, closure_lookup), statements);
  return PUSH32(closure_lookup.frame_offset) + PUSH(0x20) + opCodes.MSTORE + accumulate((x, y) => x + y, "", code);
}

function compile_conditional(expr, closure_lookup) {
  const op = operator(expr);
  const operand_1 = first_operand(expr);
  const operand_2 = second_operand(expr);

  if (is_boolean_literal(op)) {
      return literal_value(op) ? compile_expression(operand_1, closure_lookup) : compile_expression(operand_2, closure_lookup);
  }
  
  const op1_code = compile_expression(operand_1, closure_lookup);
  const op2_code = compile_expression(operand_2, closure_lookup);
  const op1_length = op1_code.length / 2;
  const op2_length = op2_code.length / 2;
  
  // if true, op1, jump over op2
  // if false, jump over op1
  // cond
  // jump op1_length + 1
  // op1
  // jump op2_length
  // op2
  // continue
  
  // cond
  // make jump condition
  // PC
  // offset
  // add

  // cond
  // PC + length
  // jumpi 
  const cond = compile_expression(op, closure_lookup);
  
  const after_op2_code_jump = make_jump_immediate(op1_length + 2);

  return make_jump_condition(op2_length + (after_op2_code_jump.length / 2) + 1, cond) 
      + op2_code
      + after_op2_code_jump
      + opCodes.JUMPDEST
      + op1_code
      + opCodes.JUMPDEST;
  
}

function compile_while_loop(expr, closure_lookup) {
  const body = compile_expression(loop_body(expr), closure_lookup);
  const cond = compile_expression(loop_condition(expr), closure_lookup);

  console.log(body)
  console.log(cond)

  const dummy = PUSH4(0) 
  + opCodes.ADD + opCodes.JUMPI
  + opCodes.POP + opCodes.PC + PUSH4(0) + opCodes.ADD + opCodes.JUMP
  + opCodes.JUMPDEST;

  const middle_len = dummy.length / 2;

  console.log(middle_len);

  const dummy2 = PUSH4(0) + opCodes.ADD + opCodes.JUMP
  + opCodes.JUMPDEST 
  + body 
  + opCodes.DUP1 + PUSH(1) + opCodes.ADD + opCodes.JUMP + opCodes.JUMPDEST;

  const back_len = dummy2.length / 2;
  console.log(back_len);

  return opCodes.PC + opCodes.JUMPDEST + cond 
    + opCodes.PC + PUSH4(middle_len) 
    + opCodes.ADD + opCodes.JUMPI
    // if true, jump to loop body 
    // end loop otherwise
    + opCodes.POP + opCodes.PC + PUSH4(back_len) + opCodes.ADD + opCodes.JUMP
    + opCodes.JUMPDEST 
    + body 
    + opCodes.DUP1 + PUSH(1) + opCodes.ADD + opCodes.JUMP + opCodes.JUMPDEST;

  // return opCodes.PC + opCodes.JUMPDEST + cond + opCodes.NOT + opCodes.PC + PUSH4(middle_len) 
  //   + opCodes.ADD + opCodes.JUMPI + body 
  //   + opCodes.DUP1 + PUSH(1) + opCodes.ADD + opCodes.JUMP + opCodes.JUMPDEST;

  // return opCodes.PC + opCodes.JUMPDEST + make_jump_condition((body.length / 2) + 1, cond) 
    // + body + opCodes.DUP1 + PUSH(1) + opCodes.ADD + opCodes.JUMP + opCodes.JUMPDEST + opCodes.POP;
  // pc
  // jump dest 0
  // condition
  // pc
  // len(loop body) + 7
  // add
  // jumpi 1
  // loop body
  // dup
  // push 1
  // add
  // jump 0
  // jump dest 1
  // pop
}

/*
const x = 5;
function f(a,b,c) {return x;}
f(0,1,2);
// expected: 5

push 5
PC
store pc + i to rtn
push y
jump f
done
// func
jumpdest
load x
load rtn
jump

[ "sequence",
[ [ ["constant_declaration", [["name", ["x", null]], [["literal", [5, null]], null]]],
  [ [ "function_declaration",
    [ ["name", ["f", null]],
    [ [["name", ["a", null]], [["name", ["b", null]], [["name", ["c", null]], null]]],
    [["return_statement", [["name", ["x", null]], null]], null]]]],
  [ [ "application",
    [ ["name", ["f", null]],
    [ [["literal", [0, null]], [["literal", [1, null]], [["literal", [2, null]], null]]],
    null]]],
  null]]],
null]]
*/

// let constants = {}; // look-up table for constants

function compile_constant(expr, closure_lookup) {
  // let local_const = {};
  console.log(expr);
  console.log(declaration_symbol(expr));
  const name = declaration_symbol(expr);
  const body = compile_expression(constant_declaration_value(expr), closure_lookup);

  // add constant name to closure constants list
  closure_lookup.constants.push(name);

  const this_offset = CONST_OFFSET;
  console.log("OFFSET: " + this_offset);
  // closure_lookup.insert(name, this_offset);
  
  // mload rtn
  // jump
  constants = constants + opCodes.JUMPDEST + body + opCodes.SWAP1 + opCodes.JUMP;
  
  CONST_OFFSET = INIT_CODE_LENGTH + constants.length / 2;
  
  return closure_lookup.update_mem(name, this_offset, get_name_offset(closure_lookup, name));
}

function get_stack_offset() {
  // store stack offset in 0x20
  return PUSH(0) + opCodes.MLOAD;
}

function get_current_env_offset() {
  // store stack offset in 0x20
  return PUSH(32) + opCodes.MLOAD;
}

function load_lambda_param(local_offset) {
  // already on stack
  return PUSH32(local_offset) + get_current_env_offset() + opCodes.ADD + opCodes.MSTORE;
}

// function load_lambda_local(x, local_offset)

function compile_lambda_expression(expr, closure_lookup) {
  console.log(closure_lookup);
  const the_body = lambda_body(expr);
  const body = is_block(the_body) ? block_body(the_body) : the_body;
  const locals = scan_out_declarations(body);

  let extended_env = new Environment(closure_lookup);

  let current_offset = 0;
  
  // list of params
  const parameters = list_to_arr(lambda_parameter_symbols(expr)).reverse();
  let load_params = "";
  // all params are on stack, in reverse order, i.e. last argument on top
  if (parameters !== null) {
    for (const x of parameters) {
      load_params = load_params + load_lambda_param(current_offset)
      extended_env.insert(x);
      current_offset += 32;
    }
  }

  if (locals !== null) {
    for (const x of locals) {
      // assign space for locals
      extended_env.insert(x);
      current_offset += 32;
    }
  }
  console.log(body);
  const code = load_params + compile_expression(body, extended_env);

  console.log(code);

  // return result or last computation stored on stack
  // need to pop stack frame and move stack pointer back by 32

  const return_stack_pointer = PUSH(32) + get_stack_offset() + opCodes.SUB + opCodes.DUP1 + PUSH(0) + opCodes.MSTORE + opCodes.MLOAD + PUSH(32) + opCodes.MSTORE
  return code + return_stack_pointer;
}
 
function compile_application(expr, closure_lookup) {
  const name = symbol_of_name(function_expression(expr));
  const function_offset_code = get_name_offset(closure_lookup, name);
  const args = map(x => compile_expression(x, closure_lookup), arg_expressions(expr));
  const arg_code = accumulate((a, b) => a + b, "", args);
  
  const change_env = closure_lookup.update_stack(name);

  const load_args_and_jump = arg_code + function_offset_code + opCodes.MLOAD + change_env + opCodes.JUMP + opCodes.JUMPDEST;

  const call_function = opCodes.PC + PUSH((load_args_and_jump.length / 2) + 3) + opCodes.ADD + load_args_and_jump;
  
  console.log("APPLICATION NAME: " + name);

  return call_function;
}

function get_name_offset(closure_lookup, name) {
  const frame_offset = get_current_env_offset();
  console.log(frame_offset);
  console.log(name);
  console.log(closure_lookup.search(name));
  return frame_offset + PUSH32(closure_lookup.search(name)) + opCodes.ADD;
}

function compile_expression(expr, closure_lookup): string {
  if (is_number_literal(expr)) {
    return PUSH32(literal_value(expr));
  } else if (is_boolean_literal(expr)) {
    return LDCB(literal_value(expr));
  } else if (is_lambda_expression(expr)) {
    return compile_lambda_expression(expr, closure_lookup);
  } else if (is_while_loop(expr)) {
    return compile_while_loop(expr, closure_lookup);
  } else if (is_variable_declaration(expr) || is_assignment(expr)) {
    const symbol = declaration_symbol(expr);
    console.log(expr);
    console.log(constant_declaration_value(expr));

    const value = compile_expression(constant_declaration_value(expr), closure_lookup);
    // frame_offset is the offset of the current env frame
    console.log(closure_lookup);
    console.log("VALUE: " + value);
    
    return value + get_name_offset(closure_lookup, symbol) + opCodes.MSTORE;
      // if (node === undefined) {
      //   console.log(value);
      //   console.log(expr);
        
      //   console.log(node);
      //   return "00";
      // }
      // console.log(symbol);
      // const res = node.pushToMem(GLOBAL_OFFSET);
      // GLOBAL_OFFSET = res[0];
      // closure_lookup.insert(symbol, res[1]);
      // // store res[1] to lookup/env
      // return res[2];
      
  } else if (is_name(expr)) {
    const name = symbol_of_name(expr);
    const load_from_heap = get_name_offset(closure_lookup, name) + opCodes.MLOAD;
      // PUSH32(closure_lookup.search(name) * 32) + opCodes.ADD + opCodes.MLOAD; 
    // const offset = closure_lookup.search(name)
    console.log(closure_lookup.search(name)); 
    console.log(closure_lookup.frame_offset);
    
    if (closure_lookup.constants.includes(name)) {
      const load_and_jump = load_from_heap + opCodes.JUMP + opCodes.JUMPDEST;
      return opCodes.PC + PUSH((load_and_jump.length / 2) + 3) + opCodes.ADD + load_and_jump;
    } else {
      return load_from_heap;
    }
    
  } else if (is_sequence(expr)) {
    return compile_sequence(expr, closure_lookup);
  } else if (is_function_declaration(expr)) {
    return compile_expression(function_decl_to_constant_decl(expr), closure_lookup);
  } else if (is_constant_declaration(expr)) {
    // closure_lookup.update_mem(compile_constant(expr, closure_lookup));
    return compile_constant(expr, closure_lookup);
  } else if (is_application(expr)) {
    return compile_application(expr, closure_lookup);
  } else if (is_return_statement(expr)) {
    return compile_expression(return_statement_expression(expr), closure_lookup) + opCodes.SWAP1 + opCodes.JUMP;
  } else if (is_conditional_statement(expr)) {
    return compile_expression(conditional_statement_to_expression(expr), closure_lookup);
  } else {
      const op = operator(expr);
      console.log(expr);
      const operand_1 = first_operand(expr);
      if (op === "!") {
          return compile_expression(operand_1, closure_lookup) + opCodes.NOT;
      } else {
          const operand_2 = second_operand(expr);
          if (is_conditional_combination(expr) && is_boolean_literal(op)) {
              return literal_value(op) ? compile_expression(operand_1, closure_lookup) : compile_expression(operand_2, closure_lookup);
          } else if (is_conditional_combination(expr)) {
              return compile_conditional(expr, closure_lookup);
              // return append(compile_expression(op),
              //             append(compile_expression(operand_1),
              //                 append(compile_expression(operand_2),
              //                     list(make_simple_instruction("COND_2")))));
          } else {
            if (op === "<=" || op === ">=") {
              const op_code = op === ">=" ? opCodes.GT : opCodes.LT;
              // op2
              // op2
              // op1
              // op1

              // op1
              // op2
              // op2
              // op1

              // res
              // op2
              // op1

              // op1
              // op2
              // res
              return compile_expression(operand_1, closure_lookup) + opCodes.DUP1 
                + compile_expression(operand_2, closure_lookup) + opCodes.DUP1 
                + opCodes.SWAP2 + op_code + opCodes.SWAP2 + opCodes.EQ + opCodes.OR;
            }
            const op_code = op === "+" ? opCodes.ADD
                          : op === "-" ? opCodes.SUB
                          : op === "*" ? opCodes.MUL
                          : op === "/" ? opCodes.DIV
                          : op === "===" ? opCodes.EQ
                          : op === "<" ? opCodes.LT
                          : op === ">" ? opCodes.GT
                          : op === "&&" ? opCodes.AND
                          : /*op === "||" ?*/ opCodes.OR;
            if (op_code === opCodes.DIV || op_code === opCodes.LT || op_code === opCodes.GT || op_code === opCodes.SUB) {
                return compile_expression(operand_2, closure_lookup)
                        + compile_expression(operand_1, closure_lookup)
                        + op_code;

            }
            return compile_expression(operand_1, closure_lookup)
                  + compile_expression(operand_2, closure_lookup)
                  + op_code;
          }
      }
  }
}

function to_hex_and_pad(n, code) {
  let res = (n).toString(16);
  let count = res.length;
  // while (n > 0) {
  //     let a = Math.floor(n / 16);
  //     let b = n % 16;
  //     res = hex_string(b) + res;
  //     n = a;
  //     count = count + 1;
  // }
  if (code === "PUSH32") {
      if (count < 64) {
          const diff = 64 - count;
          for (let i = 0; i < diff; i = i + 1) {
              res = "0" + res;
          }
      }
  } else {
      if (count < 2) {
          const diff = 2 - count;
          for (let i = 0; i < diff; i = i + 1) {
              res = "0" + res;
          }
      }
  }
  return res;
}

function get_opcode(expr) {
  const code = head(expr);
  const data = tail(expr);
  // if (is_pair(data)) {
  //     set_head(data, stringify(head(data)));
  // }
  return opCodes[code]
       + (is_pair(data) && is_number(head(data)) ? to_hex_and_pad(head(data), code) : "");
}

function parse_and_compile(string) {
  return PUSH(32) + PUSH(0) + opCodes.MSTORE + compile_program(make_sequence(parseNew(string)));
}


// console.log(parse_and_compile('let y = 1; const x = 3 + y; x + y;'));
// console.log(parse_and_compile(`const z = 5; function f(x, y) {let z = 1; return x + y + z;} let x = 2; f(10, 12) + x + z;`));

// console.log(parse_and_compile(`1 < 3 ? 2 : 4;`));
// console.log(parse_and_compile(`const z = 5; function f(x, y) {const z = 1; return z > x ? z : x + y + z;} let x = 2; f(10, 12) + x + z;`));
// console.log(parse_and_compile(`
// function f(){
//   if (1 > 2) {
//     return 1;
//   } else {
//     return 2;
//   }
// }
// f();`))
// console.log(parse_and_compile(`
// function f() {
//   x = 3;
//   return x + 1;
// }
// let x = 2;
// f() + x;
// ` // return 7
// ));

// console.log(parse_and_compile(`
// let x = 0;
// while (x < 3) {
//   x = x + 1;
// }
// x;
// `))

// recursion
console.log(parse_and_compile(`
function f(x) {
  if (x <= 1) {
    return 1;
  } else {
    return x + f(x - 1);
  }
}
f(100); 
`)); //returns 0x13ba
// console.log(constants);