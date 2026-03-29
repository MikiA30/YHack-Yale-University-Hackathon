export default function AuraLogo({ size = 28, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background */}
      <rect width="36" height="36" rx="8" fill="#0A0A0A" />

      {/* Subtle outer ring — the "aura" field */}
      <circle
        cx="18"
        cy="18"
        r="13.5"
        stroke="white"
        strokeWidth="0.6"
        strokeOpacity="0.12"
      />

      {/* Left leg */}
      <path
        d="M18 8 L9.5 27.5"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Right leg */}
      <path
        d="M18 8 L26.5 27.5"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Crossbar — curved slightly upward for character */}
      <path
        d="M13.1 20.5 Q18 17.5 22.9 20.5"
        stroke="white"
        strokeWidth="1.75"
        strokeLinecap="round"
        fill="none"
      />

      {/* Apex dot — the data point / signal source */}
      <circle cx="18" cy="8" r="2.1" fill="white" />
    </svg>
  );
}
