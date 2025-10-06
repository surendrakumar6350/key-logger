export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="h-12 w-1/3 bg-gray-800 animate-pulse rounded-lg mb-6"></div>
      
      <div className="w-full bg-gray-800 animate-pulse rounded-lg p-8 mb-6">
        <div className="h-10 bg-gray-700 rounded mb-4"></div>
        <div className="flex gap-4">
          <div className="h-10 flex-1 bg-gray-700 rounded"></div>
          <div className="h-10 w-32 bg-gray-700 rounded"></div>
        </div>
      </div>
      
      <div className="flex justify-between mb-6">
        <div className="h-6 w-1/4 bg-gray-800 animate-pulse rounded"></div>
        <div className="h-6 w-1/4 bg-gray-800 animate-pulse rounded"></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="bg-gray-800 animate-pulse rounded-lg overflow-hidden">
            <div className="h-12 bg-gray-700"></div>
            <div className="p-4 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
        
        <div>
          <div className="bg-gray-800 animate-pulse rounded-lg h-[400px]"></div>
        </div>
      </div>
    </div>
  );
}