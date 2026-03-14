import AuthController from '@/components/AuthController';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-4">
      <AuthController />
    </div>
  );
}
