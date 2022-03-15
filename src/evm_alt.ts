// import { parse } from "js-slang/dist/stdlib/parser.js";
import createContext from "js-slang/dist/createContext.js";
import { pair, is_pair, head, tail, is_null, list, set_head, set_tail } from "js-slang/dist/stdlib/list";
import { parse } from "js-slang/dist/stdlib/parser";

import { PUSH32, LDCB, opCodes } from "./Opcode";

import Node from "./Node";
import { Integer, Boolean, Character } from "./Primitives";

import NameLookupTable from "./NameLookupTable";

import { getSingleHeapValue } from "./misc";

// console.log(parse('x => x * x;', createContext(4)));

let GLOBAL_OFFSET = 0;
let LOOKUP_TABLE = {};

function parseNew(x) {
  const res = parse(x, createContext());
  return res;
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

// compile_program: see relation ->> in Section 3.5.2

function final_return() {
  return PUSH32(0) + opCodes.MSTORE + PUSH32(32) + PUSH32(0) + opCodes.RETURN;
}

function compile_program(program) {
  return compile_expression(program) + final_return();
}

function make_jump_immediate(offset) {
  return opCodes.PC + PUSH32(offset) + opCodes.ADD + opCodes.JUMP;
}

function make_jump_condition(offset, condition) {
  return condition + opCodes.PC + PUSH32(offset) + opCodes.ADD + opCodes.JUMPI;
}

// DECLARATIONS

function is_constant_declaration(stmt) {
   return is_tagged_list(stmt, "constant_declaration");
}
function is_variable_declaration(component) {
    return is_tagged_list(component, "variable_declaration");
}
function declaration_symbol(component) {
   return symbol_of_name(head(tail(component)));
}
function declaration_value(stmt) {
   return head(tail(head(tail(tail(stmt)))));
}

function compile_sequence(expr) {
  // compile for each statement, starting from 1st
  const statements = sequence_statements(expr);
  const code = map(compile_expression, statements);
  return accumulate((x, y) => x + y, "", code);
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

function compile_conditional(expr) {
  const op = operator(expr);
  const operand_1 = first_operand(expr);
  const operand_2 = second_operand(expr);

  if (is_boolean_literal(op)) {
      return literal_value(op) ? compile_expression(operand_1) : compile_expression(operand_2);
  }
  
  const op1_code = compile_expression(operand_1);
  const op2_code = compile_expression(operand_2);
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
  const cond = compile_expression(op);
  
  return make_jump_condition(op2_length + 5, cond) 
      + op2_code
      + make_jump_immediate(op1_length + 5)
      + op1_code
      + opCodes.JUMPDEST;
  
}

let constants = {} // look-up table for constants

function compile_expression(expr): string {
  if (is_number_literal(expr)) {
      return PUSH32(literal_value(expr));
  } else if (is_boolean_literal(expr)) {
      return LDCB(literal_value(expr));
  } else if (is_variable_declaration(expr)) {
      const symbol = declaration_symbol(expr);
      const value = declaration_value(expr);
    
      const node = is_number(value)
          ? new Integer(value)
          : is_boolean(value)
          ? new Boolean(value)
          : undefined;
      if (node === undefined) {
        console.log(value);
        console.log(expr);
        
        console.log(node);
        return "00";
      }
      console.log(symbol);
      const res = node.pushToMem(GLOBAL_OFFSET);
      GLOBAL_OFFSET = res[0];
      LOOKUP_TABLE[symbol] = res[1];
      // store res[1] to lookup/env
      return res[2];
      
  } else if (is_name(expr)) {
    const name = symbol_of_name(expr);
    const offset = LOOKUP_TABLE[name];
    return getSingleHeapValue(offset);
  } else if (is_sequence(expr)) {
    return compile_sequence(expr);
  } else {
      const op = operator(expr);
      console.log(expr);
      const operand_1 = first_operand(expr);
      if (op === "!") {
          return compile_expression(operand_1) + opCodes.NOT;
      } else {
          const operand_2 = second_operand(expr);
          if (is_conditional_combination(expr) && is_boolean_literal(op)) {
              return literal_value(op) ? compile_expression(operand_1) : compile_expression(operand_2);
          } else if (is_conditional_combination(expr)) {
              return compile_conditional(expr);
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
                  return compile_expression(operand_2)
                         + compile_expression(operand_1)
                         + op_code;

              }
              return compile_expression(operand_1)
                    + compile_expression(operand_2)
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
  return compile_program(parseNew(string));
}


console.log(parse_and_compile('let x = 1; x + 3;'));