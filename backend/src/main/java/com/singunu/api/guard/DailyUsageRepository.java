package com.singunu.api.guard;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface DailyUsageRepository extends MongoRepository<DailyUsage, String> {
}
