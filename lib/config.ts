export const getServerConfig = () => {
  // For development, you can set these environment variables
  // For production, these should be set in your deployment environment
  const host =
    process.env.NEXT_PUBLIC_SERVER_HOST || (typeof window !== "undefined" ? window.location.hostname : "localhost")
  const port = process.env.NEXT_PUBLIC_SERVER_PORT || "5000"

  return {
    serverUrl: `http://${host}:${port}`,
    host,
    port,
  }
}
