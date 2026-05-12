# Block-Based Adaptive Assessment System Setup Guide

## Overview

This guide walks you through setting up the advanced block-based adaptive assessment system that dynamically adjusts question difficulty based on student performance.

## Features

- **Block-wise question generation**: Questions are organized into blocks (e.g., 4 blocks of 5 questions each)
- **Adaptive difficulty**: Difficulty adjusts based on performance in previous blocks
- **Smart navigation**: Free navigation within blocks, read-only previous blocks
- **Fallback mechanisms**: Graceful degradation to static assessments if adaptive system fails
- **Real-time analytics**: Performance tracking and adaptation success metrics

## Prerequisites

- PostgreSQL database with existing tech assessment schema
- Node.js backend with NestJS
- Next.js frontend
- Sufficient question pool (minimum 5 questions per difficulty level per category)

## Database Setup

### 1. Run the Adaptive Schema Migration

```sql
-- Execute the block-adaptive-schema.sql file
\i backend/db/block-adaptive-schema.sql
```

### 2. Verify Tables Created

```sql
-- Check that adaptive tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%adaptive%' OR table_name LIKE '%block%';

-- Expected tables:
-- adaptive_blocks
-- block_attempts  
-- adaptive_paths
-- question_pool_metadata
-- block_generation_cache
-- adaptive_performance_analytics
```

### 3. Update Assessment Configuration

```sql
-- Enable block-based mode for an assessment
UPDATE tech_assessments 
SET 
  block_config = '{"enabled": true, "blocksPerAssessment": 4, "questionsPerBlock": 5}'::jsonb,
  adaptive_config = '{"enabled": true, "difficultyProgression": "linear", "adaptationStrategy": "hybrid"}'::jsonb,
  categories = '["QA", "LR", "DI", "AR", "VA"]'::jsonb,
  difficulty_marks = '{"easy": 1, "medium": 2, "hard": 5}'::jsonb,
  difficulty_negative_marks = '{"easy": 0, "medium": 0.25, "hard": 0.25}'::jsonb
WHERE assessment_code = 'TECH_APT_001';
```

## Backend Setup

### 1. Install Dependencies

```bash
cd backend/assessment-service
npm install
```

### 2. Verify Module Configuration

The adaptive system should be automatically registered in `assessment.module.ts`. Verify these imports:

```typescript
import { AdaptiveBlockService } from './services/adaptive-block.service';
import { AdaptiveFallbackService } from './services/adaptive-fallback.service';
import { AdaptiveBlockController } from './controllers/adaptive-block.controller';
```

### 3. Start Backend Service

```bash
npm run start:dev
```

### 4. Test API Endpoints

```bash
# Initialize adaptive blocks
curl -X POST http://localhost:5000/api/assessment/adaptive/blocks/initialize/1

# Get assessment overview
curl http://localhost:5000/api/assessment/adaptive/assessments/1/overview

# Get system health
curl http://localhost:5000/api/assessment/adaptive/analytics/1
```

## Frontend Setup

### 1. Components Created

- `AdaptiveAptitudeEngine.tsx` - Main adaptive assessment component
- `AdaptiveAptitudePreTest.tsx` - Adaptive pre-test modal
- `/assessment/aptitude/adaptive/page.tsx` - Adaptive assessment page

### 2. Integration Points

The `AssessmentPortal.tsx` automatically uses `AdaptiveAptitudePreTest` instead of `AptitudePreTest` when block-based mode is enabled.

### 3. Start Frontend

```bash
cd frontend
npm run dev
```

## Question Pool Requirements

### Minimum Question Requirements

For a 4-block assessment with 5 questions per block:

- **Easy difficulty**: 20+ questions across all categories
- **Medium difficulty**: 20+ questions across all categories  
- **Hard difficulty**: 20+ questions across all categories
- **Total minimum**: 60 questions

### Recommended Distribution

```
Categories: QA (Quantitative), LR (Logical Reasoning), DI (Data Interpretation), AR (Abstract Reasoning), VA (Verbal Ability)

Easy: 8 QA, 6 LR, 4 DI, 3 AR, 3 VA = 24 questions
Medium: 6 QA, 6 LR, 6 DI, 4 AR, 4 VA = 26 questions  
Hard: 4 QA, 6 LR, 6 DI, 6 AR, 4 VA = 26 questions
Total: 76 questions
```

