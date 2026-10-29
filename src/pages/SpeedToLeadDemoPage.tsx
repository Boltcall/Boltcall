import { useEffect } from 'react';
import { MachineScene } from '../components/speed-to-lead/MachineScene';

export default function SpeedToLeadDemoPage() {
  useEffect(() => {
    const title = document.title;
    document.title = 'Boltcall 3D Demo — Inquiry to Booked Appointment';
    const previous = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const tag = previous ?? document.createElement('meta');
    const content = tag.content;
    tag.name = 'robots'; tag.content = 'noindex, follow';
    if (!previous) document.head.appendChild(tag);
    return () => {
      document.title = title;
      if (previous) tag.content = content;
      else tag.remove();
    };
  }, []);
  return <MachineScene />;
}
