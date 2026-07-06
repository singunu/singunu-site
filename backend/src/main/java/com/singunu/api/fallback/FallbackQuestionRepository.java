package com.singunu.api.fallback;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface FallbackQuestionRepository extends MongoRepository<FallbackQuestion, String> {
}
