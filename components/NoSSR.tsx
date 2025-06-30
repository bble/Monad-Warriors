import dynamic from 'next/dynamic';
import { ReactNode } from 'react';

interface NoSSRProps {
  children: ReactNode;
  fallback?: ReactNode;
}

const NoSSRWrapper = ({ children, fallback }: NoSSRProps) => {
  return <>{children}</>;
};

export default dynamic(() => Promise.resolve(NoSSRWrapper), {
  ssr: false,
  loading: () => (
    <div className="glass-panel p-6">
      <div className="animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-700 rounded w-1/2"></div>
      </div>
    </div>
  ),
});
