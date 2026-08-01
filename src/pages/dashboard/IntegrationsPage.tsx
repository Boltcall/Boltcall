import React from 'react';
import IntegrationHubTab from '../../components/integrations/IntegrationHubTab';

const IntegrationsPage: React.FC = () => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto pt-4">
        <IntegrationHubTab />
      </div>
    </div>
  );
};

export default IntegrationsPage;
