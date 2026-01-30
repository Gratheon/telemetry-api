import {expect, describe, it} from '@jest/globals';
import './setup';
import {graphQLRequest} from './utils/api-config';

/**
 * Test to generate realistic bee population data for hive 199 over 3 months
 * 
 * Usage: npm test -- generate-population-data.test.ts
 */

const HIVE_ID = '199';
const DAYS_TO_GENERATE = 90; // 3 months
const ENTRIES_PER_DAY = 1; // One measurement per day

// Bee population ranges (realistic for a healthy hive)
const BEE_COUNT_MIN = 20000;
const BEE_COUNT_MAX = 60000;
const DRONE_COUNT_MIN = 100;
const DRONE_COUNT_MAX = 2000;
const VARROA_MITE_MIN = 5;
const VARROA_MITE_MAX = 100;

interface PopulationData {
    beeCount: number;
    droneCount: number;
    varroaMiteCount: number;
}

/**
 * Generate random integer between min and max (inclusive)
 */
function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate realistic bee population data with seasonal variation
 * Higher populations in summer, lower in winter
 */
function generatePopulationData(daysAgo: number): PopulationData {
    const now = new Date();
    const dataDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const month = dataDate.getMonth(); // 0-11

    // Seasonal adjustment (Northern hemisphere)
    // Winter (Dec-Feb): 0-2, 11 = lower population
    // Spring (Mar-May): 3-5 = growing population
    // Summer (Jun-Aug): 6-8 = peak population
    // Fall (Sep-Nov): 9-10 = declining population
    let seasonalFactor = 1.0;
    
    if (month >= 11 || month <= 1) {
        // Winter - 60-70% of normal
        seasonalFactor = 0.6 + Math.random() * 0.1;
    } else if (month >= 2 && month <= 4) {
        // Spring - 70-90% of normal
        seasonalFactor = 0.7 + Math.random() * 0.2;
    } else if (month >= 5 && month <= 7) {
        // Summer - 90-100% of normal
        seasonalFactor = 0.9 + Math.random() * 0.1;
    } else {
        // Fall - 70-85% of normal
        seasonalFactor = 0.7 + Math.random() * 0.15;
    }

    const baseBeeCount = randomInt(BEE_COUNT_MIN, BEE_COUNT_MAX);
    const beeCount = Math.floor(baseBeeCount * seasonalFactor);
    
    const baseDroneCount = randomInt(DRONE_COUNT_MIN, DRONE_COUNT_MAX);
    const droneCount = Math.floor(baseDroneCount * seasonalFactor);
    
    // Varroa mites tend to increase over time if untreated
    const varroaTrend = Math.min(1.0 + (90 - daysAgo) / 180, 1.5);
    const varroaMiteCount = Math.floor(randomInt(VARROA_MITE_MIN, VARROA_MITE_MAX) * varroaTrend);

    return {
        beeCount,
        droneCount,
        varroaMiteCount
    };
}

describe('Generate Bee Population Data for Hive 199', () => {
    it('should generate 3 months of realistic bee population data', async () => {
        console.log(`\nGenerating bee population data for hive ${HIVE_ID}`);
        console.log(`Period: Last ${DAYS_TO_GENERATE} days`);
        console.log(`Entries per day: ${ENTRIES_PER_DAY}`);
        console.log('---');

        const mutation = `
            mutation AddPopulationMetric($hiveId: ID!, $fields: PopulationMetricInput!, $inspectionId: String, $timestamp: DateTime) {
                addPopulationMetric(hiveId: $hiveId, fields: $fields, inspectionId: $inspectionId, timestamp: $timestamp) {
                    ... on AddMetricMessage {
                        message
                    }
                    ... on TelemetryError {
                        message
                        code
                    }
                }
            }
        `;

        let successCount = 0;
        let failCount = 0;

        // Generate data for each day
        for (let day = DAYS_TO_GENERATE; day >= 0; day--) {
            for (let entry = 0; entry < ENTRIES_PER_DAY; entry++) {
                const populationData = generatePopulationData(day);
                
                // Calculate timestamp for this entry
                const now = new Date();
                const timestamp = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);
                
                // Format date for display
                const dateStr = timestamp.toISOString().split('T')[0];
                
                console.log(
                    `Day ${DAYS_TO_GENERATE - day + 1}/${DAYS_TO_GENERATE + 1} - ${dateStr}: ` +
                    `Bees=${populationData.beeCount.toLocaleString()}, ` +
                    `Drones=${populationData.droneCount.toLocaleString()}, ` +
                    `Mites=${populationData.varroaMiteCount}`
                );

                const variables = {
                    hiveId: HIVE_ID,
                    fields: populationData,
                    inspectionId: `generated-${dateStr}`,
                    timestamp: timestamp.toISOString()
                };

                try {
                    const result = await graphQLRequest(mutation, variables);
                    
                    if (result.data?.addPopulationMetric?.message === 'OK') {
                        successCount++;
                    } else {
                        console.error(`Failed for day ${day}:`, result.data?.addPopulationMetric);
                        failCount++;
                    }
                } catch (error) {
                    console.error(`Error for day ${day}:`, error);
                    failCount++;
                }

                // Small delay to avoid overwhelming the API
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }

        console.log('---');
        console.log(`✓ Successfully created ${successCount} entries`);
        if (failCount > 0) {
            console.log(`✗ Failed to create ${failCount} entries`);
        }
        console.log(`\nView the data at: http://localhost:8080/apiaries/88/hives/199`);

        // Verify that we successfully created all entries
        expect(successCount).toBe((DAYS_TO_GENERATE + 1) * ENTRIES_PER_DAY);
        expect(failCount).toBe(0);
    }, 120000); // 2 minute timeout for generating all data

    it('should verify the generated data can be queried', async () => {
        const query = `
            query PopulationMetrics($hiveId: ID!, $days: Int) {
                populationMetrics(hiveId: $hiveId, days: $days) {
                    ... on PopulationMetricsList {
                        metrics {
                            t
                            beeCount
                            droneCount
                            varroaMiteCount
                            inspectionId
                        }
                    }
                    ... on TelemetryError {
                        message
                        code
                    }
                }
            }
        `;

        const variables = {
            hiveId: HIVE_ID,
            days: 90
        };

        const result = await graphQLRequest(query, variables);
        
        expect(result.data.populationMetrics.metrics).toBeDefined();
        expect(result.data.populationMetrics.metrics.length).toBeGreaterThan(0);

        console.log(`\nFound ${result.data.populationMetrics.metrics.length} population metrics for hive ${HIVE_ID}`);
        
        // Show a sample of the data
        if (result.data.populationMetrics.metrics.length > 0) {
            const sample = result.data.populationMetrics.metrics.slice(0, 5);
            console.log('\nSample of generated data:');
            sample.forEach(metric => {
                console.log(
                    `  ${metric.t}: Bees=${metric.beeCount?.toLocaleString() || 'N/A'}, ` +
                    `Drones=${metric.droneCount?.toLocaleString() || 'N/A'}, ` +
                    `Mites=${metric.varroaMiteCount || 'N/A'}`
                );
            });
        }
    });
});
