import fetch from 'cross-fetch';

/**
 * Wait for the telemetry-api server to be ready before running tests
 * This will poll the server's health endpoint until it responds with a 200 status code
 * or until the timeout is reached
 */
async function waitForServerToBeReady(timeoutSeconds = 60) {
  const serverUrl = 'http://localhost:8600/health';
  console.log(`Waiting for server to be ready at ${serverUrl}...`);
  
  for (let i = 0; i < timeoutSeconds; i++) {
    try {
      const response = await fetch(serverUrl);
      if (response.status === 200) {
        console.log('Server is ready!');
        return true;
      }
    } catch (error) {
      // Server not ready yet, continue waiting
    }
    
    // Wait 1 second before trying again
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Still waiting for server... (${i + 1}/${timeoutSeconds})`);
  }
  
  throw new Error(`Server did not become ready within ${timeoutSeconds} seconds`);
}

export default async function() {
  await waitForServerToBeReady();
}
