import fetch from 'cross-fetch';
import { HEALTH_URL } from './utils/api-config';

/**
 * Wait for the telemetry-api server to be ready before running tests
 * This will poll the server's health endpoint until it responds with a 200 status code
 * or until the timeout is reached
 */
async function waitForServerToBeReady(timeoutSeconds = 60) {
  console.log(`Waiting for server to be ready at ${HEALTH_URL}...`);
  
  for (let i = 0; i < timeoutSeconds; i++) {
    try {
      const response = await fetch(HEALTH_URL);
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
