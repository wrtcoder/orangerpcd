#include "test-funcs.h"
#include "../src/json_check.h"
#include "../src/json_check.c"
#include <stdio.h>

struct test {
	const char *str; 
	int valid; 
}; 

struct test tests[] = {
	{"{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"challenge\",\"params\":[]}", 1},
	{"{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"challenge\",\"params\":[foo]}", 0},
	{"{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"challenge\",\"params\":[foo:\"bar\"]}", 0},
	{"{\"jsonrpc\":\"2.0\",\"id\":1,\"method\':\"challenge\",\"params\":[]}", 0},
	{"{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"challenge\",\"params\":{\"FOO\":\"BAR\"}}", 1},
	{"{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"challenge\",\"params\":{\"FOO\b:\"BAR\"}}", 0}
}; 

int main(void){
	JSON_check jc = JSON_check_new(10); 
	for(size_t c = 0; c < sizeof(tests)/sizeof(tests[0]); c++){
		TEST(!!JSON_check_string(jc, tests[c].str) == !!tests[c].valid); 
	}
	JSON_check_free(&jc); 
	return 0; 
}
