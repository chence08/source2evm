```
yarn install
yarn tsc
node src/evm_alt.ts
```

- Every header is 32 bytes.
- Every `Node` value is at least 32 bytes, so every `Node` is at least 64 byte.
- `Node`s are used for declarations only. Primitive calculators exist only on the stack only.

------

# Sample evm bytecodes

1. return 4 + 5;

	```
	60046005016000526001601FF3
	```

2. 
