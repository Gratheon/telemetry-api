require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const { InfluxDB } = require('influx');

const app = express();
const port = process.env.PORT || 5000;

const influx = new InfluxDB({
    host: process.env.INFLUXDB_HOST || 'localhost',
    port: process.env.INFLUXDB_PORT || 8086,
    database: process.env.INFLUXDB_DATABASE || 'beehive_data'
});

// Middleware to parse JSON requests
app.use(bodyParser.json());

// Define the API endpoint to receive telemetry data
app.post('/telemetry', async (req, res) => {
    const data = req.body;

    const points = [
        {
            measurement: 'beehive_metrics',
            tags: {
                hive_id: data.hive_id
            },
            fields: {
                temperature: data.temperature,
                humidity: data.humidity,
                audio: data.audio,
                bee_count: data.bee_count
            }
        }
    ];

    try {
        await influx.writePoints(points);
        res.status(200).send('Data logged');
    } catch (error) {
        console.error('Error writing to InfluxDB:', error);
        res.status(500).send('Internal Server Error');
    }
});



app.listen(port, () => {
    console.log(f"The server is running on {port}");
});
