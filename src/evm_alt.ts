// import { parse } from "js-slang/dist/stdlib/parser.js";
import createContext from "js-slang/dist/createContext.js";
import { pair, is_pair, head, tail, is_null, list, set_head, set_tail } from "js-slang/dist/stdlib/list";
import { parse } from "js-slang/dist/stdlib/parser";

// console.log(parse('x => x * x;', createContext(4)));

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

// functions to represent virtual machine code

function op_code(instr) {
  return head(instr);
}

function arg(instr) {
  return head(tail(instr));
}

function make_simple_instruction(op_code) {
  return list(op_code);
}

function DONE() {
  return list("STOP");
}

function LDCI(i) {
  return list("PUSH32", i);
}

function PUSH(i) {
  return list("PUSH", i);
}

function LDCB(b) {
  return list("LDCB", b);
}

function PLUS() {
  return list("ADD");
}

function MINUS() {
  return list("SUB");
}

function TIMES() {
  return list("MUL");
}

function DIV() {
  return list("DIV");
}

function AND() {
  return list("AND");
}

function OR() {
  return list("OR");
}

function NOT() {
  return list("NOT");
}

function LT() {
  return list("LT");
}

function GT() {
  return list("GT");
}

function EQ() {
  return list("EQ");
}

function MSTORE() {
  return list("MSTORE");
}

function PC() {
  return list("PC");
}

function JUMPI() {
  return list("JUMPI");
}

function JUMP() {
  return list("JUMP");
}

function JUMPDEST() {
  return list("JUMPDEST");
}

function RETURN() {
  return list("RETURN");
}

// compile_program: see relation ->> in Section 3.5.2

function final_return() {
  return list(PUSH(0), MSTORE(), PUSH(32), PUSH(0), RETURN());
}

function compile_program(program) {
  return append(compile_expression(program), final_return());
}

// compile_expression: see relation hookarrow in 3.5.2

function make_jump_immediate(offset) {
  return list(PC(), PUSH(offset), PLUS(), JUMP());
}

function make_jump_condition(offset, condition) {
  return append(condition, list(PC(), PUSH(offset), PLUS(), JUMPI()));
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
  
  return append(make_jump_condition(op2_length + 5, cond), append(op2_code, 
      append(make_jump_immediate(op1_length + 5), append(op1_code, list(JUMPDEST())))));
  
}

function compile_expression(expr) {
  if (is_number_literal(expr)) {
      return list(LDCI(literal_value(expr)));
  } else if (is_boolean_literal(expr)) {
      return list(LDCB(literal_value(expr)));
  } else {
      const op = operator(expr);
      const operand_1 = first_operand(expr);
      if (op === "!") {
          return append(compile_expression(operand_1),
                        list(NOT()));
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
              const op_code = op === "+" ? "ADD"
                            : op === "-" ? "SUB"
                            : op === "*" ? "MUL"
                            : op === "/" ? "DIV"
                            : op === "===" ? "EQ"
                            : op === "<" ? "LT"
                            : op === ">" ? "GT"
                            : op === "&&" ? "AND"
                            : /*op === "||" ?*/ "OR";
              if (op_code === "DIV" || op_code === "LT" || op_code === "GT") {
                  return append(compile_expression(operand_2),
                          append(compile_expression(operand_1),
                           list(make_simple_instruction(op_code))));

              }
              return append(compile_expression(operand_1),
                            append(compile_expression(operand_2),
                                   list(make_simple_instruction(op_code))));
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
      return res.padStart(64, '0');
      // if (count < 64) {
      //     const diff = 64 - count;
      //     for (let i = 0; i < diff; i = i + 1) {
      //         res = "0" + res;
      //     }
      // }
  } else {
    return res.padStart(2, '0');
      // if (count < 2) {
      //     const diff = 2 - count;
      //     for (let i = 0; i < diff; i = i + 1) {
      //         res = "0" + res;
      //     }
      // }
  }
  return res;
}

function get_opcode(expr) {
  const code = head(expr);
  const data = tail(expr);
  // if (is_pair(data)) {
  //     set_head(data, stringify(head(data)));
  // }
  return (code === "PUSH32" ? "7F"
       : code === "PUSH" ? "60"
       : code === "ADD" ? "01"
       : code === "MUL" ? "02"
       : code === "SUB" ? "03"
       : code === "DIV" ? "04"
       : code === "EQ" ? "14"
       : code === "LT" ? "10"
       : code === "GT" ? "11"
       : code === "MSTORE" ? "52"
       : code === "RETURN" ? "F3"
       : code === "PC" ? "58"
       : code === "JUMP" ? "56"
       : code === "JUMPI" ? "57"
       : code === "JUMPDEST" ? "5B"
       : "00") // STOP
       + (is_pair(data) && is_number(head(data)) ? to_hex_and_pad(head(data), code) : "");
}

function translate(lst) {
  const temp = map(get_opcode, lst);
  return accumulate((x, y) => (x + y), "", temp);
}

function parse_and_compile(string) {
  return compile_program(parseNew(string));
}

console.log(translate(parse_and_compile('123;')));