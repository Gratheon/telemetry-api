from flask import Flask, request
from influxdb import InfluxDBClient

app = Flask(__name__)

client = InfluxDBClient(host='localhost', port=8086)
client.switch_database('beehive_data')

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
    app.run(debug=True)
