'use client';

interface CaptchaVerificationProps {
  onVerified: () => void;
}

export function CaptchaVerification({ onVerified }: CaptchaVerificationProps) {
  // Simple mock captcha for build purposes
  return (
    <div className="mt-4 p-4 border rounded-lg bg-gray-50">
      <p className="text-sm text-gray-600 mb-2">Verify you are human</p>
      <button
        type="button"
        onClick={onVerified}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        I am not a robot
      </button>
    </div>
  );
}