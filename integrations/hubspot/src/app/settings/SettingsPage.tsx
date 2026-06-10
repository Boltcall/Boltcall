import { EmptyState, Link, Text } from '@hubspot/ui-extensions';
import {
  hubspot,
  ExtensionPointApiActions,
  SettingsContext,
} from '@hubspot/ui-extensions';

interface SettingsExtensionProps {
  context: SettingsContext;
  actions: ExtensionPointApiActions<'settings'>;
}

hubspot.extend<'settings'>(({ context, actions }: SettingsExtensionProps) => (
  <SettingsPage context={context} actions={actions} />
));

const SettingsPage = ({ context, actions }: SettingsExtensionProps) => {
  void context;
  void actions;

  return (
    <>
      <EmptyState
        title="Boltcall is connected"
        layout="horizontal"
        imageName="success"
      >
        <Text>
          Use the Boltcall workflow action to trigger instant speed-to-lead
          follow-up for enrolled contacts.
        </Text>
        <Text>
          Manage routing, numbers, and AI follow-up settings inside{' '}
          <Link href="https://boltcall.org/dashboard/integrations">Boltcall</Link>.
        </Text>
      </EmptyState>
    </>
  );
};
