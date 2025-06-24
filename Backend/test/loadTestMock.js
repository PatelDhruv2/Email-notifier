const { simulateEmailProcessing } = require('./emailProcessorMock');

async function runTest() {
  const start = Date.now();
  const userEmail = 'testuser@example.com';

  const jobs = Array.from({ length: 100 }).map(() =>
    simulateEmailProcessing(userEmail)
  );

  const tokens = await Promise.all(jobs);
  const duration = Date.now() - start;

  console.log(`✅ Mock 100 users completed in ${duration / 1000}s`);
  console.log('Sample token:', tokens[0]);
}

runTest();
