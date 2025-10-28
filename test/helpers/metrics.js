class MetricsCollector {
    constructor() {
        this.metrics = {
            requests: [],
            successes: 0,
            failures: 0,
            timeouts: 0,
            startTime: Date.now(),
            responseTimes: [],
            memoryUsage: []
        };
    }

    recordRequest(options) {
        const record = {
            ...options,
            timestamp: Date.now(),
            status: 'pending'
        };
        this.metrics.requests.push(record);
        return record;
    }

    recordSuccess(record, duration) {
        record.status = 'success';
        record.duration = duration;
        this.metrics.successes++;
        this.metrics.responseTimes.push(duration);
    }

    recordFailure(record, error) {
        record.status = 'failure';
        record.error = error.message;
        this.metrics.failures++;
    }

    recordTimeout(record, duration) {
        record.status = 'timeout';
        record.duration = duration;
        this.metrics.timeouts++;
    }

    recordMemoryUsage() {
        const memUsage = process.memoryUsage();
        this.metrics.memoryUsage.push({
            timestamp: Date.now(),
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            rss: memUsage.rss,
            external: memUsage.external
        });
    }

    getSummary() {
        const endTime = Date.now();
        const totalDuration = endTime - this.metrics.startTime;
        const totalRequests = this.metrics.requests.length;
        const avgResponseTime = this.metrics.responseTimes.length > 0
            ? this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length
            : 0;
        const minResponseTime = this.metrics.responseTimes.length > 0
            ? Math.min(...this.metrics.responseTimes)
            : 0;
        const maxResponseTime = this.metrics.responseTimes.length > 0
            ? Math.max(...this.metrics.responseTimes)
            : 0;
        const successRate = totalRequests > 0
            ? (this.metrics.successes / totalRequests) * 100
            : 0;

        const latestMemory = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];
        const peakMemory = this.metrics.memoryUsage.reduce((peak, mem) => 
            mem.heapUsed > peak.heapUsed ? mem : peak, 
            latestMemory || { heapUsed: 0 }
        );

        return {
            totalRequests,
            totalDuration,
            successes: this.metrics.successes,
            failures: this.metrics.failures,
            timeouts: this.metrics.timeouts,
            successRate: successRate.toFixed(2) + '%',
            avgResponseTime: Math.round(avgResponseTime),
            minResponseTime,
            maxResponseTime,
            requestsPerSecond: (totalRequests / (totalDuration / 1000)).toFixed(2),
            currentMemoryMB: latestMemory ? (latestMemory.heapUsed / 1024 / 1024).toFixed(2) : 'N/A',
            peakMemoryMB: peakMemory ? (peakMemory.heapUsed / 1024 / 1024).toFixed(2) : 'N/A'
        };
    }

    printSummary() {
        const summary = this.getSummary();
        console.log('\n' + '='.repeat(60));
        console.log('METRICS SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Requests:        ${summary.totalRequests}`);
        console.log(`Successes:             ${summary.successes}`);
        console.log(`Failures:              ${summary.failures}`);
        console.log(`Timeouts:              ${summary.timeouts}`);
        console.log(`Success Rate:          ${summary.successRate}`);
        console.log(`Total Duration:        ${(summary.totalDuration / 1000).toFixed(2)}s`);
        console.log(`Requests/Second:       ${summary.requestsPerSecond}`);
        console.log('');
        console.log('Response Times:');
        console.log(`  Average:             ${summary.avgResponseTime}ms`);
        console.log(`  Min:                 ${summary.minResponseTime}ms`);
        console.log(`  Max:                 ${summary.maxResponseTime}ms`);
        console.log('');
        console.log('Memory Usage:');
        console.log(`  Current:             ${summary.currentMemoryMB} MB`);
        console.log(`  Peak:                ${summary.peakMemoryMB} MB`);
        console.log('='.repeat(60) + '\n');
    }

    reset() {
        this.metrics = {
            requests: [],
            successes: 0,
            failures: 0,
            timeouts: 0,
            startTime: Date.now(),
            responseTimes: [],
            memoryUsage: []
        };
    }
}

module.exports = MetricsCollector;

