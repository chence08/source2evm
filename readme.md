```
yarn install
yarn tsc
node src/evm_alt.ts
```

- Every header is 32 bytes.
- Every node value is at least 32 bytes, so every node is at least 64 byte.

------

# Sample evm bytecodes

1. return 4 + 5;

	```
	60046005016000526001601FF3
	```

2. 
