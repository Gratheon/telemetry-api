from flask import Flask, request
from influxdb import InfluxDBClient
import os

app = Flask(__name__)

influxdb_host = os.environ.get('INFLUXDB_HOST', 'localhost')
influxdb_port = int(os.environ.get('INFLUXDB_PORT', 8086))
influxdb_database = os.environ.get('INFLUXDB_DATABASE', 'beehive_data')

client = InfluxDBClient(host=influxdb_host, port=influxdb_port)
client.switch_database(influxdb_database)

# Define the API endpoint to receive telemetry data
@app.route('/telemetry', methods=['POST'])
def log_telemetry():
    data = request.json
    json_body = [
        {
            "measurement": "beehive_metrics",
            "tags": {
                "hive_id": data['hive_id']
            },
            "fields": {
                "temperature": data['temperature'],
                "humidity": data['humidity'],
                "audio": data['audio'],
                "bee_count": data['bee_count']
            }
        }
    ]
    client.write_points(json_body)
    return "Data logged", 200

# Run the Flask app
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
