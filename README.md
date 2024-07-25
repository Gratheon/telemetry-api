# gratheon / telemetry-api 📊
Backend service responsible for logging metrics into timeseries database (influx).
Expected to run in the cloud and receive IoT data from beehives.

Main goal and feature is [described in Notion](https://gratheon.notion.site/Telemetry-API-5d60632841534620ba56d1bb296af98b)

### Metrics examples
- beehive weight (over time)
- temperature
- humidity
- CO2 levels
- atmospheric pressure
- bee traffic (in/out) at the hive entrance
- audio noise volume
- vibrations
- wind speed

![Screenshot 2024-07-06 at 03 38 52](https://github.com/Gratheon/telemetry-api/assets/445122/56622ecb-95bc-46ed-a23a-e2dd18feeeec)


## URLs
| URL | Description |
| --- | --- |
| http://telemetry.gratheon.com | Production |
| http://localhost:8600 | Local dev |

## API
| URL | Method | Description |
| --- | --- | --- |
| /metric/:hiveId | POST | Send metrics to be stored in the database. Needs API tokens that are verified against user-cycle service

```json
{
  "fields": {
    "temperature": 25.5
  }
}

```

|
| /graphql | POST | Federated graphql API endpoint. Used to fetch data from web-app with authorization checks in graphql-router |

## Installation & development
Checkout grafana first from https://github.com/Gratheon/grafana
Start those pods to have influx with docker-compose
- Open http://localhost:5300/
- login into influxdb
- open Load Data -> API Tokens -> Generate API Token so that telemetry-api could write data to influxdb
- Change `INFLUXDB_TOKEN` in docker-compose.dev.yml and set it to the token you generated

Then start telemetry api:
```bash
make start
```

## Architecture

```mermaid
flowchart LR
	hardware-beehive-sensors[<a href="https://github.com/Gratheon/hardware-beehive-sensors">hardware-beehive-sensors</a>] -."send aggregate (5sec)\n metric value".-> telemetry-api

	telemetry-api --"update beehive entrance daily traffic counters"--> mysql[(<a href="https://github.com/Gratheon/mysql">mysql</a>)]
	beehive-entrance-video-processor[<a href="https://github.com/Gratheon/beehive-entrance-video-processor">beehive-entrance-video-processor</a>] -."send entrance\n traffic metric".-> telemetry-api
	telemetry-api --"store bee traffic timeseries" --> influx[(<a href="https://github.com/Gratheon/grafana">influx</a>)]
	grafana[(<a href="https://github.com/Gratheon/grafana">grafana</a>)] --"fetch history"--> influx

	telemetry-api --"verify API tokens for REST calls"--> user-cycle[<a href="https://github.com/Gratheon/user-cycle">user-cycle</a>]
	web-app[<a href="https://github.com/Gratheon/web-app">web-app</a>] --"display advanced configureable graphs"--> grafana
	web-app --"query for simplistic metrics\nPOST graphql"-->graphql-router[<a href="https://github.com/Gratheon/graphql-router">graphql-router</a>]--> telemetry-api

```
