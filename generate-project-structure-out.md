# Writing boilerplate? Nope. Claude does it!

## Command output

`$ ./generate-project-structure.sh`

```sh
Generating NestJS entities for the project structure...
Generating application layer files...
CREATE src/application/use-cases/process-drug-label/process-drug-label.command/process-drug-label.command.ts (40 bytes)
CREATE src/application/use-cases/process-drug-label/process-drug-label.handler/process-drug-label.handler.ts (40 bytes)
CREATE src/application/use-cases/process-drug-label/process-drug-label.use-case/process-drug-label.use-case.ts (40 bytes)
CREATE src/application/services/indication-query/indication-query.service.ts (99 bytes)
UPDATE src/app.module.ts (270 bytes)
CREATE src/application/dtos/indication-query.dto/indication-query.dto.ts (35 bytes)
CREATE src/application/interfaces/idailymed.client/idailymed.client.interface.ts (36 bytes)
CREATE src/application/interfaces/ispl-parser.service/ispl-parser.service.interface.ts (38 bytes)
CREATE src/application/interfaces/iai-mapper.client/iai-mapper.client.interface.ts (36 bytes)
Generating domain layer files...
CREATE src/domain/entities/drug-label.entity/drug-label.entity.ts (32 bytes)
CREATE src/domain/entities/indication.entity/indication.entity.ts (33 bytes)
CREATE src/domain/repositories/idrug-label.repository/idrug-label.repository.interface.ts (41 bytes)
CREATE src/domain/repositories/iindication-mapping.repository/iindication-mapping.repository.interface.ts (49 bytes)
Generating infrastructure layer files...
CREATE src/infrastructure/controllers/indication/indication.controller.ts (109 bytes)
UPDATE src/app.module.ts (392 bytes)
CREATE src/infrastructure/controllers/auth/auth.controller.ts (97 bytes)
UPDATE src/app.module.ts (492 bytes)
Generating TypeORM entities...
CREATE src/infrastructure/database/entities/drug-label.typeorm.entity/drug-label.typeorm.entity.ts (39 bytes)
CREATE src/infrastructure/database/entities/indication.typeorm.entity/indication.typeorm.entity.ts (40 bytes)
CREATE src/infrastructure/database/entities/icd10-mapping.typeorm.entity/icd10-mapping.typeorm.entity.ts (42 bytes)
CREATE src/infrastructure/database/repositories/drug-label.typeorm.repository/drug-label.typeorm.repository.ts (43 bytes)
CREATE src/infrastructure/database/repositories/indication-mapping.typeorm.repository/indication-mapping.typeorm.repository.ts (51 bytes)
CREATE src/infrastructure/database/database.module.ts (85 bytes)
UPDATE src/app.module.ts (584 bytes)
Generating external services...
CREATE src/infrastructure/external-services/dailymed/dailymed.client/dailymed.client.service.ts (98 bytes)
UPDATE src/app.module.ts (732 bytes)
CREATE src/infrastructure/external-services/spl-parser/spl-parser.service/spl-parser.service.service.ts (100 bytes)
UPDATE src/app.module.ts (892 bytes)
CREATE src/infrastructure/external-services/ai-mapping/comprehend.client/comprehend.client.service.ts (100 bytes)
UPDATE src/app.module.ts (1050 bytes)
Generating auth components...
CREATE src/infrastructure/auth/strategies/jwt.strategy/jwt.strategy.ts (28 bytes)
CREATE src/infrastructure/auth/guards/jwt-auth/jwt-auth.guard.ts (302 bytes)
CREATE src/infrastructure/auth/guards/roles/roles.guard.ts (300 bytes)
CREATE src/infrastructure/auth/decorators/roles/roles.decorator.ts (119 bytes)
CREATE src/infrastructure/auth/auth.module.ts (81 bytes)
UPDATE src/app.module.ts (1126 bytes)
Generating queue components...
CREATE src/infrastructure/queues/producers/label-processing.producer/label-processing.producer.service.ts (107 bytes)
UPDATE src/app.module.ts (1302 bytes)
CREATE src/infrastructure/queues/consumers/label-processing.consumer/label-processing.consumer.service.ts (107 bytes)
UPDATE src/app.module.ts (1478 bytes)
CREATE src/infrastructure/queues/consumers/indication-mapping.consumer/indication-mapping.consumer.service.ts (109 bytes)
UPDATE src/app.module.ts (1662 bytes)
CREATE src/infrastructure/queues/queues.module.ts (83 bytes)
UPDATE src/app.module.ts (1746 bytes)
Generating shared config...
CREATE src/shared/config/app-config.interface/app-config.interface.interface.ts (39 bytes)
Generating root module if it doesn't exist...
Successfully generated all NestJS entities!
```
