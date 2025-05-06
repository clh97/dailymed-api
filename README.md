# dailymed-api

Microservice-based application that generates drug indications by extracting data from DailyMed

## My approach

### Understanding the data

> **Download or scrape?**<br>
> I wasn't really sure if downloading the datasets from DailyMed and populating a DB with them would be the ideal challenge so **I've decided to follow the scraping approach.**<br>
> Real-world scenario I'd probably download the datasets and look for ways to update them.


**Finding Dupixent**
1. DailyMed's homepage search with the `DUPIXENT` term
2. Figured they implement an exact name match search **<small>and decided not to use it because they provide an API to request data. Their search renders results statically, which is parseable but I've deccided do it myself because the API doesn't seem to provide search functionality</small>**
3. Explored the DailyMed API [documentation](https://dailymed.nlm.nih.gov/dailymed/app-support-web-services.cfm) and found their [SPL paginated endpoint](https://dailymed.nlm.nih.gov/dailymed/services/v2/spls?page=1).
4. Used it to create a simple crawler that progressively explores and matches a specific `setid`, looking for a specific drug name, caching entries to enhance future requests
5. Added a functionality to crawl searching by drug name, returning the `setid` too
6. With this data, was now able to retrieve the [entire label](https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=595f437d-2729-40bb-9c62-c8ece1f82780&type=xml)
7. Searching for an OSS list of ICD10 codes, found this: [icd10cm_codes_2025.txt](https://raw.githubusercontent.com/Chetank190/icd_code_prediction/refs/heads/main/icd10cm_codes_2025.txt) and used vim to convert it to JSON

## Writing the code

1. `fetchDataPage` on `dailymed.client.ts` to retrieve and cache a entry
2. `findDataBySetId` on `dailymed.client.ts` to crawl through the pages and find a specific `setid`
3. `seatchDrugsByTitle` on `dailymed.client.ts` to crawl through the pages and find a specific string
4. `fetchLabelXMLBySetId` on `dailymed.client.ts` to retrieve label "xml" data with the `setid` **but later changed it to `fetchLabelDOMBySetId`**, because the xml data wasn't properly serialized. The modified version uses the printer-friendly version of the label due to better formatting and easier parametrization.

**With the necessary data, will start exploring ways to retrieve the close/next elements to INDICATION and COUNTERINDICATION terms**

TODO

## HTTP requests

1. `GET /indication/drug/:setid` on `indication.controller.ts` to fetch drug data by url param `setid`
2. `GET /indication/search?q=DUPIXENT` on `indication.controller.ts` to fetch drug data by query param `title`

```sh
# 1.
curl 'localhost:3000/indication/drug/595f437d-2729-40bb-9c62-c8ece1f82780'

# 2.
curl 'localhost:3000/indication/search?title=IBUPROFEN'
```


## Project structure

```py
├── src/
│   ├── application/                                         # Application Layer (Use Cases, Application Services)
│   │   ├── use-cases/                                       # Domain logic for specific features
│   │   │   └── process-drug-label/
│   │   │       ├── process-drug-label.command.ts
│   │   │       └── process-drug-label.use-case.ts
│   │   ├── services/                                        # Application-level services (e.g., querying mapped data)
│   │   │   └── indication-query.service.ts
│   │   ├── dtos/                                            # Data Transfer Objects for application layer boundaries
│   │   │   └── indication-query.dto.ts
│   │   └── interfaces/                                      # Interfaces for external services (defined here, implemented in Infra)
│   │       ├── idailymed.client.ts
│   │       ├── ispl-parser.service.ts
│   │       └── iai-mapper.client.ts
│   ├── domain/                                              # Domain Layer (Core Business Logic)
│   │   ├── entities/                                        # Core business objects (plain classes/interfaces)
│   │   │   ├── drug-label.entity.ts
│   │   │   └── indication.entity.ts
│   │   ├── repositories/                                    # Repository Interfaces (defined here, implemented in Infra)
│   │   │   ├── idrug-label.repository.ts
│   │   │   └── iindication-mapping.repository.ts
│   │   └──...                                               # Domain services, value objects (if needed)
│   ├── infrastructure/                                      # Infrastructure Layer (Frameworks, DB, External Services)
│   │   ├── controllers/                                     # NestJS HTTP Controllers
│   │   │   ├── indication.controller.ts
│   │   │   └── auth.controller.ts
│   │   ├── database/                                        # Database specific code (PostgreSQL/TypeORM)
│   │   │   ├── entities/                                    # TypeORM Entities (decorated classes)
│   │   │   │   ├── drug-label.typeorm.entity.ts
│   │   │   │   ├── indication.typeorm.entity.ts
│   │   │   │   └── icd10-mapping.typeorm.entity.ts
│   │   │   ├── repositories/                                # TypeORM Repository Implementations
│   │   │   │   ├── drug-label.typeorm.repository.ts
│   │   │   │   └── indication-mapping.typeorm.repository.ts
│   │   │   ├── migrations/                                  # Database migrations generated by TypeORM CLI
│   │   │   └── database.module.ts                           # Module for TypeORM configuration
│   │   ├── external-services/                               # Clients for external APIs
│   │   │   ├── dailymed/
│   │   │   │   └── dailymed.client.ts                       # Implements IDailyMedClient
│   │   │   ├── spl-parser/
│   │   │   │   └── spl-parser.service.ts                    # Implements ISplParserService
│   │   │   └── ai-mapping/
│   │   │       └── comprehend.client.ts                     # Implements IAiMapperClient (or LlmClient)
│   │   ├── auth/                                            # Authentication specific infrastructure
│   │   │   ├── strategies/
│   │   │   │   └── jwt.strategy.ts
│   │   │   ├── guards/
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   └── roles.guard.ts                           # RBAC
│   │   │   ├── decorators/
│   │   │   │   └── roles.decorator.ts                       # RBAC
│   │   │   └── auth.module.ts
│   │   ├── queues/                                          # Queue Producers and Consumers
│   │   │   ├── producers/
│   │   │   │   └── label-processing.producer.ts
│   │   │   ├── consumers/
│   │   │   │   ├── label-processing.consumer.ts
│   │   │   │   └── indication-mapping.consumer.ts
│   │   │   └── queue.module.ts
│   │   └──...                                               # Other infra: Logging, Caching config
│   ├── shared/                                              # Shared utilities, constants, config interfaces (optional)
│   │   └── config/
│   │       └── app-config.interface.ts
│   ├── app.module.ts                                        # Root application module
│   └── main.ts                                              # Main application entry point
├── test/                                                    # Unit, Integration, E2E tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── Containerfile                                            # or Dockerfile
├── compose.yml                                              # or docker-compose.yml
├──.env.dev
└── README.md
```