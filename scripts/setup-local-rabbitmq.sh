#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RABBIT_DIR="${ROOT_DIR}/.local/rabbitmq"
CERT_DIR="${RABBIT_DIR}/certs"
ENV_FILE="${RABBIT_DIR}/compose.env"

mkdir -p "${CERT_DIR}"
chmod 700 "${RABBIT_DIR}" "${CERT_DIR}"

if [[ ! -f "${ENV_FILE}" ]]; then
  password="$(openssl rand -hex 24)"
  {
    printf 'LOCAL_RABBITMQ_USER=lisa-local\n'
    printf 'LOCAL_RABBITMQ_PASSWORD=%s\n' "${password}"
    printf 'LOCAL_RABBITMQ_URI=amqps://lisa-local:%s@rabbitmq:5671\n' "${password}"
  } >"${ENV_FILE}"
  chmod 600 "${ENV_FILE}"
fi

if [[ ! -f "${CERT_DIR}/ca.key" ]]; then
  openssl genrsa -out "${CERT_DIR}/ca.key" 4096
  openssl req -x509 -new -sha256 -key "${CERT_DIR}/ca.key" -days 3650 \
    -subj '/O=Lisa Local Development/CN=Lisa Local RabbitMQ CA' \
    -out "${CERT_DIR}/ca.crt"
fi

generate_certificate() {
  local name="$1"
  local common_name="$2"
  local extensions="$3"

  openssl genrsa -out "${CERT_DIR}/${name}.key" 2048
  openssl req -new -sha256 -key "${CERT_DIR}/${name}.key" \
    -subj "/O=Lisa Local Development/CN=${common_name}" \
    -out "${CERT_DIR}/${name}.csr"
  openssl x509 -req -sha256 -days 1095 \
    -in "${CERT_DIR}/${name}.csr" \
    -CA "${CERT_DIR}/ca.crt" \
    -CAkey "${CERT_DIR}/ca.key" \
    -CAcreateserial \
    -extfile "${extensions}" \
    -out "${CERT_DIR}/${name}.crt"
  rm "${CERT_DIR}/${name}.csr"
}

if [[ ! -f "${CERT_DIR}/server.key" || ! -f "${CERT_DIR}/server.crt" ]]; then
  server_extensions="$(mktemp)"
  trap 'rm -f "${server_extensions}" "${client_extensions:-}"' EXIT
  printf '%s\n' \
    'basicConstraints=CA:FALSE' \
    'keyUsage=digitalSignature,keyEncipherment' \
    'extendedKeyUsage=serverAuth' \
    'subjectAltName=DNS:rabbitmq,DNS:localhost,IP:127.0.0.1' >"${server_extensions}"
  generate_certificate server rabbitmq "${server_extensions}"
fi

if [[ ! -f "${CERT_DIR}/client.key" || ! -f "${CERT_DIR}/client.crt" ]]; then
  client_extensions="$(mktemp)"
  trap 'rm -f "${server_extensions:-}" "${client_extensions}"' EXIT
  printf '%s\n' \
    'basicConstraints=CA:FALSE' \
    'keyUsage=digitalSignature,keyEncipherment' \
    'extendedKeyUsage=clientAuth' >"${client_extensions}"
  generate_certificate client lisa-local "${client_extensions}"
fi

chmod 600 "${CERT_DIR}"/*.key
chmod 644 "${CERT_DIR}"/*.crt

echo "Local RabbitMQ credentials and certificates are ready in ${RABBIT_DIR}"
