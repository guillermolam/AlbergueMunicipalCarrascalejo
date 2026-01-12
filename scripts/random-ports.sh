#!/bin/bash
set -e
#!/usr/bin/env bash
# scripts/random_ports.sh

min=${1:-3000}
max=${2:-4000}
count=3

awk -v min="$min" -v max="$max" -v count="$count" '
  BEGIN {
    srand();
    while (n < count) {
      r = int(min + rand() * (max - min + 1));
      if (!(r in seen)) {
        seen[r] = 1;
        print r;
        n++;
      }
    }
  }
'
