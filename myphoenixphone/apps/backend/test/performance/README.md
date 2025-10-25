# Performance Testing with k6

## Overview

This directory contains k6 performance tests for the MyPhoenixPhone backend API. Tests measure response times, throughput, error rates, and identify performance bottlenecks under load.

## Test Files

### 1. `eligibility-api.js`
**Target**: Eligibility check endpoint  
**Load**: 100 req/s for 60 seconds  
**Success Criteria**:
- p95 latency < 500ms
- p99 latency < 1000ms
- Error rate < 1%

**What it tests**:
- Phone number eligibility checks
- Response time under high load
- Database query performance
- API throughput

---

### 2. `consent-api.js`
**Target**: OAuth2 consent flow (init + callback)  
**Load**: 50 req/s for 60 seconds  
**Success Criteria**:
- p95 latency < 1000ms (OAuth is heavier)
- p99 latency < 2000ms
- Error rate < 2%

**What it tests**:
- Consent initialization
- OAuth callback handling
- State management
- External OAuth provider integration

---

### 3. `verification-api.js`
**Target**: SMS verification (send + verify)  
**Load**: 30 req/s for 60 seconds  
**Success Criteria**:
- p95 latency < 800ms
- p99 latency < 1500ms
- Error rate < 1%

**What it tests**:
- SMS code sending
- Code verification
- Rate limiting
- SMS provider integration

---

### 4. `workers-benchmark.js`
**Target**: Daily refresh worker execution  
**Load**: Process 500 leads  
**Success Criteria**:
- p95 execution < 60 seconds
- Error rate < 0.5%

**What it tests**:
- Batch processing performance
- Database bulk operations
- Worker job queue
- Lead processing throughput

---

## Installation

### Install k6

**macOS** (via Homebrew):
```bash
brew install k6
```

**Linux**:
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows** (via Chocolatey):
```powershell
choco install k6
```

Verify installation:
```bash
k6 version
```

---

## Running Tests

### Prerequisites

1. **Backend server must be running**:
   ```bash
   cd myphoenixphone/apps/backend
   npm run start:dev
   ```

2. **Database must be available** (PostgreSQL)

3. **Environment variables** (optional):
   - `BASE_URL`: API base URL (default: `http://localhost:3000`)
   - `API_KEY`: API key for authenticated endpoints
   - `ADMIN_TOKEN`: Admin token for worker endpoints

### Run Individual Tests

```bash
# From apps/backend/test/performance directory

# Eligibility API test
k6 run eligibility-api.js

# Consent API test
k6 run consent-api.js

# Verification API test
k6 run verification-api.js

# Workers benchmark
k6 run workers-benchmark.js
```

### Run with Custom Configuration

```bash
# Custom VUs and duration
k6 run --vus 50 --duration 120s eligibility-api.js

# With custom base URL
k6 run -e BASE_URL=https://api.example.com eligibility-api.js

# With API key
k6 run -e API_KEY=your-api-key-here eligibility-api.js

# Save detailed results
k6 run --out json=results/eligibility-results.json eligibility-api.js
```

### Run All Tests (Sequential)

```bash
#!/bin/bash
# run-all-performance-tests.sh

echo "🚀 Starting Performance Test Suite"
echo "===================================="

# Ensure server is running
echo "✓ Ensure backend server is running on http://localhost:3000"
sleep 2

# Run eligibility test
echo ""
echo "📊 Test 1/4: Eligibility API"
k6 run eligibility-api.js

# Wait between tests
sleep 10

# Run consent test
echo ""
echo "📊 Test 2/4: Consent API"
k6 run consent-api.js

sleep 10

# Run verification test
echo ""
echo "📊 Test 3/4: Verification API"
k6 run verification-api.js

sleep 10

# Run workers benchmark
echo ""
echo "📊 Test 4/4: Workers Benchmark"
k6 run workers-benchmark.js

echo ""
echo "✅ Performance Test Suite Complete"
echo "📁 Results saved in: test/performance/results/"
```

