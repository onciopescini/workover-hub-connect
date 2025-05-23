
import { Spinner } from "@/components/ui/spinner";

const LoadingScreen = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center">
      <div className="text-center">
        <Spinner className="w-8 h-8 text-primary mb-4 mx-auto" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
