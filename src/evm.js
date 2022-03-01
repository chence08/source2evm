/*
Virtual machine implementation of language Source §0 
following the virtual machine of Lecture Week 2 of CS4215

Instructions: Copy this file into the Source Academy frontend:
              https://source-academy.github.io/playground
	      You can use the google drive feature to save your 
	      work. When done, copy the file back to the
	      repository and push your changes.

              To run your program, press "Run" and observe
	      the result on the right.

The language Source §0 is defined as follows:

prgm    ::= expr ;

expr    ::= number
         |  true | false
         |  expr binop expr
         |  unop expr
binop   ::= + | - | * | / | < | > 
         | === |  && | ||
unop    ::= !
*/

// Functions from SICP JS Section 4.1.2
// with slight modifications


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

function hex_string(n) {
  return n === 0 ? "0"
       : n === 1 ? "1"
       : n === 2 ? "2"
       : n === 3 ? "3"
       : n === 4 ? "4"
       : n === 5 ? "5"
       : n === 6 ? "6"
       : n === 7 ? "7"
       : n === 8 ? "8"
       : n === 9 ? "9"
       : n === 10 ? "A"
       : n === 11 ? "B"
       : n === 12 ? "C"
       : n === 13 ? "D"
       : n === 14 ? "E"
       : "F";
}

function to_hex_and_pad(n, code) {
  let res = "";
  let count = 0;
  while (n > 0) {
      let a = math_floor(n / 16);
      let b = n % 16;
      res = hex_string(b) + res;
      n = a;
      count = count + 1;
  }
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
  display(expr);
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
  display(temp);
  return accumulate((x, y) => (x + y), "", temp);
}

function parse_and_compile(string) {
  return compile_program(parse(string));
}

// parse_and_compile("! (1 === 1 && 2 > 3);");
// parse_and_compile("1 + 2 / 0;");
// parse_and_compile("1 + 2 / 1;");
// parse_and_compile("3 / 4;");

// machine state: a pair consisting 
// of an operand stack and a program counter,
// following 3.5.3

function make_state(stack, pc) {
  return pair(stack, pc);
}

function get_stack(state) {
  return head(state);
}

function get_pc(state) {
  return tail(state);
}

// operations on the operand stack

function empty_stack() {
  return null;
}

function push(stack, value) {
  return pair(value, stack);
}

function pop(stack) {
  return tail(stack);
}

function top(stack) {
  return head(stack);
}

// run the machine according to 3.5.3

function run(code) {
  const initial_state = make_state(empty_stack(), 0);
  return transition(code, initial_state);
}

function transition(code, state) {
  const pc = get_pc(state);
  const stack = get_stack(state);
  const instr = list_ref(code, pc);
  if (op_code(instr) === "DONE") {
      return top(stack);
  } else {
      return transition(code, make_state(next_stack(stack, instr), 
                                         pc + 1));
  }
}

function next_stack(stack, instr) {
  const op = op_code(instr);
  if (op === "COND_2") {
      const eval_false = top(stack);
      const eval_true = top(pop(stack));
      const cond = top(pop(pop(stack)));
      return push(pop(pop(pop(stack))), cond ? eval_true : eval_false);
  } else {
      return op === "PUSH32" ? push(stack, arg(instr))
        : op === "LDCB" ? push(stack, arg(instr))
        : op === "ADD" ? push(pop(pop(stack)), top(pop(stack)) + top(stack))
        : op === "SUB" ? push(pop(pop(stack)), top(pop(stack)) - top(stack))
        : op === "MUL" ? push(pop(pop(stack)), top(pop(stack)) * top(stack))
        : op === "DIV" ? push(pop(pop(stack)), math_floor(top(pop(stack)) / 
                                                          top(stack)))
        : op === "NOT" ? push(pop(stack), ! top(stack))
        : op === "EQ" ? push(pop(pop(stack)), top(pop(stack)) === top(stack))
        : op === "LT" ? push(pop(pop(stack)), top(pop(stack)) < top(stack))
        : op === "GT" ? push(pop(pop(stack)), top(pop(stack)) > top(stack))
        : op === "AND" ? push(pop(pop(stack)), top(pop(stack)) && top(stack))
        : /*op === "OR" ?*/ push(pop(pop(stack)), top(pop(stack)) || top(stack));
  }
}

function parse_compile_and_run(string) {
  const code = compile_program(parse(string));
  return run(code);
}

// parse_and_compile('3+4;');
translate(parse_and_compile('(12 + 3) < 10 ? 15+12+123-13 : 12 * 12 * 12;'));
// translate(parse_and_compile('10/(13+44+123);'));
// parse_and_compile("10/(2+3);");



