import { parse } from "js-slang/dist/stdlib/parser";

// is_boolean, is_number are already implemented in Source.
function is_function(x) {
  if (is_pair(x)) {
    return false;
  } else {
    return is_tagged_list(parse(x), "function_declaration");
  }
}

const bool_type = list("name", "bool");
function is_bool_type(type) {
  return equal_type(type, bool_type);
}
const number_type = list("name", "number");
function is_number_type(type) {
  return equal_type(type, number_type);
}
const undefined_type = list("name", "undefined");
function is_undefined_type(type) {
  return equal_type(type, undefined_type);
}

const primitive_unary_functions = 
  list(list("!", bool_type, bool_type));
const primitive_binary_functions =
  list(list("+", number_type, number_type, number_type),
       list("-", number_type, number_type, number_type),
       list("*", number_type, number_type, number_type),
       list("/", number_type, number_type, number_type),
       list("===", number_type, number_type, bool_type),
       list("!==", number_type, number_type, bool_type),
       list("<", number_type, number_type, bool_type),
       list("<=", number_type, number_type, bool_type),
       list(">", number_type, number_type, bool_type),
       list(">=", number_type, number_type, bool_type),
       list("&&", bool_type, bool_type, bool_type),
       list("||", bool_type, bool_type, bool_type));