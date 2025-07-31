// Production-ready configuration with fallbacks
export const getServerConfig = () => {
  // For client-side
  if (typeof window !== "undefined") {
    // In production, use the same host as the current page
    // This works when frontend and backend are deployed to the same domain
    const isProduction = process.env.NODE_ENV === "production"

    // Use environment variables if provided
    const host = process.env.NEXT_PUBLIC_SERVER_HOST || window.location.hostname
    const port = process.env.NEXT_PUBLIC_SERVER_PORT || (isProduction ? window.location.port || "80" : "5000")
    const protocol = isProduction ? window.location.protocol : "http:"

    return {
      serverUrl: `${protocol}//${host}${port ? `:${port}` : ""}`,
      host,
      port,
      isProduction,
    }
  }

  // For server-side rendering
  return {
    serverUrl: process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000",
    host: process.env.NEXT_PUBLIC_SERVER_HOST || "localhost",
    port: process.env.NEXT_PUBLIC_SERVER_PORT || "5000",
    isProduction: process.env.NODE_ENV === "production",
  }
}
