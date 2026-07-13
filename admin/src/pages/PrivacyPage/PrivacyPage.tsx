import React from 'react';

import { LegalPage } from 'App/components/LegalPage';

const PrivacyPage: React.FC = () => (
  <LegalPage title="Privacy Policy">
    <p>This Policy explains how Lisa handles information when you use the bot or its web interface.</p>
    <h2>Information processed</h2>
    <p>
      Depending on the feature, Lisa may process platform identifiers for users, servers, channels, and chats; usernames
      and avatars; messages and command parameters sent to Lisa; server and channel configuration; and authentication
      tokens used to access the admin interface.
    </p>
    <h2>How information is used</h2>
    <p>
      Information is used to execute commands, deliver messages between configured services, manage access and
      configuration, prevent abuse, diagnose failures, and maintain the service. Lisa does not sell personal data.
    </p>
    <h2>Sharing and integrations</h2>
    <p>
      Data is sent to Discord, Telegram, or another configured integration when that is required to perform the action
      you request. Infrastructure providers may process data as needed to host and operate Lisa.
    </p>
    <h2>Retention and security</h2>
    <p>
      Configuration and identifiers are retained while needed to provide the service. Temporary authentication and
      operational data may be cached for limited periods. Reasonable safeguards are used, but no online service can
      guarantee absolute security.
    </p>
    <h2>Your choices</h2>
    <p>
      You can stop using Lisa, remove it from a server or chat you control, and revoke its authorization through the
      relevant platform. Requests concerning stored information can be submitted through the contact channel below.
    </p>
    <h2>Contact</h2>
    <p>
      Privacy questions and requests can be raised in the{' '}
      <a href="https://discord.gg/2rvxaQWj" rel="noreferrer" target="_blank">
        Lisa Discord server
      </a>
      .
    </p>
  </LegalPage>
);

export { PrivacyPage };
