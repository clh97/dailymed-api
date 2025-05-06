# DailyMed API

Node.js application that uses an LLM to generate a medication indication list with its respective ICD-10 codes, using DailyMed data.

![](video.webm)

## Approach

### Understanding the data

> **Download or scrape?**<br>
> I wasn't really sure if downloading the datasets from DailyMed and populating a DB would represent an ideal challenge so
<br><br>**I've decided to follow the scraping approach.**<br>
> Real-world scenario I'd probably download the datasets locally and look for ways to update them in the future.

**Finding Dupixent**
1. DailyMed's homepage search with the `DUPIXENT` term
2. Figured they implement an exact name match search **<small>and decided not to use it because they provide an API to request data. Their search renders results statically, which is parseable but I've deccided do it myself because the API doesn't seem to provide search functionality</small>**
3. Explored the DailyMed API [documentation](https://dailymed.nlm.nih.gov/dailymed/app-support-web-services.cfm) and found their [SPL paginated endpoint](https://dailymed.nlm.nih.gov/dailymed/services/v2/spls?page=1).
4. Used it to create a simple crawler that progressively explores and matches a specific `setid`, looking for a specific drug name, caching entries to enhance future requests
5. Added a functionality to crawl searching by drug name, returning the `setid` too
6. With this data, was now able to retrieve the [entire label](https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=595f437d-2729-40bb-9c62-c8ece1f82780&type=xml)
7. Searching for an OSS list of ICD10 codes, found this: [icd10cm_codes_2025.txt](https://raw.githubusercontent.com/Chetank190/icd_code_prediction/refs/heads/main/icd10cm_codes_2025.txt) and used vim to convert it to JSON - **ended up not using them because my token input is limited.**

## Writing the code

1. `fetchDataPage` on `dailymed.client.ts` to retrieve and cache a entry
2. `findDataBySetId` on `dailymed.client.ts` to crawl through the pages and find a specific `setid`
3. `seatchDrugsByTitle` on `dailymed.client.ts` to crawl through the pages and find a specific string
4. `fetchLabelXMLBySetId` on `dailymed.client.ts` to retrieve label "xml" data with the `setid` **but later changed it to `fetchLabelDOMBySetId`**, because the xml data wasn't properly serialized. The modified version uses the printer-friendly version of the label due to better formatting and easier parametrization.

**With the necessary data, will start exploring ways to retrieve the close/next elements to INDICATION and COUNTERINDICATION terms**

1. `indication-extractor.service.ts` basically extracts close elements to "indication" keyword occurrences 
2. `claude.client.ts` interacts with the LLM to provide the proper answer based on collected data
3. `indication-mapper.service.ts` maps the LLM response to the Redis cache, allowing cached requests for 24h

## HTTP requests

1. `GET /indication/drug/:setid` on `indication.controller.ts` to fetch drug data by url param `setid`
2. `GET /indication/search?q=DUPIXENT` on `indication.controller.ts` to fetch drug data by query param `title`

```sh
# 1. ------
curl 'localhost:3000/indication/drug/595f437d-2729-40bb-9c62-c8ece1f82780' | jq # dupixent

# 2. ------
curl "localhost:3000/indication/search/?title=dupixent" | jq
curl "localhost:3000/indication/search/?title=Flecainide" | jq
```


## Project structure

```py
src
├── application                              # Application layer (business logic)
│   ├── application.module.ts                # Module that brings together application services and interfaces
│   ├── interfaces                           # Contains interface definitions for external services
│   │   ├── iclaude.client.interface.ts      # Interface defining Claude AI client capabilities
│   │   └── idailymed.client.interface.ts    # Interface defining DailyMed API client capabilities
│   └── services                             # Application services implementing business logic
│       ├── indication-extractor.service.ts  # Service for extracting indication information from drug labels
│       └── indication-mapper.service.t      # Service for mapping indications to ICD-10 codes
├── infrastructure                           # Infrastructure layer (adapters, controllers, external services)
│   ├── controllers                          # API controllers handling HTTP requests
│   │   ├── auth.controller.ts
│   │   └── indication.controller.ts         # Controller for drug indication endpoints
│   └── external-services                    # Implementations of external service clients
│       ├── claude
│       │   └── claude.client.ts             # Client implementation for Claude AI API
│       └── dailymed
│           ├── dailymed.client.spec.ts      # Unit tests for DailyMed client
│           └── dailymed.client.ts           # Client implementation for DailyMed API
├── app.module.ts                            # Main application module that imports all other modules
├── main.ts                                  # Entry point for the NestJS application
└── shared                                   # Shared utilities and configurations
    └── config                               # Configuration interfaces and providers
        └── app-config.interface.ts          # Interface defining application configuration options
```


