import {
  dbQueryCallsTotal,
  dbQueryDurationSeconds,
  graphqlResolverCallsTotal,
  graphqlResolverDurationSeconds,
  recordDbQuery,
  wrapGraphqlResolversWithMetrics,
} from "../../src/metrics";

describe("wrapGraphqlResolversWithMetrics", () => {
  beforeEach(() => {
    dbQueryCallsTotal.reset();
    dbQueryDurationSeconds.reset();
    graphqlResolverCallsTotal.reset();
    graphqlResolverDurationSeconds.reset();
  });

  it("records resolver calls and duration for successful executions", async () => {
    const resolverMap = {
      Query: {
        temperatureCelsius: async () => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          return { __typename: "MetricFloatList", metrics: [{ t: 1, v: 20 }] };
        },
      },
    };

    const wrapped = wrapGraphqlResolversWithMetrics(resolverMap);
    await wrapped.Query.temperatureCelsius();

    const callMetrics = await graphqlResolverCallsTotal.get();
    const durationMetrics = await graphqlResolverDurationSeconds.get();

    expect(callMetrics.values).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          labels: {
            operation_type: "Query",
            resolver_name: "temperatureCelsius",
            status: "success",
          },
          value: 1,
        }),
      ]),
    );

    expect(durationMetrics.values).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          labels: {
            operation_type: "Query",
            resolver_name: "temperatureCelsius",
            status: "success",
          },
        }),
      ]),
    );
  });

  it("records resolver calls and duration for failed executions", async () => {
    const resolverMap = {
      Mutation: {
        addMetric: () => {
          throw new Error("boom");
        },
      },
    };

    const wrapped = wrapGraphqlResolversWithMetrics(resolverMap);

    expect(() => wrapped.Mutation.addMetric()).toThrow("boom");

    const callMetrics = await graphqlResolverCallsTotal.get();
    const durationMetrics = await graphqlResolverDurationSeconds.get();

    expect(callMetrics.values).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          labels: {
            operation_type: "Mutation",
            resolver_name: "addMetric",
            status: "error",
          },
          value: 1,
        }),
      ]),
    );

    expect(durationMetrics.values).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          labels: {
            operation_type: "Mutation",
            resolver_name: "addMetric",
            status: "error",
          },
        }),
      ]),
    );
  });

  it("records database query metrics using stable query labels", async () => {
    recordDbQuery({
      queryName: "read_population_metrics",
      status: "success",
      durationSeconds: 0.123,
    });

    const callMetrics = await dbQueryCallsTotal.get();
    const durationMetrics = await dbQueryDurationSeconds.get();

    expect(callMetrics.values).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          labels: {
            query_name: "read_population_metrics",
            status: "success",
          },
          value: 1,
        }),
      ]),
    );

    expect(durationMetrics.values).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          labels: {
            query_name: "read_population_metrics",
            status: "success",
          },
          value: 0.123,
        }),
      ]),
    );
  });
});
