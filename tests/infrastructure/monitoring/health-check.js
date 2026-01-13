const http = require("http");
const https = require("https");

class HealthChecker {
  constructor(baseUrl = "http://0.0.0.0:5000") {
    this.baseUrl = baseUrl;
    this.endpoints = ["/api/health", "/api/pricing", "/api/dashboard/stats"];
  }

  async checkEndpoint(path) {
    return new Promise((resolve) => {
      const url = `${this.baseUrl}${path}`;
      const client = url.startsWith("https:") ? https : http;
      const startTime = Date.now();

      const req = client.get(url, (res) => {
        const duration = Date.now() - startTime;
        let data = "";

        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          resolve({
            path,
            status: res.statusCode,
            duration,
            success: res.statusCode >= 200 && res.statusCode < 300,
            data: data.slice(0, 100), // Truncate response data
          });
        });
      });

      req.on("error", (error) => {
        resolve({
          path,
          status: 0,
          duration: Date.now() - startTime,
          success: false,
          error: error.message,
        });
      });

      req.setTimeout(5000, () => {
        req.destroy();
        resolve({
          path,
          status: 0,
          duration: 5000,
          success: false,
          error: "Timeout",
        });
      });
    });
  }

  async checkAll() {
    console.log("🏥 Running health checks...\n");

    const results = await Promise.all(
      this.endpoints.map((endpoint) => this.checkEndpoint(endpoint)),
    );

    let allHealthy = true;

    results.forEach((result) => {
      const status = result.success ? "✅" : "❌";
      const duration = `${result.duration}ms`;

      console.log(`${status} ${result.path}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Duration: ${duration}`);

      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }

      if (!result.success) {
        allHealthy = false;
      }

      console.log("");
    });

    const summary = allHealthy
      ? "🎉 All systems healthy!"
      : "⚠️  Some systems are unhealthy";
    console.log(summary);

    return {
      healthy: allHealthy,
      results,
      timestamp: new Date().toISOString(),
    };
  }
}

// Run health check if called directly
if (require.main === module) {
  const checker = new HealthChecker();
  checker.checkAll().then((result) => {
    process.exit(result.healthy ? 0 : 1);
  });
}

module.exports = HealthChecker;
