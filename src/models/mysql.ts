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
    }
) {
    try {
        await storage().query(
            sql`INSERT INTO beehive_metrics 
            (hive_id, temperature_celsius, humidity_percent, weight_kg) 
            VALUES (
                ${hiveId},
                ${fields.temperatureCelsius !== undefined ? fields.temperatureCelsius : null},
                ${fields.humidityPercent !== undefined ? fields.humidityPercent : null},
                ${fields.weightKg !== undefined ? fields.weightKg : null}
            )`
        );
    } catch (error) {
        logger.error(`Error writing beehive metrics to MySQL: ${error}`);
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
                SUM(bees_out) as beesOut
            FROM 
                entrance_observer
            WHERE 
                hive_id = ${hiveId} 
                AND box_id = ${boxId}
                AND time >= ${today}
                AND time < ${tomorrow}`
        );

        // Return the first row or empty object if no rows
        return rows[0] || { beesIn: 0, beesOut: 0 };
    } catch (error) {
        logger.error(`Error reading aggregated metrics from MySQL: ${error}`);
        throw error;
    }
}

export async function writeEntranceMovementToMySQL(
    hiveId: string,
    boxId: string,
    beesOut: number | null,
    beesIn: number | null
) {
    try {
        await storage().query(
            sql`INSERT INTO entrance_observer 
            (hive_id, box_id, bees_out, bees_in) 
            VALUES (${hiveId}, ${boxId}, ${beesOut}, ${beesIn})`
        );
    } catch (error) {
        logger.error(`Error writing entrance movement to MySQL: ${error}`);
        throw error;
    }
}
