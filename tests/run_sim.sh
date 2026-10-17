#!/bin/bash
# usage: tests/run_sim.sh RUN BASE API [N] ; 5 parallel shards
RUN=$1; B=$2; A=$3; N=${4:-100}
source /workspace/pwenv/bin/activate; cd "$(dirname "$0")/.."; rm -f /workspace/sim/run$RUN-shard*.jsonl
for s in 0 1 2 3 4; do python tests/sim.py $RUN $B $A $s 5 $N > /workspace/sim/run$RUN-s$s.log 2>&1 & done; wait
python tests/sim_report.py $RUN /workspace/sim-report-$RUN.md
