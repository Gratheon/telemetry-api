import { sql } from "@databases/mysql";
import { logger } from "../logger";

import { storage } from "../storage";

// iot sensors metrics
export async function readMetricsFromMySQL(
    hiveId: string,
    rangeMin: number = 60,
    field: string
) {
    // Map InfluxDB field names to MySQL column names
    const fieldMapping = {
        'temperatureCelsius': 'temperature_celsius',
        'humidityPercent': 'humidity_percent',
        'weightKg': 'weight_kg'
    };

    const mysqlField = fieldMapping[field];
    if (!mysqlField) {
        throw new Error(`Invalid field: ${field}`);
    }

    // Calculate the time range
    const rangeTime = new Date();
    rangeTime.setMinutes(rangeTime.getMinutes() - rangeMin);

    try {
        const rows = await storage().query(
            sql`SELECT 
                time as t, 
                ${sql.ident(mysqlField)} as v 
            FROM 
                beehive_metrics 
            WHERE 
                hive_id = ${hiveId} 
                AND time >= ${rangeTime} 
                AND ${sql.ident(mysqlField)} IS NOT NULL 
            ORDER BY 
                time ASC`
        );

        return rows;
    } catch (error) {
        logger.error(`Error reading metrics from MySQL: ${error}`);
        throw error;
    }
}

export async function writeBeehiveMetricsToMySQL(
    hiveId: string,
    fields: {
        temperatureCelsius?: number;
        humidityPercent?: number;
        weightKg?: number;
    },
    timestamp: Date = new Date()
) {
    try {
        await storage().query(
            sql`INSERT INTO beehive_metrics 
            (hive_id, temperature_celsius, humidity_percent, weight_kg, time) 
            VALUES (
                ${hiveId},
                ${fields.temperatureCelsius !== undefined ? fields.temperatureCelsius : null},
                ${fields.humidityPercent !== undefined ? fields.humidityPercent : null},
                ${fields.weightKg !== undefined ? fields.weightKg : null},
                ${timestamp}
            )`
        );
    } catch (error) {
        logger.error(`Error writing beehive metrics to MySQL: ${error}`);
        throw error;
    }
}

export async function writeBatchBeehiveMetricsToMySQL(
    metrics: Array<{
        hiveId: string;
        fields: {
            temperatureCelsius?: number;
            humidityPercent?: number;
            weightKg?: number;
        };
        timestamp: Date;
    }>
) {
    if (metrics.length === 0) return;

    try {
        // Build batch insert query
        const values = metrics.map(metric => 
            sql`(
                ${metric.hiveId},
                ${metric.fields.temperatureCelsius !== undefined ? metric.fields.temperatureCelsius : null},
                ${metric.fields.humidityPercent !== undefined ? metric.fields.humidityPercent : null},
                ${metric.fields.weightKg !== undefined ? metric.fields.weightKg : null},
                ${metric.timestamp}
            )`
        );

        await storage().query(
            sql`INSERT INTO beehive_metrics 
            (hive_id, temperature_celsius, humidity_percent, weight_kg, time) 
            VALUES ${sql.join(values, sql`, `)}`
        );
    } catch (error) {
        logger.error(`Error writing batch beehive metrics to MySQL: ${error}`);
        throw error;
    }
}

// movement metrics
export async function readAggregatedMetricsFromMySQLForToday(
    hiveId: string,
    boxId: string,
    fields: string[]
) {
    try {
        // Get today's date at midnight
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get tomorrow's date at midnight
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Build the query
        const rows = await storage().query(
            sql`SELECT 
                SUM(bees_in) as beesIn,
                SUM(bees_out) as beesOut,
                SUM(net_flow) as netFlow,
                AVG(avg_speed_px_per_frame) as avgSpeed,
                AVG(p95_speed_px_per_frame) as p95Speed,
                SUM(stationary_bees_count) as stationaryBees,
                SUM(detected_bees) as detectedBees,
                SUM(bee_interactions) as beeInteractions,
                MAX(time) as time
            FROM 
                entrance_observer
            WHERE 
                hive_id = ${hiveId} 
                AND box_id = ${boxId}
                AND time >= ${today}
                AND time < ${tomorrow}`
        );

        // Return the first row or empty object if no rows
        return rows[0] || { beesIn: 0, beesOut: 0, netFlow: 0, avgSpeed: 0, p95Speed: 0, stationaryBees: 0, detectedBees: 0, beeInteractions: 0, time: null };
    } catch (error) {
        logger.error(`Error reading aggregated metrics from MySQL: ${error}`);
        throw error;
    }
}

export async function readEntranceMovementFromMySQL(
    hiveId: string,
    boxId: string | null,
    timeFrom: Date,
    timeTo: Date
) {
    try {
        const query = boxId
            ? sql`SELECT
                id,
                hive_id as hiveId,
                box_id as boxId,
                bees_out as beesOut,
                bees_in as beesIn,
                time,
                net_flow as netFlow,
                avg_speed_px_per_frame as avgSpeed,
                p95_speed_px_per_frame as p95Speed,
                stationary_bees_count as stationaryBees,
                detected_bees as detectedBees,
                bee_interactions as beeInteractions
            FROM
                entrance_observer
            WHERE
                hive_id = ${hiveId}
                AND box_id = ${boxId}
                AND time >= ${timeFrom}
                AND time <= ${timeTo}
            ORDER BY
                time ASC`
            : sql`SELECT
                id,
                hive_id as hiveId,
                box_id as boxId,
                bees_out as beesOut,
                bees_in as beesIn,
                time,
                net_flow as netFlow,
                avg_speed_px_per_frame as avgSpeed,
                p95_speed_px_per_frame as p95Speed,
                stationary_bees_count as stationaryBees,
                detected_bees as detectedBees,
                bee_interactions as beeInteractions
            FROM
                entrance_observer
            WHERE
                hive_id = ${hiveId}
                AND time >= ${timeFrom}
                AND time <= ${timeTo}
            ORDER BY
                time ASC`;

        const rows = await storage().query(query);
        return rows;
    } catch (error) {
        logger.error(`Error reading entrance movement from MySQL: ${error}`);
        throw error;
    }
}

