"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// import { parse } from "js-slang/dist/stdlib/parser.js";
const createContext_js_1 = require("js-slang/dist/createContext.js");
const list_1 = require("js-slang/dist/stdlib/list");
const parser_1 = require("js-slang/dist/stdlib/parser");
const Opcode_1 = require("./Opcode");
const Environment_1 = require("./Environment");
// console.log(parse('x => x * x;', createContext(4)));
// start of env, starting at 0x220
let GLOBAL_OFFSET = 0x220;
const INIT_CODE_LENGTH = 29;
let CONST_OFFSET = INIT_CODE_LENGTH;
let constants = "";
function parseNew(x) {
    const res = (0, parser_1.parse)(x, (0, createContext_js_1.default)());
    return res;
}
function list_to_arr(x) {
    let arr = [];
    while (!(0, list_1.is_null)(x)) {
        arr.push((0, list_1.head)(x));
        x = (0, list_1.tail)(x);
    }
    return arr;
}
function list_ref(items, n) {
    return n === 0
        ? (0, list_1.head)(items)
        : list_ref((0, list_1.tail)(items), n - 1);
}
function append(x, y) {
    return (0, list_1.is_null)(x)
        ? y
        : (0, list_1.pair)((0, list_1.head)(x), append((0, list_1.tail)(x), y));
}
function accumulate(op, initial, sequence) {
    return (0, list_1.is_null)(sequence)
        ? initial
        : op((0, list_1.head)(sequence), accumulate(op, initial, (0, list_1.tail)(sequence)));
}
function map(f, lst) {
    return (0, list_1.is_null)(lst)
        ? lst
        : (0, list_1.pair)(f((0, list_1.head)(lst)), map(f, (0, list_1.tail)(lst)));
}
function is_number(x) {
    return typeof x === 'number';
}
function is_boolean(x) {
    return 'boolean' === typeof x;
}
function is_tagged_list(expr, the_tag) {
    return (0, list_1.is_pair)(expr) && (0, list_1.head)(expr) === the_tag;
}
function make_literal(value) {
    return (0, list_1.list)("literal", value);
}
function is_literal(expr) {
    return is_tagged_list(expr, "literal");
}
function literal_value(expr) {
    return (0, list_1.head)((0, list_1.tail)(expr));
}
function is_name(stmt) {
    return is_tagged_list(stmt, "name");
}
function symbol_of_name(stmt) {
    return (0, list_1.head)((0, list_1.tail)(stmt));
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
    return (0, list_1.list)("sequence", (0, list_1.list)(stmt));
}
function sequence_statements(stmt) {
    return (0, list_1.head)((0, list_1.tail)(stmt));
}
function is_empty_sequence(stmts) {
    return (0, list_1.is_null)(stmts);
}
function is_last_statement(stmts) {
    return (0, list_1.is_null)((0, list_1.tail)(stmts));
}
function first_statement(stmts) {
    return (0, list_1.head)(stmts);
}
function rest_statements(stmts) {
    return (0, list_1.tail)(stmts);
}
function is_conditional_combination(expr) {
    return is_tagged_list(expr, "conditional_expression");
}
function is_conditional_statement(expr) {
    return is_tagged_list(expr, "conditional_statement");
}
function conditional_statement_to_expression(expr) {
    (0, list_1.set_head)(expr, "conditional_expression");
    return expr;
}
function operator(expr) {
    return (0, list_1.head)((0, list_1.tail)(expr));
}
function first_operand(expr) {
    console.log("FIRST OPERAND: ");
    console.log(expr);
    return (0, list_1.head)((0, list_1.tail)((0, list_1.tail)(expr)));
}
function second_operand(expr) {
    return (0, list_1.head)((0, list_1.tail)((0, list_1.tail)((0, list_1.tail)(expr))));
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
    return map(symbol_of_name, (0, list_1.head)((0, list_1.tail)(component)));
}
function lambda_body(component) {
    return (0, list_1.head)((0, list_1.tail)((0, list_1.tail)(component)));
}
function make_lambda_expression(parameters, body) {
    return (0, list_1.list)("lambda_expression", parameters, body);
}
function is_block(component) {
    return is_tagged_list(component, "block");
}
function block_body(component) {
    return (0, list_1.head)((0, list_1.tail)(component));
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
    return (0, list_1.list)("constant_declaration", name, value_expression);
}
function function_decl_to_constant_decl(component) {
    return make_constant_declaration(function_declaration_name(component), make_lambda_expression(function_declaration_parameters(component), function_declaration_body(component)));
}
function final_return() {
    return (0, Opcode_1.PUSH)(0) + Opcode_1.opCodes.MSTORE + (0, Opcode_1.PUSH)(32) + (0, Opcode_1.PUSH)(0) + Opcode_1.opCodes.RETURN;
}
function compile_program(program) {
    let closure_lookup = new Environment_1.default();
    const body = compile_expression(program, closure_lookup) + final_return();
    const length_of_constants = constants.length / 2 + INIT_CODE_LENGTH;
    return (0, Opcode_1.PUSH)(0) + (0, Opcode_1.PUSH4)(length_of_constants) + Opcode_1.opCodes.JUMP + constants + Opcode_1.opCodes.JUMPDEST + body;
}
function make_jump_immediate(offset) {
    return Opcode_1.opCodes.PC + (0, Opcode_1.PUSH4)(offset + 7) + Opcode_1.opCodes.ADD + Opcode_1.opCodes.JUMP;
}
function make_jump_condition(offset, condition) {
    return condition + Opcode_1.opCodes.PC + (0, Opcode_1.PUSH4)(offset + 7) + Opcode_1.opCodes.ADD + Opcode_1.opCodes.JUMPI;
}
function scan_out_declarations(component) {
    return is_sequence(component)
        ? accumulate(append, null, map(scan_out_declarations, sequence_statements(component)))
        : is_declaration(component)
            ? (0, list_1.list)(declaration_symbol(component))
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
    return symbol_of_name((0, list_1.head)((0, list_1.tail)(component)));
}
function declaration_value(stmt) {
    return (0, list_1.head)((0, list_1.tail)((0, list_1.head)((0, list_1.tail)((0, list_1.tail)(stmt)))));
}
function constant_declaration_value(stmt) {
    return (0, list_1.head)((0, list_1.tail)((0, list_1.tail)(stmt)));
}
// applications are tagged with "application"
// and have "operator" and "operands"
function is_application(component) {
    return is_tagged_list(component, "application");
}
function function_expression(component) {
    return (0, list_1.head)((0, list_1.tail)(component));
}
function arg_expressions(component) {
    return (0, list_1.head)((0, list_1.tail)((0, list_1.tail)(component)));
}
// Return statements
function is_return_statement(stmt) {
    return is_tagged_list(stmt, "return_statement");
}
function return_statement_expression(stmt) {
    return (0, list_1.head)((0, list_1.tail)(stmt));
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
    return (0, list_1.head)((0, list_1.tail)((0, list_1.tail)(expr)));
}
function loop_condition(expr) {
    return (0, list_1.head)((0, list_1.tail)(expr));
}
function compile_sequence(expr, closure_lookup) {
    // compile for each statement, starting from 1st
    const statements = sequence_statements(expr);
    const declarations = list_to_arr(scan_out_declarations(expr));
    const extend_env_code = closure_lookup.extend_env();
    let extended_env = new Environment_1.default(closure_lookup);
    console.log(declarations);
    for (let i = 0; i < declarations.length; i++) {
        extended_env.insert(declarations[i]);
    }
    const code = map(x => compile_expression(x, extended_env), statements);
    console.log("----------------------------------------------------");
    const l = accumulate((x, y) => x + y, "", code).length;
    if (l % 2 == 1) {
        console.log(statements);
        console.log(code);
    }
    console.log("----------------------------------------------------");
    return extend_env_code + accumulate((x, y) => x + y, "", code) + extended_env.go_up_stack();
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
        + Opcode_1.opCodes.JUMPDEST
        + op1_code
        + Opcode_1.opCodes.JUMPDEST;
}
function compile_while_loop(expr, closure_lookup) {
    const body = compile_expression(loop_body(expr), closure_lookup);
    const cond = compile_expression(loop_condition(expr), closure_lookup);
    console.log(body);
    console.log(cond);
    const dummy = (0, Opcode_1.PUSH4)(0)
        + Opcode_1.opCodes.ADD + Opcode_1.opCodes.JUMPI
        + Opcode_1.opCodes.POP + Opcode_1.opCodes.PC + (0, Opcode_1.PUSH4)(0) + Opcode_1.opCodes.ADD + Opcode_1.opCodes.JUMP
        + Opcode_1.opCodes.JUMPDEST;
    const middle_len = dummy.length / 2;
    console.log(middle_len);
    const dummy2 = (0, Opcode_1.PUSH4)(0) + Opcode_1.opCodes.ADD + Opcode_1.opCodes.JUMP
        + Opcode_1.opCodes.JUMPDEST
        + body
        + Opcode_1.opCodes.DUP1 + (0, Opcode_1.PUSH)(1) + Opcode_1.opCodes.ADD + Opcode_1.opCodes.JUMP + Opcode_1.opCodes.JUMPDEST;
    const back_len = dummy2.length / 2;
    console.log(back_len);
    return Opcode_1.opCodes.PC + Opcode_1.opCodes.JUMPDEST + cond
        + Opcode_1.opCodes.PC + (0, Opcode_1.PUSH4)(middle_len)
        + Opcode_1.opCodes.ADD + Opcode_1.opCodes.JUMPI
        // if true, jump to loop body 
        // end loop otherwise
        + Opcode_1.opCodes.POP + Opcode_1.opCodes.PC + (0, Opcode_1.PUSH4)(back_len) + Opcode_1.opCodes.ADD + Opcode_1.opCodes.JUMP
        + Opcode_1.opCodes.JUMPDEST
        + body
        + Opcode_1.opCodes.DUP1 + (0, Opcode_1.PUSH)(1) + Opcode_1.opCodes.ADD + Opcode_1.opCodes.JUMP + Opcode_1.opCodes.JUMPDEST;
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
    const body_expr = constant_declaration_value(expr);
    closure_lookup.constants.push(name);
    // use normal assignment if is not a function
    if (!is_lambda_expression(body_expr)) {
        return compile_assignment(expr, closure_lookup, false);
    }
    const body = compile_expression(constant_declaration_value(expr), closure_lookup);
    // add constant name to closure constants list
    const this_offset = CONST_OFFSET;
    console.log("OFFSET: " + this_offset);
    // closure_lookup.insert(name, this_offset);
    // mload rtn
    // jump
    constants = constants + Opcode_1.opCodes.JUMPDEST + body + Opcode_1.opCodes.SWAP1 + Opcode_1.opCodes.JUMP;
    CONST_OFFSET = INIT_CODE_LENGTH + constants.length / 2;
    return closure_lookup.update_mem(name, this_offset, closure_lookup.get_name_offset(name));
}
function get_stack_offset() {
    // store stack offset in 0x20
    return (0, Opcode_1.PUSH)(0) + Opcode_1.opCodes.MLOAD;
}
function get_current_env_offset() {
    // store stack offset in 0x20
    return (0, Opcode_1.PUSH)(32) + Opcode_1.opCodes.MLOAD;
}
function load_lambda_param(local_offset) {
    // already on stack
    console.log("local offset");
    console.log(local_offset);
    console.log("local offset");
    return (0, Opcode_1.PUSH4)(local_offset) + get_current_env_offset() + Opcode_1.opCodes.ADD + Opcode_1.opCodes.MSTORE;
}
// function load_lambda_local(x, local_offset)
function compile_lambda_expression(expr, closure_lookup) {
    console.log(closure_lookup);
    const the_body = lambda_body(expr);
    const body = is_block(the_body) ? block_body(the_body) : the_body;
    const locals = scan_out_declarations(body);
    let extended_env = new Environment_1.default(closure_lookup);
    let current_offset = 32;
    // list of params
    const parameters = list_to_arr(lambda_parameter_symbols(expr)).reverse();
    let load_params = "";
    // all params are on stack, in reverse order, i.e. last argument on top
    if (parameters !== null) {
        for (const x of parameters) {
            load_params = load_params + load_lambda_param(current_offset);
            extended_env.insert(x);
            current_offset += 32;
        }
    }
    console.log("++++++++++++++++++++++++++++++++++++++++");
    console.log(extended_env);
    console.log("++++++++++++++++++++++++++++++++++++++++");
    if (locals !== null) {
        for (const x of locals) {
            // assign space for locals
            extended_env.insert(x);
            current_offset += 32;
        }
    }
    console.log(body);
    const code = closure_lookup.extend_env() + load_params + compile_expression(body, extended_env);
    console.log(code);
    // return result or last computation stored on stack
    // need to pop stack frame and move stack pointer back by 32
    const return_stack_frame = closure_lookup.go_up_stack();
    // const return_stack_pointer = PUSH(32) + get_stack_offset() + opCodes.SUB + opCodes.DUP1 + PUSH(0) + opCodes.MSTORE + opCodes.MLOAD + PUSH(32) + opCodes.MSTORE
    return code + return_stack_frame;
}
function compile_application(expr, closure_lookup) {
    const name = symbol_of_name(function_expression(expr));
    const function_offset_code = closure_lookup.get_name_offset(name);
    const args = map(x => compile_expression(x, closure_lookup), arg_expressions(expr));
    const arg_code = accumulate((a, b) => a + b, "", args);
    // const change_env = closure_lookup.extend_env();
    const load_args_and_jump = arg_code + function_offset_code + Opcode_1.opCodes.MLOAD + Opcode_1.opCodes.JUMP + Opcode_1.opCodes.JUMPDEST;
    const call_function = Opcode_1.opCodes.PC + (0, Opcode_1.PUSH4)((load_args_and_jump.length / 2) + 6) + Opcode_1.opCodes.ADD + load_args_and_jump;
    console.log("APPLICATION NAME: " + name);
    return call_function;
}
function compile_tail_call_application(expr, closure_lookup) {
    const name = symbol_of_name(function_expression(expr));
    const function_offset_code = closure_lookup.get_name_offset(name);
    const args = map(x => compile_expression(x, closure_lookup), arg_expressions(expr));
    const arg_code = accumulate((a, b) => a + b, "", args);
    const move_up_stack = closure_lookup.go_up_stack();
    closure_lookup = closure_lookup.upper_scope;
    // const change_to_function_env = closure_lookup.update_stack(name);
    const load_args_and_jump = arg_code + function_offset_code + Opcode_1.opCodes.MLOAD + move_up_stack + Opcode_1.opCodes.JUMP + Opcode_1.opCodes.JUMPDEST;
    const call_function = load_args_and_jump;
    return call_function;
}
function compile_assignment(expr, closure_lookup, is_reassignment) {
    const symbol = declaration_symbol(expr);
    console.log(expr);
    console.log(constant_declaration_value(expr));
    if (is_reassignment && closure_lookup.constants.includes(symbol)) {
        throw console.error("Reassigning constant: " + symbol);
    }
    const value = compile_expression(constant_declaration_value(expr), closure_lookup);
    // frame_offset is the offset of the current env frame
    console.log(closure_lookup);
    console.log("VALUE: " + value);
    return value + closure_lookup.get_name_offset(symbol) + Opcode_1.opCodes.MSTORE;
}
function compile_expression(expr, closure_lookup) {
    if (is_number_literal(expr)) {
        return (0, Opcode_1.PUSH32)(literal_value(expr));
    }
    else if (is_boolean_literal(expr)) {
        return (0, Opcode_1.LDCB)(literal_value(expr));
    }
    else if (is_lambda_expression(expr)) {
        return compile_lambda_expression(expr, closure_lookup);
    }
    else if (is_while_loop(expr)) {
        return compile_while_loop(expr, closure_lookup);
    }
    else if (is_variable_declaration(expr) || is_assignment(expr)) {
        return compile_assignment(expr, closure_lookup, is_assignment(expr));
    }
    else if (is_name(expr)) {
        const name = symbol_of_name(expr);
        const load_from_heap = closure_lookup.get_name_offset(name) + Opcode_1.opCodes.MLOAD;
        // PUSH32(closure_lookup.search(name) * 32) + opCodes.ADD + opCodes.MLOAD; 
        // const offset = closure_lookup.search(name)
        console.log(closure_lookup.search(name));
        console.log(closure_lookup.frame_offset);
        return load_from_heap;
        // if (closure_lookup.constants.includes(name)) {
        //   const load_and_jump = load_from_heap + opCodes.JUMP + opCodes.JUMPDEST;
        //   return opCodes.PC + PUSH((load_and_jump.length / 2) + 3) + opCodes.ADD + load_and_jump;
        // } else {
        //   return load_from_heap;
        // }
    }
    else if (is_sequence(expr)) {
        return compile_sequence(expr, closure_lookup);
    }
    else if (is_function_declaration(expr)) {
        return compile_expression(function_decl_to_constant_decl(expr), closure_lookup);
    }
    else if (is_constant_declaration(expr)) {
        // closure_lookup.update_mem(compile_constant(expr, closure_lookup));
        return compile_constant(expr, closure_lookup);
    }
    else if (is_application(expr)) {
        return compile_application(expr, closure_lookup);
    }
    else if (is_return_statement(expr)) {
        const return_expr = return_statement_expression(expr);
        if (is_application(return_expr)) {
            // tail call optimisation
            return compile_tail_call_application(return_expr, closure_lookup);
        }
        else {
            return compile_expression(return_expr, closure_lookup) + closure_lookup.go_up_stack() + Opcode_1.opCodes.SWAP1 + Opcode_1.opCodes.JUMP;
        }
    }
    else if (is_conditional_statement(expr)) {
        return compile_expression(conditional_statement_to_expression(expr), closure_lookup);
    }
    else {
        const op = operator(expr);
        console.log(expr);
        const operand_1 = first_operand(expr);
        if (op === "!") {
            return compile_expression(operand_1, closure_lookup) + Opcode_1.opCodes.NOT;
        }
        else {
            const operand_2 = second_operand(expr);
            if (is_conditional_combination(expr) && is_boolean_literal(op)) {
                return literal_value(op) ? compile_expression(operand_1, closure_lookup) : compile_expression(operand_2, closure_lookup);
            }
            else if (is_conditional_combination(expr)) {
                return compile_conditional(expr, closure_lookup);
                // return append(compile_expression(op),
                //             append(compile_expression(operand_1),
                //                 append(compile_expression(operand_2),
                //                     list(make_simple_instruction("COND_2")))));
            }
            else {
                if (op === "<=" || op === ">=") {
                    const op_code = op === ">=" ? Opcode_1.opCodes.GT : Opcode_1.opCodes.LT;
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
                    return compile_expression(operand_1, closure_lookup) + Opcode_1.opCodes.DUP1
                        + compile_expression(operand_2, closure_lookup) + Opcode_1.opCodes.DUP1
                        + Opcode_1.opCodes.SWAP2 + op_code + Opcode_1.opCodes.SWAP2 + Opcode_1.opCodes.EQ + Opcode_1.opCodes.OR;
                }
                const op_code = op === "+" ? Opcode_1.opCodes.ADD
                    : op === "-" ? Opcode_1.opCodes.SUB
                        : op === "*" ? Opcode_1.opCodes.MUL
                            : op === "/" ? Opcode_1.opCodes.DIV
                                : op === "===" ? Opcode_1.opCodes.EQ
                                    : op === "<" ? Opcode_1.opCodes.LT
                                        : op === ">" ? Opcode_1.opCodes.GT
                                            : op === "&&" ? Opcode_1.opCodes.AND
                                                : /*op === "||" ?*/ Opcode_1.opCodes.OR;
                if (op_code === Opcode_1.opCodes.DIV || op_code === Opcode_1.opCodes.LT || op_code === Opcode_1.opCodes.GT || op_code === Opcode_1.opCodes.SUB) {
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
function parse_and_compile(string) {
    return (0, Opcode_1.PUSH)(0x20) + (0, Opcode_1.PUSH)(0) + (0, Opcode_1.PUSH4)(0x200) + (0, Opcode_1.PUSH)(0x20) + (0, Opcode_1.PUSH4)(0x200) + (0, Opcode_1.PUSH)(0x40)
        + Opcode_1.opCodes.MSTORE + Opcode_1.opCodes.MSTORE + Opcode_1.opCodes.MSTORE + compile_program(parseNew(string));
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
console.log(parse_and_compile(`

let x = 3;
if (1 < 3) {
  let y = 5;
  x = 4 + 5;
} else { x = 5; }
x + 2;

`));
// console.log(constants);
