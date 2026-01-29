import {expect, describe, it} from '@jest/globals';
import './setup';
import {graphQLRequest} from './utils/api-config';

const hiveId = '199';
const testInspectionId = 'test-inspection-123';

describe('Population Metrics', () => {
    describe('Mutation: addPopulationMetric', () => {
        it('should add population metric with bee count', async () => {
            const mutation = `
                mutation AddPopulationMetric($hiveId: ID!, $fields: PopulationMetricInput!, $inspectionId: String) {
                    addPopulationMetric(hiveId: $hiveId, fields: $fields, inspectionId: $inspectionId) {
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

            const variables = {
                hiveId,
                fields: {
                    beeCount: 40000,
                    droneCount: 500,
                    varroaMiteCount: 10
                },
                inspectionId: testInspectionId
            };

            const result = await graphQLRequest(mutation, variables);
            expect(result.data.addPopulationMetric.message).toBe('OK');
        });

        it('should add population metric with only bee count', async () => {
            const mutation = `
                mutation AddPopulationMetric($hiveId: ID!, $fields: PopulationMetricInput!) {
                    addPopulationMetric(hiveId: $hiveId, fields: $fields) {
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

            const variables = {
                hiveId,
                fields: {
                    beeCount: 35000
                }
            };

            const result = await graphQLRequest(mutation, variables);
            expect(result.data.addPopulationMetric.message).toBe('OK');
        });

        it('should fail with empty fields', async () => {
            const mutation = `
                mutation AddPopulationMetric($hiveId: ID!, $fields: PopulationMetricInput!) {
                    addPopulationMetric(hiveId: $hiveId, fields: $fields) {
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

            const variables = {
                hiveId,
                fields: {}
            };

            const result = await graphQLRequest(mutation, variables);
            expect(result.data.addPopulationMetric.code).toBe('4006');
            expect(result.data.addPopulationMetric.message).toBe('Fields are required');
        });
    });

    describe('Query: populationMetrics', () => {
        it('should retrieve population metrics', async () => {
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
                hiveId,
                days: 90
            };

            const result = await graphQLRequest(query, variables);
            expect(result.data.populationMetrics.metrics).toBeDefined();
            expect(result.data.populationMetrics.metrics.length).toBeGreaterThan(0);

            const firstMetric = result.data.populationMetrics.metrics[0];
            expect(firstMetric.beeCount).toBeGreaterThan(0);
            expect(firstMetric.t).toBeDefined();
        });

        it('should fail with negative days', async () => {
            const query = `
                query PopulationMetrics($hiveId: ID!, $days: Int) {
                    populationMetrics(hiveId: $hiveId, days: $days) {
                        ... on PopulationMetricsList {
                            metrics {
                                t
                                beeCount
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
                hiveId,
                days: -1
            };

            const result = await graphQLRequest(query, variables);
            expect(result.data.populationMetrics.code).toBe('4003');
            expect(result.data.populationMetrics.message).toBe('Days must be positive');
        });

        it('should fail with days > 730', async () => {
            const query = `
                query PopulationMetrics($hiveId: ID!, $days: Int) {
                    populationMetrics(hiveId: $hiveId, days: $days) {
                        ... on PopulationMetricsList {
                            metrics {
                                t
                                beeCount
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
                hiveId,
                days: 1000
            };

            const result = await graphQLRequest(query, variables);
            expect(result.data.populationMetrics.code).toBe('4003');
            expect(result.data.populationMetrics.message).toBe('Days cannot exceed 730');
        });

        it('should use default 90 days when days not provided', async () => {
            const query = `
                query PopulationMetrics($hiveId: ID!) {
                    populationMetrics(hiveId: $hiveId) {
                        ... on PopulationMetricsList {
                            metrics {
                                t
                                beeCount
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
                hiveId
            };

            const result = await graphQLRequest(query, variables);
            expect(result.data.populationMetrics.metrics).toBeDefined();
        });
    });
});

