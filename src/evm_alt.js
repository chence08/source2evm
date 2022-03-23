"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// import { parse } from "js-slang/dist/stdlib/parser.js";
const createContext_js_1 = require("js-slang/dist/createContext.js");
const list_1 = require("js-slang/dist/stdlib/list");
const parser_1 = require("js-slang/dist/stdlib/parser");
const Opcode_1 = require("./Opcode");
const misc_1 = require("./misc");
const Environment_1 = require("./Environment");
// console.log(parse('x => x * x;', createContext(4)));
let GLOBAL_OFFSET = 32;
let LOOKUP_TABLE = {};
let CONST_OFFSET = 1;
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
function operator(expr) {
    return (0, list_1.head)((0, list_1.tail)(expr));
}
function first_operand(expr) {
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
function is_function_declaration(component) {
    return is_tagged_list(component, "function_declaration");
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
    return (0, Opcode_1.PUSH32)(0) + Opcode_1.opCodes.MSTORE + (0, Opcode_1.PUSH32)(32) + (0, Opcode_1.PUSH32)(0) + Opcode_1.opCodes.RETURN;
}
function compile_program(program) {
    let closure_lookup = new Environment_1.default();
    const body = compile_expression(program, closure_lookup) + final_return();
    const length_of_constants = constants.length / 2 + 5;
    return (0, Opcode_1.PUSH)(0) + (0, Opcode_1.PUSH)(length_of_constants) + Opcode_1.opCodes.JUMP + constants + Opcode_1.opCodes.JUMPDEST + body;
}
function make_jump_immediate(offset) {
    return Opcode_1.opCodes.PC + (0, Opcode_1.PUSH32)(offset) + Opcode_1.opCodes.ADD + Opcode_1.opCodes.JUMP;
}
function make_jump_condition(offset, condition) {
    return condition + Opcode_1.opCodes.PC + (0, Opcode_1.PUSH32)(offset) + Opcode_1.opCodes.ADD + Opcode_1.opCodes.JUMPI;
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
function is_declaration(component) {
    return is_tagged_list(component, "constant_declaration") ||
        is_tagged_list(component, "variable_declaration") ||
        is_tagged_list(component, "function_declaration");
}
function is_variable_declaration(component) {
    return is_tagged_list(component, "variable_declaration");
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
function compile_sequence(expr, closure_lookup) {
    // compile for each statement, starting from 1st
    const statements = sequence_statements(expr);
    const declarations = list_to_arr(scan_out_declarations(expr));
    for (let i = 0; i < declarations.length; i++) {
        closure_lookup.insert(declarations[i], (i + 1) * 32);
    }
    closure_lookup.frame_offset = GLOBAL_OFFSET;
    const code = map(x => compile_expression(x, closure_lookup), statements);
    return accumulate((x, y) => x + y, "", code);
}
function count_opcode_length(code) {
    if ((0, list_1.head)(code) === "PUSH32") {
        return 33;
    }
    else if ((0, list_1.head)(code) === "PUSH") {
        return 2;
    }
    else {
        return 1;
    }
}
function count_length(code) {
    return accumulate((a, b) => a + b, 0, map(count_opcode_length, code));
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
        + Opcode_1.opCodes.JUMPDEST;
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
    closure_lookup.insert(name, CONST_OFFSET);
    // mload rtn
    // jump
    constants = constants + body + (0, Opcode_1.PUSH)(0) + Opcode_1.opCodes['MLOAD'] + Opcode_1.opCodes['JUMP'];
    CONST_OFFSET = constants.length / 2;
    return "";
}
function compile_lambda_expression(expr, closure_lookup) {
    const the_body = lambda_body(expr);
    const body = is_block(the_body) ? block_body(the_body) : the_body;
    // const locals = scan_out_declarations(body);
    let extended_env = new Environment_1.default(closure_lookup);
    // list of params
    const parameters = list_to_arr(lambda_parameter_symbols(expr)).reverse();
    let map_params = "";
    // all params are on stack, in reverse order, i.e. last argument on top
    for (const x of parameters) {
        map_params = map_params + (0, Opcode_1.PUSH32)(GLOBAL_OFFSET) + Opcode_1.opCodes.MSTORE;
        extended_env.insert(x, GLOBAL_OFFSET);
        GLOBAL_OFFSET += 32;
    }
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
function compile_expression(expr, closure_lookup) {
    if (is_number_literal(expr)) {
        return (0, Opcode_1.PUSH32)(literal_value(expr));
    }
    else if (is_boolean_literal(expr)) {
        return (0, Opcode_1.LDCB)(literal_value(expr));
    }
    else if (is_variable_declaration(expr)) {
        const symbol = declaration_symbol(expr);
        const value = declaration_value(expr);
        const frame_offset = closure_lookup.frame_offset;
        const offset = closure_lookup.search(symbol) + frame_offset;
        return is_number_literal(value)
            ? (0, Opcode_1.PUSH32)(literal_value(value))
            : is_boolean_literal(value)
                ? (0, Opcode_1.LDCB)(literal_value(value))
                : undefined
                    + (0, Opcode_1.PUSH32)(offset) + Opcode_1.opCodes.MSTORE;
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
    }
    else if (is_name(expr)) {
        const name = symbol_of_name(expr);
        const offset = LOOKUP_TABLE[name];
        return (0, misc_1.getSingleHeapValue)(offset);
    }
    else if (is_sequence(expr)) {
        return compile_sequence(expr, closure_lookup);
    }
    else if (is_function_declaration(expr)) {
        return compile_expression(function_decl_to_constant_decl(expr), closure_lookup);
    }
    else if (is_constant_declaration(expr)) {
        return compile_constant(expr, closure_lookup);
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
                const op_code = op === "+" ? Opcode_1.opCodes.ADD
                    : op === "-" ? Opcode_1.opCodes.SUB
                        : op === "*" ? Opcode_1.opCodes.MUL
                            : op === "/" ? Opcode_1.opCodes.DIV
                                : op === "===" ? Opcode_1.opCodes.EQ
                                    : op === "<" ? Opcode_1.opCodes.LT
                                        : op === ">" ? Opcode_1.opCodes.GT
                                            : op === "&&" ? Opcode_1.opCodes.AND
                                                : /*op === "||" ?*/ Opcode_1.opCodes.OR;
                if (op_code === Opcode_1.opCodes.DIV || op_code === Opcode_1.opCodes.LT || op_code === Opcode_1.opCodes.GT) {
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
    }
    else {
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
    const code = (0, list_1.head)(expr);
    const data = (0, list_1.tail)(expr);
    // if (is_pair(data)) {
    //     set_head(data, stringify(head(data)));
    // }
    return Opcode_1.opCodes[code]
        + ((0, list_1.is_pair)(data) && is_number((0, list_1.head)(data)) ? to_hex_and_pad((0, list_1.head)(data), code) : "");
}
function translate(lst) {
    const temp = map(get_opcode, lst);
    return accumulate((x, y) => (x + y), "", temp);
}
function parse_and_compile(string) {
    return compile_program(parseNew(string));
}
console.log(parse_and_compile('const x = 1;'));
console.log(constants);
