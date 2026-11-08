#!/bin/sh
set -eu
cd /opt/itsaplan
nginx -t
docker compose -f docker-compose.yml -f compose.override.yaml config --quiet
[ "$(stat -c %a .env)" = 600 ]
for service in api web worker bot; do
    id=$(docker compose -f docker-compose.yml -f compose.override.yaml ps -q "$service")
    [ -n "$id" ]
    [ "$(docker inspect -f '{{.State.Running}}' "$id")" = true ]
    case "$service" in
        api|web)
            docker inspect "$id" | python3 -c '
import json, sys
container = json.load(sys.stdin)[0]
ports = container["NetworkSettings"]["Ports"]
assert ports, "missing port binding"
for bindings in ports.values():
    for binding in bindings or []:
        assert binding["HostIp"] == "127.0.0.1", binding
'
            ;;
    esac
done
[ "$(docker inspect -f '{{.State.ExitCode}}' itsaplan-migrate-1)" = 0 ]
[ "$(docker inspect -f '{{.State.Status}}' itsaplan-migrate-1)" = exited ]
curl -fsS --max-time 20 http://127.0.0.1:3000/ >/dev/null
curl -fsS --max-time 20 http://127.0.0.1:3001/login >/dev/null
printf 'PASS: config, secrets permissions, services, migration, localhost-only ports, API + login\n'
