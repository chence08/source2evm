// import { parse } from "js-slang/dist/stdlib/parser.js";
import createContext from "js-slang/dist/createContext.js";
import { pair, is_pair, head, tail, is_null, list, set_head, set_tail } from "js-slang/dist/stdlib/list";
import { parse } from "js-slang/dist/stdlib/parser";

import { PUSH32, PUSH, PUSH4, LDCB, opCodes } from "./Opcode";

import Environment from "./Environment";


// console.log(parse('x => x * x;', createContext(4)));

// start of env, starting at 0x220
// let GLOBAL_OFFSET = 0x220;
const INIT_CODE_LENGTH = 29;
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
  return PUSH(0) + opCodes.MSTORE + PUSH(32) + PUSH(0) + opCodes.RETURN;
}

function compile_program(program) {
  let closure_lookup = new Environment();
  const body = compile_expression(program, closure_lookup) + final_return();
  const length_of_constants = constants.length / 2 + INIT_CODE_LENGTH;
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

// for loops
function is_for_loop(expr) {
  return is_tagged_list(expr, "for_loop");
}

function init(expr) {
  return head(tail(expr));
}

function test(expr) {
  return head(tail(tail(expr)));
}

function update(expr) {
  return head(tail(tail(tail(expr))));
}

function for_loop_body(expr) {
  return head(tail(tail(tail(tail(expr)))));
}
 
function scan_out_names(component) {
  return is_name(component)
  ? list(symbol_of_name(component))
  : is_pair(component)
  ? accumulate(append, null, map(scan_out_names, component))
  : null;
}

function scan_out_applications(component) {
  return is_application(component)
    ? !(is_lambda_expression(function_expression(component)) || is_application(function_expression))
      ? list(symbol_of_name(function_expression(component)))
      : null
    : is_pair(component)
    ? accumulate(append, null, map(scan_out_applications, component))
    : null;
}

function is_recursive(component, name) {
  return list_to_arr(scan_out_applications(component)).includes(name);
}

function scan_out_functions(component) {
  return is_function_declaration(component)
    ? pair(component, scan_out_functions(function_declaration_body(component)))
    : is_lambda_expression(component)
    ? pair(component, scan_out_functions(lambda_body(component)))
    : is_pair(component)
    ? accumulate(append, null, map(scan_out_functions, component))
    : null;
}

function compile_sequence(expr, closure_lookup) {
  // compile for each statement, starting from 1st
  const statements = sequence_statements(expr);
  const declarations = list_to_arr(scan_out_declarations(expr));

  const extend_env_code = closure_lookup.extend_env();

  let extended_env = new Environment(closure_lookup);
  // console.log(declarations);
  
  for (let i = 0; i < declarations.length; i++) {
    extended_env.insert(declarations[i]);
  }

  const code = map(x => compile_expression(x, extended_env), statements);

  return extend_env_code + accumulate((x, y) => x + y, "", code);
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

function compile_for_loop(expr, closure_lookup) {
  const init_expression = init(expr);
  const new_declarations = head(scan_out_declarations(init_expression));
  closure_lookup.insert(new_declarations);

  const _init = compile_expression(init(expr), closure_lookup);
  const _test = compile_expression(test(expr), closure_lookup);
  const _update = compile_expression(update(expr), closure_lookup);
  const body = compile_expression(for_loop_body(expr), closure_lookup);

  const true_offset = PUSH4(0)
                      + opCodes.ADD + opCodes.JUMPI
                      // if true, jump to loop body 
                      // end loop otherwise
                      + opCodes.POP + opCodes.PC + PUSH4(0) + opCodes.ADD + opCodes.JUMP
                      + opCodes.JUMPDEST;
  const false_offset = PUSH4(0) + opCodes.ADD + opCodes.JUMP
                      + opCodes.JUMPDEST 
                      + body + _update
                      + opCodes.DUP1 + PUSH(0) + opCodes.ADD + opCodes.JUMP + opCodes.JUMPDEST;;

  const true_len = true_offset.length / 2;
  const false_len = false_offset.length / 2;

  return _init + opCodes.PC + opCodes.JUMPDEST + _test +
    + opCodes.PC + PUSH4(true_len)
    + opCodes.ADD + opCodes.JUMPI
    // if true, jump to loop body 
    // end loop otherwise
    + opCodes.POP + opCodes.PC + PUSH4(false_len) + opCodes.ADD + opCodes.JUMP
    + opCodes.JUMPDEST 
    + body + _update
    + opCodes.DUP1 + PUSH(1) + opCodes.ADD + opCodes.JUMP + opCodes.JUMPDEST;
}

function compile_while_loop(expr, closure_lookup) {
  const body = compile_expression(loop_body(expr), closure_lookup);
  const cond = compile_expression(loop_condition(expr), closure_lookup);

  // console.log(body)
  // console.log(cond)

  const true_offset = PUSH4(0) 
  + opCodes.ADD + opCodes.JUMPI
  + opCodes.POP + opCodes.PC + PUSH4(0) + opCodes.ADD + opCodes.JUMP
  + opCodes.JUMPDEST;

  const true_len = true_offset.length / 2;

  // console.log(true_len);

  const false_offset = PUSH4(0) + opCodes.ADD + opCodes.JUMP
  + opCodes.JUMPDEST 
  + body 
  + opCodes.DUP1 + PUSH(1) + opCodes.ADD + opCodes.JUMP + opCodes.JUMPDEST;

  const false_len = false_offset.length / 2;
  // console.log(false_len);

  return opCodes.PC + opCodes.JUMPDEST + cond 
    + opCodes.PC + PUSH4(true_len) 
    + opCodes.ADD + opCodes.JUMPI
    // if true, jump to loop body 
    // end loop otherwise
    + opCodes.POP + opCodes.PC + PUSH4(false_len) + opCodes.ADD + opCodes.JUMP
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
  const name = declaration_symbol(expr);
  const body_expr = constant_declaration_value(expr);

  closure_lookup.constants.push(name);

  // use normal assignment if is not a function
  if (!is_lambda_expression(body_expr)) {
    return compile_assignment(expr, closure_lookup, false);
  }

  // update lookup if is function

  let body, captures = compile_lambda_expression(constant_declaration_value(expr), closure_lookup);
  console.log(body);
  console.log("_____________________");
  closure_lookup.funcs[name] = captures;
  console.log(closure_lookup);
  console.log(captures);

  // add constant name to closure constants list

  const this_offset = CONST_OFFSET;
  // console.log("OFFSET: " + this_offset);
  // closure_lookup.insert(name, this_offset);
  
  // mload rtn
  // jump
  constants = constants + opCodes.JUMPDEST + body + opCodes.SWAP1 + opCodes.JUMP;
  
  CONST_OFFSET = INIT_CODE_LENGTH + constants.length / 2;
  
  return closure_lookup.update_mem(name, this_offset, closure_lookup.get_name_offset(name));
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
  return PUSH4(local_offset) + get_current_env_offset() + opCodes.ADD + opCodes.MSTORE;
}

// function load_lambda_local(x, local_offset)

function compile_lambda_expression(expr, closure_lookup) {
  // console.log(closure_lookup);
  const the_body = lambda_body(expr);
  const body = is_block(the_body) ? block_body(the_body) : the_body;
  const locals = list_to_arr(scan_out_declarations(body));

  // let extended_env = new Environment(closure_lookup);
  let extended_env = new Environment(closure_lookup);

  let current_offset = 32;

  // list of params
  const parameters = list_to_arr(lambda_parameter_symbols(expr)).reverse();

  const captured = [...new Set(list_to_arr(scan_out_names(body)))].filter(x => !(parameters.includes(x) || locals.includes(x)));

  const all_names = [...parameters, ...captured];

  let load_params = "";
  // all params are on stack, in reverse order, i.e. last argument on top
  if (all_names !== null) {
    for (const x of all_names) {
      load_params = load_params + load_lambda_param(current_offset)
      extended_env.insert(x);
      current_offset += 32;
    }
  }

  // push 32
  // mload
  // mload
  // mload // number of prev locals on stack
  // jumpdest 1
  // dup1
  // iszero // jump to 2 if 0
  // jumpi 
  // load param id
  // load param
  // push 1
  // swap1
  // sub 
  // jump // jump to 1
  // jumpdest 2
  // pop


    // get number of prev locals
  // load_params = load_params + load_lambda_param(0);

  // for (const x of Object.keys(extended_env.upper_scope.locals).reverse()) {
  //   load_params = load_params + load_lambda_param(current_offset)
  //   extended_env.insert(x);
  //   current_offset += 32;
  // }

  // console.log("++++++++++++++++++++++++++++++++++++++++");

  // console.log(extended_env);

  // console.log("++++++++++++++++++++++++++++++++++++++++");

  if (locals !== null) {
    for (const x of locals) {
      // assign space for locals
      extended_env.insert(x);
      current_offset += 32;
    }
  }

  // console.log(body);
  // const code = extended_env.extend_env() + load_params + compile_expression(body, extended_env);
  const code = load_params + compile_expression(body, extended_env);

  // console.log(code);

  // return result or last computation stored on stack
  // need to pop stack frame and move stack pointer back by 32
  // const return_stack_frame = closure_lookup.go_up_stack();
  // const return_stack_pointer = PUSH(32) + get_stack_offset() + opCodes.SUB + opCodes.DUP1 + PUSH(0) + opCodes.MSTORE + opCodes.MLOAD + PUSH(32) + opCodes.MSTORE
  console.log("HIHIHIHIHIHIHIHI");
  
  console.log("captured: " + captured);
  return [code, captured];
}

function compile_application(expr, closure_lookup) {
  const args = map(x => compile_expression(x, closure_lookup), arg_expressions(expr));
  const arg_code = accumulate((a, b) => a + b, "", args);

  // const local_code = closure_lookup.get_locals();

  console.log(closure_lookup);
  const function_expr = function_expression(expr);

  // let extended_env = new Environment(closure_lookup);

  // const get_locals_code = closure_lookup.consume_prev_locals(Object.keys(closure_lookup.locals).length);

  if (is_lambda_expression(function_expr)) {
    // don't lookup, apply with lambda instead
    const lambda_code = compile_lambda_expression(function_expr, closure_lookup);
    constants = constants + opCodes.JUMPDEST + lambda_code + opCodes.SWAP1 + opCodes.JUMP;
    
    const this_offset = CONST_OFFSET;

    CONST_OFFSET = INIT_CODE_LENGTH + constants.length / 2;

    const load_args_and_jump = arg_code + PUSH4(this_offset) + opCodes.JUMP + opCodes.JUMPDEST;
    
    return opCodes.PC + PUSH4((load_args_and_jump.length / 2) + 6) + opCodes.ADD + load_args_and_jump;
  } else {
    // load params
    // load locals
    // extend

    const name = symbol_of_name(function_expression(expr));
    const function_offset_code = closure_lookup.get_name_offset(name);
    // console.log(closure_lookup);

    const captures = closure_lookup.funcs[name];
    console.log(captures);
    const capture_code = captures.map(x => closure_lookup.get_name_offset(x) + opCodes.MLOAD).reduce((x, y) => x + y, "");

    const load_args_and_jump = capture_code + arg_code + function_offset_code + opCodes.MLOAD + opCodes.JUMP + opCodes.JUMPDEST;

    return opCodes.PC + PUSH4((load_args_and_jump.length / 2) + 6) + opCodes.ADD + load_args_and_jump;
  }
  

}

function compile_tail_call_application(expr, closure_lookup) {
  const name = symbol_of_name(function_expression(expr));
  const function_offset_code = closure_lookup.get_name_offset(name);
  const args = map(x => compile_expression(x, closure_lookup), arg_expressions(expr));
  const arg_code = accumulate((a, b) => a + b, "", args);
  const local_code = closure_lookup.get_locals();

  const move_up_stack = closure_lookup.go_up_stack();

  // closure_lookup = closure_lookup.upper_scope;

  // const change_to_function_env = closure_lookup.update_stack(name);

  const call_function = arg_code + local_code + function_offset_code + opCodes.MLOAD + move_up_stack + opCodes.JUMP + opCodes.JUMPDEST;

  return call_function;
}

function compile_assignment(expr, closure_lookup, is_reassignment) {
  const symbol = declaration_symbol(expr);
  // console.log(expr);
  // console.log(constant_declaration_value(expr));

  if (is_reassignment && closure_lookup.constants.includes(symbol)) {
    throw console.error("Reassigning constant: " + symbol);
  }

  const value = compile_expression(constant_declaration_value(expr), closure_lookup);
  // frame_offset is the offset of the current env frame
  // console.log(closure_lookup);
  // console.log("VALUE: " + value);
  
  return value + closure_lookup.get_name_offset(symbol) + opCodes.MSTORE;
}

function compile_expression(expr, closure_lookup): string {
  if (is_number_literal(expr)) {
    return PUSH32(literal_value(expr));
  } else if (is_boolean_literal(expr)) {
    return LDCB(literal_value(expr));
  } else if (is_lambda_expression(expr)) {
    let code, env = compile_lambda_expression(expr, closure_lookup);
    return code;
  } else if (is_while_loop(expr)) {
    return compile_while_loop(expr, closure_lookup);
  } else if (is_for_loop(expr)) {
    return compile_for_loop(expr, closure_lookup);
  } else if (is_variable_declaration(expr) || is_assignment(expr)) {
    return compile_assignment(expr, closure_lookup, is_assignment(expr));
  } else if (is_name(expr)) {
    const name = symbol_of_name(expr);
    const load_from_heap = closure_lookup.get_name_offset(name) + opCodes.MLOAD;
      // PUSH32(closure_lookup.search(name) * 32) + opCodes.ADD + opCodes.MLOAD; 
    // const offset = closure_lookup.search(name)
    // console.log(closure_lookup.search(name)); 
    // console.log(closure_lookup.frame_offset);
    
    return load_from_heap;

    // if (closure_lookup.constants.includes(name)) {
    //   const load_and_jump = load_from_heap + opCodes.JUMP + opCodes.JUMPDEST;
    //   return opCodes.PC + PUSH((load_and_jump.length / 2) + 3) + opCodes.ADD + load_and_jump;
    // } else {
    //   return load_from_heap;
    // }
    
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
    const return_expr = return_statement_expression(expr);
    if (is_application(return_expr)) {
      // tail call optimisation
      return compile_tail_call_application(return_expr, closure_lookup);
    } else {
      console.log(return_expr);
      return compile_expression(return_expr, closure_lookup) + closure_lookup.go_up_stack() + opCodes.SWAP1 + opCodes.JUMP;
    }
  } else if (is_conditional_statement(expr)) {
    return compile_expression(conditional_statement_to_expression(expr), closure_lookup);
  } else {
      const op = operator(expr);
      // console.log(expr);
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

export function parse_and_compile(string) {
  return PUSH(0x20) + PUSH(0) + PUSH4(0x200) + PUSH(0x20) + PUSH4(0x200) + PUSH(0x40) 
    + opCodes.MSTORE + opCodes.MSTORE + opCodes.MSTORE + compile_program(parseNew(string));
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
// console.log(parse_and_compile(`
// function f(x) {
//   if (x <= 1) {
//     return 1;
//   } else {
//     return x + f(x - 1);
//   }
// }
// f(100); 
// `)); //returns 0x13ba

// recursion with tail call optimisation, will reach stack limit with above algo
// console.log(parse_and_compile(`
// function f(x, y) {
//   if (x <= 1) {
//     return y;
//   } else {
//     return f(x - 1, x + y);
//   }
// }
// f(1000, 1);
// `)); //returns 0x7a314

// console.log(constants);

// console.log(parse_and_compile(`1/0;`));

// console.log(parse_and_compile(`
// let y = 0;
// for (const x = 0; x < 5; x = x + 1) {
//   y = y + 1;
// }
// y;
// `));
// f(1000, 1); 
// `)); //returns 0x7a314

// console.log(parse_and_compile(`
// let x = 1;
// const y = x + 2;
// y;
// `))

// passing functions as parameter and nested function
// console.log(parse_and_compile(`
// function square(x) {
//   return x * x;
// }

// function apply_twice_and_cube(f, x) {
//   function cube(y) {
//     return y * y * y;
//   }
//   return cube(f(f(x)));
// }

// apply_twice_and_cube(square, 2);

// `))

// console.log(parse_and_compile(`

// (x => x + 1)(3);


// `))