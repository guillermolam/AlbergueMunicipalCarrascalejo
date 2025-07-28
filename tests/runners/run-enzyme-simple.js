
#!/usr/bin/env node

console.log('🧪 Running Enzyme Component Tests\n');

import { spawn } from 'child_process';

const testProcess = spawn('npx', ['jest', '--config=jest.config.cjs', '--verbose', '--no-coverage'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'test',
  }
});

testProcess.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ All Enzyme tests completed successfully!');
  } else {
    console.log(`\n❌ Tests failed with exit code: ${code}`);
    process.exit(code);
  }
});

testProcess.on('error', (error) => {
  console.error('❌ Failed to run tests:', error.message);
  process.exit(1);
});
