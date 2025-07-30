// Redis setup script
const redis = require("redis")

async function setupRedis() {
  const client = redis.createClient({
    host: "localhost",
    port: 6379,
  })

  try {
    await client.connect()
    console.log("Connected to Redis successfully!")

    // Test Redis connection
    await client.set("test", "Hello Redis!")
    const value = await client.get("test")
    console.log("Redis test value:", value)

    // Clean up test key
    await client.del("test")

    console.log("Redis setup completed successfully!")
  } catch (error) {
    console.error("Redis setup failed:", error)
  } finally {
    await client.quit()
  }
}

setupRedis()
