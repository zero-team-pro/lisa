import React from 'react';

import { LegalPage } from 'App/components/LegalPage';

const TermsPage: React.FC = () => (
  <LegalPage title="Terms of Service">
    <p>
      These Terms govern your use of Lisa, a messenger bot and its web interface. By adding Lisa to a server, connecting
      a chat, or using its commands, you agree to these Terms.
    </p>
    <h2>Using Lisa</h2>
    <p>
      You may use Lisa only in compliance with applicable law and the rules of the platform through which you access it.
      You are responsible for the servers, chats, content, and configuration that you control.
    </p>
    <p>
      You must not use Lisa to abuse others, distribute unlawful content, attempt unauthorized access, disrupt the
      service, or circumvent platform or service restrictions.
    </p>
    <h2>Third-party services</h2>
    <p>
      Some features depend on services such as Discord, Telegram, and optional integrations configured by an
      administrator. Their own terms and availability also apply. Lisa is not responsible for third-party services.
    </p>
    <h2>Availability and changes</h2>
    <p>
      Lisa is provided on an “as is” and “as available” basis. Features may change, become unavailable, or be removed.
      To the extent permitted by law, no warranty is made that the service will be uninterrupted or error-free.
    </p>
    <h2>Suspension</h2>
    <p>
      Access may be restricted when necessary to protect users, platforms, or the service, or when these Terms are
      violated.
    </p>
    <h2>Contact</h2>
    <p>
      Questions about these Terms can be raised in the{' '}
      <a href="https://discord.gg/2rvxaQWj" rel="noreferrer" target="_blank">
        Lisa Discord server
      </a>
      .
    </p>
  </LegalPage>
);

export { TermsPage };