export async function writeEntranceMovementToMySQL(
    hiveId: string,
    boxId: string,
    beesOut: number | null,
    beesIn: number | null,
    netFlow: number | null,
    avgSpeed: number | null,
    p95Speed: number | null,
    stationaryBees: number | null,
    detectedBees: number | null,
    beeInteractions: number | null,
    timestamp: Date = new Date()
) {
    try {
        await storage().query(
            sql`INSERT INTO entrance_observer 
            (hive_id, box_id, bees_out, bees_in, net_flow, avg_speed_px_per_frame, p95_speed_px_per_frame, stationary_bees_count, detected_bees, bee_interactions, time) 
            VALUES (${hiveId}, ${boxId}, ${beesOut}, ${beesIn}, ${netFlow}, ${avgSpeed}, ${p95Speed}, ${stationaryBees}, ${detectedBees}, ${beeInteractions}, ${timestamp})`
        );
    } catch (error) {
        logger.error(`Error writing entrance movement to MySQL: ${error}`);
        throw error;
    }
}

export async function writeBatchEntranceMovementToMySQL(
    movements: Array<{
        hiveId: string;
        boxId: string;
        beesOut: number | null;
        beesIn: number | null;
        netFlow: number | null;
        avgSpeed: number | null;
        p95Speed: number | null;
        stationaryBees: number | null;
        detectedBees: number | null;
        beeInteractions: number | null;
        timestamp: Date;
    }>
) {
    if (movements.length === 0) return;

    try {
        const values = movements.map(movement =>
            sql`(
                ${movement.hiveId},
                ${movement.boxId},
                ${movement.beesOut},
                ${movement.beesIn},
                ${movement.netFlow},
                ${movement.avgSpeed},
                ${movement.p95Speed},
                ${movement.stationaryBees},
                ${movement.detectedBees},
                ${movement.beeInteractions},
                ${movement.timestamp}
            )`
        );

        await storage().query(
            sql`INSERT INTO entrance_observer 
            (hive_id, box_id, bees_out, bees_in, net_flow, avg_speed_px_per_frame, p95_speed_px_per_frame, stationary_bees_count, detected_bees, bee_interactions, time) 
            VALUES ${sql.join(values, sql`, `)}`
        );
    } catch (error) {
        logger.error(`Error writing batch entrance movement to MySQL: ${error}`);
        throw error;
    }
}

export async function readAggregatedWeightMetricsFromMySQL(
    hiveId: string,
    days: number = 365,
    aggregation: 'DAILY_AVG' | 'DAILY_MAX' | 'DAILY_MIN' = 'DAILY_AVG'
) {
    const rangeTime = new Date();
    rangeTime.setDate(rangeTime.getDate() - days);

    let aggregationFunc = 'AVG';
    if (aggregation === 'DAILY_MAX') aggregationFunc = 'MAX';
    if (aggregation === 'DAILY_MIN') aggregationFunc = 'MIN';

    try {
        const rows = await storage().query(
            sql`SELECT 
                DATE(time) as date,
                ${sql.__dangerous__rawValue(aggregationFunc)}(weight_kg) as v
            FROM 
                beehive_metrics 
            WHERE 
                hive_id = ${hiveId} 
                AND time >= ${rangeTime} 
                AND weight_kg IS NOT NULL 
            GROUP BY 
                DATE(time)
            ORDER BY 
                date ASC`
        );

        return rows.map(row => ({
            t: new Date(row.date),
            v: row.v
        }));
    } catch (error) {
        logger.error(`Error reading aggregated metrics from MySQL: ${error}`);
        throw error;
    }
}

export async function readPopulationMetricsFromMySQL(
    hiveId: string,
    days: number = 90
) {
    const rangeTime = new Date();
    rangeTime.setDate(rangeTime.getDate() - days);

    try {
        const rows = await storage().query(
            sql`SELECT 
                time as t,
                bee_count as beeCount,
                drone_count as droneCount,
                varroa_mite_count as varroaMiteCount,
                inspection_id as inspectionId
            FROM 
                population_metrics 
            WHERE 
                hive_id = ${hiveId} 
                AND time >= ${rangeTime}
            ORDER BY 
                time ASC`
        );

        return rows;
    } catch (error) {
        logger.error(`Error reading population metrics from MySQL: ${error}`);
        throw error;
    }
}

export async function writePopulationMetricsToMySQL(
    hiveId: string,
    fields: {
        beeCount?: number;
        droneCount?: number;
        varroaMiteCount?: number;
    },
    inspectionId?: string,
    timestamp: Date = new Date()
) {
    try {
        await storage().query(
            sql`INSERT INTO population_metrics 
            (hive_id, bee_count, drone_count, varroa_mite_count, inspection_id, time) 
            VALUES (
                ${hiveId},
                ${fields.beeCount !== undefined ? fields.beeCount : null},
                ${fields.droneCount !== undefined ? fields.droneCount : null},
                ${fields.varroaMiteCount !== undefined ? fields.varroaMiteCount : null},
                ${inspectionId || null},
                ${timestamp}
            )`
        );
    } catch (error) {
        logger.error(`Error writing population metrics to MySQL: ${error}`);
        throw error;
    }
}

