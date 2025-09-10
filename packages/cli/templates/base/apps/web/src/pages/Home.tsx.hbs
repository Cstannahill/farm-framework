import { useQuery } from "@tanstack/react-query";

export function Home() {
  const { data: health, isLoading } = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const response = await fetch("/api/health");
      if (!response.ok) throw new Error("Health check failed");
      return response.json();
    },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Your FARM App
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          FastAPI + React + MongoDB = ❤️
        </p>

        <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
          <h2 className="text-lg font-semibold mb-4">API Status</h2>
          {isLoading ? (
            <div className="text-gray-500">Checking...</div>
          ) : health ? (
            <div className="text-green-600">
              ✅ API is {health.status}
              <div className="text-sm text-gray-500 mt-1">
                Service: {health.service} v{health.version}
              </div>
            </div>
          ) : (
            <div className="text-red-600">❌ API unavailable</div>
          )}
        </div>
      </div>
    </div>
  );
}