## Configuration Options

### Block Configuration

```json
{
  "enabled": true,
  "blocksPerAssessment": 4,
  "questionsPerBlock": 5
}
```

### Adaptive Configuration

```json
{
  "enabled": true,
  "difficultyProgression": "linear", // "static", "linear", "exponential"
  "adaptationStrategy": "hybrid" // "performance_based", "time_based", "hybrid"
}
```

### Difficulty Progression Strategies

1. **Static**: Fixed difficulty progression (easy → medium → hard)
2. **Linear**: Gradual difficulty increase based on performance
3. **Exponential**: Rapid difficulty changes for high/low performers

### Adaptation Strategies

1. **Performance Based**: Focus on accuracy scores
2. **Time Based**: Consider completion time
3. **Hybrid**: Combine accuracy, time, and consistency metrics

## Testing the System

### 1. Unit Tests

```bash
# Backend tests
cd backend/assessment-service
npm run test

# Frontend tests  
cd frontend
npm run test
```

### 2. Integration Tests

Test the complete flow:

1. Navigate to assessment portal
2. Click "Start Aptitude Assessment"
3. Verify adaptive mode detection
4. Complete first block with 80%+ accuracy
5. Verify second block has increased difficulty
6. Complete all blocks
7. Check results and analytics

### 3. Load Testing

```bash
# Test concurrent users
npm run test:load

# Test adaptive system under load
curl -X POST http://localhost:5000/api/assessment/adaptive/blocks/generate \
  -H "Content-Type: application/json" \
  -d '{"assessmentId": 1, "blockNumber": 1, "userId": 1, "mode": "main"}'
```

## Monitoring and Analytics

### 1. System Health Check

```bash
curl http://localhost:5000/api/assessment/adaptive/analytics/1
```

### 2. Performance Metrics

- Block completion rates
- Difficulty progression accuracy
- Adaptation success scores
- Question pool utilization

### 3. Fallback Monitoring

- Adaptive system failure rates
- Fallback activation frequency
- Static vs adaptive performance comparison

## Troubleshooting

### Common Issues

1. **"Adaptive system not ready"**
   - Check database schema migration
   - Verify question pool sufficiency
   - Validate block configuration

2. **"Insufficient questions for difficulty"**
   - Add more questions to the question pool
   - Check question status (must be 'active')
   - Verify difficulty classifications

3. **"Block generation failed"**
   - Check system health endpoint
   - Review error logs
   - Verify database connectivity

### Debug Mode

Enable debug logging:

```typescript
// In adaptive-block.service.ts
this.logger.setDebugMode(true);
```

### Fallback Activation

If adaptive system fails, the system automatically falls back to static assessments. Check logs for:

```
Adaptive system failed for aptitude, falling back to static assessment
```

## Performance Optimization

### 1. Database Indexes

The schema includes optimized indexes for:

- Block attempts by user and token
- Question pool metadata
- Adaptive performance analytics

### 2. Caching Strategy

- Block generation cache for common patterns
- Question pool metadata caching
- Assessment configuration caching

### 3. Background Processing

- Preload fallback assessments
- Background block generation
- Async analytics processing

## Security Considerations

### 1. Question Pool Protection

- Prevent question pool enumeration
- Secure adaptive path prediction
- Rate limiting on block generation

### 2. Data Privacy

- Encrypt performance analytics
- Anonymize user data in analytics
- Secure fallback cache storage

## Future Enhancements

### Phase 2 Features (Planned)

- Time pressure adaptation
- Category specialization
- Predictive analytics
- Multi-dimensional adaptation

### Phase 3 Features (Future)

- Machine learning integration
- Personalized learning paths
- Real-time difficulty adjustment
- Collaborative filtering

## Support

For issues or questions:

1. Check system health endpoint
2. Review error logs
3. Verify configuration
4. Test with fallback mode

## Deployment Checklist

- [ ] Database schema migrated
- [ ] Question pool populated (60+ questions)
- [ ] Assessment configured for adaptive mode
- [ ] Backend service running
- [ ] Frontend components deployed
- [ ] System health check passing
- [ ] Fallback mechanisms tested
- [ ] Load testing completed
- [ ] Monitoring configured

---

**Note**: This system requires careful question pool management and regular monitoring to ensure optimal adaptive performance.
