#!/bin/bash
#
# PostgreSQL HA Blog Series — Full Playbook Test
# Tests every critical command from Parts 1-4
# Run from your Mac: bash playbook-test-ha-series.sh
#
# Prerequisites: All 4 VMs running (pg-primary, pg-replica1, pg-replica2, proxy-orch)
# This script rebuilds the cluster clean before testing.
#

set -euo pipefail

PASS=0
FAIL=0
TOTAL=0

pass() { ((PASS++)); ((TOTAL++)); echo "  [PASS] $1"; }
fail() { ((FAIL++)); ((TOTAL++)); echo "  [FAIL] $1 — $2"; }

run_on() {
  local vm=$1; shift
  multipass exec "$vm" -- bash -c "$*" 2>&1
}

run_proxy() {
  run_on proxy-orch "$@"
}

psql_admin() {
  run_proxy "PGPASSWORD=admin psql -h 127.0.0.1 -p 6132 -U admin -d admin -tAc \"$1\""
}

psql_app() {
  run_proxy "PGPASSWORD=app_pass_2026 psql -h 127.0.0.1 -p 6133 -U appuser -d appdb -tAc \"$1\""
}

orch_client() {
  run_proxy "export ORCHESTRATOR_API=http://localhost:3098/api; orchestrator-client -c $*"
}

echo "============================================"
echo " PostgreSQL HA Blog Series — Playbook Test"
echo " $(date)"
echo "============================================"

# ──────────────────────────────────────────────
echo ""
echo "PHASE 0: Verify VMs are running"
echo "──────────────────────────────────────────"

for vm in pg-primary pg-replica1 pg-replica2 proxy-orch; do
  state=$(multipass info "$vm" --format csv 2>/dev/null | tail -1 | cut -d',' -f2)
  if [ "$state" = "Running" ]; then
    pass "$vm is Running"
  else
    echo "  Starting $vm..."
    multipass start "$vm" 2>/dev/null
    sleep 10
    pass "$vm started"
  fi
done

# ──────────────────────────────────────────────
echo ""
echo "PHASE 1: Rebuild clean cluster"
echo "──────────────────────────────────────────"

echo "  Dropping old replication slots..."
run_on pg-primary "sudo -u postgres psql -c \"SELECT pg_drop_replication_slot(slot_name) FROM pg_replication_slots;\"" >/dev/null 2>&1 || true

echo "  Creating fresh slots..."
run_on pg-primary "sudo -u postgres psql -c \"SELECT pg_create_physical_replication_slot('slot_replica1');\"" >/dev/null 2>&1
run_on pg-primary "sudo -u postgres psql -c \"SELECT pg_create_physical_replication_slot('slot_replica2');\"" >/dev/null 2>&1

# Fix /etc/hosts if needed
for vm in pg-primary pg-replica1 pg-replica2 proxy-orch; do
  run_on "$vm" "grep -q pg-replica1 /etc/hosts || sudo bash -c 'cat >> /etc/hosts << EOF
192.168.2.6  pg-primary
192.168.2.7  pg-replica1
192.168.2.8  pg-replica2
192.168.2.9  proxy-orch
EOF'" >/dev/null 2>&1
done

