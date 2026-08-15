import { Swirling } from './swirling';

interface BoltcallLoaderProps {
  className?: string;
  logoClassName?: string;
}

/** Swirling ring with the Boltcall mark centered inside — app-wide loading animation. */
function BoltcallLoader({ className = 'size-16 text-white', logoClassName = 'w-[38%]' }: BoltcallLoaderProps) {
  return (
    <div className="relative inline-flex items-center justify-center">
      <Swirling className={className} />
      <img
        src="/boltcall_small_logo.webp"
        alt=""
        className={`absolute ${logoClassName}`}
      />
    </div>
  );
}

export { BoltcallLoader };

export default BoltcallLoader;
