import EventRepository from '../repositories/event.repository.js';
import type { ConditionQuery } from '../repositories/event.repository.js';
import logger from '../utils/logger.js';
import type {
    AudiencePreviewRequest,
    AudiencePreviewResponse,
} from '../dto/audience-preview.dto.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

class AudienceService {
    private eventRepository: EventRepository;

    constructor() {
        this.eventRepository = new EventRepository();
    }

    async previewAudience(request: AudiencePreviewRequest): Promise<AudiencePreviewResponse> {
        try {
            logger.info(`[AudienceService] Previewing audience with ${request.conditions.length} condition(s)`);

            // asOf comes from the request. We never use the server clock.
            const asOf = new Date(request.asOf);

            // Work out the time window for each condition.
            const conditionQueries: ConditionQuery[] = request.conditions.map((condition) => ({
                eventType: condition.eventType,
                operator: condition.operator,
                count: condition.count,
                windowStart: new Date(asOf.getTime() - condition.withinDays * MS_PER_DAY),
                windowEnd: asOf,
            }));

            // The database returns only the users who pass every condition.
            const matchedUsers = await this.eventRepository.findMatchingUsers(conditionQueries);

            // Evidence: for each condition, how many events the user had.
            const members = matchedUsers.map((user) => ({
                anonymousId: user.anonymousId,
                evidence: request.conditions.map((condition, index) => ({
                    eventType: condition.eventType,
                    observedCount: user.counts[index] ?? 0,
                })),
            }));

            logger.info(`[AudienceService] Audience size: ${members.length}`);

            return {
                name: request.name,
                asOf: request.asOf,
                total: members.length,
                members,
            };
        } catch (error) {
            logger.error('[AudienceService] Error previewing audience:', error);
            throw error;
        }
    }
}

export default AudienceService;