Make executable:
```bash
chmod +x run-all-performance-tests.sh
./run-all-performance-tests.sh
```

---

## Understanding Results

### Key Metrics

1. **http_req_duration**: Time from request start to response end
   - **p50 (median)**: 50% of requests completed in this time
   - **p95**: 95% of requests completed in this time (key SLA metric)
   - **p99**: 99% of requests completed in this time
   - **avg**: Average response time
   - **max**: Maximum response time

2. **http_req_failed**: Percentage of failed HTTP requests
   - Target: < 1% for most APIs, < 2% for OAuth flows

3. **http_reqs**: Total number of requests
   - **rate**: Requests per second (throughput)

4. **vus (Virtual Users)**: Number of concurrent users simulated

5. **Custom Metrics**:
   - `eligibility_duration`: Time for eligibility check
   - `consent_init_duration`: Time for consent init
   - `consent_callback_duration`: Time for consent callback
   - `send_code_duration`: Time to send SMS code
   - `verify_code_duration`: Time to verify SMS code
   - `worker_execution_duration`: Worker execution time

### Sample Output

```
Performance Test Summary: Eligibility API
==================================================

HTTP Request Duration:
  - p50: 187.23ms
  - p95: 412.67ms (target: <500ms)
  - p99: 789.45ms (target: <1000ms)
  - avg: 234.12ms
  - max: 1203.78ms

Request Rate:
  - total: 9876 requests
  - rate: 98.76 req/s

Error Rate:
  - failed: 23 requests
  - rate: 0.23% (target: <1%)

Virtual Users:
  - max: 100
  - avg: 75

Thresholds:
  ✓ PASS - http_req_duration (p95<500ms, p99<1000ms)
  ✓ PASS - http_req_failed (rate<0.01)
  ✓ PASS - errors (rate<0.01)
  ✓ PASS - eligibility_duration (p95<500ms)
```

### Interpreting Results

#### ✅ Good Performance
- p95 below target thresholds
- Error rate < 1%
- Consistent response times (low variance between p50 and p95)
- Stable throughput throughout test

#### ⚠️ Warning Signs
- p95 approaching threshold limits
- Error rate 1-5%
- Large gap between p50 and p95 (indicates inconsistent performance)
- Throughput degrades over time

#### ❌ Performance Issues
- p95 exceeds thresholds
- Error rate > 5%
- Response times increase over test duration
- Timeouts or connection errors

---

## Common Performance Issues

### Issue: High p95/p99 Latency

**Possible Causes**:
- Slow database queries
- N+1 query problem
- Missing database indexes
- External API calls blocking

**Investigation**:
```bash
# Check database query times
# Enable PostgreSQL slow query log
# Review query execution plans
```

**Solutions**:
- Add database indexes
- Use query result caching
- Implement connection pooling
- Use async/await properly

### Issue: High Error Rate

**Possible Causes**:
- Rate limiting
- Database connection pool exhaustion
- Memory leaks
- Unhandled exceptions

**Investigation**:
```bash
# Check application logs
# Monitor database connections
# Review error stack traces
```

**Solutions**:
- Increase rate limits
- Increase connection pool size
- Fix memory leaks
- Add proper error handling

### Issue: Throughput Degradation

**Possible Causes**:
- Memory leaks
- Database connection leaks
- CPU throttling
- Disk I/O bottleneck

**Investigation**:
```bash
# Monitor system resources
top
htop
df -h  # Disk space
```

**Solutions**:
- Fix resource leaks
- Scale horizontally (more instances)
- Optimize hot code paths
- Use caching

---

## Performance Baselines

### Target SLAs

| Endpoint | p50 | p95 | p99 | Throughput | Error Rate |
|----------|-----|-----|-----|------------|------------|
| Eligibility | < 200ms | < 500ms | < 1s | 100 req/s | < 1% |
| Consent Init | < 400ms | < 800ms | < 1.5s | 50 req/s | < 2% |
| Consent Callback | < 500ms | < 1s | < 2s | 50 req/s | < 2% |
| Verification Send | < 250ms | < 500ms | < 800ms | 30 req/s | < 1% |
| Verification Verify | < 400ms | < 800ms | < 1.5s | 30 req/s | < 1% |
| Workers (500 leads) | < 40s | < 60s | < 90s | 10 leads/s | < 0.5% |

