import {describe, expect, it} from '@jest/globals';

// Import setup to ensure mocks are properly configured
import './setup';

// Import API configuration
import {ENTRANCE_MOVEMENT_URL, TEST_AUTH_HEADER} from './utils/api-config';

const hiveId = 8;
const boxId = 19;


describe('POST /entrance/v1/movement', () => {
  describe('validation errors', () => {
    it('empty body should fail with missing hiveId', async () => {
      let response = await fetch(ENTRANCE_MOVEMENT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [TEST_AUTH_HEADER]: 'true'
        },
        body: JSON.stringify({}) // <-- empty body
      });

      const result = await response.json();
      expect(response.status).toBe(400);
      expect(result.error).toBe('Bad Request: hiveId not provided');
    });

    it('empty body should fail with missing sectionId', async () => {
      let response = await fetch(ENTRANCE_MOVEMENT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [TEST_AUTH_HEADER]: 'true'
        },
        body: JSON.stringify({
          hiveId,
          // <-- missing sectionId
        })
      });

      const result = await response.json();
      expect(response.status).toBe(400);
      expect(result.error).toBe('Bad Request: boxId not provided');
    });

    it('empty body should fail with missing fields', async () => {
      let response = await fetch(ENTRANCE_MOVEMENT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [TEST_AUTH_HEADER]: 'true'
        },
        body: JSON.stringify({
          hiveId,
          boxId,
          // <-- missing fields
        })
      });

      const result = await response.json();
      expect(response.status).toBe(400);
      expect(result.error).toBe('Bad Request: beesOut or beesIn are not provided');
    });

    it('empty array should fail', async () => {
      let response = await fetch(ENTRANCE_MOVEMENT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [TEST_AUTH_HEADER]: 'true'
        },
        body: JSON.stringify([])
      });

      const result = await response.json();
      expect(response.status).toBe(400);
      expect(result.error).toBe('Bad Request: no movements provided');
    });

    it('array with missing hiveId should fail', async () => {
      let response = await fetch(ENTRANCE_MOVEMENT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [TEST_AUTH_HEADER]: 'true'
        },
        body: JSON.stringify([{
          boxId,
          beesIn: 10,
          beesOut: 5
        }])
      });

      const result = await response.json();
      expect(response.status).toBe(400);
      expect(result.error).toBe('Bad Request: hiveId not provided');
    });
  });

  describe('success cases', () => {
    it('should respond with message:OK for single movement', async () => {
      let response = await fetch(ENTRANCE_MOVEMENT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [TEST_AUTH_HEADER]: 'true'
        },
        body: JSON.stringify({
          hiveId,
          boxId,
          "beesIn": Math.ceil(Math.random() * 100),
          "beesOut": Math.ceil(Math.random() * 100),
          "netFlow": Math.ceil(Math.random() * 100),
          "avgSpeed": Math.random() * 10,
          "p95Speed": Math.random() * 20,
          "stationaryBees": Math.ceil(Math.random() * 5),
          "detectedBees": Math.ceil(Math.random() * 100),
        })
      });

      const result = await response.json();
      expect(response.status).toBe(200);
      expect(result.message).toBe('OK');
    });

    it('should respond with message:OK for single movement with timestamp', async () => {
      const timestamp = Math.floor(Date.now() / 1000) - 3600;

      let response = await fetch(ENTRANCE_MOVEMENT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [TEST_AUTH_HEADER]: 'true'
        },
        body: JSON.stringify({
          hiveId,
          boxId,
          timestamp,
          "beesIn": 50,
          "beesOut": 45,
          "netFlow": 5,
          "avgSpeed": 5.5,
          "p95Speed": 12.3,
          "stationaryBees": 3,
          "detectedBees": 95,
        })
      });

      const result = await response.json();
      expect(response.status).toBe(200);
      expect(result.message).toBe('OK');
    });

    it('should respond with message:OK for array of movements', async () => {
      let response = await fetch(ENTRANCE_MOVEMENT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [TEST_AUTH_HEADER]: 'true'
        },
        body: JSON.stringify([
          {
            hiveId,
            boxId,
            "beesIn": 20,
            "beesOut": 15,
            "netFlow": 5,
            "avgSpeed": 4.2,
            "p95Speed": 10.5,
            "stationaryBees": 2,
            "detectedBees": 35,
          },
          {
            hiveId,
            boxId,
            "beesIn": 25,
            "beesOut": 18,
            "netFlow": 7,
            "avgSpeed": 5.1,
            "p95Speed": 11.2,
            "stationaryBees": 3,
            "detectedBees": 43,
          }
        ])
      });

      const result = await response.json();
      expect(response.status).toBe(200);
      expect(result.message).toBe('OK');
    });
  });

  describe('bulk data generation', () => {
    it('should accept month of movements with 5-minute intervals', async () => {
      const now = Math.floor(Date.now() / 1000);
      const monthInSeconds = 30 * 24 * 60 * 60;
      const fiveMinutesInSeconds = 5 * 60;
      const movementsCount = monthInSeconds / fiveMinutesInSeconds;

      const movements = [];
      const baseBeesIn = 50;
      const baseBeesOut = 45;
      const baseAvgSpeed = 5.0;
      const baseP95Speed = 12.0;
      const baseStationaryBees = 3;

      for (let i = 0; i < movementsCount; i++) {
        const timestamp = now - (i * fiveMinutesInSeconds);

        const beesInVariation = Math.floor((Math.random() - 0.5) * 40);
        const beesOutVariation = Math.floor((Math.random() - 0.5) * 40);
        const speedVariation = (Math.random() - 0.5) * 4;
        const stationaryVariation = Math.floor((Math.random() - 0.5) * 4);

        const beesIn = Math.max(0, Math.min(200, baseBeesIn + beesInVariation));
        const beesOut = Math.max(0, Math.min(200, baseBeesOut + beesOutVariation));
        const netFlow = beesIn - beesOut;
        const avgSpeed = Math.max(1, Math.min(15, baseAvgSpeed + speedVariation));
        const p95Speed = Math.max(avgSpeed, Math.min(30, baseP95Speed + speedVariation * 2));
        const stationaryBees = Math.max(0, Math.min(10, baseStationaryBees + stationaryVariation));
        const detectedBees = beesIn + beesOut;
        const beeInteractions = Math.floor(Math.random() * 20);

        movements.push({
          hiveId,
          boxId,
          timestamp,
          beesIn,
          beesOut,
          netFlow,
          avgSpeed: Math.round(avgSpeed * 10) / 10,
          p95Speed: Math.round(p95Speed * 10) / 10,
          stationaryBees,
          detectedBees,
          beeInteractions
        });
      }

      console.log(`Generated ${movements.length} movements`);

      const batchSize = 1000;
      const batches = [];
      for (let i = 0; i < movements.length; i += batchSize) {
        batches.push(movements.slice(i, i + batchSize));
      }

      console.log(`Sending ${batches.length} batches of up to ${batchSize} movements`);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`Sending batch ${i + 1}/${batches.length} with ${batch.length} movements`);

        let response = await fetch(ENTRANCE_MOVEMENT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [TEST_AUTH_HEADER]: 'true'
          },
          body: JSON.stringify(batch)
        });

        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.message).toBe('OK');
      }

      console.log(`Successfully sent all ${movements.length} movements in ${batches.length} batches`);
    });
  });
});