echo "  Rebuilding pg-replica1..."
run_on pg-replica1 "
  sudo systemctl stop postgresql
  sudo -u postgres rm -rf /var/lib/postgresql/17/main/*
  sudo -u postgres PGPASSWORD=repl_pass_2026 pg_basebackup -h 192.168.2.6 -U replicator -D /var/lib/postgresql/17/main -Fp -Xs -P -R -S slot_replica1 2>&1
  sudo -u postgres bash -c \"cat > /var/lib/postgresql/17/main/postgresql.auto.conf << EOCONF
primary_conninfo = 'user=replicator password=repl_pass_2026 host=192.168.2.6 port=5432 sslmode=prefer'
primary_slot_name = 'slot_replica1'
EOCONF\"
  sudo systemctl start postgresql
" >/dev/null

echo "  Rebuilding pg-replica2..."
run_on pg-replica2 "
  sudo systemctl stop postgresql
  sudo -u postgres rm -rf /var/lib/postgresql/17/main/*
  sudo -u postgres PGPASSWORD=repl_pass_2026 pg_basebackup -h 192.168.2.6 -U replicator -D /var/lib/postgresql/17/main -Fp -Xs -P -R -S slot_replica2 2>&1
  sudo -u postgres bash -c \"cat > /var/lib/postgresql/17/main/postgresql.auto.conf << EOCONF
primary_conninfo = 'user=replicator password=repl_pass_2026 host=192.168.2.6 port=5432 sslmode=prefer'
primary_slot_name = 'slot_replica2'
EOCONF\"
  sudo systemctl start postgresql
" >/dev/null

sleep 3

echo "  Restarting Orchestrator..."
run_proxy "sudo killall orchestrator 2>/dev/null; sleep 2; sudo rm -f /usr/local/orchestrator/orchestrator.sqlite3; sudo bash -c '> /tmp/orchestrator.log; > /tmp/orchestrator-recovery.log'; sudo bash -c 'nohup /usr/local/orchestrator/orchestrator -config /usr/local/orchestrator/orchestrator.conf.json http > /tmp/orchestrator.log 2>&1 &'" >/dev/null
sleep 8

echo "  Discovering topology..."
orch_client "discover -i 192.168.2.6:5432" >/dev/null
sleep 8

echo "  Cluster rebuilt."

# ──────────────────────────────────────────────
echo ""
echo "PHASE 2: Part 1 — Replication pre-checks"
echo "──────────────────────────────────────────"

# Check 1: Primary is not in recovery
result=$(run_on pg-primary "sudo -u postgres psql -tAc 'SELECT pg_is_in_recovery();'" | tr -d '[:space:]')
[ "$result" = "f" ] && pass "pg-primary is PRIMARY (pg_is_in_recovery=f)" || fail "pg-primary role" "got $result"

# Check 2: Both replicas in recovery
for vm in pg-replica1 pg-replica2; do
  result=$(run_on "$vm" "sudo -u postgres psql -tAc 'SELECT pg_is_in_recovery();'" | tr -d '[:space:]')
  [ "$result" = "t" ] && pass "$vm is REPLICA (pg_is_in_recovery=t)" || fail "$vm role" "got $result"
done

# Check 3: 2 replicas streaming
count=$(run_on pg-primary "sudo -u postgres psql -tAc \"SELECT count(*) FROM pg_stat_replication WHERE state = 'streaming';\"" | tr -d '[:space:]')
[ "$count" = "2" ] && pass "2 replicas streaming" || fail "Streaming replicas" "got $count"

# Check 4: Replication slots active
count=$(run_on pg-primary "sudo -u postgres psql -tAc \"SELECT count(*) FROM pg_replication_slots WHERE active = true;\"" | tr -d '[:space:]')
[ "$count" = "2" ] && pass "2 replication slots active" || fail "Active slots" "got $count"

# Check 5: Replica rejects writes
result=$(run_on pg-replica1 "sudo -u postgres psql -d appdb -c \"INSERT INTO replication_test (message) VALUES ('should-fail');\" 2>&1" || true)
echo "$result" | grep -q "read-only" && pass "Replica rejects writes" || fail "Write rejection" "no read-only error"

# Check 6: Monitor user connects from proxy-orch
for host in pg-primary pg-replica1 pg-replica2; do
  result=$(run_proxy "PGPASSWORD=monitor_pass_2026 psql -h $host -U monitor -d postgres -tAc 'SELECT 1;'" | tr -d '[:space:]')
  [ "$result" = "1" ] && pass "Monitor user connects to $host" || fail "Monitor to $host" "got $result"
done

# Check 7: Orchestrator user is SUPERUSER
result=$(run_on pg-primary "sudo -u postgres psql -tAc \"SELECT usesuper FROM pg_user WHERE usename = 'orchestrator';\"" | tr -d '[:space:]')
[ "$result" = "t" ] && pass "Orchestrator user is SUPERUSER" || fail "SUPERUSER" "got $result"

# Check 8: primary_conninfo uses IPs
for vm in pg-replica1 pg-replica2; do
  conninfo=$(run_on "$vm" "sudo -u postgres cat /var/lib/postgresql/17/main/postgresql.auto.conf | grep host=")
  if echo "$conninfo" | grep -q "host=''"; then
    fail "$vm primary_conninfo" "quoted hostname detected"
  else
    pass "$vm primary_conninfo uses IP"
  fi
done

# ──────────────────────────────────────────────
echo ""
echo "PHASE 3: Part 2 — ProxySQL pre-checks"
echo "──────────────────────────────────────────"

# Check: Primary in hostgroup 10
count=$(psql_admin "SELECT count(*) FROM runtime_pgsql_servers WHERE hostgroup_id = 10 AND status = 'ONLINE';" | tr -d '[:space:]')
[ "$count" -ge 1 ] && pass "Primary in hostgroup 10 (writer)" || fail "HG 10" "count=$count"

# Check: Replicas in hostgroup 20
count=$(psql_admin "SELECT count(*) FROM runtime_pgsql_servers WHERE hostgroup_id = 20 AND status = 'ONLINE';" | tr -d '[:space:]')
[ "$count" -ge 2 ] && pass "$count servers in hostgroup 20 (readers)" || fail "HG 20" "count=$count"

# Check: No ping errors
count=$(psql_admin "SELECT count(*) FROM monitor.pgsql_server_ping_log WHERE ping_error != '' AND time_start_us > (SELECT max(time_start_us) - 10000000 FROM monitor.pgsql_server_ping_log);" | tr -d '[:space:]')
[ "$count" = "0" ] && pass "No recent ping errors" || fail "Ping errors" "count=$count"

# Check: Read-only monitor correct
primary_ro=$(psql_admin "SELECT read_only FROM monitor.pgsql_server_read_only_log WHERE hostname = 'pg-primary' ORDER BY time_start_us DESC LIMIT 1;" | tr -d '[:space:]')
[ "$primary_ro" = "0" ] && pass "Monitor: pg-primary read_only=0" || fail "Monitor primary" "got $primary_ro"

# Check: Write through ProxySQL
result=$(psql_app "INSERT INTO replication_test (message) VALUES ('playbook-write') RETURNING id;" | tr -d '[:space:]')
[ -n "$result" ] && pass "Write through ProxySQL (id=$result)" || fail "ProxySQL write" "empty result"

# Check: Read through ProxySQL
count=$(psql_app "SELECT count(*) FROM replication_test;" | tr -d '[:space:]')
[ "$count" -ge 1 ] && pass "Read through ProxySQL ($count rows)" || fail "ProxySQL read" "count=$count"

# Check: Query routing split
writes=$(psql_admin "SELECT COALESCE(SUM(count_star),0) FROM stats_pgsql_query_digest WHERE hostgroup = 10;" | tr -d '[:space:]')
reads=$(psql_admin "SELECT COALESCE(SUM(count_star),0) FROM stats_pgsql_query_digest WHERE hostgroup = 20;" | tr -d '[:space:]')
[ "$writes" -ge 1 ] && [ "$reads" -ge 1 ] && pass "Query routing: $writes writes (HG10), $reads reads (HG20)" || fail "Routing" "w=$writes r=$reads"

# ──────────────────────────────────────────────
echo ""
echo "PHASE 4: Part 3 — Orchestrator pre-checks"
echo "──────────────────────────────────────────"

# Check: Single cluster
clusters=$(orch_client "clusters" | wc -l | tr -d '[:space:]')
[ "$clusters" = "1" ] && pass "Single cluster (no topology split)" || fail "Clusters" "found $clusters"

# Check: Topology shows 1 rw + 2 ro
topo=$(orch_client "topology -i 192.168.2.6:5432")
echo "$topo" | grep -q "rw" && pass "Topology shows rw primary" || fail "Topology rw" "not found"
ro_count=$(echo "$topo" | grep -c "ro" || true)
[ "$ro_count" = "2" ] && pass "Topology shows 2 ro replicas" || fail "Topology ro" "found $ro_count"

# Check: Correct master
master=$(orch_client "which-cluster-master -i 192.168.2.6:5432" | tr -d '[:space:]')
[ "$master" = "192.168.2.6:5432" ] && pass "Master is 192.168.2.6:5432" || fail "Master" "got $master"

# Check: 2 replicas listed
replica_count=$(orch_client "which-replicas -i 192.168.2.6:5432" | wc -l | tr -d '[:space:]')
[ "$replica_count" = "2" ] && pass "2 replicas found" || fail "Replicas" "found $replica_count"

# Check: No replication problems
analysis=$(orch_client "replication-analysis" | tr -d '[:space:]')
[ -z "$analysis" ] && pass "No replication problems detected" || fail "Replication analysis" "$analysis"

# Check: Auto-recovery enabled
mode=$(orch_client "check-global-recoveries" | tr -d '[:space:]')
[ "$mode" = "enabled" ] && pass "Auto-recovery enabled" || fail "Recovery mode" "got $mode"

# ──────────────────────────────────────────────
echo ""
echo "PHASE 5: Part 4, Scenario 1 — Automatic failover"
echo "──────────────────────────────────────────────────"

echo "  Inserting pre-failover data..."
psql_app "INSERT INTO replication_test (message) VALUES ('pre-auto-failover');" >/dev/null
pre_count=$(psql_app "SELECT count(*) FROM replication_test;" | tr -d '[:space:]')
echo "  Pre-failover row count: $pre_count"

echo ""
echo "  >>> Killing pg-primary <<<"
multipass stop pg-primary 2>/dev/null
echo "  Waiting 25s for detection + auto-promotion..."
sleep 25

# Check: Orchestrator detected DeadPrimary
recovery_log=$(run_proxy "cat /tmp/orchestrator-recovery.log 2>/dev/null")
echo "$recovery_log" | grep -q "DeadPrimary" && pass "Orchestrator detected DeadPrimary" || fail "Detection" "no DeadPrimary in log"

# Check: Orchestrator promoted a replica
echo "$recovery_log" | grep -q "Master failover complete" && pass "Orchestrator auto-promoted" || fail "Auto-promotion" "no failover in log"

promoted=$(echo "$recovery_log" | grep "Master failover complete" | tail -1 | grep -o "Promoted: [0-9.]*:[0-9]*" | cut -d' ' -f2)
echo "  Promoted: $promoted"

# Check: ProxySQL has a writer in HG 10
sleep 5
hg10=$(psql_admin "SELECT count(*) FROM runtime_pgsql_servers WHERE hostgroup_id = 10 AND status = 'ONLINE';" | tr -d '[:space:]')
[ "$hg10" -ge 1 ] && pass "ProxySQL has writer in HG 10 after failover" || fail "ProxySQL HG10" "count=$hg10"

# Check: ProxySQL shunned old primary
shunned=$(psql_admin "SELECT count(*) FROM runtime_pgsql_servers WHERE hostname = 'pg-primary' AND status = 'SHUNNED';" | tr -d '[:space:]')
[ "$shunned" -ge 1 ] && pass "ProxySQL shunned pg-primary" || fail "Shunning" "count=$shunned"

# Check: Write through ProxySQL works after failover
result=$(psql_app "INSERT INTO replication_test (message) VALUES ('post-auto-failover') RETURNING id;" 2>&1 | tr -d '[:space:]')
[ -n "$result" ] && pass "Write through ProxySQL after failover (id=$result)" || fail "Post-failover write" "empty"

# Check: Orchestrator topology shows new primary
new_topo=$(orch_client "topology -i $promoted" 2>/dev/null || echo "")
echo "$new_topo" | grep -q "rw" && pass "New topology shows rw primary" || fail "New topology" "no rw found"
echo "  New topology:"
echo "$new_topo" | sed 's/^/    /'

# ──────────────────────────────────────────────
echo ""
echo "PHASE 6: Part 4, Scenario 3 — Rejoin old primary as replica"
echo "────────────────────────────────────────────────────────────"

echo "  Starting pg-primary VM..."
multipass start pg-primary 2>/dev/null
sleep 10

# Fix /etc/hosts if lost
run_on pg-primary "grep -q pg-replica1 /etc/hosts || sudo bash -c 'cat >> /etc/hosts << EOF
192.168.2.6  pg-primary
192.168.2.7  pg-replica1
192.168.2.8  pg-replica2
192.168.2.9  proxy-orch
EOF'" >/dev/null 2>&1

# Determine which node is the new primary
new_primary_ip=$(echo "$promoted" | cut -d: -f1)

echo "  Creating replication slot on new primary ($new_primary_ip)..."
run_on pg-primary "sudo -u postgres PGPASSWORD=orch_pass_2026 psql -h $new_primary_ip -U orchestrator -d postgres -c \"SELECT pg_create_physical_replication_slot('slot_old_primary');\"" >/dev/null 2>&1 || true

echo "  Re-basebackup pg-primary from new primary ($new_primary_ip)..."
run_on pg-primary "
  sudo systemctl stop postgresql
  sudo -u postgres rm -rf /var/lib/postgresql/17/main/*
  sudo -u postgres PGPASSWORD=repl_pass_2026 pg_basebackup -h $new_primary_ip -U replicator -D /var/lib/postgresql/17/main -Fp -Xs -P -R -S slot_old_primary 2>&1
  sudo -u postgres bash -c \"cat > /var/lib/postgresql/17/main/postgresql.auto.conf << EOCONF
primary_conninfo = 'user=replicator password=repl_pass_2026 host=$new_primary_ip port=5432 sslmode=prefer'
primary_slot_name = 'slot_old_primary'
EOCONF\"
  sudo systemctl start postgresql
" >/dev/null

sleep 5

# Check: Old primary is now a replica
result=$(run_on pg-primary "sudo -u postgres psql -tAc 'SELECT pg_is_in_recovery();'" | tr -d '[:space:]')
[ "$result" = "t" ] && pass "Old primary rejoined as replica (pg_is_in_recovery=t)" || fail "Rejoin" "got $result"

# Check: ProxySQL detects it as ONLINE reader
sleep 10
pg_primary_status=$(psql_admin "SELECT status FROM runtime_pgsql_servers WHERE hostname = 'pg-primary' AND hostgroup_id = 20 LIMIT 1;" | tr -d '[:space:]')
[ "$pg_primary_status" = "ONLINE" ] && pass "ProxySQL: pg-primary ONLINE in HG 20" || fail "ProxySQL rejoin" "status=$pg_primary_status"

# Check: Data integrity — no data loss
post_count=$(psql_app "SELECT count(*) FROM replication_test;" | tr -d '[:space:]')
[ "$post_count" -ge "$pre_count" ] && pass "No data loss: $post_count rows (was $pre_count pre-failover)" || fail "Data loss" "now $post_count, was $pre_count"

# ──────────────────────────────────────────────
echo ""
echo "PHASE 7: Part 4, Scenario 2 — Manual failover"
echo "───────────────────────────────────────────────"

echo "  Rebuilding clean cluster for manual test..."
# Need to rebuild because roles changed
# The current primary is $promoted, rebuild others as replicas of it

new_primary_vm=""
if [ "$new_primary_ip" = "192.168.2.7" ]; then
  new_primary_vm="pg-replica1"
elif [ "$new_primary_ip" = "192.168.2.8" ]; then
  new_primary_vm="pg-replica2"
fi

echo "  Current primary: $new_primary_vm ($new_primary_ip)"
echo "  Acknowledging old recoveries..."
orch_client "ack-all-recoveries --reason playbook-reset" >/dev/null 2>&1

echo ""
echo "  Step 2a: Disable auto-recovery"
orch_client "disable-global-recoveries" >/dev/null
mode=$(orch_client "check-global-recoveries" | tr -d '[:space:]')
[ "$mode" = "disabled" ] && pass "Auto-recovery disabled" || fail "Disable" "got $mode"

echo ""
echo "  Step 2b: Kill the current primary ($new_primary_vm)"
multipass stop "$new_primary_vm" 2>/dev/null
echo "  Waiting 20s for detection..."
sleep 20

# Check: Orchestrator detected but did NOT promote
not_recovering=$(run_proxy "grep -c 'NOT Recovering' /tmp/orchestrator.log" | tr -d '[:space:]')
[ "$not_recovering" -ge 1 ] && pass "Orchestrator: NOT Recovering (disabled globally)" || fail "Manual mode" "no NOT Recovering in log"

analysis=$(orch_client "replication-analysis")
echo "$analysis" | grep -q "DeadPrimary" && pass "replication-analysis shows DeadPrimary" || fail "Analysis" "no DeadPrimary"

echo ""
echo "  Step 2d: Manual promote via orchestrator-client"
promoted2=$(orch_client "recover -i $promoted" | tr -d '[:space:]')
[ -n "$promoted2" ] && pass "Manual recover promoted: $promoted2" || fail "Manual recover" "empty output"

sleep 5

# Check: New node is rw
new_topo2=$(orch_client "topology -i $promoted2" 2>/dev/null || echo "")
echo "$new_topo2" | grep -q "rw" && pass "New topology after manual promote shows rw" || fail "Manual topo" "no rw"
echo "  New topology:"
echo "$new_topo2" | sed 's/^/    /'

echo ""
echo "  Step 2e: Re-enable auto-recovery"
orch_client "enable-global-recoveries" >/dev/null
mode=$(orch_client "check-global-recoveries" | tr -d '[:space:]')
[ "$mode" = "enabled" ] && pass "Auto-recovery re-enabled" || fail "Re-enable" "got $mode"

orch_client "ack-all-recoveries --reason playbook-manual-test" >/dev/null 2>&1

# ──────────────────────────────────────────────
echo ""
echo "============================================"
echo " RESULTS: $PASS passed, $FAIL failed, $TOTAL total"
echo "============================================"

if [ "$FAIL" -eq 0 ]; then
  echo " ALL TESTS PASSED"
else
  echo " $FAIL TESTS FAILED — review output above"
fi

echo ""
echo "Cleanup: run 'multipass start --all' to restore all VMs"
