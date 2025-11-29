mutation {
  serviceLevelCreate(
    entityGuid: "MzQ2ODQzMHxFWFR8U0VSVklDRV9MRVZFTHwzNjM10TU"
    accountId: 3468430
    indicator: {
      description: "Proportion of transaction frontend views that are served without errors."
      name: "OpRA(Onboarding) all MM Services - Successful processing of requests-10040"
      events: {
        badEvents: {
          from: "Transaction"
          select: {
            attribute: "*"
            function: "COUNT"
            threshold: 0
          }
          where: "request.headers.xRequestId LIKE 'MMDEOPRA%' OR `X-Request-Id` LIKE 'MMDEOPRA%' AND http.statusCode > 499 AND tags.environment = 'production'"
        }
        validEvents: {
          from: "Transaction"
          select: {
            attribute: "*"
            function: "COUNT"
            threshold: 0
          }
          where: "request.headers.xRequestId LIKE 'MMDEOPRA%' OR `X-Request-Id` LIKE 'MMDEOPRA%' AND tags.environment = 'production'"
        }
      }
    },
    objectives: [
      {
        target: 95
        timeWindow: {
          rolling: {
            count: 1
            unit: "DAY"
          }
        }
      }
    ]
  ) {
    id
  }
}