### Acceptable Performance

Performance within 20% of targets is acceptable.

### Performance Alerts

Set up monitoring alerts for:
- p95 > 80% of target
- Error rate > 50% of target
- Throughput < 80% of target

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Performance Tests

on:
  schedule:
    - cron: '0 2 * * *'  # Run daily at 2 AM
  workflow_dispatch:      # Allow manual trigger

jobs:
  performance:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install k6
        run: |
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      
      - name: Install dependencies
        run: npm ci
        working-directory: myphoenixphone/apps/backend
      
      - name: Start backend server
        run: npm run start:prod &
        working-directory: myphoenixphone/apps/backend
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_db
      
      - name: Wait for server
        run: sleep 10
      
      - name: Run performance tests
        run: |
          k6 run --out json=results/eligibility-results.json test/performance/eligibility-api.js
          k6 run --out json=results/consent-results.json test/performance/consent-api.js
          k6 run --out json=results/verification-results.json test/performance/verification-api.js
        working-directory: myphoenixphone/apps/backend
      
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: myphoenixphone/apps/backend/test/performance/results/
```

---

## Advanced Usage

### Load Testing with Stages

```javascript
export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Warm up
    { duration: '3m', target: 100 },  // Ramp up
    { duration: '5m', target: 100 },  // Sustain
    { duration: '1m', target: 200 },  // Spike test
    { duration: '3m', target: 100 },  // Recovery
    { duration: '1m', target: 0 },    // Ramp down
  ],
};
```

### Stress Testing

```bash
# Find breaking point
k6 run --vus 200 --duration 180s eligibility-api.js
k6 run --vus 500 --duration 180s eligibility-api.js
k6 run --vus 1000 --duration 180s eligibility-api.js
```

### Soak Testing (Endurance)

```bash
# Test stability over long duration
k6 run --vus 50 --duration 4h eligibility-api.js
```

### Spike Testing

```javascript
export const options = {
  stages: [
    { duration: '10s', target: 10 },   // Normal load
    { duration: '5s', target: 500 },   // Sudden spike
    { duration: '30s', target: 500 },  // Sustain spike
    { duration: '10s', target: 10 },   // Return to normal
  ],
};
```

---

## Monitoring During Tests

### Real-time Monitoring

```bash
# Watch k6 output
k6 run eligibility-api.js

# Stream metrics to InfluxDB
k6 run --out influxdb=http://localhost:8086/k6 eligibility-api.js

# Stream to Grafana Cloud
k6 run --out cloud eligibility-api.js
```

### Server Monitoring

```bash
# Monitor CPU and memory
htop

# Monitor network connections
netstat -an | grep 3000

# Monitor database connections
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Application logs
tail -f logs/application.log
```

---

## Troubleshooting

### k6: command not found

**Solution**: Install k6 (see Installation section)

### Connection refused

**Issue**: Backend server not running

**Solution**:
```bash
cd myphoenixphone/apps/backend
npm run start:dev
```

### High error rate in tests

**Issue**: Test configuration doesn't match API requirements

**Solution**:
- Check API_KEY is valid
- Verify endpoints exist
- Check rate limits
- Review server logs

### Results directory not created

**Solution**:
```bash
mkdir -p test/performance/results
```

---

## Next Steps

1. **Establish baseline**: Run tests on staging environment
2. **Set up monitoring**: Integrate with Grafana/InfluxDB
3. **Automate**: Add to CI/CD pipeline
4. **Set alerts**: Configure performance degradation alerts
5. **Optimize**: Address bottlenecks found in tests
6. **Re-test**: Verify optimizations improved performance

---

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Examples](https://k6.io/docs/examples/)
- [Performance Testing Best Practices](https://k6.io/docs/testing-guides/test-types/)
- [Analyzing k6 Results](https://k6.io/docs/results-output/overview/)
