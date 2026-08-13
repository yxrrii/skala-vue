# Boundary Data Source

- Original administrative boundary data: [vuski/admdongkor](https://github.com/vuski/admdongkor),
  version `ver20260201` (2026-02-01), sourced from Korea Statistics Service (통계청 SGIS).
- Processed TopoJSON (this project uses these files as-is):
  [HwangJungeon/korea-drilldown-svg-map](https://github.com/HwangJungeon/korea-drilldown-svg-map),
  `data/boundaries/sido/all.topo.json` and `data/boundaries/sgg/by-sido/11.topo.json`.

## License

The boundary data is licensed under **Creative Commons Attribution 4.0 (CC BY 4.0)**. Source
attribution to 통계청 SGIS (Korea Statistics Service) must be preserved wherever this data is
displayed — see `AttributionFooter.vue`.

## Files in this directory

- `sido/all.topo.json` — 17 sido (province/metropolitan city) boundaries, nationwide.
- `sgg/by-sido/11.topo.json` — 25 sgg (autonomous district) boundaries for Seoul (sido code `11`).

Additional `sgg/by-sido/{sidoCode}.topo.json` files can be added later, following the same path
pattern, to extend drilldown to other provinces.
