// import { parse } from "js-slang/dist/stdlib/parser.js";
import createContext from "js-slang/dist/createContext.js";
import { pair, is_pair, head, tail, is_null, list, set_head, set_tail } from "js-slang/dist/stdlib/list";
import { parse } from "js-slang/dist/stdlib/parser";

import { PUSH32, PUSH, LDCB, opCodes } from "./Opcode";

import Node from "./Node";
import { Integer, Boolean, Character } from "./Primitives";

import NameLookupTable from "./NameLookupTable";

import { getSingleHeapValue } from "./misc";

import Environment from "./Environment";


// console.log(parse('x => x * x;', createContext(4)));

// start of env, starting at 0x220
let GLOBAL_OFFSET = 0x220;
let LOOKUP_TABLE = {};
let CONST_OFFSET = 10;
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
  const length_of_constants = constants.length / 2 + 10;

  return PUSH(0) + PUSH(length_of_constants) + opCodes.JUMP + constants + opCodes.JUMPDEST + body;
  
}

function make_jump_immediate(offset) {
  return opCodes.PC + PUSH32(offset) + opCodes.ADD + opCodes.JUMP;
}

function make_jump_condition(offset, condition) {
  return condition + opCodes.PC + PUSH32(offset) + opCodes.ADD + opCodes.JUMPI;
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

function count_opcode_length(code) {
  if (head(code) === "PUSH32") {
      return 33;
  } else if (head(code) === "PUSH") {
      return 2;
  } else {
      return 1;
  }
}


function count_length(code) {
  return accumulate((a, b) =>
      a + b, 0, map(count_opcode_length, code));
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
  const op1_length = count_length(op1_code);
  const op2_length = count_length(op2_code);
  
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
  
  return make_jump_condition(op2_length + 5, cond) 
      + op2_code
      + make_jump_immediate(op1_length + 5)
      + op1_code
      + opCodes.JUMPDEST;
  
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
  
  closure_lookup.insert(name, this_offset);
  
  // mload rtn
  // jump
  constants = opCodes.JUMPDEST + constants + body + opCodes.SWAP1 + opCodes.JUMP;
  
  CONST_OFFSET = constants.length / 2;
  
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

function load_lambda_param(x, local_offset) {
  // already on stack
  return PUSH32(local_offset) + get_current_env_offset() + opCodes.ADD;
}

// function load_lambda_local(x, local_offset)

function compile_lambda_expression(expr, closure_lookup) {
  console.log("HIHIIHIHI");
  console.log(closure_lookup);
  const the_body = lambda_body(expr);
  const body = is_block(the_body) ? block_body(the_body) : the_body;
  const locals = scan_out_declarations(body);

  let extended_env = new Environment(closure_lookup);

  let current_offset = 0;
  
  // list of params
  const parameters = list_to_arr(lambda_parameter_symbols(expr)).reverse();
  let map_params = "";
  // all params are on stack, in reverse order, i.e. last argument on top
  for (const x of parameters) {
    if (x == null) {
      break;
    }
    map_params = map_params + load_lambda_param(x, current_offset)
    extended_env.insert(x, current_offset);
    current_offset += 32;
  }

  for (const x of locals) {
    // assign space for locals
    extended_env.insert(x, current_offset);
    current_offset += 32;
  }
  console.log(body);
  return compile_expression(body, extended_env);
  // const extended_index_table =
  //     accumulate((s, it) => extend_index_table(it, s),
  //                index_table,
  //                append(reverse(locals), 
  //                       reverse(parameters)));
  // add_ternary_instruction(LDF, NaN, NaN, 
  //                        length(parameters) + length(locals));
  // const max_stack_size_address = insert_pointer - 3;
  // const address_address = insert_pointer - 2;
  
  // push_to_compile(make_to_compile_task(
  //                     body, max_stack_size_address, 
  //                     address_address, extended_index_table));
  // return ;
}

function get_name_offset(closure_lookup, name) {
  const frame_offset = get_current_env_offset();
  console.log(frame_offset);
  return frame_offset + PUSH32(closure_lookup.search(name) * 32) + opCodes.ADD;
}

function compile_expression(expr, closure_lookup): string {
  if (is_number_literal(expr)) {
    return PUSH32(literal_value(expr));
  } else if (is_boolean_literal(expr)) {
    return LDCB(literal_value(expr));
  } else if (is_lambda_expression(expr)) {
    return compile_lambda_expression(expr, closure_lookup);
  } else if (is_variable_declaration(expr)) {
    const symbol = declaration_symbol(expr);
    const value = declaration_value(expr);
    console.log("IN VAR DECLARATION COMPILE");
    // frame_offset is the offset of the current env frame
    console.log(closure_lookup);
    console.log(value);
    
    return PUSH32(value)
            + get_name_offset(closure_lookup, symbol) + opCodes.MSTORE;
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

    let constant_name_jump = "";
    // const load_from_heap = getSingleHeapValue(offset); 
    
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
              const op_code = op === "+" ? opCodes.ADD
                            : op === "-" ? opCodes.SUB
                            : op === "*" ? opCodes.MUL
                            : op === "/" ? opCodes.DIV
                            : op === "===" ? opCodes.EQ
                            : op === "<" ? opCodes.LT
                            : op === ">" ? opCodes.GT
                            : op === "&&" ? opCodes.AND
                            : /*op === "||" ?*/ opCodes.OR;
              if (op_code === opCodes.DIV || op_code === opCodes.LT || op_code === opCodes.GT) {
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

function translate(lst) {
  const temp = map(get_opcode, lst);
  return accumulate((x, y) => (x + y), "", temp);
}

function parse_and_compile(string) {
  return PUSH(32) + PUSH(0) + opCodes.MSTORE + compile_program(make_sequence(parseNew(string)));
}


console.log(parse_and_compile('const x = 3; x + x;'));
// console.log(constants);