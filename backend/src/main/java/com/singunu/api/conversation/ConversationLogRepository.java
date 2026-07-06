package com.singunu.api.conversation;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface ConversationLogRepository extends MongoRepository<ConversationLog, String> {
}
