/** LEGACY. Although this code ultimately proved to be useless, it was decided to keep it for a rainy day. */

import forge from 'node-forge';
import { readFileSync } from 'fs';
import oauth from 'mastercard-oauth1-signer';

import * as dotenv from 'dotenv';
dotenv.config();

const { MASTERCARD_NAME, MASTERCARD_PASSWORD, MASTERCARD_CONSUMER_KEY } = process.env;

const getMastercardKey = () => {
  // TODO: Memo
  const p12Content = readFileSync('/certs/mastercard/mastercard.p12', 'binary');

  const p12Asn1 = forge.asn1.fromDer(p12Content, false);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, MASTERCARD_PASSWORD);

  const keyObj = p12.getBags({
    friendlyName: MASTERCARD_NAME,
    bagType: forge.pki.oids.pkcs8ShroudedKeyBag,
  }).friendlyName[0];

  return forge.pki.privateKeyToPem(keyObj.key);
};

export const getMastercardAuthHeader = (uri: string, method?: string, payload?: string): string => {
  const signingKey = getMastercardKey();

  return oauth.getAuthorizationHeader(uri, method || 'GET', payload, MASTERCARD_CONSUMER_KEY, signingKey);
};
