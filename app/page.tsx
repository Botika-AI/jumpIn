export default function Home() {
  return (
    <div className="mesh-bg min-h-screen flex items-center justify-center p-6">
      <div className="liquid-glass p-8 max-w-md w-full space-y-6">
        <h1 className="text-4xl font-montserrat font-bold text-gray-900">
          JumpIn QR Check-In
        </h1>

        <div className="space-y-3">
          <p className="text-lg font-inter text-gray-700">
            ✓ Next.js 16 App Router
          </p>
          <p className="text-lg font-inter text-gray-700">
            ✓ Tailwind CSS v3 (npm package)
          </p>
          <p className="text-lg font-inter text-gray-700">
            ✓ Google Fonts (next/font)
          </p>
          <p className="text-lg font-inter text-gray-700">
            ✓ Glassmorphism styling
          </p>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Glass input test"
            className="glass-input w-full px-4 py-3 rounded-xl"
          />
          <button className="btn-primary-liquid w-full px-6 py-3 rounded-xl">
            Primary button test
          </button>
        </div>

        <div className="text-sm text-gray-500 font-inter">
          <p>Font test:</p>
          <p className="font-montserrat font-semibold">Montserrat (headings)</p>
          <p className="font-inter">Inter (body text)</p>
        </div>
      </div>
    </div>
  );
}
