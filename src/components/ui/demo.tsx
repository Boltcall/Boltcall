'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';

const InputPreview = () => {
  const [value, setValue] = useState('');

  return (
    <Input
      label="Email Address"
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
};

export default InputPreview;
