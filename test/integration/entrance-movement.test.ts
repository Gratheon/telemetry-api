import {describe, expect, it} from '@jest/globals';

// Import setup to ensure mocks are properly configured
import './setup';

// Import API configuration
import {ENTRANCE_MOVEMENT_URL, TEST_AUTH_HEADER} from './utils/api-config';

const hiveId = 1;
const boxId = 7;


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

    it('should accept 12 movements with hourly timestamps', async () => {
      const now = Math.floor(Date.now() / 1000);
      const movements = [];

      for (let i = 0; i < 12; i++) {
        movements.push({
          hiveId,
          boxId,
          timestamp: now - (i * 3600),
          "beesIn": 10 + i * 2,
          "beesOut": 8 + i * 2,
          "netFlow": 2,
          "avgSpeed": 3.5 + i * 0.2,
          "p95Speed": 8.0 + i * 0.5,
          "stationaryBees": 1 + (i % 3),
          "detectedBees": 18 + i * 4,
          "beeInteractions": 5 + i
        });
      }

      let response = await fetch(ENTRANCE_MOVEMENT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [TEST_AUTH_HEADER]: 'true'
        },
        body: JSON.stringify(movements)
      });

      const result = await response.json();
      expect(response.status).toBe(200);
      expect(result.message).toBe('OK');
    });
  });
});
