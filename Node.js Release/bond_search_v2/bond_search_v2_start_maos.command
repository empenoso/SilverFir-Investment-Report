#!/bin/bash
node /home/mike/SynologyDrive/rabota/2018_investments/2020_04_node.js/bond_search_v2 2>&1 | tee /home/mike/SynologyDrive/rabota/2018_investments/2020_04_node.js/bond_search_v2/log/log_$(date +%F_%T).txt
