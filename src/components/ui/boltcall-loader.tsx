import { Swirling } from './swirling';

interface BoltcallLoaderProps {
  className?: string;
  logoClassName?: string;
}

/** Swirling ring with the Boltcall mark centered inside — app-wide loading animation. */
function BoltcallLoader({ className = 'size-20 text-white', logoClassName = 'w-[24%]' }: BoltcallLoaderProps) {
  return (
    <div className="relative inline-flex items-center justify-center">
      <Swirling className={className} />
      {/* logo asset is blue-only — brightness-0 invert forces it white, no separate asset needed */}
      <img
        src="/boltcall_small_logo.webp"
        alt=""
        className={`absolute brightness-0 invert ${logoClassName}`}
      />
    </div>
  );
}

export { BoltcallLoader };

export default BoltcallLoader;
